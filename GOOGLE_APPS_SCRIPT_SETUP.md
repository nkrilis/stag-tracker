# Google Apps Script Setup Instructions

The Google Sheets API doesn't allow write operations from the browser with just an API key. Instead, we'll use Google Apps Script as a simple backend.

## Setup Steps

### 1. Open Your Google Sheet
Navigate to your spreadsheet: https://docs.google.com/spreadsheets/d/1f5bmhguWT3CMlHgrwHyH4YjNIryI4NwmEssvd-V3YZs/edit

### 2. Open Apps Script Editor
- Click **Extensions** → **Apps Script**
- This opens the Apps Script editor

### 3. Replace Default Code
- Delete any existing code in the editor
- Copy all the code from `google-apps-script.js` in this project
- Paste it into the Apps Script editor

### 4. Deploy as Web App
- Click the **Deploy** button (top right) → **New deployment**
- Click the gear icon ⚙️ next to "Select type"
- Choose **Web app**
- Configure:
  - **Description**: "Stag Tracker Backend"
  - **Execute as**: Me (your email)
  - **Who has access**: Anyone
- Click **Deploy**

### 5. Authorize the Script
- You'll be asked to authorize the script
- Click **Authorize access**
- Choose your Google account
- Click **Advanced** → **Go to [Project Name] (unsafe)**
  - (This is safe - it's your own script)
- Click **Allow**

### 6. Copy the Web App URL
- After deployment, you'll see a **Web app URL**
- It looks like: `https://script.google.com/macros/s/AKfycby.../exec`
- **Copy this URL**

### 7. Add URL to .env File
- Open `.env` in your project
- Paste the URL:
  ```env
  VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
  ```

### 8. Restart Your Dev Server
```bash
npm run dev
```

## Testing
Try adding a ticket through the web app. The Apps Script will:
1. Check if the ticket number already exists
2. Append the new ticket if it doesn't exist
3. Return success or error messages

## Updating the Script
If you need to make changes later:
1. Edit the code in the Apps Script editor
2. Click **Deploy** → **Manage deployments**
3. Click the pencil icon ✏️ next to your deployment
4. Update the version to "New version"
5. Click **Deploy**
