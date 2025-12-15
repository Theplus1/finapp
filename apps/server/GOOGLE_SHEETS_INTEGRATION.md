# Google Sheets Integration Guide

## Overview

This integration automatically creates and syncs Google Sheets for Virtual Accounts. The system consists of two main components:

1. Google Apps Script: Automatically creates Google Sheet files for virtual accounts that don't have reports for the current month
2. Backend Cron Job: Automatically syncs transaction data to existing Google Sheets every 15 minutes

## Architecture

The integration follows this workflow:

1. Google Apps Script runs daily (configurable time) to check all virtual accounts
2. For each virtual account without a report for the current month, it creates a new Google Sheet
3. The script registers the new sheet in the database via API
4. Backend cron job runs every 15 minutes to sync transaction data to all existing sheets
5. Sheets are organized in a "FinApp" folder on Google Drive

## Prerequisites

### Backend Requirements

- Node.js server running with MongoDB connection
- Google Service Account credentials file (google-credentials.json)
- Environment variables configured

### Google Cloud Setup

1. Create a Google Cloud Project
2. Enable Google Drive API and Google Sheets API
3. Create a Service Account
4. Download Service Account JSON key file
5. Place the JSON file as `google-credentials.json` in the server root directory

### Google Apps Script Setup

1. Access Google Apps Script at https://script.google.com
2. Create a new project
3. Copy the code from `google-apps-script.js`
4. Configure Script Properties

## Configuration

### Backend Environment Variables

Add these variables to your `.env` file:

```
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-credentials.json
GOOGLE_SHEETS_ENABLE_SCHEDULED_SYNC=true
GOOGLE_SHEETS_SYNC_CRON=*/15 * * * *
```

- `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`: Path to the Service Account JSON key file
- `GOOGLE_SHEETS_ENABLE_SCHEDULED_SYNC`: Enable/disable automatic sync (true/false)
- `GOOGLE_SHEETS_SYNC_CRON`: Cron expression for sync schedule (default: `*/15 * * * *` - every 15 minutes)

### Google Apps Script Properties

In Google Apps Script, go to Project Settings > Script Properties and add:

- `API_BASE_URL`: Your backend API base URL (e.g., `https://your-domain.com`)

## Google Apps Script Setup

### Step 1: Create Script

1. Open https://script.google.com
2. Click "New Project"
3. Name it "FinApp Google Sheets Creator"
4. Copy all code from `google-apps-script.js` into the editor

### Step 2: Configure Properties

1. Click the gear icon (Project Settings)
2. Scroll to "Script Properties"
3. Click "Add script property"
4. Property: `API_BASE_URL`
5. Value: Your backend API URL
6. Click "Save script properties"

### Step 3: Test Connection

1. In the Apps Script editor, select `testGetVirtualAccounts` from the function dropdown
2. Click Run
3. Check the execution log for any errors
4. Verify that virtual accounts are retrieved successfully

### Step 4: Run Manually

1. Select `main` from the function dropdown
2. Click Run
3. Review the execution log to see which sheets were created
4. Check Google Drive for the "FinApp" folder and new sheets

### Step 5: Setup Automatic Trigger

1. Select `setupTrigger` from the function dropdown
2. Click Run
3. This will create a daily trigger that runs at midnight (00:00)
4. To change the time, modify the `atHour()` value in `setupTrigger()` function

### Available Functions

- `main()`: Main function that checks and creates sheets for all virtual accounts
- `setupTrigger()`: Sets up daily automatic execution
- `deleteTriggers()`: Removes all triggers
- `testGetVirtualAccounts()`: Test function to retrieve virtual accounts
- `testCheckReport()`: Test function to check if a report exists
- `testCreateSheet()`: Test function to create a single test sheet

## Usage Workflow

### Initial Setup

1. Configure backend environment variables
2. Place `google-credentials.json` in server root
3. Start the backend server
4. Setup Google Apps Script (see Google Apps Script Setup section)
5. Run `main()` function in Apps Script to create initial sheets
6. Verify sheets are created in Google Drive "FinApp" folder
7. Setup automatic trigger using `setupTrigger()`

### Daily Operations

1. Google Apps Script automatically runs at midnight (configurable)
2. Checks all virtual accounts for missing reports
3. Creates new sheets for accounts without reports for current month
4. Registers new sheets in database
5. Backend cron job syncs data every 15 minutes to all existing sheets

### Manual Operations

#### Create Sheets Manually

1. Open Google Apps Script
2. Select `main` function
3. Click Run
4. Check execution log for results

#### Sync Data Manually

Use the manual sync endpoints:

```bash
# Sync all accounts
curl -X POST http://localhost:3000/google-sheets/sync/all

# Sync single account
curl -X POST "http://localhost:3000/google-sheets/sync/account?virtualAccountId=subaccount_at36wwp12yex"
```

## File Naming Convention

Google Sheets are named using this format:

```
[virtualAccountId]_[YYYY-MM]
```

Example:
```
subaccount_at36wwp12yex_2025-12
```

This ensures unique identification and easy sorting by date.

## Scheduled Jobs

### Backend Cron Job

- Frequency: Every 15 minutes (default, configurable via `GOOGLE_SHEETS_SYNC_CRON`)
- Job: `GoogleSheetsSyncJob.syncToGoogleSheets()`
- Action: Syncs transaction data to all existing Google Sheets
- Configurable via:
  - `GOOGLE_SHEETS_ENABLE_SCHEDULED_SYNC`: Enable/disable sync (true/false)
  - `GOOGLE_SHEETS_SYNC_CRON`: Cron expression for schedule (default: `*/15 * * * *`)

### Google Apps Script Trigger

- Frequency: Daily at midnight (00:00)
- Function: `main()`
- Action: Creates new sheets for accounts without reports for current month
- Configurable by modifying `setupTrigger()` function




