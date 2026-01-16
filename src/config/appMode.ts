// ========== APP MODE CONFIGURATION ==========
// Toggle this single constant to switch between modes
// =============================================

/**
 * EVENT_DAY = true:
 *   - Navigation: Dashboard, Add Tickets, Express Check-in, Guest Search
 *   - Add Tickets: "Paid & Checked In" toggle (marks both at once)
 *   - Use on event day for walk-ins and door sales
 * 
 * EVENT_DAY = false (PRE-SALE):
 *   - Navigation: Dashboard, Add Tickets, Payment Management
 *   - Add Tickets: "Paid" toggle only (checked in = false)
 *   - Use during pre-sale period before event day
 */
export const EVENT_DAY = false; // ⚠️ CHANGE THIS TO SWITCH MODES
