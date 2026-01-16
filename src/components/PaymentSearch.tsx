import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import './PaymentSearch.css';

export function PaymentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [allTickets, setAllTickets] = useState<string[][]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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
      const name = String(row[1] || '').toLowerCase();
      const phoneNumber = String(row[2] || '').toLowerCase();
      const ticketNumber = String(row[0] || '').trim();
      
      // For numeric queries, pad both query and ticket number for comparison
      if (/^\d+$/.test(query)) {
        const paddedQuery = query.padStart(3, '0');
        const paddedTicket = ticketNumber.padStart(3, '0').toLowerCase();
        return paddedTicket.includes(paddedQuery) || phoneNumber.includes(query);
      }
      
      // For text queries, search in names
      return name.includes(query);
    });

    setResults(filtered);
    setLoading(false);
  }, [searchQuery, allTickets]);

  const handleTogglePayment = async (ticketNumber: string, currentStatus: boolean) => {
    setIsProcessing(ticketNumber);
    
    try {
      if (currentStatus) {
        // Mark as unpaid
        await sheetsService.markAsUnpaid(ticketNumber);
      } else {
        // Mark as paid
        await sheetsService.markAsPaid(ticketNumber);
      }
      // Refresh the tickets to update status
      await loadAllTickets();
    } catch (error) {
      console.error('Payment status update failed:', error);
    }
    
    setIsProcessing(null);
  };

  return (
    <div className="payment-search">
      <div className="search-header">
        <h2>💳 Payment Management</h2>
        <p>Search and update payment status</p>
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
                  <span className="stat-item paid">
                    💵 {results.filter(r => r[3] === 'Yes').length} Paid
                  </span>
                  <span className="stat-item needs-payment">
                    ❌ {results.filter(r => r[3] !== 'Yes').length} Unpaid
                  </span>
                </div>
              </div>
              <ul>
                {results.map((row, index) => {
                  const ticketNumber = String(row[0]);
                  const name = String(row[1] || '');
                  const phoneNumber = String(row[2] || '');
                  const isPaid = row[3] === 'Yes';
                  const isCheckedIn = row[4] === 'Yes';
                  const isCurrentlyProcessing = isProcessing === ticketNumber;
                  
                  return (
                    <li key={index}>
                      <div className="result-info">
                        <div className="result-main">
                          <span className="result-ticket">#{ticketNumber.padStart(3, '0')}</span>
                          <div className="result-details">
                            <span className="result-name">{name}</span>
                            {phoneNumber && (
                              <div className="result-phone-row">
                                <a href={`tel:${phoneNumber}`} className="result-phone-btn" title="Call">
                                  📞
                                </a>
                                <span className="result-phone-number">{phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="result-actions">
                        <div className="result-badges">
                          {isCheckedIn && (
                            <span className="checked-in-indicator">✓ Checked In</span>
                          )}
                          {isPaid ? (
                            <span className="paid-badge">💵 Paid</span>
                          ) : (
                            <span className="not-paid-badge">❌ Unpaid</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleTogglePayment(ticketNumber, isPaid)}
                          className={`payment-toggle-btn ${isPaid ? 'mark-unpaid' : 'mark-paid'}`}
                          disabled={isCurrentlyProcessing}
                        >
                          {isCurrentlyProcessing ? (
                            'Processing...'
                          ) : isPaid ? (
                            'Mark Unpaid'
                          ) : (
                            'Mark Paid'
                          )}
                        </button>
                      </div>
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
    </div>
  );
}
