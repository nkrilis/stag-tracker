import { useState } from 'react';
import { GoogleSheetsService } from '../services/googleSheetsService';
import './TicketCheck.css';

interface TicketDetails {
  ticketNumber: string;
  name: string;
  phoneNumber: string;
  paid: string;
  checkedIn: string;
}

interface TicketResult {
  ticketNumber: string;
  found: boolean;
  details?: TicketDetails;
}

const TICKET_PRICE = 120;

type SearchMode = 'ticket' | 'name' | 'phone';

export const TicketCheck = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('ticket');
  const [loading, setLoading] = useState(false);
  const [updatingTickets, setUpdatingTickets] = useState<Set<string>>(new Set());
  const [checkingInTickets, setCheckingInTickets] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<TicketResult[]>([]);

  const googleSheetsService = new GoogleSheetsService();

  // Parse ticket number input (single, range, or comma-separated)
  const parseTicketNumbers = (input: string): string[] => {
    const tickets: string[] = [];
    const parts = input.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range (e.g., "001-005")
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            tickets.push(i.toString());
          }
        }
      } else {
        // Single ticket
        tickets.push(part);
      }
    }

    return tickets;
  };

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchInput.trim()) {
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const rows = await googleSheetsService.getRows();
      const foundResults: TicketResult[] = [];

      if (searchMode === 'ticket') {
        // Ticket number search (supports ranges and comma-separated)
        const ticketsToCheck = parseTicketNumbers(searchInput);

        for (const ticket of ticketsToCheck) {
          const normalizedTicket = ticket.trim().padStart(3, '0').toLowerCase();
          
          const ticketRow = rows.slice(1).find(row => {
            const existingTicket = String(row[0] || '').trim().padStart(3, '0').toLowerCase();
            return existingTicket === normalizedTicket;
          });

          if (ticketRow) {
            foundResults.push({
              ticketNumber: ticket.trim().padStart(3, '0'),
              found: true,
              details: {
                ticketNumber: String(ticketRow[0]),
                name: String(ticketRow[1]),
                phoneNumber: String(ticketRow[2]),
                paid: String(ticketRow[3]),
                checkedIn: String(ticketRow[4] || 'No')
              }
            });
          } else {
            foundResults.push({
              ticketNumber: ticket.trim().padStart(3, '0'),
              found: false
            });
          }
        }
      } else if (searchMode === 'name') {
        // Name search (case-insensitive partial match)
        const searchTerm = searchInput.trim().toLowerCase();
        
        rows.slice(1).forEach(row => {
          const name = String(row[1] || '').toLowerCase();
          if (name.includes(searchTerm)) {
            foundResults.push({
              ticketNumber: String(row[0]),
              found: true,
              details: {
                ticketNumber: String(row[0]),
                name: String(row[1]),
                phoneNumber: String(row[2]),
                paid: String(row[3]),
                checkedIn: String(row[4] || 'No')
              }
            });
          }
        });
      } else if (searchMode === 'phone') {
        // Phone number search (ignore dashes and special characters)
        const searchTerm = searchInput.trim().replace(/\D/g, ''); // Remove all non-digits
        
        rows.slice(1).forEach(row => {
          const phone = String(row[2] || '').replace(/\D/g, ''); // Remove all non-digits
          if (phone.includes(searchTerm)) {
            foundResults.push({
              ticketNumber: String(row[0]),
              found: true,
              details: {
                ticketNumber: String(row[0]),
                name: String(row[1]),
                phoneNumber: String(row[2]),
                paid: String(row[3]),
                checkedIn: String(row[4] || 'No')
              }
            });
          }
        });
      }

      setResults(foundResults);
    } catch (error) {
      console.error('Error checking tickets:', error);
      alert('Error checking tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (ticketNum: string) => {
    setUpdatingTickets(prev => new Set(prev).add(ticketNum));

    try {
      await googleSheetsService.updatePaymentStatus(ticketNum);
      
      // Update local state
      setResults(prev => prev.map(result => 
        result.ticketNumber === ticketNum && result.details
          ? { ...result, details: { ...result.details, paid: 'Yes' } }
          : result
      ));
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment status. Please try again.');
    } finally {
      setUpdatingTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticketNum);
        return newSet;
      });
    }
  };

  const handleCheckIn = async (ticketNum: string) => {
    setCheckingInTickets(prev => new Set(prev).add(ticketNum));

    try {
      await googleSheetsService.checkInTicket(ticketNum);
      
      // Update local state
      setResults(prev => prev.map(result => 
        result.ticketNumber === ticketNum && result.details
          ? { ...result, details: { ...result.details, checkedIn: 'Yes' } }
          : result
      ));
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Failed to check in ticket. Please try again.');
    } finally {
      setCheckingInTickets(prev => {
        const newSet = new Set(prev);
        newSet.delete(ticketNum);
        return newSet;
      });
    }
  };

  const handleClear = () => {
    setSearchInput('');
    setResults([]);
  };

  const getPlaceholder = () => {
    switch (searchMode) {
      case 'ticket':
        return 'e.g., 001, 003-005, 010';
      case 'name':
        return 'Enter name to search';
      case 'phone':
        return 'Enter phone number';
      default:
        return '';
    }
  };

  const getHelperText = () => {
    switch (searchMode) {
      case 'ticket':
        return 'Enter single (001), range (001-005), or comma-separated (001, 003, 005)';
      case 'name':
        return 'Search by full or partial name (case-insensitive)';
      case 'phone':
        return 'Search by full or partial phone number';
      default:
        return '';
    }
  };

  return (
    <div className="ticket-check-container">
      <h1>Check Ticket</h1>
      
      <form onSubmit={handleCheck} className="check-form">
        <div className="form-group">
          <label>Search By:</label>
          <div className="search-mode-tabs">
            <button
              type="button"
              className={`mode-tab ${searchMode === 'ticket' ? 'active' : ''}`}
              onClick={() => setSearchMode('ticket')}
            >
              Ticket #
            </button>
            <button
              type="button"
              className={`mode-tab ${searchMode === 'name' ? 'active' : ''}`}
              onClick={() => setSearchMode('name')}
            >
              Name
            </button>
            <button
              type="button"
              className={`mode-tab ${searchMode === 'phone' ? 'active' : ''}`}
              onClick={() => setSearchMode('phone')}
            >
              Phone
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="checkTicketNumber">
            {searchMode === 'ticket' ? 'Ticket Number(s)' : searchMode === 'name' ? 'Name' : 'Phone Number'}
          </label>
          <input
            type="text"
            id="checkTicketNumber"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            required
            disabled={loading}
            placeholder={getPlaceholder()}
            autoFocus
          />
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
            {getHelperText()}
          </small>
        </div>

        <div className="button-group">
          <button type="submit" disabled={loading} className="check-button">
            {loading ? 'Searching...' : 'Search'}
          </button>
          
          {results.length > 0 && (
            <button type="button" onClick={handleClear} className="clear-button">
              Clear
            </button>
          )}
        </div>
      </form>

      {results.length > 0 && (
        <div className="results-container">
          <h2 className="results-header">
            Found {results.filter(r => r.found).length} of {results.length} ticket(s)
          </h2>
          
          <div className="results-grid">
            {results.map((result) => (
              <div 
                key={result.ticketNumber} 
                className={`result-card ${result.found ? 'found' : 'not-found'}`}
              >
                <h3 className="ticket-number-header">
                  Ticket #{result.ticketNumber}
                </h3>
                
                {result.found && result.details ? (
                  <div className="ticket-details">
                    <div className="detail-row">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{result.details.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{result.details.phoneNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Paid:</span>
                      <span className={`detail-value ${result.details.paid === 'Yes' ? 'paid-yes' : 'paid-no'}`}>
                        {result.details.paid}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Checked In:</span>
                      <span className={`detail-value ${result.details.checkedIn === 'Yes' ? 'checked-in-yes' : 'checked-in-no'}`}>
                        {result.details.checkedIn}
                      </span>
                    </div>
                    
                    {result.details.paid !== 'Yes' && (
                      <>
                        <div className="detail-row amount-owed">
                          <span className="detail-label">Amount Owed:</span>
                          <span className="detail-value owed-amount">${TICKET_PRICE}</span>
                        </div>
                        
                        <button 
                          onClick={() => handleMarkAsPaid(result.ticketNumber)}
                          disabled={updatingTickets.has(result.ticketNumber)}
                          className="mark-paid-button"
                        >
                          {updatingTickets.has(result.ticketNumber) ? 'Updating...' : 'Mark as Paid'}
                        </button>
                      </>
                    )}
                    
                    {result.details.checkedIn !== 'Yes' && result.details.paid === 'Yes' && (
                      <button 
                        onClick={() => handleCheckIn(result.ticketNumber)}
                        disabled={checkingInTickets.has(result.ticketNumber)}
                        className="check-in-button"
                      >
                        {checkingInTickets.has(result.ticketNumber) ? 'Checking In...' : 'Check In'}
                      </button>
                    )}

                    {result.details.checkedIn !== 'Yes' && result.details.paid !== 'Yes' && (
                      <div style={{ 
                        textAlign: 'center', 
                        marginTop: '0.75rem', 
                        padding: '0.75rem', 
                        backgroundColor: '#fff3cd', 
                        border: '1px solid #ffc107',
                        borderRadius: '6px',
                        color: '#856404'
                      }}>
                        <small style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                          ⚠️ Payment required before check-in
                        </small>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="not-found-message">Ticket not found</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
