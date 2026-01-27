/**
 * Event Configuration
 * Configure your event details here for notifications and calendar links
 */

export const EVENT_CONFIG = {
  // Event name
  name: "Gentleman's Dinner in Honor of Christopher Krilis",
  
  // Event date and time (adjust to your event)
  // Use ISO format or any format that can be parsed by new Date()
  startDate: '2026-03-06T19:00:00', // 7:00 PM
  endDate: '2026-03-07T00:00:00',   // 12:00 AM next day
  
  // Human-readable date and time for SMS messages
  formattedDate: 'Friday, March 6, 2026',
  formattedTime: '7:00 PM',
  
  // Location details
  location: 'The Terrace Event Venue',
  address: '1680 Creditstone Rd, Vaughan, ON L4K 5V6',
  
  // Optional: Additional description for calendar event
  description: "Join us for Christopher's Gentleman's Dinner!",
  
  // Timezone (adjust based on your location)
  timezone: 'America/Toronto'
};
