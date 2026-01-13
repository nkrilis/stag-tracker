import { useState, FormEvent, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import { TicketData } from '../config/googleSheets';
import './TicketForm.css';

export function TicketForm() {
  const [formData, setFormData] = useState<TicketData>({
    ticketNumber: '',
    name: '',
    phoneNumber: '',
    paid: false,
  });

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [ticketExists, setTicketExists] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);

  // Parse ticket numbers from input (supports ranges and comma-separated)
  const parseTicketNumbers = (input: string): string[] => {
    const tickets: string[] = [];
    const parts = input.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        // Handle range like "001-005"
        const [start, end] = part.split('-').map(s => s.trim());
        const startNum = parseInt(start, 10);
        const endNum = parseInt(end, 10);
        
        if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
          for (let i = startNum; i <= endNum; i++) {
            tickets.push(i.toString().padStart(3, '0'));
          }
        }
      } else if (part) {
        // Single ticket number
        tickets.push(part.padStart(3, '0'));
      }
    }
    
    return [...new Set(tickets)]; // Remove duplicates
  };

  // Check if ticket exists when ticket number changes (with debounce)
  useEffect(() => {
    const checkTicketNumbers = async () => {
      const input = formData.ticketNumber.trim();
      
      if (!input) {
        setTicketExists(false);
        setDuplicates([]);
        return;
      }

      setChecking(true);
      try {
        const tickets = parseTicketNumbers(input);
        
        // Use batch checking for better performance
        const existingTickets = await sheetsService.checkMultipleTickets(tickets);
        
        setDuplicates(existingTickets);
        setTicketExists(existingTickets.length > 0);
      } catch (error) {
        console.error('Error checking ticket:', error);
        setTicketExists(false);
        setDuplicates([]);
      } finally {
        setChecking(false);
      }
    };

    const timer = setTimeout(checkTicketNumbers, 500);
    return () => clearTimeout(timer);
  }, [formData.ticketNumber]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (ticketExists) {
      setMessage({ type: 'error', text: `Ticket(s) already exist: ${duplicates.join(', ')}` });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      const tickets = parseTicketNumbers(formData.ticketNumber);
      
      if (tickets.length === 0) {
        throw new Error('Please enter at least one ticket number');
      }

      // Create batch of tickets with same info
      const ticketBatch = tickets.map(ticket => ({
        ...formData,
        ticketNumber: ticket,
      }));

      // Submit all tickets in one batch request
      const result = await sheetsService.appendMultipleTickets(ticketBatch);

      if (result.failed.length === 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully added ${result.success} ticket${result.success > 1 ? 's' : ''}!` 
        });
        
        // Reset form
        setFormData({
          ticketNumber: '',
          name: '',
          phoneNumber: '',
          paid: false,
        });
        setTicketExists(false);
        setDuplicates([]);
      } else {
        setMessage({ 
          type: 'error', 
          text: `Added ${result.success} ticket(s), but failed for: ${result.failed.join(', ')}` 
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add tickets';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof TicketData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="ticket-form-container">
      <h1>Ticket Entry Form</h1>
      
      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-group">
          <label htmlFor="ticketNumber">
            Ticket Number(s) <span className="required">*</span>
          </label>
          <input
            type="text"
            id="ticketNumber"
            value={formData.ticketNumber}
            onChange={(e) => handleInputChange('ticketNumber', e.target.value)}
            required
            disabled={loading}
            placeholder="e.g., 001, 003-005, 010"
            className={ticketExists ? 'error' : ''}
          />
          <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
            Enter single (001), range (001-005), or comma-separated (001, 003, 005)
          </small>
          {checking && <span className="checking-text">Checking...</span>}
          {ticketExists && (
            <span className="error-text">
              ⚠️ Already exist: {duplicates.join(', ')}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="name">
            Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            disabled={loading}
            placeholder="Enter full name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phoneNumber">
            Phone Number <span className="required">*</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            required
            disabled={loading}
            placeholder="Enter phone number"
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.paid}
              onChange={(e) => handleInputChange('paid', e.target.checked)}
              disabled={loading}
            />
            <span>Paid</span>
          </label>
        </div>

        <button type="submit" disabled={loading || checking || ticketExists} className="submit-button">
          {loading ? 'Adding Tickets...' : 'Add Ticket(s)'}
        </button>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

