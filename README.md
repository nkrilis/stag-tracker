# Stag Tracker - Ticket Management System

A React web application for managing ticket entries with Google Sheets integration.

## Features

- ✅ Enter ticket information (ticket number, name, phone number, payment status)
- ✅ Automatically checks if ticket number already exists
- ✅ Appends new tickets to Google Sheets
- ✅ Clean, responsive UI
- ✅ Real-time validation and error handling

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Sheets API

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

#### Step 2: Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key (you'll need this later)
4. **Important**: Restrict the API key:
   - Click on the API key to edit it
   - Under "API restrictions", select "Restrict key"
   - Select only "Google Sheets API"
   - Under "Application restrictions", you can add your website domain for production

#### Step 3: Prepare Your Google Sheet

1. Create a new Google Sheet or use an existing one
2. Make sure the first row contains headers:

   ```env
   Ticket Number | Name | Phone Number | Paid
   ```

3. Share the sheet:
   - Click "Share" button
   - Change access to "Anyone with the link can view"
   - Copy the Spreadsheet ID from the URL:

     ```env
     https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
     ```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_SPREADSHEET_ID=your_spreadsheet_id_here
```

**Important**: Never commit the `.env` file to version control!

### 4. Run the Application

Development mode:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Project Structure

```env
stag-tracker/
├── src/
│   ├── components/
│   │   ├── TicketForm.tsx       # Main form component
│   │   └── TicketForm.css       # Form styling
│   ├── config/
│   │   └── googleSheets.ts      # Google Sheets configuration
│   ├── services/
│   │   └── googleSheetsService.ts  # API service layer
│   ├── App.tsx                  # Main app component
│   ├── App.css                  # App styling
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── .env                         # Environment variables (create this)
├── .gitignore                   # Git ignore file
├── index.html                   # HTML template
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── vite.config.ts               # Vite config
```

## How It Works

1. **User Input**: User enters ticket information in the form
2. **Validation**: Form validates required fields before submission
3. **Duplicate Check**: The app checks if the ticket number already exists in the sheet
4. **Append**: If ticket doesn't exist, it's added as a new row in the Google Sheet
5. **Feedback**: User receives success or error message

## Google Sheets Format

Your Google Sheet should have the following columns:

| Ticket Number | Name | Phone Number | Paid |
| ---------- | ---------- | ---------- | ---------- |
| 001 | John Doe | 555-1234 | Yes |
| 002 | Jane Smith | 555-5678 | No |

## Troubleshooting

### API Key Issues

- Make sure your API key is correctly set in the `.env` file
- Verify the Google Sheets API is enabled in your Google Cloud project
- Check that API key restrictions aren't blocking requests

### Sheet Access Issues

- Ensure the Google Sheet is shared with "Anyone with the link can view"
- Verify the Spreadsheet ID is correct in the `.env` file
- Check that the sheet name matches the range in `src/config/googleSheets.ts` (default is "Sheet1")

### CORS Issues

- The app uses the Google Sheets API v4 which supports browser requests
- If you encounter CORS issues in development, you may need to configure Vite's proxy

## Security Notes

- **Never expose your API key in client-side code in production**
- For production apps, consider using a backend server to handle API requests
- Use API key restrictions to limit usage to your domain
- Consider implementing authentication for sensitive data

## License

MIT
