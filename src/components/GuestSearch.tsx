import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import './GuestSearch.css';

interface PaymentModalData {
  name: string;
  ticketNumber: string;
}

export function GuestSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [allTickets, setAllTickets] = useState<string[][]>([]);
  const [paymentModal, setPaymentModal] = useState<PaymentModalData | null>(null);
  const [pendingTicket, setPendingTicket] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');

  useEffect(() => {
    loadAllTickets();

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadAllTickets, 5000);

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAllTickets();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadAllTickets = async () => {
    try {
      const rows = await sheetsService.getRows();
      setAllTickets(rows.slice(2)); // Skip title row and header row
    } catch (error) {
      console.error('Failed to load tickets:', error);
    }
  };

  useEffect(() => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = allTickets.filter(row => {
      const firstName = String(row[1] || '').toLowerCase();
      const lastName = String(row[2] || '').toLowerCase();
      const ticketNumber = String(row[0] || '').trim();
      
      // For numeric queries, pad both query and ticket number for comparison
      if (/^\d+$/.test(query)) {
        const paddedQuery = query.padStart(3, '0');
        const paddedTicket = ticketNumber.padStart(3, '0').toLowerCase();
        return paddedTicket.includes(paddedQuery);
      }
      
      // For text queries, search in names
      return firstName.includes(query) || lastName.includes(query);
    });

    setResults(filtered);
    setLoading(false);
  }, [searchQuery, allTickets]);

  const handleCheckIn = async (ticketNumber: string, isPaid: boolean, name: string) => {
    // Check if not paid - show payment modal
    if (!isPaid) {
      setPendingTicket(ticketNumber);
      setPaymentModal({
        name: name,
        ticketNumber: ticketNumber
      });
      return;
    }

    // Proceed with check-in for paid tickets
    try {
      await sheetsService.checkInTicket(ticketNumber);
      // Refresh the tickets to update status
      await loadAllTickets();
    } catch (error) {
      console.error('Check-in failed:', error);
    }
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
      // Refresh the tickets to update status
      await loadAllTickets();
    } catch (error) {
      console.error('Payment/Check-in failed:', error);
    }

    setIsProcessing(false);
  };

  const handlePaymentCancel = () => {
    setPaymentModal(null);
    setPendingTicket('');
    setAmountReceived('');
  };

  const calculateChange = () => {
    const ticketPrice = 120;
    const received = parseFloat(amountReceived) || 0;
    return received - ticketPrice;
  };

  const change = calculateChange();

  return (
    <div className="guest-search">
      <div className="search-header">
        <h2>🔍 Guest Search</h2>
        <p>Search by name or ticket number</p>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Enter first name, last name, or ticket number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
      </div>

      {loading && <div className="search-loading">Searching...</div>}

      {searchQuery.length >= 1 && !loading && (
        <div className="search-results">
          {results.length > 0 ? (
            <>
              <div className="results-summary">
                <div className="results-count">{results.length} result{results.length !== 1 ? 's' : ''}</div>
                <div className="results-stats">
                  <span className="stat-item checked-in">
                    ✓ {results.filter(r => r[4] === 'Yes').length} Checked In
                  </span>
                  <span className="stat-item paid">
                    💵 {results.filter(r => r[3] === 'Yes').length} Paid
                  </span>
                  <span className="stat-item needs-payment">
                    ❌ {results.filter(r => r[3] !== 'Yes').length} Need Payment
                  </span>
                </div>
              </div>
              <ul>
                {results.map((row, index) => {
                  const isCheckedIn = row[4] === 'Yes';
                  const isPaid = row[3] === 'Yes';
                  return (
                    <li key={index} className={isCheckedIn ? 'checked-in' : ''}>
                      <div className="result-info">
                        <span className="result-ticket">#{String(row[0]).padStart(3, '0')}</span>
                        <span className="result-name">{row[1]} {row[2]}</span>
                        <span className={`result-status ${isCheckedIn ? 'checked-in' : 'pending'}`}>
                          {isCheckedIn ? '✓ Checked In' : 'Not Checked In'}
                        </span>
                        {isPaid ? (
                          <span className="paid-badge">💵 Paid</span>
                        ) : (
                          <span className="not-paid-badge">❌ Not Paid</span>
                        )}
                      </div>
                      {!isCheckedIn && (
                        <button
                          onClick={() => handleCheckIn(String(row[0]), isPaid, `${row[1]} ${row[2]}`)}
                          className="quick-checkin-btn"
                        >
                          Check In
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="no-results">
              No tickets found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}

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
              <div className="change-calculator">
                <label htmlFor="modal-amount-received">Amount Received:</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    id="modal-amount-received"
                    type="number"
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
