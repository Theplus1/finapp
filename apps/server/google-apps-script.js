/**
 * Google Apps Script: Automatically create Google Sheets for Virtual Accounts
 * 
 * Configuration:
 * - Add API_BASE_URL to Script Properties (PropertiesService)
 * - Run main() to create sheets for current month
 * - Run setupTrigger() to run automatically daily
 */

//==================== CONFIGURATION ====================
const properties = PropertiesService.getScriptProperties();
const API_BASE_URL = properties.getProperty('API_BASE_URL');
if (!API_BASE_URL) {
  throw new Error('API_BASE_URL is not defined in script properties');
}

/**
 * Get current month (1-12)
 */
function getCurrentMonth() {
  return new Date().getMonth() + 1;
}

/**
 * Get current year (e.g., 2025)
 */
function getCurrentYear() {
  return new Date().getFullYear();
}

//==================== MAIN FUNCTION ====================

/**
 * Main function: Check and create sheets for all virtual accounts
 * Uses bulk create to optimize performance
 */
function main() {
  try {
    console.log('Starting to check and create sheets...');
    
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();
    
    // 1. Get all virtual accounts
    const virtualAccounts = getAllVirtualAccounts();
    console.log(`Found ${virtualAccounts.length} virtual accounts`);
    
    // 2. Check which accounts already have reports, which don't
    const accountsToCreate = [];
    let skipped = 0;
    
    for (let i = 0; i < virtualAccounts.length; i++) {
      const account = virtualAccounts[i];
      try {
        console.log(`[${i + 1}/${virtualAccounts.length}] Checking: ${account.name} (${account.virtualAccountId})`);
        
        // Check if report already exists for current month/year
        const existingReport = getReportByVirtualAccountId(
          account.virtualAccountId,
          currentMonth,
          currentYear
        );
        
        if (existingReport) {
          console.log(`  [OK] Sheet already exists for ${currentMonth}/${currentYear}: ${existingReport.sheetName} (${existingReport.sheetId})`);
          skipped++;
        } else {
          console.log(`  [NEW] Need to create new sheet for ${currentMonth}/${currentYear}`);
          accountsToCreate.push(account);
        }
      } catch (error) {
        console.error(`  [ERROR] Error checking ${account.name}:`, error);
      }
    }
    
    console.log(`\nCheck summary:`);
    console.log(`  Already exists: ${skipped}`);
    console.log(`  Need to create: ${accountsToCreate.length}`);
    
    // 3. Create sheets for accounts that need them
    if (accountsToCreate.length === 0) {
      console.log('\nRESULT:');
      console.log(`All accounts already have sheets for ${currentMonth}/${currentYear}`);
      return;
    }
    
    console.log(`\nStarting to create ${accountsToCreate.length} sheets...`);
    const reportsToCreate = [];
    let created = 0;
    let errors = 0;
    
    for (let i = 0; i < accountsToCreate.length; i++) {
      const account = accountsToCreate[i];
      try {
        console.log(`[${i + 1}/${accountsToCreate.length}] Creating sheet: ${account.name}`);
        
        // Create new sheet
        const sheet = createSheetForVirtualAccount(account);
        if (sheet) {
          // Create file name in correct format: [virtualAccountId]_[YYYY-MM]
          const monthStr = String(currentMonth).padStart(2, '0');
          const expectedSheetName = `${account.virtualAccountId}_${currentYear}-${monthStr}`;
          
          // Add to list of reports to create
          reportsToCreate.push({
            sheetId: sheet.getId(),
            sheetName: expectedSheetName, // Ensure correct format
            virtualAccountId: account.virtualAccountId,
            month: currentMonth,
            year: currentYear
          });
          console.log(`  [OK] Created sheet: ${expectedSheetName} (${sheet.getId()})`);
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
    
    // 4. Bulk create reports in database
    if (reportsToCreate.length > 0) {
      console.log(`\nBulk creating ${reportsToCreate.length} reports in database...`);
      try {
        const bulkResult = bulkCreateReports(reportsToCreate);
        console.log(`  [OK] Bulk create successful: ${bulkResult.data.summary.successful} successful, ${bulkResult.data.summary.failed} failed`);
        
        if (bulkResult.data.failed && bulkResult.data.failed.length > 0) {
          console.log('  Failed reports:');
          bulkResult.data.failed.forEach(failed => {
            console.log(`    Index ${failed.index}: ${failed.error}`);
          });
        }
      } catch (error) {
        console.error('  [ERROR] Error bulk creating reports:', error);
        errors += reportsToCreate.length;
      }
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
        'User-Agent': 'GoogleAppsScript/FinApp'
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
 * Get report by virtualAccountId for specific month/year
 * @param {string} virtualAccountId - Virtual account ID
 * @param {number} month - Month (1-12)
 * @param {number} year - Year (e.g., 2025)
 * @returns {Object|null} Report object or null if not found
 */
function getReportByVirtualAccountId(virtualAccountId, month, year) {
  const url = `${API_BASE_URL}/google-sheets/reports?virtualAccountId=${encodeURIComponent(virtualAccountId)}&month=${month}&year=${year}`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp'
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      return null; // Not found or error
    }
    
    const data = JSON.parse(responseText);
    
    if (data.success && data.data && data.data.data && data.data.data.length > 0) {
      // API already filtered by month and year, so just take the first element
      const report = data.data.data[0];
      return report;
    }
    
    return null;
  } catch (error) {
    console.error('Error calling API getReportByVirtualAccountId:', error);
    return null;
  }
}

/**
 * Bulk create reports in database
 * @param {Array} reportsData - Array of report objects to create
 * @returns {Object} Bulk create result
 */
function bulkCreateReports(reportsData) {
  const url = `${API_BASE_URL}/google-sheets/reports`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GoogleAppsScript/FinApp'
      },
      payload: JSON.stringify(reportsData),
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 201 && statusCode !== 200) {
      throw new Error(`API error ${statusCode}: ${responseText}`);
    }
    
    const data = JSON.parse(responseText);
    
    // Handle nested response structure
    const result = data.data || data;
    
    if (!result.success) {
      throw new Error('Failed to bulk create reports: ' + JSON.stringify(result));
    }
    
    return result;
  } catch (error) {
    console.error('Error bulk creating reports:', error);
    throw error;
  }
}

//==================== GOOGLE SHEETS OPERATIONS ====================

/**
 * Find or create "FinApp" folder on Google Drive
 * @returns {Folder} Folder object
 */
function getOrCreateFinAppFolder() {
  const folderName = 'FinApp';
  
  try {
    // Find folder in root
    const folders = DriveApp.getRootFolder().getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      const folder = folders.next();
      console.log(`  Found folder "${folderName}" (ID: ${folder.getId()})`);
      return folder;
    } else {
      // Create new folder
      const folder = DriveApp.getRootFolder().createFolder(folderName);
      console.log(`  Created new folder "${folderName}" (ID: ${folder.getId()})`);
      return folder;
    }
  } catch (error) {
    console.error(`Error finding/creating folder "${folderName}":`, error);
    throw error;
  }
}

/**
 * Create new Google Sheet for virtual account (for current month/year)
 * Sheet will be created in "FinApp" folder
 */
function createSheetForVirtualAccount(account) {
  try {
    // Create file name: [virtualAccountId]_[YYYY-MM] (for current month/year)
    const currentMonth = getCurrentMonth();
    const currentYear = getCurrentYear();
    const monthStr = String(currentMonth).padStart(2, '0');
    const sheetName = `${account.virtualAccountId}_${currentYear}-${monthStr}`;
    
    // Find or create "FinApp" folder
    const finAppFolder = getOrCreateFinAppFolder();
    
    // Create new spreadsheet (temporarily in root)
    const spreadsheet = SpreadsheetApp.create(sheetName);
    
    // Move file to "FinApp" folder
    const file = DriveApp.getFileById(spreadsheet.getId());
    file.moveTo(finAppFolder);
    
    // Create basic sheets
    const defaultSheet = spreadsheet.getActiveSheet();
    defaultSheet.setName('Payment');
    
    // Create "Transactions History" sheet
    spreadsheet.insertSheet('Transactions History');
    
    // Create "Reversed" sheet
    spreadsheet.insertSheet('Reversed');
    
    // Delete default "Sheet1" if exists
    const sheets = spreadsheet.getSheets();
    sheets.forEach(sheet => {
      if (sheet.getName() === 'Sheet1' && sheet.getIndex() !== 1) {
        spreadsheet.deleteSheet(sheet);
      }
    });
    
    // Note: Backend will automatically format and sync data when cron job runs
    console.log(`  Created spreadsheet in "FinApp" folder: ${sheetName} (ID: ${spreadsheet.getId()})`);
    
    return spreadsheet;
  } catch (error) {
    console.error('Error creating sheet:', error);
    return null;
  }
}

//==================== TRIGGER SETUP ====================

/**
 * Setup trigger to run automatically daily
 */
function setupTrigger() {
  // Delete old triggers (if any)
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'main') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger: run daily at 9:00 AM
  ScriptApp.newTrigger('main')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
  
  console.log('Trigger set to run daily at 00:00 AM');
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
 * Test function to check report for current month/year
 */
function testCheckReport() {
  const accounts = getAllVirtualAccounts();
  if (accounts.length === 0) {
    console.log('No virtual accounts found');
    return;
  }
  
  const firstAccount = accounts[0];
  const currentMonth = getCurrentMonth();
  const currentYear = getCurrentYear();
  console.log(`Checking report for: ${firstAccount.name} (${currentMonth}/${currentYear})`);
  const report = getReportByVirtualAccountId(firstAccount.virtualAccountId, currentMonth, currentYear);
  
  if (report) {
    console.log(`Report exists for ${currentMonth}/${currentYear}:`, report);
  } else {
    console.log(`No report found for ${currentMonth}/${currentYear}`);
  }
  
  return report;
}

/**
 * Test function to create sheet
 */
function testCreateSheet() {
  const accounts = getAllVirtualAccounts();
  if (accounts.length === 0) {
    console.log('No virtual accounts found');
    return;
  }
  
  const firstAccount = accounts[0];
  console.log(`Creating test sheet for: ${firstAccount.name}`);
  const sheet = createSheetForVirtualAccount(firstAccount);
  
  if (sheet) {
    console.log('Sheet created:', sheet.getName(), sheet.getId());
    return sheet;
  } else {
    console.log('Failed to create sheet');
    return null;
  }
}

