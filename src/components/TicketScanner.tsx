import { useCallback, useEffect, useRef, useState } from 'react';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import './TicketScanner.css';

interface TicketScannerProps {
  onDetected: (ticketNumber: string) => void;
  onClose: () => void;
  /** When true, a stable read is accepted automatically without a tap. */
  autoAccept?: boolean;
}

// Aim box is the portion of the video frame we actually OCR. Ticket numbers
// live in the bottom-right of each ticket, so keeping this small keeps OCR fast.
const AIM_BOX = { widthPct: 0.55, heightPct: 0.35 };
const SAMPLE_INTERVAL_MS = 450;
const STABLE_READS_REQUIRED = 2;

export function TicketScanner({ onDetected, onClose, autoAccept = true }: TicketScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  const accept = useCallback(
    (value: string) => {
      if (acceptedRef.current) return;
      acceptedRef.current = true;
      onDetected(value);
    },
    [onDetected],
  );

  // Start camera + OCR worker.
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        if (caps.torch) setTorchSupported(true);

        const worker = await createWorker('eng');
        if (cancelled) {
          await worker.terminate();
          return;
        }
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
          tessedit_pageseg_mode: PSM.SINGLE_LINE,
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

  // Sampling loop: crop the aim box and OCR it.
  useEffect(() => {
    if (status !== 'ready') return;

    let stopped = false;
    let timer: number | undefined;

    const tick = async () => {
      if (stopped || acceptedRef.current) return;
      if (scanningRef.current) {
        timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const worker = workerRef.current;
      if (!video || !canvas || !worker || video.readyState < 2) {
        timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
        return;
      }

      scanningRef.current = true;
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cw = Math.floor(vw * AIM_BOX.widthPct);
        const ch = Math.floor(vh * AIM_BOX.heightPct);
        const cx = Math.floor((vw - cw) / 2);
        const cy = Math.floor((vh - ch) / 2);
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);

        const {
          data: { text },
        } = await worker.recognize(canvas);
        if (stopped || acceptedRef.current) return;

        const digits = text.replace(/\D/g, '');
        // Ticket numbers are exactly 3 digits (001–999).
        const match = digits.match(/\b\d{3}\b/) ?? (digits.length === 3 ? [digits] : null);
        if (match) {
          const value = match[0];
          const last = lastReadRef.current;
          if (last.value === value) {
            last.count += 1;
          } else {
            lastReadRef.current = { value, count: 1 };
          }
          if (lastReadRef.current.count >= STABLE_READS_REQUIRED) {
            if (autoAccept) {
              accept(value);
              return;
            }
            setCandidate(value);
          }
        }
      } catch {
        // Ignore per-frame errors; try again next tick.
      } finally {
        scanningRef.current = false;
      }

      timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
    };

    timer = window.setTimeout(tick, SAMPLE_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [status, autoAccept, accept]);

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
          {status === 'ready' && !candidate && '📷 Point at ticket number'}
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

      <div className="scanner-viewport">
        <video ref={videoRef} playsInline muted className="scanner-video" />
        <div
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
          <div className="scanner-confirm">
            <button type="button" className="scanner-reject" onClick={rejectCandidate}>
              ✕
            </button>
            <span className="scanner-confirm-number">#{candidate}</span>
            <button type="button" className="scanner-accept" onClick={confirmCandidate}>
              Add
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
