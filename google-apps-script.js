// Google Apps Script Backend for Stag Tracker
// Deploy this as a Web App and use the URL in your React app

// Handle CORS preflight requests
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Server-side search for specific ticket
  if (e.parameter.action === 'searchTicket') {
    const ticketNumber = e.parameter.ticketNumber;
    const normalizedTicket = String(ticketNumber || '').trim().padStart(3, '0').toLowerCase();
    
    const allData = sheet.getDataRange().getValues();
    
    // Find the ticket in data rows (skip rows 1-2 for title/header)
    for (let i = 2; i < allData.length; i++) {
      const existingTicket = String(allData[i][0] || '').trim().padStart(3, '0').toLowerCase();
      
      if (existingTicket === normalizedTicket) {
        const rowData = allData[i];
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true, 
          found: true,
          data: {
            ticketNumber: String(rowData[0] || ''),
            name: String(rowData[1] || ''),
            phoneNumber: String(rowData[2] || ''),
            paid: String(rowData[3] || ''),
            checkedIn: String(rowData[4] || '')
          }
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      found: false 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Batch ticket check for existence
  if (e.parameter.action === 'checkTickets') {
    const ticketNumbers = JSON.parse(e.parameter.tickets);
    const normalizedTickets = ticketNumbers.map(t => String(t).trim().padStart(3, '0').toLowerCase());
    
    const allData = sheet.getDataRange().getValues();
    const existingSet = new Set(
      allData.slice(2).map(row => String(row[0] || '').trim().padStart(3, '0').toLowerCase())
    );
    
    const existingTickets = [];
    for (let i = 0; i < ticketNumbers.length; i++) {
      if (existingSet.has(normalizedTickets[i])) {
        existingTickets.push(ticketNumbers[i].padStart(3, '0'));
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      existingTickets: existingTickets 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Default: return all data (fallback for backward compatibility)
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
      
      // Find the row index (skip rows 1-2 for title/header, start at row 3)
      let rowIndex = -1;
      for (let i = 2; i < allData.length; i++) {
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
    
    // Check if this is a combined payment + check-in operation
    if (e.parameter.action === 'payAndCheckIn') {
      const ticketNumber = e.parameter.ticketNumber;
      const allData = sheet.getDataRange().getValues();
      const normalizedTicket = String(ticketNumber || '').trim().padStart(3, '0').toLowerCase();
      
      // Find the row index (skip rows 1-2 for title/header, start at row 3)
      let rowIndex = -1;
      for (let i = 2; i < allData.length; i++) {
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
      
      // Update both paid (column D) and checked in (column E) in one batch
      const timestamp = new Date().toLocaleString();
      sheet.getRange(rowIndex, 4, 1, 2).setValues([['Yes', 'Yes']]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        timestamp: timestamp
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if this is a mark as paid operation
    if (e.parameter.action === 'markPaid') {
      const ticketNumber = e.parameter.ticketNumber;
      const allData = sheet.getDataRange().getValues();
      const normalizedTicket = String(ticketNumber || '').trim().padStart(3, '0').toLowerCase();
      
      // Find the row index (skip rows 1-2 for title/header, start at row 3)
      let rowIndex = -1;
      for (let i = 2; i < allData.length; i++) {
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
    
    // Check if this is a mark as unpaid operation
    if (e.parameter.action === 'markUnpaid') {
      const ticketNumber = e.parameter.ticketNumber;
      const allData = sheet.getDataRange().getValues();
      const normalizedTicket = String(ticketNumber || '').trim().padStart(3, '0').toLowerCase();
      
      // Find the row index (skip rows 1-2 for title/header, start at row 3)
      let rowIndex = -1;
      for (let i = 2; i < allData.length; i++) {
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
      sheet.getRange(rowIndex, 4).setValue('No');
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if this is a check-in operation
    if (e.parameter.action === 'checkIn') {
      const ticketNumber = e.parameter.ticketNumber;
      const allData = sheet.getDataRange().getValues();
      const normalizedTicket = String(ticketNumber || '').trim().padStart(3, '0').toLowerCase();
      
      // Find the row index (skip rows 1-2 for title/header, start at row 3)
      let rowIndex = -1;
      for (let i = 2; i < allData.length; i++) {
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
      
      // Update the checked in status (column E, index 5)
      // Also record the timestamp
      const timestamp = new Date().toLocaleString();
      sheet.getRange(rowIndex, 5).setValue('Yes');
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        timestamp: timestamp
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if this is a batch operation
    if (e.parameter.batch === 'true') {
      const tickets = JSON.parse(e.parameter.tickets);
      
      // Get existing ticket numbers for duplicate checking (skip rows 1-2)
      const allData = sheet.getDataRange().getValues();
      const existingTickets = new Set(
        allData.slice(2).map(row => 
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
        // EVENT DAY MODE: Use ticket.checkedIn if provided
        // ORIGINAL MODE: Always set to 'No' for pre-sale
        sheet.appendRow([
          formattedTicketNumber,
          ticket.name,
          ticket.phoneNumber,
          ticket.paid ? 'Yes' : 'No',
          ticket.checkedIn ? 'Yes' : 'No' // EVENT DAY: Supports checking in on creation
          // 'No' // ORIGINAL: Always 'No' for pre-sale tickets
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
      paid: e.parameter.paid === 'true',
      checkedIn: e.parameter.checkedIn === 'true' // EVENT DAY: Support checkedIn parameter
    };
    
    // Check if ticket number already exists (normalized to 3 digits, skip rows 1-2)
    const allData = sheet.getDataRange().getValues();
    const normalizedTicket = String(data.ticketNumber || '').trim().padStart(3, '0').toLowerCase();
    const ticketNumbers = allData.slice(2).map(row => 
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
    
    // EVENT DAY MODE: Use data.checkedIn if provided
    // ORIGINAL MODE: Always set to 'No' for pre-sale
    // Append new row
    sheet.appendRow([
      formattedTicketNumber,
      data.name,
      data.phoneNumber,
      data.paid ? 'Yes' : 'No',
      data.checkedIn ? 'Yes' : 'No' // EVENT DAY: Supports checking in on creation
      // 'No' // ORIGINAL: Always 'No' for pre-sale tickets
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
