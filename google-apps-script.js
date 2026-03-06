// Google Apps Script Backend for Stag Tracker
// Deploy this as a Web App and use the URL in your React app

// ─── Helpers ────────────────────────────────────────────────────────────────

// Normalize a ticket number to a zero-padded 3-digit lowercase string
function normalizeTicket(ticket) {
  return String(ticket || '').trim().padStart(3, '0').toLowerCase();
}

// Format a ticket number for display / storage (3-digit, original case)
function formatTicket(ticket) {
  return String(ticket || '').trim().padStart(3, '0');
}

// Convert a 6-column row array to a ticket object
function rowToTicket(row) {
  return {
    ticketNumber: String(row[0] || ''),
    name:         String(row[1] || ''),
    phoneNumber:  String(row[2] || ''),
    paid:         String(row[3] || ''),
    checkedIn:    String(row[4] || ''),
    expected:     String(row[5] || 'Yes')
  };
}

// Find the 1-based sheet row for a ticket number. Returns -1 if not found.
// Reads only column A (not the full sheet) and normalizes values to handle
// both text "001" and numeric 1 stored in cells.
function findTicketRow(sheet, ticketNumber) {
  var target = normalizeTicket(ticketNumber);
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return -1;
  var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  for (var i = 0; i < colA.length; i++) {
    if (normalizeTicket(colA[i][0]) === target) {
      return i + 3; // convert 0-based array index to 1-based sheet row (data starts at row 3)
    }
  }
  return -1;
}

// Shorthand JSON response
function jsonOk(payload)  { return jsonResponse(payload); }
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── CORS preflight ─────────────────────────────────────────────────────────

// Handle CORS preflight requests
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ─── GET handlers ───────────────────────────────────────────────────────────

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // --- Search for a single ticket (TextFinder — reads only 1 row) -----------
  if (e.parameter.action === 'searchTicket') {
    var row = findTicketRow(sheet, e.parameter.ticketNumber);
    if (row !== -1) {
      var rowData = sheet.getRange(row, 1, 1, 6).getValues()[0];
      return jsonOk({ success: true, found: true, data: rowToTicket(rowData) });
    }
    return jsonOk({ success: true, found: false });
  }
  
  // --- Group booking search (match by phone + name) -------------------------
  if (e.parameter.action === 'searchByGroup') {
    var phoneNumber = e.parameter.phoneNumber;
    var name = e.parameter.name;
    var lastRow = sheet.getLastRow();
    if (lastRow < 3) return jsonOk({ success: true, tickets: [] });

    // Read all 6 columns for data rows (needed to return full ticket objects)
    var allData = sheet.getRange(3, 1, lastRow - 2, 6).getValues();
    var tickets = [];
    for (var i = 0; i < allData.length; i++) {
      var rowName = String(allData[i][1] || '').trim();
      var rowPhone = String(allData[i][2] || '').trim();
      if (rowPhone === phoneNumber && rowName === name) {
        tickets.push(rowToTicket(allData[i]));
      }
    }
    return jsonOk({ success: true, tickets: tickets });
  }
  
  // --- Batch ticket existence check (reads only column A) -------------------
  if (e.parameter.action === 'checkTickets') {
    var ticketNumbers = JSON.parse(e.parameter.tickets);
    var lastRow = sheet.getLastRow();
    if (lastRow < 3) return jsonOk({ success: true, existingTickets: [] });

    // Read only column A instead of getDataRange() — avoids pulling all 6 cols
    var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
    var existingSet = new Set();
    for (var i = 0; i < colA.length; i++) {
      existingSet.add(normalizeTicket(colA[i][0]));
    }
    
    var existingTickets = [];
    for (var j = 0; j < ticketNumbers.length; j++) {
      if (existingSet.has(normalizeTicket(ticketNumbers[j]))) {
        existingTickets.push(formatTicket(ticketNumbers[j]));
      }
    }
    return jsonOk({ success: true, existingTickets: existingTickets });
  }
  
  // --- Default: return all data (live, no cache) ----------------------------
  var data = sheet.getDataRange().getValues();
  return jsonOk({ success: true, data: data });
}

// ─── POST handlers ──────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var action = e.parameter.action;
    
    // --- Single-ticket update actions (all use TextFinder via findTicketRow) --
    
    if (action === 'updatePayment' || action === 'markPaid') {
      var row = findTicketRow(sheet, e.parameter.ticketNumber);
      if (row === -1) return jsonOk({ success: false, error: 'Ticket not found' });
      sheet.getRange(row, 4).setValue('Yes');
      return jsonOk({ success: true });
    }
    
    if (action === 'markUnpaid') {
      var row = findTicketRow(sheet, e.parameter.ticketNumber);
      if (row === -1) return jsonOk({ success: false, error: 'Ticket not found' });
      sheet.getRange(row, 4).setValue('No');
      return jsonOk({ success: true });
    }
    
    if (action === 'payAndCheckIn') {
      var row = findTicketRow(sheet, e.parameter.ticketNumber);
      if (row === -1) return jsonOk({ success: false, error: 'Ticket not found' });
      var timestamp = new Date().toLocaleString();
      sheet.getRange(row, 4, 1, 2).setValues([['Yes', 'Yes']]);
      return jsonOk({ success: true, timestamp: timestamp });
    }
    
    if (action === 'checkIn') {
      var row = findTicketRow(sheet, e.parameter.ticketNumber);
      if (row === -1) return jsonOk({ success: false, error: 'Ticket not found' });
      var timestamp = new Date().toLocaleString();
      sheet.getRange(row, 5).setValue('Yes');
      return jsonOk({ success: true, timestamp: timestamp });
    }
    
    // --- Batch insert (bulk setValues instead of per-row appendRow) ----------
    if (e.parameter.batch === 'true') {
      var tickets = JSON.parse(e.parameter.tickets);
      var lastRow = sheet.getLastRow();
      
      // Read only column A for duplicate checking
      var existingTickets = new Set();
      if (lastRow >= 3) {
        var colA = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
        for (var i = 0; i < colA.length; i++) {
          existingTickets.add(normalizeTicket(colA[i][0]));
        }
      }
      
      var added = 0;
      var failed = [];
      var newRows = [];
      
      for (var t = 0; t < tickets.length; t++) {
        var ticket = tickets[t];
        var norm = normalizeTicket(ticket.ticketNumber);
        
        if (existingTickets.has(norm)) {
          failed.push(ticket.ticketNumber);
          continue;
        }
        
        var isPaid = ticket.paid === true || ticket.paid === 'true';
        var isCheckedIn = ticket.checkedIn === true || ticket.checkedIn === 'true';
        var isExpected = ticket.expected === true || ticket.expected === 'true';
        
        newRows.push([
          formatTicket(ticket.ticketNumber),
          ticket.name,
          ticket.phoneNumber,
          isPaid ? 'Yes' : 'No',
          isCheckedIn ? 'Yes' : 'No',
          isExpected ? 'Yes' : 'No'
        ]);
        
        existingTickets.add(norm);
        added++;
      }
      
      // Single bulk write instead of N appendRow calls
      if (newRows.length > 0) {
        sheet.getRange(lastRow + 1, 1, newRows.length, 6).setValues(newRows);
      }
      
      return jsonOk({ success: true, added: added, failed: failed });
    }
    
    // --- Single ticket creation ----------------------------------------------
    var data = {
      ticketNumber: e.parameter.ticketNumber,
      name: e.parameter.name,
      phoneNumber: e.parameter.phoneNumber,
      paid: e.parameter.paid === 'true',
      checkedIn: e.parameter.checkedIn === 'true',
      expected: e.parameter.expected === 'true' || e.parameter.expected === undefined
    };
    
    // Use TextFinder to check for duplicate (no full sheet read)
    if (findTicketRow(sheet, data.ticketNumber) !== -1) {
      return jsonOk({ success: false, error: 'Ticket number already exists' });
    }
    
    sheet.appendRow([
      formatTicket(data.ticketNumber),
      data.name,
      data.phoneNumber,
      data.paid ? 'Yes' : 'No',
      data.checkedIn ? 'Yes' : 'No',
      data.expected ? 'Yes' : 'No'
    ]);
    
    return jsonOk({ success: true });
      
  } catch (error) {
    return jsonOk({ success: false, error: error.toString() });
  }
}
