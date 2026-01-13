// Google Apps Script Backend for Stag Tracker
// Deploy this as a Web App and use the URL in your React app

// Handle CORS preflight requests
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  const output = ContentService.createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
  
  return output;
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Parse data from URL parameters (form data)
    const data = {
      ticketNumber: e.parameter.ticketNumber,
      name: e.parameter.name,
      phoneNumber: e.parameter.phoneNumber,
      paid: e.parameter.paid === 'true'
    };
    
    // Check if ticket number already exists (normalized to 3 digits)
    const allData = sheet.getDataRange().getValues();
    const normalizedTicket = String(data.ticketNumber || '').trim().padStart(3, '0').toLowerCase();
    const ticketNumbers = allData.slice(1).map(row => 
      String(row[0] || '').trim().padStart(3, '0').toLowerCase()
    );
    
    if (ticketNumbers.includes(normalizedTicket)) {
      const output = ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'Ticket number already exists' 
      })).setMimeType(ContentService.MimeType.JSON);
      
      return output;
    }
    
    // Format ticket number as 3 digits before appending
    const formattedTicketNumber = String(data.ticketNumber).trim().padStart(3, '0');
    
    // Append new row
    sheet.appendRow([
      formattedTicketNumber,
      data.name,
      data.phoneNumber,
      data.paid ? 'Yes' : 'No'
    ]);
    
    const output = ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
    
    return output;
      
  } catch (error) {
    const output = ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
    
    return output;
  }
}
