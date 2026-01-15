import { useState, useRef, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import './BulkCheckIn.css';

interface CheckInResult {
  ticketNumber: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

interface PaymentModalData {
  name: string;
  ticketNumber: string;
}

export function BulkCheckIn() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [results, setResults] = useState<CheckInResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [paymentModal, setPaymentModal] = useState<PaymentModalData | null>(null);
  const [pendingTicket, setPendingTicket] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus on input
    inputRef.current?.focus();
  }, [results]);

  const playSound = (success: boolean) => {
    if (!soundEnabled) return;
    try {
      // Create a simple beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = success ? 800 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Sound error:', error);
    }
  };

  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketNumber.trim() || isProcessing) return;

    setIsProcessing(true);
    const ticket = ticketNumber.trim();

    try {
      // Search for ticket
      const searchResult = await sheetsService.searchTicket(ticket);
      
      if (!searchResult.found || !searchResult.data) {
        const result: CheckInResult = {
          ticketNumber: ticket,
          success: false,
          message: 'Ticket not found',
          timestamp: new Date()
        };
        setResults(prev => [result, ...prev]);
        playSound(false);
        vibrate(200);
        setTicketNumber('');
        setIsProcessing(false);
        return;
      }

      const ticketData = searchResult.data;

      // Check if already checked in
      if (ticketData.checkedIn === 'Yes') {
        const result: CheckInResult = {
          ticketNumber: ticket,
          success: false,
          message: `Already checked in - ${ticketData.name}`,
          timestamp: new Date()
        };
        setResults(prev => [result, ...prev]);
        playSound(false);
        vibrate([100, 50, 100]);
        setTicketNumber('');
        setIsProcessing(false);
        return;
      }

      // Check if not paid - show payment modal
      if (ticketData.paid !== 'Yes') {
        setPendingTicket(ticket);
        setPaymentModal({
          name: ticketData.name,
          ticketNumber: ticket
        });
        setTicketNumber('');
        setIsProcessing(false);
        return;
      }

      // Perform check-in
      await sheetsService.checkInTicket(ticket);
      
      const result: CheckInResult = {
        ticketNumber: ticket,
        success: true,
        message: `✓ ${ticketData.name}`,
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev]);
      playSound(true);
      vibrate(50);
      
    } catch (error) {
      const result: CheckInResult = {
        ticketNumber: ticket,
        success: false,
        message: 'Check-in failed - try again',
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev]);
      playSound(false);
      vibrate(200);
    }

    setTicketNumber('');
    setIsProcessing(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const handlePaymentConfirm = async () => {
    if (!pendingTicket) return;

    setIsProcessing(true);
    const ticket = pendingTicket;
    setPaymentModal(null);
    setPendingTicket('');

    try {
      // Combined payment + check-in (faster - single operation)
      await sheetsService.payAndCheckIn(ticket);
      
      const result: CheckInResult = {
        ticketNumber: ticket,
        success: true,
        message: `✓ Paid & Checked in`,
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev]);
      playSound(true);
      vibrate(50);
    } catch (error) {
      const result: CheckInResult = {
        ticketNumber: ticket,
        success: false,
        message: 'Payment/Check-in failed',
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev]);
      playSound(false);
      vibrate(200);
    }

    setIsProcessing(false);
    inputRef.current?.focus();
  };

  const handlePaymentCancel = () => {
    if (!pendingTicket) return;

    const result: CheckInResult = {
      ticketNumber: pendingTicket,
      success: false,
      message: `Payment required - ${paymentModal?.name || ''}`,
      timestamp: new Date()
    };
    setResults(prev => [result, ...prev]);
    playSound(false);
    vibrate(200);

    setPaymentModal(null);
    setPendingTicket('');
    inputRef.current?.focus();
  };

  return (
    <div className="bulk-checkin">
      <div className="bulk-header">
        <h2>⚡ Express Check-in</h2>
        <div className="bulk-controls">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`sound-toggle ${soundEnabled ? 'active' : ''}`}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          {results.length > 0 && (
            <button onClick={clearResults} className="clear-btn">
              Clear History
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleCheckIn} className="bulk-form">
        <input
          ref={inputRef}
          type="text"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          placeholder="Scan or enter ticket number..."
          disabled={isProcessing}
          autoFocus
          className="bulk-input"
        />
        <button type="submit" disabled={isProcessing || !ticketNumber.trim()} className="bulk-submit">
          {isProcessing ? '⏳' : '→'}
        </button>
      </form>

      <div className="bulk-stats">
        <div className="stat">
          <span className="stat-value">{results.filter(r => r.success).length}</span>
          <span className="stat-label">Successful</span>
        </div>
        <div className="stat">
          <span className="stat-value">{results.filter(r => !r.success).length}</span>
          <span className="stat-label">Failed</span>
        </div>
        <div className="stat">
          <span className="stat-value">{results.length}</span>
          <span className="stat-label">Total Scans</span>
        </div>
      </div>

      <div className="bulk-results">
        {results.map((result, index) => (
          <div 
            key={index} 
            className={`bulk-result ${result.success ? 'success' : 'error'} ${index === 0 ? 'latest' : ''}`}
          >
            <span className="result-ticket">#{result.ticketNumber.padStart(3, '0')}</span>
            <span className="result-message">{result.message}</span>
            <span className="result-time">{result.timestamp.toLocaleTimeString()}</span>
          </div>
        ))}
        {results.length === 0 && (
          <div className="no-results">
            Ready to scan tickets. Enter or scan ticket numbers above.
          </div>
        )}
      </div>

      {paymentModal && (
        <div className="payment-modal-overlay" onClick={handlePaymentCancel}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💳 Payment Required</h3>
            </div>
            <div className="modal-content">
              <div className="modal-guest-name">{paymentModal.name}</div>
              <div className="modal-ticket">Ticket #{paymentModal.ticketNumber.padStart(3, '0')}</div>
              <div className="modal-amount">$120.00</div>
              <p className="modal-text">Mark as paid and check in?</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn modal-cancel" 
                onClick={handlePaymentCancel}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-confirm" 
                onClick={handlePaymentConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Mark Paid & Check In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
