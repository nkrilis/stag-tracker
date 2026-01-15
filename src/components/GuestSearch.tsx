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

  useEffect(() => {
    loadAllTickets();
  }, []);

  const loadAllTickets = async () => {
    try {
      const rows = await sheetsService.getRows();
      setAllTickets(rows.slice(1)); // Skip header
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
  };

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
              <div className="results-count">{results.length} result{results.length !== 1 ? 's' : ''}</div>
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
