/**
 * Calendar Link Generator
 * Creates universal calendar links that work across different calendar apps
 * and generate .ics files for native calendar integration
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

export class CalendarLinkGenerator {
  /**
   * Generate a Google Calendar link
   */
  static generateGoogleCalendarLink(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDate(event.startDate)}/${formatDate(event.endDate)}`,
      details: event.description || '',
      location: event.location,
      ctz: event.timezone || 'America/New_York'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate an Outlook calendar link
   */
  static generateOutlookLink(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString();
    };

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      body: event.description || '',
      location: event.location,
      startdt: formatDate(event.startDate),
      enddt: formatDate(event.endDate)
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Generate an ICS file content (iCalendar format)
   * This is the universal format supported by all calendar apps
   * Optimized for shorter length to reduce SMS size
   */
  static generateICSContent(event: CalendarEvent): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const escapeText = (text: string): string => {
      return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    };

    // Simplified .ics format to reduce length
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(event.startDate)}`,
      `DTEND:${formatDate(event.endDate)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description || '')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  }

  /**
   * Generate a data URL for ICS file that can be downloaded directly
   */
  static generateICSDataURL(event: CalendarEvent): string {
    const icsContent = this.generateICSContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  /**
   * Generate a universal calendar link that works on all devices
   * Creates a data URI with .ics file that any calendar app can import
   */
  static generateUniversalLink(event: CalendarEvent): string {
    const icsContent = this.generateICSContent(event);
    // Encode the ICS content as a data URL
    const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    return dataUrl;
  }

  /**
   * Generate a web-based universal calendar link
   * For SMS, we create a short data URI that iOS will treat as a single event
   * This works perfectly with iOS Calendar app
   */
  static generateWebCalendarLink(_event: CalendarEvent): string {
    // For iOS to treat this as a single event (not a subscription),
    // we need to use a data URI with the .ics content
    const icsContent = this.generateICSContent(_event);
    const encoded = encodeURIComponent(icsContent);
    return `data:text/calendar;charset=utf-8,${encoded}`;
  }

  /**
   * Generate a shortened calendar link (you can integrate with a URL shortener service)
   */
  static async generateShortLink(event: CalendarEvent): Promise<string> {
    const longUrl = this.generateUniversalLink(event);
    
    // Option 1: Use a URL shortener service (e.g., bit.ly, TinyURL)
    // For now, return the Google Calendar link
    // You can integrate with services like:
    // - bit.ly API
    // - TinyURL API
    // - Your own URL shortener
    
    return longUrl;
  }

  /**
   * Trigger download of ICS file
   */
  static downloadICSFile(event: CalendarEvent, filename?: string): void {
    const icsContent = this.generateICSContent(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Create calendar event from simple parameters
   */
  static createEvent(
    title: string,
    location: string,
    address: string,
    startDate: Date,
    endDate: Date,
    description?: string
  ): CalendarEvent {
    return {
      title,
      location: `${location}, ${address}`,
      startDate,
      endDate,
      description: description || `${title}\n\nLocation: ${location}\n${address}`,
      timezone: 'America/New_York' // Adjust based on your needs
    };
  }
}

// Export convenience function
export const generateCalendarLink = (
  title: string,
  location: string,
  address: string,
  startDate: Date,
  endDate: Date
): string => {
  const event = CalendarLinkGenerator.createEvent(
    title,
    location,
    address,
    startDate,
    endDate
  );
  // Use web-based link for SMS - works on all devices and auto-opens native calendar
  return CalendarLinkGenerator.generateWebCalendarLink(event);
};
