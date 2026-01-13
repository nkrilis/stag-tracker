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
   * Check if a ticket number already exists in the sheet
   */
  async ticketExists(ticketNumber: string): Promise<boolean> {
    try {
      const rows = await this.getRows();
      
      // Normalize ticket number to 3 digits (001, 002, etc.)
      const normalizedTicket = ticketNumber.trim().padStart(3, '0').toLowerCase();
      
      const exists = rows.slice(1).some(row => {
        const existingTicket = String(row[0] || '').trim().padStart(3, '0').toLowerCase();
        return existingTicket === normalizedTicket;
      });
      
      return exists;
    } catch (error) {
      console.error('Error checking ticket existence:', error);
      return false;
    }
  }

  /**
   * Check multiple ticket numbers at once (optimized batch check)
   */
  async checkMultipleTickets(ticketNumbers: string[]): Promise<string[]> {
    try {
      const rows = await this.getRows();
      const existingTickets: string[] = [];
      
      // Normalize all ticket numbers
      const normalizedTickets = ticketNumbers.map(t => t.trim().padStart(3, '0').toLowerCase());
      
      // Get all existing ticket numbers from sheet
      const existingSet = new Set(
        rows.slice(1).map(row => String(row[0] || '').trim().padStart(3, '0').toLowerCase())
      );
      
      // Check which tickets exist
      for (let i = 0; i < ticketNumbers.length; i++) {
        if (existingSet.has(normalizedTickets[i])) {
          existingTickets.push(ticketNumbers[i].padStart(3, '0'));
        }
      }
      
      return existingTickets;
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
}

export const sheetsService = new GoogleSheetsService();
