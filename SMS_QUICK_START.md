# 📱 SMS Notification Feature - Quick Start

## Overview

The SMS notification feature allows you to send bulk text messages to all your event guests with:

- Event date, time, and location details
- A universal calendar link that works on any device (iPhone, Android, desktop)
- Personalized messages with guest names
- Progress tracking and detailed delivery reports

## Quick Setup (5 minutes)

### 1. Sign up for Twilio (Free Trial)

1. Go to <https://www.twilio.com/try-twilio>
2. Sign up for a free account ($15-20 free credit)
3. Get your free phone number

### 2. Copy Credentials

From your Twilio Dashboard (<https://console.twilio.com>):

- Account SID
- Auth Token (click "Show")
- Your Twilio Phone Number

### 3. Configure Environment

Create a `.env` file in the project root:

```env
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_TWILIO_PHONE_NUMBER=+15551234567
```

### 4. Update Event Details

Edit `src/config/eventConfig.ts`:

```typescript
export const EVENT_CONFIG = {
  name: "Christopher's Stag Party",
  startDate: '2026-02-14T19:00:00',
  endDate: '2026-02-15T02:00:00',
  formattedDate: 'Saturday, February 14, 2026',
  formattedTime: '7:00 PM',
  location: 'The Grand Ballroom',
  address: '123 Main Street, New York, NY 10001',
  description: 'Join us for an unforgettable night!',
  timezone: 'America/New_York'
};
```

### 5. Test It

```bash
npm run dev
```

Navigate to the 📱 Notifications page and click "Send Test Message"

## Features

### Smart Filtering

- Filter by check-in status (checked in / not checked in)
- Filter by payment status (paid / unpaid)
- See recipient count in real-time

### Message Preview

- Preview exactly what guests will receive
- Test messages before sending to everyone

### Calendar Links

- Universal links work on iPhone, Android, and desktop
- Automatically opens the right calendar app
- One-click to add event to calendar

### Bulk Sending

- Send to dozens or hundreds at once
- Progress bar shows real-time status
- 1-second delay between messages to avoid rate limits

### Delivery Reports

- See exactly which messages were delivered
- Failed messages show error details
- Export results if needed

## Cost

**Twilio Pricing (Pay-As-You-Go):**

- ~$0.0079 per SMS in USA
- 100 guests = ~$0.79
- 200 guests = ~$1.58
- Free trial includes $15-20 credit

## Trial Account Limits

**Important:** Twilio trial accounts can only send to verified numbers.

To verify a number:

1. Twilio Console → Phone Numbers → Verified Caller IDs
2. Click "+" and add the number
3. Verify via SMS code

**Solution:** Upgrade to paid account (no monthly fee, just pay per SMS) to send to any number.

## Message Example

```text
Hi John! 🎉

Event: Christopher's Stag Party
📅 Saturday, February 14, 2026 at 7:00 PM
📍 The Grand Ballroom
123 Main Street, New York, NY 10001

Add to your calendar: https://calendar.google.com/calendar/...

See you there!
```

## Troubleshooting

### "Twilio credentials not configured"

- Check your `.env` file exists
- Restart dev server after adding credentials

### Messages not sending

- Trial account? Verify recipient numbers first
- Check Twilio Console → Monitor → Logs for details
- Verify phone number format: +1234567890

### Calendar link not working

- Link opens Google Calendar which redirects to device's native app
- Works on all platforms (iPhone, Android, Outlook, etc.)

## Security

- ✅ `.env` is in `.gitignore` (credentials never committed)
- ✅ Login required to access notification page
- ✅ Confirmation prompt before sending bulk messages

## Full Documentation

See [SMS_SETUP_GUIDE.md](./SMS_SETUP_GUIDE.md) for complete setup instructions and advanced features.

## Support

- Twilio Docs: <https://www.twilio.com/docs>
- Calendar Link Format: iCalendar (.ics) standard
- Issues: [Your GitHub Issues Page]

---

**That's it!** You're ready to send professional event notifications with calendar links. 🎉
