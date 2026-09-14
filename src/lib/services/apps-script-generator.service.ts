/**
 * GOOGLE APPS SCRIPT GENERATOR SERVICE
 * 
 * Dynamically generates production-ready Google Apps Script code for Google Sheets.
 * Compatible with School Study backend live synchronization and batch export/import.
 */

export interface GeneratorOptions {
  schoolName?: string;
  defaultSecret?: string;
  spreadsheetId?: string;
}

export function generateGoogleAppsScript(options: GeneratorOptions = {}): string {
  const schoolLabel = options.schoolName || "School Study";
  const defaultSecret = options.defaultSecret || "SCHOOL_STUDY_SECURE_SYNC_SECRET";

  return `/**
 * ==============================================================================
 * SCHOOL STUDY — GOOGLE SHEETS LIVE BACKUP & SYNCHRONIZATION ENGINE
 * Target Organization: ${schoolLabel}
 * Generated: ${new Date().toISOString()}
 * ==============================================================================
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. In your Google Sheet, click on "Extensions" > "Apps Script".
 * 2. Delete any code in Code.gs and PASTE THIS ENTIRE SCRIPT.
 * 3. Click "Deploy" (top-right) > "New deployment".
 * 4. Click the gear icon (Select type) > "Web app".
 * 5. Fill in the deployment details:
 *    - Description: School Study Backup Web App
 *    - Execute as: "Me" (your Google account)
 *    - Who has access: "Anyone" (authentication is enforced via secret token)
 * 6. Click "Deploy", authorize permissions when prompted.
 * 7. Copy the "Web app URL" and paste it into the School Study Super Admin panel.
 * 8. Enter the Sync Secret below into School Study.
 * 
 * SCRIPT PROPERTY SETUP (RECOMMENDED):
 * - You can either set the SYNC_SECRET in Script Properties (Project Settings > Script Properties)
 *   or rely on the default token set below.
 * ==============================================================================
 */

/**
 * Resolves the authoritative sync secret from Script Properties (Recommended)
 * or server-injected deployment token.
 */
function getAuthoritativeSecret() {
  var propSecret = PropertiesService.getScriptProperties().getProperty("SYNC_SECRET");
  if (propSecret && propSecret.toString().trim().length > 0) {
    return propSecret.toString().trim();
  }
  return "${defaultSecret}";
}

/**
 * Handles incoming POST requests from School Study backend.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent requests to avoid sheet collisions
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return createJsonResponse({
      success: false,
      error: "Sheet is currently busy processing another sync request. Please retry.",
      code: "LOCK_TIMEOUT"
    }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "Empty request payload" }, 400);
    }

    var payload = JSON.parse(e.postData.contents);
    var providedSecret = payload.syncSecret || (e.parameter && e.parameter.secret);

    // Verify secret against Script Properties SYNC_SECRET or authorized server token
    var expectedSecret = getAuthoritativeSecret();
    if (!providedSecret || providedSecret !== expectedSecret) {
      return createJsonResponse({
        success: false,
        error: "Unauthorized: Invalid or missing sync secret.",
        code: "INVALID_SECRET",
        hint: "Configure Script Properties in Apps Script Project Settings -> Script Properties -> Name: SYNC_SECRET"
      }, 401);
    }

    var action = payload.action || "batch_upsert";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ACTION 1: Ping / Health Check
    if (action === "ping") {
      var sheets = ss.getSheets().map(function(s) { return s.getName(); });
      return createJsonResponse({
        success: true,
        message: "School Study Google Sheet Mirror is online and healthy.",
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        sheets: sheets,
        timestamp: new Date().toISOString()
      });
    }

    // ACTION 2: Get Tab Row Counts / Statistics
    if (action === "get_stats") {
      var stats = {};
      ss.getSheets().forEach(function(s) {
        var name = s.getName();
        if (!name.startsWith("_")) {
          stats[name] = Math.max(0, s.getLastRow() - 1); // Exclude header row
        }
      });
      return createJsonResponse({
        success: true,
        spreadsheetId: ss.getId(),
        stats: stats,
        timestamp: new Date().toISOString()
      });
    }

    // ACTION 3: Batch Upsert to Sheet (Zero Row Duplication)
    if (action === "batch_upsert") {
      var sheetName = payload.sheetName;
      var headers = payload.headers || [];
      var records = payload.records || [];

      if (!sheetName || !Array.isArray(headers) || headers.length === 0) {
        return createJsonResponse({ success: false, error: "Missing sheetName or headers." }, 400);
      }

      var result = executeUpsert(ss, sheetName, headers, records, payload.isFullSnapshot);
      logSyncActivity(ss, sheetName, "BATCH_UPSERT", result.updatedCount + result.insertedCount, true, "");

      return createJsonResponse({
        success: true,
        sheetName: sheetName,
        totalReceived: records.length,
        updatedCount: result.updatedCount,
        insertedCount: result.insertedCount,
        totalRows: result.totalRows,
        timestamp: new Date().toISOString()
      });
    }

    // ACTION 4: Versioned Historical Snapshot
    if (action === "create_snapshot") {
      var snapshotName = payload.snapshotName || ("Backup_" + Utilities.formatDate(new Date(), "GMT+5:30", "yyyy_MM_dd"));
      var snapshotData = payload.data || {}; // { [sheetName]: { headers: [], records: [] } }

      var snapshotResults = {};
      Object.keys(snapshotData).forEach(function(sName) {
        var sInfo = snapshotData[sName];
        var tabTitle = sName + "_" + Utilities.formatDate(new Date(), "GMT+5:30", "yyyyMMdd");
        var res = executeUpsert(ss, tabTitle, sInfo.headers, sInfo.records, true);
        snapshotResults[sName] = res;
      });

      return createJsonResponse({
        success: true,
        snapshotName: snapshotName,
        results: snapshotResults,
        timestamp: new Date().toISOString()
      });
    }

    return createJsonResponse({ success: false, error: "Unsupported action: " + action }, 400);

  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.message || "Internal Apps Script error",
      stack: err.stack
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles incoming GET requests for simple health monitoring.
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return createJsonResponse({
    status: "online",
    name: ss.getName(),
    spreadsheetId: ss.getId(),
    service: "School Study Backup Mirror",
    timestamp: new Date().toISOString()
  });
}

/**
 * Executes high-performance row upserting using Column A as the stable Primary Key.
 */
function executeUpsert(ss, sheetName, headers, records, isFullSnapshot) {
  var sheet = ss.getSheetByName(sheetName);
  
  // 1. Create sheet if missing with styled headers
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupSheetFormatting(sheet, headers);
  }

  // 2. Ensure headers match
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    setupSheetFormatting(sheet, headers);
  }

  if (!records || records.length === 0) {
    return { updatedCount: 0, insertedCount: 0, totalRows: Math.max(0, sheet.getLastRow() - 1) };
  }

  // 3. Build index map of existing IDs from Column A (Primary Key)
  var lastRow = sheet.getLastRow();
  var idToRowIndex = {};
  if (lastRow > 1) {
    var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < existingIds.length; i++) {
      var idVal = String(existingIds[i][0] || "").trim();
      if (idVal) {
        idToRowIndex[idVal] = i + 2; // 1-based row index in Sheet
      }
    }
  }

  var updatedCount = 0;
  var rowsToAppend = [];

  for (var r = 0; r < records.length; r++) {
    var rec = records[r];
    var rowValues = [];

    for (var h = 0; h < headers.length; h++) {
      var colKey = headers[h];
      var rawVal = rec[colKey];
      if (rawVal === undefined || rawVal === null) {
        rowValues.push("");
      } else if (typeof rawVal === "object") {
        rowValues.push(JSON.stringify(rawVal));
      } else {
        var strVal = String(rawVal);
        // Formula injection protection: Prepend single quote if value starts with formula triggers
        if (/^[=+\\-@]/.test(strVal)) {
          strVal = "'" + strVal;
        }
        rowValues.push(strVal);
      }
    }

    var primaryId = String(rowValues[0] || "").trim();

    if (primaryId && idToRowIndex[primaryId]) {
      // Row exists: Direct targeted update
      var targetRow = idToRowIndex[primaryId];
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      updatedCount++;
    } else {
      // New record: Queue for bulk append
      rowsToAppend.push(rowValues);
      if (primaryId) {
        idToRowIndex[primaryId] = lastRow + rowsToAppend.length;
      }
    }
  }

  // 4. Batch append new records
  if (rowsToAppend.length > 0) {
    var startAppendRow = sheet.getLastRow() + 1;
    sheet.getRange(startAppendRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }

  return {
    updatedCount: updatedCount,
    insertedCount: rowsToAppend.length,
    totalRows: Math.max(0, sheet.getLastRow() - 1)
  };
}

/**
 * Styles sheet headers, freezes header row, and auto-resizes columns.
 */
function setupSheetFormatting(sheet, headers) {
  sheet.setFrozenRows(1);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#312E81"); // Deep Indigo
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");

  // Auto-resize first 12 columns for readability
  for (var c = 1; c <= Math.min(headers.length, 12); c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * Logs synchronization activity to the internal _SyncLogs tab.
 */
function logSyncActivity(ss, sheetName, action, count, success, error) {
  try {
    var logSheet = ss.getSheetByName("_SyncLogs");
    if (!logSheet) {
      logSheet = ss.insertSheet("_SyncLogs");
      logSheet.appendRow(["Timestamp (IST)", "Sheet Name", "Action", "Records Affected", "Status", "Error"]);
      logSheet.setFrozenRows(1);
      logSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#1F2937").setFontColor("#FFFFFF");
    }
    logSheet.appendRow([
      Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss"),
      sheetName,
      action,
      count,
      success ? "SUCCESS" : "FAILED",
      error || "None"
    ]);
  } catch (e) {
    // Ignore logging failures
  }
}

/**
 * Helper to build standard JSON response.
 */
function createJsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
`;
}
