import { Timestamp } from "firebase/firestore";

export type BackupSyncType = "manual" | "daily" | "live" | "test";
export type BackupSyncStatus = "healthy" | "success" | "warning" | "failed";

export interface GoogleSheetsConfig {
  id: string;
  schoolId: string; // "global" for Super Admin master sheet, or specific schoolId
  schoolName: string;
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  webAppUrl: string; // Google Apps Script deployed Web App URL
  syncSecret: string; // Shared secret for HMAC / token auth
  autoSyncEnabled: boolean;
  syncSchedule: "realtime" | "hourly" | "daily_2am" | "manual";
  lastSyncAt?: string;
  lastSyncStatus?: BackupSyncStatus;
  lastSyncError?: string;
  lastBackupCounts?: Record<string, number>;
  connectedAt?: string;
  connectedBy?: string;
  updatedAt?: string | Timestamp;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  schoolId: string;
  schoolName: string;
  syncType: BackupSyncType;
  status: BackupSyncStatus;
  recordCounts: Record<string, number>;
  durationMs: number;
  error?: string;
  integrityCheck?: {
    passed: boolean;
    discrepancies: Record<string, { firestore: number; sheets: number }>;
  };
  triggeredBy?: string;
  createdAt: string | Timestamp;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  schoolId: string;
  schoolName: string;
  backupType: "full" | "pre_import" | "scheduled";
  recordCounts: Record<string, number>;
  status: "success" | "failed";
  durationMs: number;
  checksum: string; // SHA-256 integrity hash
  snapshotData?: Record<string, any[]>;
  storageBackupPath?: string;
  error?: string;
  createdAt: string | Timestamp;
}

export type SupportedImportModule = "students" | "teachers" | "classes" | "fees" | "attendance";

export interface ImportColumnMapping {
  fileColumn: string;
  targetField: string;
  isRequired: boolean;
}

export interface ImportValidationError {
  rowNumber: number;
  field: string;
  value: any;
  reason: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  newRows: number;
  detectedColumns: string[];
  mappedFields: Record<string, string>;
  previewData: Record<string, any>[];
  allValidRecords?: Record<string, any>[];
  validationErrors: ImportValidationError[];
  duplicates: Array<{ rowNumber: number; keyField: string; keyValue: string; existingRecordId: string }>;
}

export interface ImportExecutionResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  preImportSnapshotId: string;
  fallbackToClient?: boolean;
  summary?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  errors?: string[];
}
