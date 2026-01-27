# SMS Notification Service Setup Guide

This guide will help you set up the SMS notification service for your Stag Tracker application using Twilio.

## Prerequisites

- A Twilio account (sign up at <https://www.twilio.com>)
- A Twilio phone number capable of sending SMS

## Step 1: Create a Twilio Account

1. Go to <https://www.twilio.com/try-twilio>
2. Sign up for a free trial account
3. Verify your email and phone number

## Step 2: Get Your Twilio Credentials

1. Log in to your Twilio Console (<https://console.twilio.com>)
2. From the Dashboard, you'll need three pieces of information:
   - **Account SID** - Found on the main dashboard
   - **Auth Token** - Click "Show" to reveal it
   - **Phone Number** - Your Twilio phone number

### To get a phone number (if you don't have one)

1. In the Twilio Console, go to "Phone Numbers" > "Buy a Number"
2. Select your country
3. Search for a number with SMS capabilities
4. Purchase the number (free trial accounts get credit)

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root of your project (if it doesn't exist)
2. Add the following variables:

```env
# Google Sheets (existing)
VITE_GOOGLE_SCRIPT_URL=your_existing_script_url

# Twilio SMS Configuration
VITE_TWILIO_ACCOUNT_SID=your_account_sid_here
VITE_TWILIO_AUTH_TOKEN=your_auth_token_here
VITE_TWILIO_PHONE_NUMBER=+1234567890
```

**Important Notes:**

- Replace `your_account_sid_here` with your actual Account SID
- Replace `your_auth_token_here` with your actual Auth Token
- Replace `+1234567890` with your Twilio phone number (include the + and country code)
- Never commit your `.env` file to version control!

## Step 4: Update Event Configuration

Edit `src/config/eventConfig.ts` to match your event details:

```typescript
export const EVENT_CONFIG = {
  name: "Your Event Name",
  startDate: '2026-02-14T19:00:00',
  endDate: '2026-02-15T02:00:00',
  formattedDate: 'Saturday, February 14, 2026',
  formattedTime: '7:00 PM',
  location: 'Your Venue Name',
  address: 'Your Full Address',
  description: 'Event description',
  timezone: 'America/New_York' // Adjust to your timezone
};
```

## Step 5: Verify Phone Numbers (Trial Accounts)

**Important for Twilio Trial Accounts:**

- Trial accounts can only send SMS to verified phone numbers
- To verify a phone number:
  1. Go to Twilio Console > Phone Numbers > Verified Caller IDs
  2. Click "+" to add a new number
  3. Enter the phone number and verify via SMS or call
  4. Only verified numbers will receive messages during trial

To send to any number, you'll need to upgrade your Twilio account.

## Step 6: Understanding Phone Number Format

The SMS service automatically formats phone numbers to E.164 format:

- US numbers: `+1234567890` (country code + 10 digits)
- International: `+[country code][number]`

Examples:

- Input: `(123) 456-7890` → Output: `+11234567890`
- Input: `123-456-7890` → Output: `+11234567890`
- Input: `1234567890` → Output: `+11234567890`

## Step 7: Test the Service

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to the Notifications page (📱 icon in navigation)

3. Click "Send Test Message" and enter your phone number

4. You should receive a test SMS with event details and calendar link

## Features

### Bulk Notifications

- Send SMS to multiple recipients at once
- Filter by check-in status and payment status
- Progress tracking during sending
- Detailed results showing success/failure for each recipient

### Calendar Integration

- Generates universal calendar links
- Works with Google Calendar, Apple Calendar, Outlook, and others
- Recipients can add the event with one click
- Automatically opens the appropriate calendar app on mobile devices

### Message Customization

- Preview messages before sending
- Personalized with recipient's name
- Includes event date, time, location
- Includes clickable calendar link

## Pricing (as of 2026)

**Twilio Trial Account:**

- Free trial credit (typically $15-$20)
- Can send SMS to verified numbers only
- Great for testing

**Twilio Pay-As-You-Go:**

- SMS in USA: ~$0.0079 per message
- SMS International: varies by country
- No monthly fees
- Only pay for what you use

**Example Cost:**

- Sending to 100 guests in USA: ~$0.79
- Sending to 200 guests in USA: ~$1.58

## Troubleshooting

### Error: "Twilio credentials not configured"

- Check that your `.env` file exists and has the correct variables
- Ensure variable names start with `VITE_`
- Restart your development server after adding environment variables

### Error: "Failed to send SMS"

- Verify your Account SID and Auth Token are correct
- Check that your Twilio phone number is correct (with + and country code)
- For trial accounts, ensure recipient number is verified
- Check your Twilio account balance

### Messages not received

- Check if the phone number is verified (trial accounts)
- Verify the phone number format is correct
- Check Twilio Console > Monitor > Logs for delivery status
- Some carriers may block short codes or certain content

### Rate Limiting

- The service includes a 1-second delay between messages
- Twilio's default rate limit is 1 message/second
- Contact Twilio support to increase limits if needed

## Security Best Practices

1. **Never commit `.env` file to git**
   - Add `.env` to your `.gitignore`
   - Use `.env.example` for documentation

2. **Rotate credentials regularly**
   - Change Auth Token periodically
   - Generate new tokens if compromised

3. **Monitor usage**
   - Check Twilio Console regularly
   - Set up usage alerts

4. **Verify user authentication**
   - Only authenticated users can send notifications
   - Implement additional authorization if needed

## Alternative SMS Services

While this implementation uses Twilio, you can adapt it to work with:

- **Amazon SNS** - AWS's SMS service
- **MessageBird** - International SMS
- **Vonage (Nexmo)** - SMS API
- **Plivo** - SMS platform

To switch services, modify `src/services/smsService.ts` with the new API.

## Support

- Twilio Documentation: <https://www.twilio.com/docs>
- Twilio Support: <https://support.twilio.com>
- Project Issues: [Your GitHub repository]

## Next Steps

1. ✅ Set up Twilio account
2. ✅ Configure environment variables
3. ✅ Update event configuration
4. ✅ Send test message
5. ✅ Send bulk notifications to your guests!

Happy notifying! 🎉📱
