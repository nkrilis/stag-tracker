import { useState, useRef, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import './BulkCheckIn.css';

interface CheckInResult {
  ticketNumber: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

interface SelectedGuest {
  ticketNumber: string;
  name: string;
  paid: boolean;
  checkedIn: boolean;
}

export function BulkCheckIn() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [results, setResults] = useState<CheckInResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedGuests, setSelectedGuests] = useState<SelectedGuest[]>([]);
  const [amountReceived, setAmountReceived] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus on input
    inputRef.current?.focus();
  }, [results, selectedGuests]);

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

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketNumber.trim() || isProcessing) return;

    const ticket = ticketNumber.trim();
    const normalizedTicket = ticket.padStart(3, '0');

    // Check if already in selected list (normalized comparison)
    if (selectedGuests.some(g => g.ticketNumber.padStart(3, '0') === normalizedTicket)) {
      const result: CheckInResult = {
        ticketNumber: ticket,
        success: false,
        message: 'Already in selection',
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev]);
      playSound(false);
      vibrate(100);
      setTicketNumber('');
      return;
    }

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
        return;
      }

      // Add to selection (store normalized ticket number)
      setSelectedGuests(prev => [...prev, {
        ticketNumber: normalizedTicket,
        name: ticketData.name,
        paid: ticketData.paid === 'Yes',
        checkedIn: false
      }]);
      
      playSound(true);
      vibrate(50);
      
    } catch (error) {
      const result: CheckInResult = {
        ticketNumber: ticket,
        success: false,
        message: 'Search failed - try again',
        timestamp: new Date()
      };
      setResults(prev => [result, ...prev]);
      playSound(false);
      vibrate(200);
    }

    setTicketNumber('');
  };

  const removeGuest = (ticketNumber: string) => {
    setSelectedGuests(prev => prev.filter(g => g.ticketNumber !== ticketNumber));
  };

  const clearSelection = () => {
    setSelectedGuests([]);
    setAmountReceived('');
  };

  const calculateTotal = () => {
    const unpaidCount = selectedGuests.filter(g => !g.paid).length;
    return unpaidCount * 120;
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const received = parseFloat(amountReceived) || 0;
    return received - total;
  };

  const handleBatchCheckIn = async () => {
    if (selectedGuests.length === 0 || isProcessing) return;

    setIsProcessing(true);

    const guestsToProcess = [...selectedGuests];
    let successCount = 0;
    let failCount = 0;

    for (const guest of guestsToProcess) {
      try {
        if (guest.paid) {
          // Just check in
          await sheetsService.checkInTicket(guest.ticketNumber);
        } else {
          // Pay and check in
          await sheetsService.payAndCheckIn(guest.ticketNumber);
        }
        
        const result: CheckInResult = {
          ticketNumber: guest.ticketNumber,
          success: true,
          message: `✓ ${guest.name} ${guest.paid ? '' : '(Paid)'}`,
          timestamp: new Date()
        };
        setResults(prev => [result, ...prev]);
        successCount++;
      } catch (error) {
        const result: CheckInResult = {
          ticketNumber: guest.ticketNumber,
          success: false,
          message: `Failed: ${guest.name}`,
          timestamp: new Date()
        };
        setResults(prev => [result, ...prev]);
        failCount++;
      }
    }

    if (successCount > 0) {
      playSound(true);
      vibrate([50, 100, 50]);
    } else {
      playSound(false);
      vibrate(200);
    }

    setSelectedGuests([]);
    setAmountReceived('');
    setIsProcessing(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const totalAmount = calculateTotal();
  const unpaidCount = selectedGuests.filter(g => !g.paid).length;
  const change = calculateChange();

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

      <form onSubmit={handleAddGuest} className="bulk-form">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={ticketNumber}
          onChange={(e) => setTicketNumber(e.target.value)}
          placeholder="Scan or enter ticket number..."
          disabled={isProcessing}
          autoFocus
          className="bulk-input"
        />
        <button type="submit" disabled={isProcessing || !ticketNumber.trim()} className="bulk-submit">
          {isProcessing ? '⏳' : '+'}
        </button>
      </form>

      {selectedGuests.length > 0 && (
        <div className="selected-guests">
          <div className="selected-header">
            <h3>Selected Guests ({selectedGuests.length})</h3>
            <button onClick={clearSelection} className="clear-selection-btn">
              Clear All
            </button>
          </div>
          <div className="selected-list">
            {selectedGuests.map((guest) => (
              <div key={guest.ticketNumber} className="selected-guest-item">
                <div className="guest-info">
                  <span className="guest-ticket">#{guest.ticketNumber.padStart(3, '0')}</span>
                  <span className="guest-name">{guest.name}</span>
                  {!guest.paid && <span className="needs-payment">💵 $120</span>}
                </div>
                <button 
                  onClick={() => removeGuest(guest.ticketNumber)}
                  className="remove-guest-btn"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="batch-actions">
            <div className="batch-summary">
              <div className="summary-line">
                <span>Total Guests:</span>
                <span className="summary-value">{selectedGuests.length}</span>
              </div>
              {unpaidCount > 0 && (
                <>
                  <div className="summary-line">
                    <span>Need Payment:</span>
                    <span className="summary-value">{unpaidCount}</span>
                  </div>
                  <div className="summary-line total-line">
                    <span>Total Amount:</span>
                    <span className="summary-value total-amount">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="change-calculator">
                    <label htmlFor="amount-received">Amount Received:</label>
                    <div className="amount-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        id="amount-received"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="amount-input"
                      />
                    </div>
                    {amountReceived && parseFloat(amountReceived) > 0 && (
                      <div className={`change-display ${change >= 0 ? 'positive' : 'negative'}`}>
                        {change >= 0 ? (
                          <>
                            <span className="change-label">Change:</span>
                            <span className="change-amount">${change.toFixed(2)}</span>
                          </>
                        ) : (
                          <>
                            <span className="change-label">Short:</span>
                            <span className="change-amount">${Math.abs(change).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={handleBatchCheckIn}
              disabled={isProcessing}
              className="batch-checkin-btn"
            >
              {isProcessing ? 'Processing...' : `Check In ${selectedGuests.length > 1 ? 'All' : ''} ${unpaidCount > 0 ? '& Pay' : ''}`}
            </button>
          </div>
        </div>
      )}

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
    </div>
  );
}
