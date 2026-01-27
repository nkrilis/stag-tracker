import { useState, useEffect } from 'react';
import { sheetsService } from '../services/googleSheetsService';
import { smsService, SMSRecipient, EventDetails } from '../services/smsService';
import { CalendarLinkGenerator } from '../utils/calendarLinkGenerator';
import { EVENT_CONFIG } from '../config/eventConfig';
import './BulkNotification.css';

interface Recipient extends SMSRecipient {
  ticketNumber: string;
  paid: boolean;
  checkedIn: boolean;
  expected: boolean;
}

interface SendResult {
  name: string;
  phoneNumber: string;
  success: boolean;
  error?: string;
}

export function BulkNotification() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [uniqueRecipients, setUniqueRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  
  // Progress tracking
  const [progress, setProgress] = useState({ sent: 0, total: 0, currentRecipient: '' });
  const [results, setResults] = useState<SendResult[]>([]);
  
  // Calendar link
  const [calendarLink, setCalendarLink] = useState('');
  
  // Error handling
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecipients();
    generateCalendarLink();
  }, []);

  useEffect(() => {
    // Deduplicate recipients by phone number
    // Keep the first occurrence of each unique phone number
    const phoneMap = new Map<string, Recipient>();
    
    recipients.forEach(recipient => {
      const normalizedPhone = recipient.phoneNumber.replace(/\D/g, '');
      if (!phoneMap.has(normalizedPhone)) {
        phoneMap.set(normalizedPhone, recipient);
      }
    });
    
    setUniqueRecipients(Array.from(phoneMap.values()));
  }, [recipients]);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const rows = await sheetsService.getRows();
      
      // Skip header row and map to recipients
      // Only include people who are expected to attend
      const recipientList: Recipient[] = rows.slice(1).map(row => ({
        ticketNumber: row[0] || '',
        name: row[1] || '',
        phoneNumber: row[2] || '',
        paid: row[3]?.toLowerCase() === 'yes',
        checkedIn: row[4]?.toLowerCase() === 'yes',
        expected: row[5]?.toLowerCase() === 'yes',
      })).filter(r => r.phoneNumber && r.name && r.expected); // Only those expected to attend

      setRecipients(recipientList);
    } catch (err) {
      console.error('Error loading recipients:', err);
      setError('Failed to load recipient list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarLink = () => {
    const event = CalendarLinkGenerator.createEvent(
      EVENT_CONFIG.name,
      EVENT_CONFIG.location,
      EVENT_CONFIG.address,
      new Date(EVENT_CONFIG.startDate),
      new Date(EVENT_CONFIG.endDate),
      EVENT_CONFIG.description
    );
    
    // Use web-based calendar link that works universally on all devices
    // This link auto-opens the native calendar app on mobile (iOS, Android)
    const link = CalendarLinkGenerator.generateWebCalendarLink(event);
    setCalendarLink(link);
  };

  const getPreviewMessage = (): string => {
    if (uniqueRecipients.length === 0) return '';
    
    const sampleRecipient = uniqueRecipients[0];
    const eventDetails: EventDetails = {
      name: EVENT_CONFIG.name,
      date: EVENT_CONFIG.formattedDate,
      time: EVENT_CONFIG.formattedTime,
      location: EVENT_CONFIG.location,
      address: EVENT_CONFIG.address
    };
    
    return `Thank you ${sampleRecipient.name},

Your ticket number is ${sampleRecipient.ticketNumber}

${eventDetails.name}
${eventDetails.date} at ${eventDetails.time}

${eventDetails.location}
${eventDetails.address}

Calendar: ${calendarLink}`;
  };

  const handleSendNotifications = async () => {
    if (!smsService.isConfigured()) {
      setError('SMS service is not configured. Please add Twilio credentials to your environment variables.');
      return;
    }

    if (uniqueRecipients.length === 0) {
      setError('No recipients to send to. Please check that guests are marked as expected to attend.');
      return;
    }

    // Confirm before sending
    const confirmed = window.confirm(
      `You are about to send ${uniqueRecipients.length} text message(s) to unique phone numbers. This action cannot be undone. Continue?`
    );
    
    if (!confirmed) return;

    setSending(true);
    setSendComplete(false);
    setResults([]);
    setError(null);
    
    const eventDetails: EventDetails = {
      name: EVENT_CONFIG.name,
      date: EVENT_CONFIG.formattedDate,
      time: EVENT_CONFIG.formattedTime,
      location: EVENT_CONFIG.location,
      address: EVENT_CONFIG.address
    };

    try {
      const result = await smsService.sendBulkSMS(
        uniqueRecipients,
        eventDetails,
        calendarLink,
        (sent, total, recipientName) => {
          setProgress({ sent, total, currentRecipient: recipientName });
        }
      );
      
      setResults(result.results);
      setSendComplete(true);
      
      if (result.totalFailed > 0) {
        setError(`${result.totalFailed} message(s) failed to send. See details below.`);
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
      setError('An error occurred while sending notifications. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTestMessage = async () => {
    if (!smsService.isConfigured()) {
      setError('SMS service is not configured. Please add Twilio credentials to your environment variables.');
      return;
    }

    const testPhone = window.prompt('Enter your phone number to receive a test message (e.g., +1234567890):');
    if (!testPhone) return;

    setSending(true);
    setError(null);

    const eventDetails: EventDetails = {
      name: EVENT_CONFIG.name,
      date: EVENT_CONFIG.formattedDate,
      time: EVENT_CONFIG.formattedTime,
      location: EVENT_CONFIG.location,
      address: EVENT_CONFIG.address
    };

    try {
      const result = await smsService.sendSMS(
        { name: 'Test User', phoneNumber: testPhone },
        '001',
        eventDetails,
        calendarLink
      );

      if (result.success) {
        alert('Test message sent successfully! Check your phone.');
      } else {
        setError(`Failed to send test message: ${result.error}`);
      }
    } catch (err) {
      console.error('Error sending test message:', err);
      setError('Failed to send test message. Please check your phone number and try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="bulk-notification-container">
        <h2>📱 Bulk Notifications</h2>
        <p>Loading recipient list...</p>
      </div>
    );
  }

  return (
    <div className="bulk-notification-container">
      <h2>📱 Bulk Notifications</h2>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {!smsService.isConfigured() && (
        <div className="warning-message">
          ⚠️ SMS service not configured. Please add your Twilio credentials to the .env file to enable notifications.
        </div>
      )}

      {/* Event Details */}
      <div className="event-details-card">
        <h3>📅 Event Details</h3>
        <div className="event-info-grid">
          <div className="event-info-item">
            <strong>Event:</strong>
            <span>{EVENT_CONFIG.name}</span>
          </div>
          <div className="event-info-item">
            <strong>Date:</strong>
            <span>{EVENT_CONFIG.formattedDate}</span>
          </div>
          <div className="event-info-item">
            <strong>Time:</strong>
            <span>{EVENT_CONFIG.formattedTime}</span>
          </div>
          <div className="event-info-item">
            <strong>Location:</strong>
            <span>{EVENT_CONFIG.location}</span>
          </div>
          <div className="event-info-item">
            <strong>Address:</strong>
            <span>{EVENT_CONFIG.address}</span>
          </div>
        </div>
        <div className="calendar-link-preview">
          <strong>Calendar Link:</strong> {calendarLink}
        </div>
      </div>

      {/* Recipient Selection */}
      <div className="recipient-selection-card">
        <h3>👥 Recipients</h3>
        
        <div className="recipient-stats">
          <div className="stat-item">
            <span className="stat-label">Total Expected to Attend</span>
            <span className="stat-value">{recipients.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unique Phone Numbers</span>
            <span className="stat-value">{uniqueRecipients.length}</span>
          </div>
          {recipients.length > uniqueRecipients.length && (
            <div className="stat-item">
              <span className="stat-label">Duplicate Numbers Removed</span>
              <span className="stat-value">{recipients.length - uniqueRecipients.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!sending && !sendComplete && (
        <div className="action-buttons">
          <button
            className="btn btn-secondary"
            onClick={() => setShowPreview(!showPreview)}
            disabled={uniqueRecipients.length === 0}
          >
            {showPreview ? '🙈 Hide Preview' : '👁️ Preview Message'}
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={handleTestMessage}
            disabled={!smsService.isConfigured()}
          >
            📤 Send Test Message
          </button>
          
          <button
            className="btn btn-primary"
            onClick={handleSendNotifications}
            disabled={uniqueRecipients.length === 0 || !smsService.isConfigured()}
          >
            🚀 Send to {uniqueRecipients.length} Recipients
          </button>
        </div>
      )}

      {/* Message Preview */}
      {showPreview && !sending && !sendComplete && (
        <div className="preview-message-card">
          <h3>💬 Message Preview</h3>
          <div className="message-preview">
            {getPreviewMessage()}
          </div>
        </div>
      )}

      {/* Sending Progress */}
      {sending && (
        <div className="sending-progress-card">
          <h3>📨 Sending Notifications...</h3>
          
          <div className="progress-bar-container">
            <div 
              className="progress-bar"
              style={{ width: `${(progress.sent / progress.total) * 100}%` }}
            >
              {progress.sent} / {progress.total}
            </div>
          </div>
          
          <div className="progress-text">
            {Math.round((progress.sent / progress.total) * 100)}% Complete
          </div>
          
          {progress.currentRecipient && (
            <div className="current-recipient">
              Currently sending to: {progress.currentRecipient}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {sendComplete && results.length > 0 && (
        <div className="sending-progress-card">
          <h3>✅ Sending Complete</h3>
          
          <div className="results-summary">
            <div className="result-stat success">
              <div className="result-stat-value">
                {results.filter(r => r.success).length}
              </div>
              <div className="result-stat-label">Sent Successfully</div>
            </div>
            
            <div className="result-stat failed">
              <div className="result-stat-value">
                {results.filter(r => !r.success).length}
              </div>
              <div className="result-stat-label">Failed</div>
            </div>
          </div>

          <div className="results-details">
            {results.map((result, index) => (
              <div key={index} className="result-item">
                <div className="result-info">
                  <div className="result-name">{result.name}</div>
                  <div className="result-phone">{result.phoneNumber}</div>
                  {result.error && (
                    <div className="result-phone" style={{ color: '#dc2626' }}>
                      Error: {result.error}
                    </div>
                  )}
                </div>
                <div className={`result-status ${result.success ? 'success' : 'error'}`}>
                  {result.success ? '✓ Sent' : '✗ Failed'}
                </div>
              </div>
            ))}
          </div>

          <div className="action-buttons">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSendComplete(false);
                setResults([]);
                loadRecipients();
              }}
            >
              ← Back to Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
