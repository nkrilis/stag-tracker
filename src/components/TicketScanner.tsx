import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import './TicketScanner.css';

interface TicketScannerProps {
  onDetected: (ticketNumber: string) => void;
  onClose: () => void;
  /** When true, a stable read is accepted automatically without a tap. */
  autoAccept?: boolean;
  /** Show the raw OCR read + preview thumbnail overlaid on the video. */
  debug?: boolean;
}

// Aim box is the portion of the video frame we OCR.
const AIM_BOX = { widthPct: 0.6, heightPct: 0.32 };
// Upscale the crop to at least this width before OCR so digits are large enough.
const OCR_TARGET_WIDTH = 1600;
const SAMPLE_INTERVAL_MS = 500;
const STABLE_READS_REQUIRED = 2;
// Any single read at or above this confidence is trusted immediately.
const FAST_ACCEPT_CONFIDENCE = 75;
// Tap-to-scan uses a lower bar since it's an explicit user action.
const TAP_ACCEPT_CONFIDENCE = 55;

type PreprocessMode = 'grayscale' | 'otsu' | 'otsuInvert';
type ScanPsm = typeof PSM.SINGLE_WORD | typeof PSM.SINGLE_LINE | typeof PSM.SINGLE_BLOCK;
type ScanResult = { value: string; confidence: number };

export function TicketScanner({
  onDetected,
  onClose,
  autoAccept = true,
  debug = false,
}: TicketScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aimRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastReadRef = useRef<{ value: string; count: number }>({ value: '', count: 0 });
  const acceptedRef = useRef(false);
  const scanningRef = useRef(false);

  const [status, setStatus] = useState<'starting' | 'ready' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [candidate, setCandidate] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [debugRead, setDebugRead] = useState<string>('');
  const [flashCapture, setFlashCapture] = useState(false);
  // Viewport aspect is matched to the video source so aim box percentages line up 1:1.
  const [sourceAspect, setSourceAspect] = useState<number | null>(null);

  const accept = useCallback(
    (value: string) => {
      if (acceptedRef.current) return;
      acceptedRef.current = true;
      onDetected(value);
      // Release the lock so the scanner stays live for the next ticket. Consumer
      // handles same-value dedup, so a short cooldown is enough here.
      window.setTimeout(() => {
        acceptedRef.current = false;
        lastReadRef.current = { value: '', count: 0 };
        setCandidate(null);
      }, 1200);
    },
    [onDetected],
  );

  // Compute the crop rect in the *source* frame's pixel space. Because the
  // viewport's aspect ratio matches the source, the visible aim box (in %)
  // aligns 1:1 with these coordinates — no object-fit math required.
  const getSourceCrop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const cw = Math.round(vw * AIM_BOX.widthPct);
    const ch = Math.round(vh * AIM_BOX.heightPct);
    const cx = Math.round((vw - cw) / 2);
    const cy = Math.round((vh - ch) / 2);
    return { vw, vh, cx, cy, cw, ch };
  }, []);

  // Grab the aim-box crop, run one preprocessing mode, OCR it, return any 3-digit hit.
  const scanOnce = useCallback(
    async (mode: PreprocessMode, psm: ScanPsm = PSM.SINGLE_WORD): Promise<ScanResult | null> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const worker = workerRef.current;
      if (!video || !canvas || !worker) return null;
      const src = getSourceCrop();
      if (!src) return null;
      const { cx, cy, cw, ch } = src;

      const scale = Math.max(1, OCR_TARGET_WIDTH / cw);
      const targetW = Math.round(cw * scale);
      const targetH = Math.round(ch * scale);
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, targetW, targetH);

      const img = ctx.getImageData(0, 0, targetW, targetH);
      const d = img.data;

      // Grayscale pass + gather min/max/histogram in one loop.
      const hist = new Uint32Array(256);
      let gMin = 255;
      let gMax = 0;
      for (let i = 0; i < d.length; i += 4) {
        const g = ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000) | 0;
        d[i] = d[i + 1] = d[i + 2] = g;
        hist[g]++;
        if (g < gMin) gMin = g;
        if (g > gMax) gMax = g;
      }

      if (mode === 'grayscale') {
        // Linear contrast stretch — helps when the number sits in a mid-grey range.
        const range = Math.max(1, gMax - gMin);
        for (let i = 0; i < d.length; i += 4) {
          const g = Math.max(0, Math.min(255, ((d[i] - gMin) * 255) / range)) | 0;
          d[i] = d[i + 1] = d[i + 2] = g;
        }
      } else {
        const threshold = otsuThreshold(hist, targetW * targetH);
        if (mode === 'otsu') {
          for (let i = 0; i < d.length; i += 4) {
            const v = d[i] > threshold ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v;
          }
        } else {
          for (let i = 0; i < d.length; i += 4) {
            const v = d[i] > threshold ? 0 : 255;
            d[i] = d[i + 1] = d[i + 2] = v;
          }
        }
      }
      ctx.putImageData(img, 0, 0);

      if (debug && previewRef.current) {
        const pc = previewRef.current;
        const pctx = pc.getContext('2d');
        if (pctx) {
          const maxW = 120;
          const maxH = 80;
          const aspect = targetW / targetH;
          let pw = maxW;
          let ph = Math.round(pw / aspect);
          if (ph > maxH) {
            ph = maxH;
            pw = Math.round(ph * aspect);
          }
          pc.width = Math.max(1, pw);
          pc.height = Math.max(1, ph);
          pctx.imageSmoothingEnabled = true;
          pctx.drawImage(canvas, 0, 0, pc.width, pc.height);
        }
      }

      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const {
        data: { text, confidence },
      } = await worker.recognize(canvas);
      const digits = text.replace(/\D/g, '');
      if (debug) {
        const rawSample = text.trim().slice(0, 12).replace(/\n/g, ' ');
        setDebugRead(`${mode.slice(0, 4)}\u00b7psm${psm} "${rawSample || '—'}" c:${Math.round(confidence)}`);
      }
      const match = digits.match(/\b\d{3}\b/) ?? (digits.length === 3 ? [digits] : null);
      return match ? { value: match[0], confidence } : null;
    },
    [debug, getSourceCrop],
  );

  // Track the source aspect ratio so the viewport can match it.
  useEffect(() => {
    if (status !== 'ready') return;
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh) setSourceAspect(vw / vh);
    };
    update();
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);
    return () => {
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
    };
  }, [status]);

  // Start camera + OCR worker.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          const insecure = typeof window !== 'undefined' && !window.isSecureContext;
          throw new Error(
            insecure
              ? 'Camera requires HTTPS. Open this page over https:// (or use localhost) and try again.'
              : 'This browser does not support camera access.',
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          torch?: boolean;
          focusMode?: string[];
        };
        if (caps.torch) setTorchSupported(true);
        if (caps.focusMode?.includes('continuous')) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
            });
          } catch {
            // Best-effort focus tweak.
          }
        }

        const worker = await createWorker('eng');
        if (cancelled) {
          await worker.terminate();
          return;
        }
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: PSM.SINGLE_WORD,
          // Legacy engine off; LSTM is more forgiving on small numeric crops.
          classify_bln_numeric_mode: '1',
        });
        workerRef.current = worker;
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Camera unavailable';
        setErrorMsg(msg);
        setStatus('error');
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const w = workerRef.current;
      workerRef.current = null;
      if (w) void w.terminate();
    };
  }, []);

  // Continuous sampling loop.
  useEffect(() => {
    if (status !== 'ready') return;

    let stopped = false;
    let timer: number | undefined;

    const tick = async () => {
      if (stopped) return;
      // While locked (post-accept cooldown) or already scanning, just reschedule.
      if (acceptedRef.current || scanningRef.current) {
        timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
        return;
      }
      scanningRef.current = true;
      try {
        const result =
          (await scanOnce('grayscale', PSM.SINGLE_WORD)) ??
          (await scanOnce('otsu', PSM.SINGLE_WORD)) ??
          (await scanOnce('otsuInvert', PSM.SINGLE_WORD)) ??
          (await scanOnce('grayscale', PSM.SINGLE_LINE));
        if (stopped) return;
        if (result && !acceptedRef.current) {
          const { value, confidence } = result;
          if (confidence >= FAST_ACCEPT_CONFIDENCE) {
            if (autoAccept) accept(value);
            else setCandidate(value);
          } else {
            const last = lastReadRef.current;
            if (last.value === value) {
              last.count += 1;
            } else {
              lastReadRef.current = { value, count: 1 };
            }
            if (lastReadRef.current.count >= STABLE_READS_REQUIRED) {
              if (autoAccept) accept(value);
              else setCandidate(value);
            }
          }
        }
      } catch {
        // Ignore per-frame errors; retry next tick.
      } finally {
        scanningRef.current = false;
      }
      if (!stopped) timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
    };

    timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [status, autoAccept, accept, scanOnce]);

  // Tap-to-scan: immediate best-effort capture triggered by tapping the viewport.
  const handleTapScan = async () => {
    if (status !== 'ready' || acceptedRef.current || scanningRef.current) return;
    scanningRef.current = true;
    setFlashCapture(true);
    window.setTimeout(() => setFlashCapture(false), 180);
    try {
      const result =
        (await scanOnce('grayscale', PSM.SINGLE_WORD)) ??
        (await scanOnce('otsu', PSM.SINGLE_WORD)) ??
        (await scanOnce('otsuInvert', PSM.SINGLE_WORD)) ??
        (await scanOnce('grayscale', PSM.SINGLE_LINE)) ??
        (await scanOnce('otsu', PSM.SINGLE_LINE)) ??
        (await scanOnce('grayscale', PSM.SINGLE_BLOCK));
      if (result && result.confidence >= TAP_ACCEPT_CONFIDENCE) {
        if (autoAccept) accept(result.value);
        else setCandidate(result.value);
      }
    } finally {
      scanningRef.current = false;
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  };

  const rejectCandidate = () => {
    setCandidate(null);
    lastReadRef.current = { value: '', count: 0 };
  };

  const confirmCandidate = () => {
    if (candidate) accept(candidate);
  };

  return (
    <div className="scanner-panel" role="dialog" aria-label="Ticket scanner">
      <div className="scanner-header">
        <span className="scanner-title">
          {status === 'ready' && !candidate && '📷 Tap video to scan'}
          {status === 'ready' && candidate && `Detected: #${candidate}`}
          {status === 'starting' && 'Starting camera…'}
          {status === 'error' && 'Camera error'}
        </span>
        <div className="scanner-header-actions">
          {torchSupported && status === 'ready' && (
            <button
              type="button"
              className={`scanner-torch ${torchOn ? 'on' : ''}`}
              onClick={toggleTorch}
              aria-label="Toggle flashlight"
            >
              {torchOn ? '💡' : '🔦'}
            </button>
          )}
          <button
            type="button"
            className="scanner-close"
            onClick={onClose}
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`scanner-viewport ${flashCapture ? 'flash' : ''}`}
        onClick={handleTapScan}
        aria-label="Capture a scan now"
        style={sourceAspect ? { aspectRatio: `${sourceAspect}`, height: 'auto' } : undefined}
      >
        <video ref={videoRef} playsInline muted className="scanner-video" />
        <div
          ref={aimRef}
          className="scanner-aim"
          style={{
            width: `${AIM_BOX.widthPct * 100}%`,
            height: `${AIM_BOX.heightPct * 100}%`,
          }}
        >
          <span className="scanner-aim-corner tl" />
          <span className="scanner-aim-corner tr" />
          <span className="scanner-aim-corner bl" />
          <span className="scanner-aim-corner br" />
        </div>
        {status !== 'ready' && (
          <div className="scanner-overlay-msg">
            {status === 'error' ? errorMsg || 'Camera unavailable' : 'Starting camera…'}
          </div>
        )}
        {candidate && !autoAccept && (
          <div className="scanner-confirm" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="scanner-reject" onClick={rejectCandidate}>
              ✕
            </button>
            <span className="scanner-confirm-number">#{candidate}</span>
            <button type="button" className="scanner-accept" onClick={confirmCandidate}>
              Add
            </button>
          </div>
        )}
        {debug && status === 'ready' && (
          <>
            <div className="scanner-debug">OCR: {debugRead || '—'}</div>
            <canvas ref={previewRef} className="scanner-debug-preview" />
          </>
        )}
      </button>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

function otsuThreshold(hist: Uint32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}
