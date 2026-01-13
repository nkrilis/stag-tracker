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

  // Check if ticket exists when ticket number changes (with debounce)
  useEffect(() => {
    const checkTicketNumber = async () => {
      const ticketNumber = formData.ticketNumber.trim();
      
      if (!ticketNumber) {
        setTicketExists(false);
        return;
      }

      setChecking(true);
      try {
        const exists = await sheetsService.ticketExists(ticketNumber);
        setTicketExists(exists);
      } catch (error) {
        console.error('Error checking ticket:', error);
        setTicketExists(false);
      } finally {
        setChecking(false);
      }
    };

    const timer = setTimeout(checkTicketNumber, 500);
    return () => clearTimeout(timer);
  }, [formData.ticketNumber]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (ticketExists) {
      setMessage({ type: 'error', text: 'Ticket number already exists!' });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      await sheetsService.appendTicket(formData);
      setMessage({ type: 'success', text: 'Ticket added successfully!' });
      
      // Reset form
      setFormData({
        ticketNumber: '',
        name: '',
        phoneNumber: '',
        paid: false,
      });
      setTicketExists(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add ticket';
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
            Ticket Number <span className="required">*</span>
          </label>
          <input
            type="text"
            id="ticketNumber"
            value={formData.ticketNumber}
            onChange={(e) => handleInputChange('ticketNumber', e.target.value)}
            required
            disabled={loading}
            placeholder="Enter ticket number"
            className={ticketExists ? 'error' : ''}
          />
          {checking && <span className="checking-text">Checking...</span>}
          {ticketExists && <span className="error-text">⚠️ This ticket number already exists</span>}
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
          {loading ? 'Adding...' : 'Add Ticket'}
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
