/**
 * Google Apps Script V2: Setup Google Sheets for Full Data Sync
 * 
 * This version is designed for full data sync where each Virtual Account (VA)
 * uses a single Google Sheet that accumulates all historical data.
 * 
 * 
 * Configuration:
 * - Add API_BASE_URL to Script Properties (PropertiesService)
 * - Run setupFinanceSheets() on a spreadsheet to setup formulas
 * - Run createFullDataSheet() to create a new sheet for a VA
 */

//==================== CONFIGURATION ====================
const properties = PropertiesService.getScriptProperties();
const API_BASE_URL = properties.getProperty('API_BASE_URL');
if (!API_BASE_URL) {
  throw new Error('API_BASE_URL is not defined in script properties');
}

//==================== API CALLS ====================

/**
 * Get all virtual accounts from API
 */
function getAllVirtualAccounts() {
  const url = `${API_BASE_URL}/google-sheets/virtual-accounts`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp-V2',
        'ngrok-skip-browser-warning': '9599'
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      throw new Error(`API error ${statusCode}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (data.success && data.data && data.data.data) {
      return data.data.data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error calling API getAllVirtualAccounts:', error);
    throw error;
  }
}

/**
 * Get report by virtualAccountId from database
 * @param {string} virtualAccountId - Virtual account ID
 * @returns {Object|null} Report object or null if not found
 */
function getReportByVirtualAccountId(virtualAccountId) {
  const url = `${API_BASE_URL}/google-sheets/reports-all/check?virtualAccountId=${encodeURIComponent(virtualAccountId)}`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp-V2',
        'ngrok-skip-browser-warning': '9599'
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      return null;
    }
    
    const data = JSON.parse(responseText);
    
    if (data.success && data.exists && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error calling API getReportByVirtualAccountId:', error);
    return null;
  }
}

/**
 * Get all reports from database (bulk fetch)
 * @returns {Object} Map of virtualAccountId
 */
function getAllReports() {
  const url = `${API_BASE_URL}/google-sheets/reports-all`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp-V2',
        'ngrok-skip-browser-warning': '9599'
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      console.error(`Error fetching all reports: ${statusCode} - ${responseText}`);
      return {}; // Return empty object on error
    }
    
    const data = JSON.parse(responseText);
    
    if (!data.success || !data.data || !Array.isArray(data.data)) {
      console.warn('Invalid response format from getAllReports');
      return {};
    }
    
    const reportsMap = {};
    data.data.forEach(report => {
      if (report.virtualAccountId) {
        reportsMap[report.virtualAccountId] = report;
      }
    });
    
    console.log(`Loaded ${Object.keys(reportsMap).length} existing reports`);
    return reportsMap;
  } catch (error) {
    console.error('Error calling API getAllReports:', error);
    return {};
  }
}

/**
 * Create or update report in database for full data sync
 * @param {string} sheetId - Google Spreadsheet ID
 * @param {string} virtualAccountId - Virtual account ID
 */
function createOrUpdateFullDataReport(sheetId, virtualAccountId) {
  const url = `${API_BASE_URL}/google-sheets/reports-all`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp-V2',
        'ngrok-skip-browser-warning': '9599'
      },
      payload: JSON.stringify({
        sheetId: sheetId,
        virtualAccountId: virtualAccountId
      }),
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 201 && statusCode !== 200) {
      throw new Error(`API error ${statusCode}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    return data.data || data;
  } catch (error) {
    console.error('Error creating/updating full data report:', error);
    throw error;
  }
}

/**
 * Bulk create or update reports in database for full data sync
 */
function bulkCreateOrUpdateFullDataReports(reports) {
  const url = `${API_BASE_URL}/google-sheets/reports-all/bulk`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp-V2',
        'ngrok-skip-browser-warning': '9599'
      },
      payload: JSON.stringify(reports),
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 201 && statusCode !== 200) {
      throw new Error(`API error ${statusCode}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    if (!data.success) {
      throw new Error(data.error || 'Bulk register failed');
    }
    
    return data.data || data;
  } catch (error) {
    console.error('Error bulk creating/updating full data reports:', error);
    throw error;
  }
}

//==================== GOOGLE SHEETS OPERATIONS ====================

/**
 * Find or create "FinApp" folder on Google Drive
 */
function getOrCreateFinAppFolder() {
  const folderName = 'FinApp';
  
  try {
    const folders = DriveApp.getRootFolder().getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      const folder = folders.next();
      console.log(`Found folder "${folderName}" (ID: ${folder.getId()})`);
      return folder;
    }
    
    try {
      const folder = DriveApp.getRootFolder().createFolder(folderName);
      console.log(`Created new folder "${folderName}" (ID: ${folder.getId()})`);
      return folder;
    } catch (createError) {
      console.error(`Error creating folder "${folderName}":`, createError);
      const retryFolders = DriveApp.getRootFolder().getFoldersByName(folderName);
      if (retryFolders.hasNext()) {
        const folder = retryFolders.next();
        console.log(`Found folder "${folderName}" on retry (ID: ${folder.getId()})`);
        return folder;
      }
      console.warn(`Cannot create folder "${folderName}", will create sheets in root folder`);
      return null;
    }
  } catch (error) {
    console.error(`Error accessing Drive for folder "${folderName}":`, error);
    console.warn(`Will create sheets in root folder instead`);
    return null;
  }
}


/**
 * Create a new Google Sheet for full data sync
 */
function createFullDataSheet(account, skipMove = true) {
  try {
    const sheetName = `${account.name} - Full Data Report`;
    
    const spreadsheet = SpreadsheetApp.create(sheetName);
    const fileId = spreadsheet.getId();
    
    setupFinanceSheetsForSpreadsheet(spreadsheet);
    
    const sheets = spreadsheet.getSheets();
    if (sheets.length > 1) {
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        if (sheet.getName() === 'Sheet1') {
          spreadsheet.deleteSheet(sheet);
          break;
        }
      }
    }
    
    console.log(`Created full data spreadsheet: ${sheetName} (ID: ${fileId})`);
    
    return {
      spreadsheet: spreadsheet,
      fileId: fileId,
      account: account,
      virtualAccountId: account.virtualAccountId
    };
  } catch (error) {
    console.error('Error creating full data sheet:', error);
    throw error;
  }
}

/**
 * Bulk move files to FinApp folder
 */
function bulkMoveFilesToFolder(fileIds, finAppFolder) {
  if (!finAppFolder || !fileIds || fileIds.length === 0) {
    return { moved: 0, errors: 0 };
  }
  
  let moved = 0;
  let errors = 0;
  
  console.log(`\nMoving ${fileIds.length} files to FinApp folder...`);
  
  for (let i = 0; i < fileIds.length; i++) {
    const fileId = fileIds[i];
    try {
      const file = DriveApp.getFileById(fileId);
      file.moveTo(finAppFolder);
      moved++;
      
      // Add small delay every 10 files to avoid rate limit
      if ((i + 1) % 10 === 0) {
        console.log(`  Moved ${i + 1}/${fileIds.length} files...`);
        Utilities.sleep(200); // 200ms delay every 10 files
      }
    } catch (error) {
      console.error(`  [ERROR] Failed to move file ${fileId}:`, error);
      errors++;
    }
  }
  
  console.log(`\nBulk move completed: ${moved} moved, ${errors} errors`);
  return { moved, errors };
}

//==================== SHEET SETUP FUNCTIONS ====================

/**
 * Setup finance sheets with formulas based on Transactions History data
 */
function setupFinanceSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupFinanceSheetsForSpreadsheet(ss);
}

/**
 * Setup finance sheets for a specific spreadsheet
 */
function setupFinanceSheetsForSpreadsheet(spreadsheet) {
  function getOrCreateSheet(name) {
    let sh = spreadsheet.getSheetByName(name);
    if (!sh) sh = spreadsheet.insertSheet(name);
    return sh;
  }

  // =========================
  // 1. Transactions History
  // =========================
  const transactionsHistory = getOrCreateSheet('Transactions History');
  transactionsHistory.getRange('A1:K1').setValues([[
    'ID','Date','Authorized','Merchant','Amount',
    'Card','Status','Original','Currency','Group Month','Group Day'
  ]]);

  // =========================
  // 2. Tổng nạp (Deposit)
  // =========================
  const tongNap = getOrCreateSheet('Tổng nạp');
  tongNap.getRange('A1:B1').setValues([['Date', 'Tổng nạp']]);
  
  tongNap.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  tongNap.getRange('B2:B').setNumberFormat('$#,##0.00');

  // =========================
  // 3. Payment
  // =========================
  const payment = getOrCreateSheet('Payment');
  payment.getRange('A1:E1').setValues([[
    'Date',
    'Tổng nạp',
    'Tổng tiêu',
    'Tổng refund',
    'Account Balance'
  ]]);

  payment.getRange('B2').setFormula(`=SUM(B3:B)`);
  payment.getRange('D2').setFormula(`=SUM(ARRAYFORMULA(VALUE(SUBSTITUTE('Refund'!E2:E, "$", ""))))`);
  payment.getRange('E2').setFormula(`=B2-C2+D2`);
  
  payment.getRange('A3:A').setNumberFormat('yyyy-mm-dd');
  payment.getRange('B2:B').setNumberFormat('$#,##0.00');
  payment.getRange('C2:C').setNumberFormat('$#,##0.00');
  payment.getRange('E2').setNumberFormat('$#,##0.00');

  // =========================
  // 4. Card
  // =========================
  const card = getOrCreateSheet('Card');
  card.getRange('A1').setFormula(`
=QUERY(
 {
   FILTER(
     INDIRECT("'Transactions History'!F2:F"),
     INDIRECT("'Transactions History'!F2:F")<>"",
     INDIRECT("'Transactions History'!B2:B")<>""
   ),
   FILTER(
     ARRAYFORMULA(TEXT(DATEVALUE(LEFT(INDIRECT("'Transactions History'!B2:B"), 10)), "yyyy-mm-dd")),
     INDIRECT("'Transactions History'!F2:F")<>"",
     INDIRECT("'Transactions History'!B2:B")<>""
   ),
   FILTER(
     ARRAYFORMULA(VALUE(SUBSTITUTE(INDIRECT("'Transactions History'!E2:E"),"$",""))),
     INDIRECT("'Transactions History'!F2:F")<>"",
     INDIRECT("'Transactions History'!B2:B")<>""
   )
 ;
   FILTER(
     IF(INDIRECT("'Transactions History'!F2:F")<>""," Total",""),
     INDIRECT("'Transactions History'!F2:F")<>"",
     INDIRECT("'Transactions History'!B2:B")<>""
   ),
   FILTER(
     ARRAYFORMULA(TEXT(DATEVALUE(LEFT(INDIRECT("'Transactions History'!B2:B"), 10)), "yyyy-mm-dd")),
     INDIRECT("'Transactions History'!F2:F")<>"",
     INDIRECT("'Transactions History'!B2:B")<>""
   ),
   FILTER(
     ARRAYFORMULA(VALUE(SUBSTITUTE(INDIRECT("'Transactions History'!E2:E"),"$",""))),
     INDIRECT("'Transactions History'!F2:F")<>"",
     INDIRECT("'Transactions History'!B2:B")<>""
   )
 },
 "select Col1, sum(Col3)
  where Col2 is not null
  group by Col1
  pivot Col2
  label Col1 'Card'",
  0
)
`.trim());
  
  card.getRange('B2:Z').setNumberFormat('$#,##0.00');

  // =========================
  // 5. Hold
  // =========================
  const hold = getOrCreateSheet('Hold');
  hold.getRange('A1:K1').setValues([[
    'ID','Date','Authorized','Merchant','Amount',
    'Card','Status','Original','Currency','Group Month','Group Day'
  ]]);

  // =========================
  // 6. Reversed
  // =========================
  const reversed = getOrCreateSheet('Reversed');
  reversed.getRange('A1:I1').setValues([[
    'ID',
    'Date',
    'Authorized',
    'Merchant',
    'Amount',
    'Card',
    'Status',
    'Original',
    'Currency'
  ]]);

  // =========================
  // 7. Refund
  // =========================
  const refund = getOrCreateSheet('Refund');
  refund.getRange('A1:K1').setValues([[
    'ID',
    'Date',
    'Authorized',
    'Merchant',
    'Amount',
    'Card',
    'Status',
    'Original',
    'Currency',
    'Group Month',
    'Group Day'
  ]]);

  // =========================
  // 8. Location
  // =========================
  const location = getOrCreateSheet('Location');
  location.getRange('A1:C1').setValues([[
    'Date',
    'Tổng tiêu non US',
    'Tổng tiêu trong US'
  ]]);
  
  location.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  location.getRange('B2:B').setNumberFormat('$#,##0.00');
  location.getRange('C2:C').setNumberFormat('$#,##0.00');

  SpreadsheetApp.flush();
  console.log('Finance sheets setup completed successfully');
}

//==================== MAIN FUNCTIONS ====================

/**
 * Main function: Check and create sheets for virtual accounts that don't have one yet
 */
function main() {
  try {
    console.log('Starting to check and create full data sheets...');
    
    // 1. Get all virtual accounts
    const virtualAccounts = getAllVirtualAccounts();
    console.log(`Found ${virtualAccounts.length} virtual accounts`);
    
    // 2. Get all existing reports once (bulk fetch)
    console.log('Fetching all existing reports...');
    const existingReportsMap = getAllReports();
    
    // 3. Check which accounts already have reports
    const accountsToCreate = [];
    let skipped = 0;
    
    for (let i = 0; i < virtualAccounts.length; i++) {
      const account = virtualAccounts[i];
      try {
        const existingReport = existingReportsMap[account.virtualAccountId];
        
        if (existingReport && existingReport.sheetId) {
          console.log(`[${i + 1}/${virtualAccounts.length}] [SKIP] ${account.name} - Sheet exists: ${existingReport.sheetId}`);
          skipped++;
        } else {
          console.log(`[${i + 1}/${virtualAccounts.length}] [NEW] ${account.name} - Need to create sheet`);
          accountsToCreate.push(account);
        }
      } catch (error) {
        console.error(`  [ERROR] Error checking ${account.name}:`, error);
        accountsToCreate.push(account);
      }
    }
    
    console.log(`\nCheck summary:`);
    console.log(`  Already exists: ${skipped}`);
    console.log(`  Need to create: ${accountsToCreate.length}`);
    
    // 3. Create sheets for accounts that need them
    if (accountsToCreate.length === 0) {
      console.log('\nRESULT:');
      console.log(`All accounts already have full data sheets`);
      return;
    }
    
    console.log(`\nStarting to create ${accountsToCreate.length} sheets...`);
    
    // Step 1: Create all sheets first (in root folder)
    const createdSheets = [];
    const reportsToRegister = [];
    let created = 0;
    let errors = 0;
    
    for (let i = 0; i < accountsToCreate.length; i++) {
      const account = accountsToCreate[i];
      try {
        console.log(`[${i + 1}/${accountsToCreate.length}] Creating sheet: ${account.name}`);
        
        const result = createFullDataSheet(account, true);
        if (result && result.fileId) {
          console.log(`  [OK] Created sheet: ${result.spreadsheet.getName()} (${result.fileId})`);
          createdSheets.push(result.fileId);
          reportsToRegister.push({
            sheetId: result.fileId,
            virtualAccountId: result.virtualAccountId
          });
          created++;
        } else {
          console.log(`  [ERROR] Failed to create sheet for ${account.name}`);
          errors++;
        }
      } catch (error) {
        console.error(`  [ERROR] Error creating sheet for ${account.name}:`, error);
        errors++;
      }
    }
    
    // Step 2: Bulk register all created sheets in database
    if (reportsToRegister.length > 0) {
      console.log(`\nBulk registering ${reportsToRegister.length} sheets in database...`);
      try {
        const registerResult = bulkCreateOrUpdateFullDataReports(reportsToRegister);
        console.log(`  [OK] Registered: ${registerResult.summary?.successful || 0} successful, ${registerResult.summary?.failed || 0} failed`);
        if (registerResult.failed && registerResult.failed.length > 0) {
          console.warn(`  [WARN] Failed registrations:`, registerResult.failed);
        }
      } catch (error) {
        console.error(`  [ERROR] Bulk registration failed:`, error);
      }
    }
    
    // Step 3: Bulk move all created files to FinApp folder
    if (createdSheets.length > 0) {
      const finAppFolder = getOrCreateFinAppFolder();
      const moveResult = bulkMoveFilesToFolder(createdSheets, finAppFolder);
      console.log(`\nMove summary: ${moveResult.moved} moved, ${moveResult.errors} errors`);
    }
    
    console.log('\nRESULT:');
    console.log(`Created: ${created}`);
    console.log(`Already exists: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${virtualAccounts.length}`);
    
  } catch (error) {
    console.error('Error in main function:', error);
    throw error;
  }
}

/**
 * Create full data sheet for a specific virtual account
 */
function createSheetForVirtualAccount(virtualAccountId) {
  try {
    const accounts = getAllVirtualAccounts();
    const account = accounts.find(a => a.virtualAccountId === virtualAccountId);
    
    if (!account) {
      throw new Error(`Virtual account ${virtualAccountId} not found`);
    }
    
    const finAppFolder = getOrCreateFinAppFolder();
    const spreadsheet = createFullDataSheet(account, finAppFolder);
    
    console.log(`Successfully created full data sheet for ${account.name}`);
    return spreadsheet;
  } catch (error) {
    console.error('Error creating sheet for virtual account:', error);
    throw error;
  }
}

/**
 * Create full data sheets for all virtual accounts
 */
function createSheetsForAllVirtualAccounts() {
  try {
    const accounts = getAllVirtualAccounts();
    console.log(`Found ${accounts.length} virtual accounts`);
    
    const finAppFolder = getOrCreateFinAppFolder();
    let created = 0;
    let errors = 0;
    
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        console.log(`[${i + 1}/${accounts.length}] Processing: ${account.name} (${account.virtualAccountId})`);
        createFullDataSheet(account, finAppFolder);
        created++;
      } catch (error) {
        console.error(`  [ERROR] Failed to create sheet for ${account.name}:`, error);
        errors++;
      }
    }
    
    console.log('\nRESULT:');
    console.log(`Created: ${created}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${accounts.length}`);
  } catch (error) {
    console.error('Error in createSheetsForAllVirtualAccounts:', error);
    throw error;
  }
}

//==================== TRIGGER SETUP ====================

/**
 * Setup trigger to run main() automatically daily
 * This will check for new virtual accounts and create sheets for them
 */
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
  
  console.log('Trigger set to run main() daily at 00:00 AM');
}

/**
 * Delete all triggers
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log('All triggers deleted');
}

//==================== TEST FUNCTIONS ====================

/**
 * Test function to get list of virtual accounts
 */
function testGetVirtualAccounts() {
  const accounts = getAllVirtualAccounts();
  console.log('List of virtual accounts:');
  accounts.forEach((account, index) => {
    console.log(`${index + 1}. ${account.name} (${account.virtualAccountId})`);
  });
  return accounts;
}

/**
 * Test function to create a sheet for the first virtual account
 */
function testCreateSheet() {
  const accounts = getAllVirtualAccounts();
  if (accounts.length === 0) {
    console.log('No virtual accounts found');
    return;
  }
  
  const firstAccount = accounts[0];
  console.log(`Creating test sheet for: ${firstAccount.name}`);
  
  const result = createFullDataSheet(firstAccount, true);
  
  if (result && result.spreadsheet) {
    const spreadsheet = result.spreadsheet;
    console.log('Sheet created:', spreadsheet.getName(), spreadsheet.getId());
    console.log('File ID:', result.fileId);
    console.log('Virtual Account ID:', result.virtualAccountId);
    
    const finAppFolder = getOrCreateFinAppFolder();
    if (finAppFolder) {
      try {
        const file = DriveApp.getFileById(result.fileId);
        file.moveTo(finAppFolder);
        console.log('Moved to FinApp folder');
      } catch (error) {
        console.error('Failed to move to folder:', error);
      }
    }
    
    return spreadsheet;
  } else {
    console.log('Failed to create sheet');
    return null;
  }
}

