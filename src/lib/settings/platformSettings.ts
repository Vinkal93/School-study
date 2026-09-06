/**
 * PLATFORM SETTINGS & CONFIGURATION SCHEMA
 * 
 * Central authoritative model for platform-wide settings, operational defaults,
 * security policies, storage constraints, and integration health.
 * 
 * Strict Single Source of Truth Separation:
 * - PLATFORM SETTINGS: Operational platform defaults & general preferences (siteSettings/platformSettings)
 * - CMS SETTINGS: Managed by siteSettings/global (Hero, announcements, FAQs, testimonials, SEO)
 * - BILLING/PRICING: Managed by plans & billingAccessPolicy
 * - EMERGENCY SETTINGS: Managed by siteSettings/emergency_controls
 * - PORTAL UI: Managed by siteSettings/portalUI
 * - SECRETS: Never stored in Firestore documents or returned to client browsers.
 */

export interface GeneralPlatformSettings {
  platformName: string;
  platformTagline: string;
  defaultTimezone: string;
  defaultLocale: string;
  defaultCurrency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  supportEmail: string;
  supportPhone: string;
  defaultPaginationSize: number;
  systemEmailSenderName: string;
}

export interface SecurityPolicySettings {
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  maxLoginAttempts: number;
  requireReAuthForCritical: boolean;
  minPasswordLength: number;
  requireSpecialCharInPassword: boolean;
  requireDigitInPassword: boolean;
  securityNotificationEmail: string;
}

export interface AuthenticationSettings {
  allowPublicSignup: boolean;
  requireEmailVerification: boolean;
  allowGoogleAuth: boolean;
  allowPasswordAuth: boolean;
  defaultUserStatus: "active" | "pending_verification";
  accountActivationPolicy: "automatic" | "admin_approval";
}

export interface SessionSettings {
  maxConcurrentSessionsPerUser: number;
  enforceSingleSessionForAdmin: boolean;
  tokenRefreshIntervalMinutes: number;
}

export interface NotificationDefaultSettings {
  enableInAppNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enableWhatsAppNotifications: boolean;
  defaultNotificationFrequency: "instant" | "hourly" | "daily_digest";
}

export interface IntegrationSettings {
  emailProvider: "smtp" | "resend" | "sendgrid" | "none";
  emailSenderAddress: string;
  smsProvider: "msg91" | "fast2sms" | "twilio" | "none";
  whatsAppProvider: "meta_cloud" | "twilio" | "none";
}

export interface StorageSettings {
  allowedMimeTypes: string[];
  maxFileUploadSizeMb: number;
  enablePublicMediaBucket: boolean;
  autoDeleteTempUploadsDays: number;
}

export interface BackupRecoverySettings {
  backupFrequency: "daily" | "weekly";
  lastBackupTimestamp: string;
  backupStatus: "HEALTHY" | "DEGRADED" | "UNKNOWN";
  restoreVerificationStatus: "NOT_VERIFIED" | "VERIFIED";
  lastRestoreTestTimestamp: string | null;
}

export interface DataPrivacySettings {
  auditLogRetentionDays: number;
  activityLogRetentionDays: number;
  exportRetentionDays: number;
  immutableFinancialRetention: boolean;
}

export interface SystemDefaultsSettings {
  defaultAcademicYear: string;
  defaultFeeCycle: "monthly" | "quarterly" | "annual";
  defaultReportFormat: "pdf" | "xlsx" | "csv";
}

export interface DeveloperEnvironmentInfo {
  environment: "production" | "staging" | "development";
  appVersion: string;
  buildId: string;
  framework: string;
  nodeVersion: string;
}

export interface PlatformSettingsDoc {
  general: GeneralPlatformSettings;
  security: SecurityPolicySettings;
  auth: AuthenticationSettings;
  sessions: SessionSettings;
  notifications: NotificationDefaultSettings;
  integrations: IntegrationSettings;
  storage: StorageSettings;
  backup: BackupRecoverySettings;
  privacy: DataPrivacySettings;
  systemDefaults: SystemDefaultsSettings;
  environment: DeveloperEnvironmentInfo;
  updatedAt?: string;
  updatedByUid?: string;
  updatedByName?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsDoc = {
  general: {
    platformName: "School Study",
    platformTagline: "Next-Gen Cloud School ERP Platform",
    defaultTimezone: "Asia/Kolkata",
    defaultLocale: "en-IN",
    defaultCurrency: "INR",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    supportEmail: "sbci224234@gmail.com",
    supportPhone: "+91 9118245636",
    defaultPaginationSize: 20,
    systemEmailSenderName: "School Study Cloud",
  },
  security: {
    sessionTimeoutMinutes: 1440, // 24 hours
    idleTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    requireReAuthForCritical: true,
    minPasswordLength: 8,
    requireSpecialCharInPassword: true,
    requireDigitInPassword: true,
    securityNotificationEmail: "sbci224234@gmail.com",
  },
  auth: {
    allowPublicSignup: true,
    requireEmailVerification: false,
    allowGoogleAuth: true,
    allowPasswordAuth: true,
    defaultUserStatus: "active",
    accountActivationPolicy: "automatic",
  },
  sessions: {
    maxConcurrentSessionsPerUser: 3,
    enforceSingleSessionForAdmin: false,
    tokenRefreshIntervalMinutes: 60,
  },
  notifications: {
    enableInAppNotifications: true,
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    enableWhatsAppNotifications: false,
    defaultNotificationFrequency: "instant",
  },
  integrations: {
    emailProvider: "smtp",
    emailSenderAddress: "no-reply@sbci.online",
    smsProvider: "none",
    whatsAppProvider: "none",
  },
  storage: {
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    maxFileUploadSizeMb: 15,
    enablePublicMediaBucket: false,
    autoDeleteTempUploadsDays: 7,
  },
  backup: {
    backupFrequency: "daily",
    lastBackupTimestamp: new Date().toISOString(),
    backupStatus: "HEALTHY",
    restoreVerificationStatus: "NOT_VERIFIED", // Truthful: not verified until full restore test drill
    lastRestoreTestTimestamp: null,
  },
  privacy: {
    auditLogRetentionDays: 365,
    activityLogRetentionDays: 180,
    exportRetentionDays: 30,
    immutableFinancialRetention: true, // Permanent invariant
  },
  systemDefaults: {
    defaultAcademicYear: "2026-2027",
    defaultFeeCycle: "monthly",
    defaultReportFormat: "pdf",
  },
  environment: {
    environment: "production",
    appVersion: "2.4.0",
    buildId: "2026.09.06-prod",
    framework: "Next.js 15.x App Router",
    nodeVersion: "Node.js 20+ LTS",
  },
};

/**
 * Validates and sanitizes updated platform settings.
 * Fails closed on malicious input, illegal ranges, or attempts to weaken immutable security rules.
 */
export function validateAndSanitizePlatformSettings(
  input: any,
  current: PlatformSettingsDoc = DEFAULT_PLATFORM_SETTINGS
): { isValid: boolean; sanitized: PlatformSettingsDoc; errors: string[] } {
  const errors: string[] = [];
  const sanitized: PlatformSettingsDoc = JSON.parse(JSON.stringify(current));

  if (!input || typeof input !== "object") {
    return { isValid: false, sanitized, errors: ["Invalid settings payload."] };
  }

  // 1. General Settings Validation
  if (input.general && typeof input.general === "object") {
    if (typeof input.general.platformName === "string" && input.general.platformName.trim().length > 0) {
      sanitized.general.platformName = input.general.platformName.trim().substring(0, 100);
    }
    if (typeof input.general.platformTagline === "string") {
      sanitized.general.platformTagline = input.general.platformTagline.trim().substring(0, 200);
    }
    if (typeof input.general.defaultTimezone === "string" && input.general.defaultTimezone.trim()) {
      sanitized.general.defaultTimezone = input.general.defaultTimezone.trim();
    }
    if (typeof input.general.defaultCurrency === "string" && input.general.defaultCurrency.trim()) {
      sanitized.general.defaultCurrency = input.general.defaultCurrency.trim().toUpperCase().substring(0, 5);
    }
    if (typeof input.general.dateFormat === "string" && input.general.dateFormat.trim()) {
      sanitized.general.dateFormat = input.general.dateFormat.trim();
    }
    if (input.general.timeFormat === "12h" || input.general.timeFormat === "24h") {
      sanitized.general.timeFormat = input.general.timeFormat;
    }
    if (typeof input.general.supportEmail === "string" && input.general.supportEmail.includes("@")) {
      sanitized.general.supportEmail = input.general.supportEmail.trim().toLowerCase();
    }
    if (typeof input.general.supportPhone === "string") {
      sanitized.general.supportPhone = input.general.supportPhone.trim();
    }
    if (typeof input.general.defaultPaginationSize === "number") {
      if (input.general.defaultPaginationSize >= 5 && input.general.defaultPaginationSize <= 100) {
        sanitized.general.defaultPaginationSize = Math.round(input.general.defaultPaginationSize);
      } else {
        errors.push("Pagination size must be between 5 and 100.");
      }
    }
  }

  // 2. Security Settings Validation
  if (input.security && typeof input.security === "object") {
    if (typeof input.security.sessionTimeoutMinutes === "number") {
      if (input.security.sessionTimeoutMinutes >= 15 && input.security.sessionTimeoutMinutes <= 10080) {
        sanitized.security.sessionTimeoutMinutes = Math.round(input.security.sessionTimeoutMinutes);
      } else {
        errors.push("Session timeout must be between 15 and 10080 minutes (7 days).");
      }
    }
    if (typeof input.security.idleTimeoutMinutes === "number") {
      if (input.security.idleTimeoutMinutes >= 5 && input.security.idleTimeoutMinutes <= 1440) {
        sanitized.security.idleTimeoutMinutes = Math.round(input.security.idleTimeoutMinutes);
      } else {
        errors.push("Idle timeout must be between 5 and 1440 minutes.");
      }
    }
    if (typeof input.security.maxLoginAttempts === "number") {
      if (input.security.maxLoginAttempts >= 3 && input.security.maxLoginAttempts <= 20) {
        sanitized.security.maxLoginAttempts = Math.round(input.security.maxLoginAttempts);
      } else {
        errors.push("Max login attempts must be between 3 and 20.");
      }
    }
    if (typeof input.security.requireReAuthForCritical === "boolean") {
      sanitized.security.requireReAuthForCritical = input.security.requireReAuthForCritical;
    }
    if (typeof input.security.minPasswordLength === "number") {
      if (input.security.minPasswordLength >= 6 && input.security.minPasswordLength <= 32) {
        sanitized.security.minPasswordLength = Math.round(input.security.minPasswordLength);
      } else {
        errors.push("Minimum password length must be between 6 and 32 characters.");
      }
    }
    if (typeof input.security.requireSpecialCharInPassword === "boolean") {
      sanitized.security.requireSpecialCharInPassword = input.security.requireSpecialCharInPassword;
    }
    if (typeof input.security.requireDigitInPassword === "boolean") {
      sanitized.security.requireDigitInPassword = input.security.requireDigitInPassword;
    }
    if (typeof input.security.securityNotificationEmail === "string" && input.security.securityNotificationEmail.includes("@")) {
      sanitized.security.securityNotificationEmail = input.security.securityNotificationEmail.trim().toLowerCase();
    }
  }

  // 3. Auth Settings Validation
  if (input.auth && typeof input.auth === "object") {
    if (typeof input.auth.allowPublicSignup === "boolean") {
      sanitized.auth.allowPublicSignup = input.auth.allowPublicSignup;
    }
    if (typeof input.auth.requireEmailVerification === "boolean") {
      sanitized.auth.requireEmailVerification = input.auth.requireEmailVerification;
    }
    if (typeof input.auth.allowGoogleAuth === "boolean") {
      sanitized.auth.allowGoogleAuth = input.auth.allowGoogleAuth;
    }
    if (typeof input.auth.allowPasswordAuth === "boolean") {
      sanitized.auth.allowPasswordAuth = input.auth.allowPasswordAuth;
    }
  }

  // 4. Session Settings Validation
  if (input.sessions && typeof input.sessions === "object") {
    if (typeof input.sessions.maxConcurrentSessionsPerUser === "number") {
      if (input.sessions.maxConcurrentSessionsPerUser >= 1 && input.sessions.maxConcurrentSessionsPerUser <= 10) {
        sanitized.sessions.maxConcurrentSessionsPerUser = Math.round(input.sessions.maxConcurrentSessionsPerUser);
      } else {
        errors.push("Max concurrent sessions must be between 1 and 10.");
      }
    }
    if (typeof input.sessions.enforceSingleSessionForAdmin === "boolean") {
      sanitized.sessions.enforceSingleSessionForAdmin = input.sessions.enforceSingleSessionForAdmin;
    }
  }

  // 5. Notifications Validation
  if (input.notifications && typeof input.notifications === "object") {
    if (typeof input.notifications.enableInAppNotifications === "boolean") {
      sanitized.notifications.enableInAppNotifications = input.notifications.enableInAppNotifications;
    }
    if (typeof input.notifications.enableEmailNotifications === "boolean") {
      sanitized.notifications.enableEmailNotifications = input.notifications.enableEmailNotifications;
    }
    if (typeof input.notifications.enableSmsNotifications === "boolean") {
      sanitized.notifications.enableSmsNotifications = input.notifications.enableSmsNotifications;
    }
    if (typeof input.notifications.enableWhatsAppNotifications === "boolean") {
      sanitized.notifications.enableWhatsAppNotifications = input.notifications.enableWhatsAppNotifications;
    }
  }

  // 6. Storage Settings Validation
  if (input.storage && typeof input.storage === "object") {
    if (typeof input.storage.maxFileUploadSizeMb === "number") {
      if (input.storage.maxFileUploadSizeMb >= 1 && input.storage.maxFileUploadSizeMb <= 50) {
        sanitized.storage.maxFileUploadSizeMb = Math.round(input.storage.maxFileUploadSizeMb);
      } else {
        errors.push("Max upload size must be between 1 MB and 50 MB.");
      }
    }
    if (Array.isArray(input.storage.allowedMimeTypes)) {
      sanitized.storage.allowedMimeTypes = input.storage.allowedMimeTypes.filter(
        (m: any) => typeof m === "string" && m.includes("/")
      );
    }
  }

  // 7. Privacy & Data Retention Validation
  if (input.privacy && typeof input.privacy === "object") {
    if (typeof input.privacy.auditLogRetentionDays === "number") {
      if (input.privacy.auditLogRetentionDays >= 90) {
        sanitized.privacy.auditLogRetentionDays = Math.round(input.privacy.auditLogRetentionDays);
      } else {
        errors.push("Audit log retention cannot be reduced below 90 days.");
      }
    }
    if (typeof input.privacy.activityLogRetentionDays === "number") {
      if (input.privacy.activityLogRetentionDays >= 30) {
        sanitized.privacy.activityLogRetentionDays = Math.round(input.privacy.activityLogRetentionDays);
      } else {
        errors.push("Activity log retention cannot be reduced below 30 days.");
      }
    }
    // Immutable financial retention must ALWAYS be true
    sanitized.privacy.immutableFinancialRetention = true;
  }

  // 8. System Defaults Validation
  if (input.systemDefaults && typeof input.systemDefaults === "object") {
    if (typeof input.systemDefaults.defaultAcademicYear === "string" && input.systemDefaults.defaultAcademicYear.trim()) {
      sanitized.systemDefaults.defaultAcademicYear = input.systemDefaults.defaultAcademicYear.trim();
    }
    if (["monthly", "quarterly", "annual"].includes(input.systemDefaults.defaultFeeCycle)) {
      sanitized.systemDefaults.defaultFeeCycle = input.systemDefaults.defaultFeeCycle;
    }
    if (["pdf", "xlsx", "csv"].includes(input.systemDefaults.defaultReportFormat)) {
      sanitized.systemDefaults.defaultReportFormat = input.systemDefaults.defaultReportFormat;
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
}
