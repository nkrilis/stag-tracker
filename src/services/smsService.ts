/**
 * SMS Service for sending text message notifications
 * Uses Twilio API for SMS delivery
 */

export interface EventDetails {
  name: string;
  date: string; // ISO format or human readable
  time: string;
  location: string;
  address: string;
}

export interface SMSRecipient {
  name: string;
  phoneNumber: string;
}

export class SMSService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private twilioApiUrl: string;

  constructor() {
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID || '';
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || '';
    this.fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER || '';
    this.twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
  }

  /**
   * Generate a message with event details and calendar link
   */
  private generateMessage(
    recipientName: string,
    ticketNumber: string,
    eventDetails: EventDetails,
    calendarLink: string
  ): string {
    return `Thank you ${recipientName},

Your ticket number is ${ticketNumber}

${eventDetails.name}
${eventDetails.date} at ${eventDetails.time}

${eventDetails.location}
${eventDetails.address}

Calendar: ${calendarLink}`;
  }

  /**
   * Send a single SMS message
   */
  async sendSMS(
    recipient: SMSRecipient,
    ticketNumber: string,
    eventDetails: EventDetails,
    calendarLink: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!this.accountSid || !this.authToken || !this.fromNumber) {
        throw new Error('Twilio credentials not configured. Please check your environment variables.');
      }

      // Format phone number to E.164 format (assuming US numbers)
      const formattedPhone = this.formatPhoneNumber(recipient.phoneNumber);
      const message = this.generateMessage(recipient.name, ticketNumber, eventDetails, calendarLink);

      const response = await fetch(this.twilioApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${this.accountSid}:${this.authToken}`)
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: this.fromNumber,
          Body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Twilio API Error:', errorData);
        throw new Error(errorData.message || `Failed to send SMS: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Twilio Response:', result);
      console.log('Message Status:', result.status);
      console.log('Message SID:', result.sid);
      console.log('Error Code:', result.error_code);
      
      // Log important info for debugging
      if (result.status === 'queued' || result.status === 'accepted') {
        console.log('✓ Message queued successfully. Check Twilio Console for delivery status.');
      }
      
      return {
        success: true,
        messageId: result.sid
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send bulk SMS notifications to multiple recipients
   */
  async sendBulkSMS(
    recipients: Array<SMSRecipient & { ticketNumber: string }>,
    eventDetails: EventDetails,
    calendarLink: string,
    onProgress?: (sent: number, total: number, recipientName: string) => void
  ): Promise<{
    totalSent: number;
    totalFailed: number;
    results: Array<{
      name: string;
      phoneNumber: string;
      success: boolean;
      error?: string;
      messageId?: string;
    }>;
  }> {
    const results: Array<{
      name: string;
      phoneNumber: string;
      success: boolean;
      error?: string;
      messageId?: string;
    }> = [];

    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      const result = await this.sendSMS(
        { name: recipient.name, phoneNumber: recipient.phoneNumber },
        recipient.ticketNumber,
        eventDetails,
        calendarLink
      );
      
      results.push({
        name: recipient.name,
        phoneNumber: recipient.phoneNumber,
        success: result.success,
        error: result.error,
        messageId: result.messageId
      });

      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }

      // Call progress callback if provided
      if (onProgress) {
        onProgress(i + 1, recipients.length, recipient.name);
      }

      // Add a small delay between messages to avoid rate limiting
      if (i < recipients.length - 1) {
        await this.delay(1000); // 1 second delay
      }
    }

    return {
      totalSent,
      totalFailed,
      results
    };
  }

  /**
   * Format phone number to E.164 format
   * Handles formats like: 647-330-8919, (647) 330-8919, 6473308919, etc.
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming US/Canada)
    if (cleaned.length === 10) {
      // 10 digits: add +1 for North America
      const formatted = `+1${cleaned}`;
      console.log(`Formatted phone: ${phoneNumber} → ${formatted}`);
      return formatted;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // 11 digits starting with 1: just add +
      const formatted = `+${cleaned}`;
      console.log(`Formatted phone: ${phoneNumber} → ${formatted}`);
      return formatted;
    } else if (cleaned.startsWith('+')) {
      // Already has +
      console.log(`Phone already formatted: ${phoneNumber}`);
      return phoneNumber;
    }
    
    // For other cases, add + if not present
    const formatted = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    console.log(`Formatted phone: ${phoneNumber} → ${formatted}`);
    return formatted;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate Twilio configuration
   */
  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }
}

// Export a singleton instance
export const smsService = new SMSService();
