/**
 * Event Configuration
 * Configure your event details here for notifications and calendar links
 */

export const EVENT_CONFIG = {
  // Event name
  name: "Gentleman's Dinner in Honor of Nicholas Krilis",
  
  // Event date and time (adjust to your event)
  // Use ISO format or any format that can be parsed by new Date()
  startDate: '2026-08-14T19:00:00', // 7:00 PM
  endDate: '2026-08-14T23:00:00',   // 11:00 PM
  
  // Human-readable date and time for SMS messages
  formattedDate: 'Friday, August 14, 2026',
  formattedTime: '7:00 PM',
  
  // Location details
  location: 'La Primavera Event Space',
  address: '77 Woodstream Blvd, Woodbridge, ON L4L 7Y6',
  
  // Optional: Additional description for calendar event
  description: "Join us for Nick's Gentleman's Dinner!",
  
  // Timezone (adjust based on your location)
  timezone: 'America/Toronto'
};
