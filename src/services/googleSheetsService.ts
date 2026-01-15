import { GOOGLE_SHEETS_CONFIG, TicketData } from '../config/googleSheets';

export class GoogleSheetsService {
  private scriptUrl: string;

  constructor() {
    this.scriptUrl = GOOGLE_SHEETS_CONFIG.scriptUrl;
  }

  /**
   * Fetch all rows from the Google Sheet
   */
  async getRows(): Promise<string[][]> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL. Please check your .env file.');
      }

      const response = await fetch(this.scriptUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      return result.data || [];
    } catch (error) {
      console.error('Error fetching rows:', error);
      throw error;
    }
  }

  /**
   * Search for a specific ticket (realtime server-side search)
   */
  async searchTicket(ticketNumber: string): Promise<{
    found: boolean;
    data?: {
      ticketNumber: string;
      name: string;
      phoneNumber: string;
      paid: string;
      checkedIn: string;
    };
  }> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL');
      }

      const normalizedTicket = ticketNumber.trim().padStart(3, '0');
      const url = `${this.scriptUrl}?action=searchTicket&ticketNumber=${encodeURIComponent(normalizedTicket)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to search ticket: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to search ticket');
      }
      
      return {
        found: result.found,
        data: result.data
      };
    } catch (error) {
      console.error('Error searching ticket:', error);
      return { found: false };
    }
  }

  /**
   * Check if a ticket number already exists in the sheet (realtime)
   */
  async ticketExists(ticketNumber: string): Promise<boolean> {
    try {
      const result = await this.searchTicket(ticketNumber);
      return result.found;
    } catch (error) {
      console.error('Error checking ticket existence:', error);
      return false;
    }
  }

  /**
   * Check multiple ticket numbers at once (optimized batch check - server-side)
   */
  async checkMultipleTickets(ticketNumbers: string[]): Promise<string[]> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL');
      }

      const url = `${this.scriptUrl}?action=checkTickets&tickets=${encodeURIComponent(JSON.stringify(ticketNumbers))}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to check tickets: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check tickets');
      }
      
      return result.existingTickets || [];
    } catch (error) {
      console.error('Error checking multiple tickets:', error);
      return [];
    }
  }

  /**
   * Append multiple tickets at once (batch operation)
   */
  async appendMultipleTickets(tickets: TicketData[]): Promise<{ success: number; failed: string[] }> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL. Please check your .env file.');
      }

      const params = new URLSearchParams();
      params.append('batch', 'true');
      params.append('tickets', JSON.stringify(tickets));
      
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to append data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to append data');
      }

      return {
        success: result.added || 0,
        failed: result.failed || []
      };
    } catch (error) {
      console.error('Error appending multiple tickets:', error);
      throw error;
    }
  }

  /**
   * Append a new ticket entry to the sheet
   */
  async appendTicket(ticketData: TicketData): Promise<boolean> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL. Please check your .env file.');
      }
      
      // Use URLSearchParams to avoid CORS preflight
      const params = new URLSearchParams();
      params.append('ticketNumber', ticketData.ticketNumber);
      params.append('name', ticketData.name);
      params.append('phoneNumber', ticketData.phoneNumber);
      params.append('paid', ticketData.paid.toString());
      
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to append data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to append data');
      }

      return true;
    } catch (error) {
      console.error('Error appending ticket:', error);
      throw error;
    }
  }

  /**
   * Update payment status for a ticket
   */
  async updatePaymentStatus(ticketNumber: string): Promise<boolean> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL');
      }

      const params = new URLSearchParams();
      params.append('action', 'updatePayment');
      params.append('ticketNumber', ticketNumber.trim().padStart(3, '0'));
      
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to update payment: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update payment');
      }

      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  /**
   * Check in a ticket
   */
  async checkInTicket(ticketNumber: string): Promise<boolean> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL');
      }

      const params = new URLSearchParams();
      params.append('action', 'checkIn');
      params.append('ticketNumber', ticketNumber.trim().padStart(3, '0'));
      
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to check in: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to check in');
      }

      return true;
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  /**
   * Mark as paid and check in (optimized single operation)
   */
  async payAndCheckIn(ticketNumber: string): Promise<boolean> {
    try {
      if (!this.scriptUrl) {
        throw new Error('Missing Google Apps Script URL');
      }

      const params = new URLSearchParams();
      params.append('action', 'payAndCheckIn');
      params.append('ticketNumber', ticketNumber.trim().padStart(3, '0'));
      
      const response = await fetch(this.scriptUrl, {
        method: 'POST',
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Failed to pay and check in: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to pay and check in');
      }

      return true;
    } catch (error) {
      console.error('Error paying and checking in:', error);
      throw error;
    }
  }
}

export const sheetsService = new GoogleSheetsService();
