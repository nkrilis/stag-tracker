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
    
    // Check if this is an update payment operation
    if (e.parameter.action === 'updatePayment') {
      const ticketNumber = e.parameter.ticketNumber;
      const allData = sheet.getDataRange().getValues();
      const normalizedTicket = String(ticketNumber || '').trim().padStart(3, '0').toLowerCase();
      
      // Find the row index (add 1 because arrays are 0-indexed but sheets are 1-indexed)
      let rowIndex = -1;
      for (let i = 1; i < allData.length; i++) {
        const existingTicket = String(allData[i][0] || '').trim().padStart(3, '0').toLowerCase();
        if (existingTicket === normalizedTicket) {
          rowIndex = i + 1; // Sheet row index
          break;
        }
      }
      
      if (rowIndex === -1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'Ticket not found' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Update the paid status (column D, index 4)
      sheet.getRange(rowIndex, 4).setValue('Yes');
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if this is a batch operation
    if (e.parameter.batch === 'true') {
      const tickets = JSON.parse(e.parameter.tickets);
      
      // Get existing ticket numbers for duplicate checking
      const allData = sheet.getDataRange().getValues();
      const existingTickets = new Set(
        allData.slice(1).map(row => 
          String(row[0] || '').trim().padStart(3, '0').toLowerCase()
        )
      );
      
      let added = 0;
      let failed = [];
      
      // Process each ticket
      for (const ticket of tickets) {
        const normalizedTicket = String(ticket.ticketNumber || '').trim().padStart(3, '0').toLowerCase();
        
        // Skip if already exists
        if (existingTickets.has(normalizedTicket)) {
          failed.push(ticket.ticketNumber);
          continue;
        }
        
        // Format ticket number and append
        const formattedTicketNumber = String(ticket.ticketNumber).trim().padStart(3, '0');
        sheet.appendRow([
          formattedTicketNumber,
          ticket.name,
          ticket.phoneNumber,
          ticket.paid ? 'Yes' : 'No'
        ]);
        
        // Add to set to prevent duplicates within batch
        existingTickets.add(normalizedTicket);
        added++;
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        added: added,
        failed: failed
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Single ticket operation (original code)
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
