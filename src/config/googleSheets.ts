// Google Sheets API configuration
export const GOOGLE_SHEETS_CONFIG = {
  // Google Apps Script Web App URL
  scriptUrl: import.meta.env.VITE_GOOGLE_SCRIPT_URL || '',
};

export interface TicketData {
  ticketNumber: string;
  name: string;
  phoneNumber: string;
  paid: boolean;
  checkedIn: boolean; // EVENT DAY: Mark as checked in when adding
}
