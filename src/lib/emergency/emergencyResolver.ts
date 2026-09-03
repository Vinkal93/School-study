import {
  getGlobalEmergencyControls,
  getSchoolEmergencyControl,
  getUserSecurityControl,
  GlobalEmergencyControls,
  SchoolEmergencyControl,
  UserSecurityControl,
} from "./emergencyEngine";

export interface EmergencyCheckOptions {
  schoolId?: string;
  userId?: string;
  userRole?: string;
  moduleKey?: string;
  featureKey?: string;
  action?: string;
  httpMethod?: string;
  clientSecurityVersion?: number;
}

export interface EmergencyResolutionResult {
  allowed: boolean;
  status: number; // 200, 401, 403, 423, 503
  code: string;
  message: string;
  reason?: string;
  emergencyControls?: {
    systemStatus: string;
    schoolStatus?: string;
    userStatus?: string;
    announcement?: any;
  };
}

/**
 * Normalizes module and feature keys.
 */
function normalizeKey(key?: string): string {
  if (!key) return "";
  const k = key.toLowerCase().trim();
  if (k.includes("student")) return "students";
  if (k.includes("teacher")) return "teachers";
  if (k.includes("attendance")) return "attendance";
  if (k.includes("fee")) return "fees";
  if (k.includes("report")) return "reports";
  if (k.includes("payment") || k.includes("billing")) return "payments";
  if (k.includes("notice")) return "notices";
  return k;
}

/**
 * Core Emergency State Resolver.
 * Enforces strict precedence hierarchy:
 * 1. Global Emergency Mode
 * 2. School Emergency State
 * 3. User Security State
 * 4. RBAC & Role Check
 * 5. Feature & Action Kill Switches
 */
export async function resolveEmergencyAccess(
  options: EmergencyCheckOptions = {}
): Promise<EmergencyResolutionResult> {
  const {
    schoolId = "",
    userId = "",
    userRole = "",
    moduleKey = "",
    featureKey = "",
    action = "",
    httpMethod = "GET",
    clientSecurityVersion,
  } = options;

  const isSuperAdmin = userRole === "super_admin" || userRole === "super_admin_delegate";
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(httpMethod.toUpperCase());

  // 1. Fetch Emergency States
  const globalControls = await getGlobalEmergencyControls();

  // Super Admin Bypass for Super Admin administrative actions
  if (isSuperAdmin) {
    return {
      allowed: true,
      status: 200,
      code: "ALLOWED_SUPER_ADMIN",
      message: "Super Admin emergency access granted.",
      emergencyControls: { systemStatus: globalControls.systemStatus },
    };
  }

  // --------------------------------------------------
  // LAYER 1: GLOBAL SYSTEM EMERGENCY CONTROL
  // --------------------------------------------------
  if (globalControls.systemStatus === "MAINTENANCE" || globalControls.maintenanceMode) {
    return {
      allowed: false,
      status: 503,
      code: "MAINTENANCE_MODE_ACTIVE",
      message: "School Study is currently undergoing scheduled system maintenance. Your data remains safe. Please check back shortly.",
      reason: "GLOBAL_MAINTENANCE",
      emergencyControls: { systemStatus: "MAINTENANCE", announcement: globalControls.emergencyAnnouncement },
    };
  }

  if ((globalControls.systemStatus === "READ_ONLY" || globalControls.readOnlyMode) && isMutation) {
    return {
      allowed: false,
      status: 423,
      code: "SYSTEM_READ_ONLY",
      message: "System is operating in Read-Only protection mode. Data creation and modifications are temporarily disabled.",
      reason: "GLOBAL_READ_ONLY",
      emergencyControls: { systemStatus: "READ_ONLY", announcement: globalControls.emergencyAnnouncement },
    };
  }

  // Check Global Module Kill Switch
  const normalizedModule = normalizeKey(moduleKey || featureKey);
  if (normalizedModule && globalControls.moduleKillSwitches) {
    const moduleState = globalControls.moduleKillSwitches[normalizedModule];
    if (moduleState === "OFF") {
      return {
        allowed: false,
        status: 503,
        code: "MODULE_DISABLED",
        message: `The ${normalizedModule.toUpperCase()} module is temporarily disabled for emergency maintenance.`,
        reason: `MODULE_OFF_${normalizedModule.toUpperCase()}`,
        emergencyControls: { systemStatus: globalControls.systemStatus },
      };
    }
  }

  // Check Granular Action Kill Switch
  if (featureKey && globalControls.featureKillSwitches) {
    const cleanFeature = featureKey.toLowerCase().trim();
    if (globalControls.featureKillSwitches[cleanFeature] === "OFF") {
      return {
        allowed: false,
        status: 503,
        code: "FEATURE_DISABLED",
        message: `Action feature "${featureKey}" is temporarily disabled by system administrators.`,
        reason: `FEATURE_OFF_${cleanFeature.toUpperCase()}`,
        emergencyControls: { systemStatus: globalControls.systemStatus },
      };
    }
  }

  // Check Payment System Emergency Switch
  if (normalizedModule === "payments" && globalControls.paymentSystemStatus === "OFFLINE") {
    return {
      allowed: false,
      status: 503,
      code: "ONLINE_PAYMENTS_DISABLED",
      message: "Online payments are temporarily unavailable due to system emergency. Please try again later.",
      reason: "PAYMENT_GATEWAY_OFFLINE",
      emergencyControls: { systemStatus: globalControls.systemStatus },
    };
  }

  // --------------------------------------------------
  // LAYER 2: SCHOOL EMERGENCY CONTROL
  // --------------------------------------------------
  if (schoolId) {
    const schoolControl = await getSchoolEmergencyControl(schoolId);

    if (schoolControl.status === "PAUSED") {
      return {
        allowed: false,
        status: 503,
        code: "SCHOOL_PAUSED",
        message: "Your institution's portal access is temporarily paused by platform administration.",
        reason: schoolControl.reason || "SCHOOL_PAUSED",
        emergencyControls: { systemStatus: globalControls.systemStatus, schoolStatus: "PAUSED" },
      };
    }

    if (schoolControl.status === "READ_ONLY" && isMutation) {
      return {
        allowed: false,
        status: 423,
        code: "SCHOOL_READ_ONLY",
        message: "Your institution is currently operating in Read-Only emergency mode. Modifications are temporarily restricted.",
        reason: schoolControl.reason || "SCHOOL_READ_ONLY",
        emergencyControls: { systemStatus: globalControls.systemStatus, schoolStatus: "READ_ONLY" },
      };
    }

    if (normalizedModule === "payments" && schoolControl.disablePayments) {
      return {
        allowed: false,
        status: 503,
        code: "SCHOOL_PAYMENTS_DISABLED",
        message: "Online payment gateway is temporarily disabled for your school.",
        reason: "SCHOOL_PAYMENTS_DISABLED",
        emergencyControls: { systemStatus: globalControls.systemStatus, schoolStatus: schoolControl.status },
      };
    }

    if (normalizedModule === "fees" && schoolControl.disableFees && isMutation) {
      return {
        allowed: false,
        status: 503,
        code: "SCHOOL_FEES_MUTATION_DISABLED",
        message: "Fee modifications and transactions are temporarily disabled for your school.",
        reason: "SCHOOL_FEES_DISABLED",
        emergencyControls: { systemStatus: globalControls.systemStatus, schoolStatus: schoolControl.status },
      };
    }
  }

  // --------------------------------------------------
  // LAYER 3: USER SECURITY & SESSION STATE
  // --------------------------------------------------
  if (userId) {
    const userControl = await getUserSecurityControl(userId);

    if (userControl.status === "SUSPENDED" || userControl.status === "BLOCKED") {
      return {
        allowed: false,
        status: 403,
        code: "ACCOUNT_SUSPENDED",
        message: "Your user account is suspended or blocked by security administration.",
        reason: userControl.reason || "USER_SUSPENDED",
        emergencyControls: { systemStatus: globalControls.systemStatus, userStatus: userControl.status },
      };
    }

    if (
      typeof clientSecurityVersion === "number" &&
      typeof userControl.securityVersion === "number" &&
      userControl.securityVersion > clientSecurityVersion
    ) {
      return {
        allowed: false,
        status: 401,
        code: "SESSION_REVOKED",
        message: "Your active session has been revoked by security administration. Please log in again.",
        reason: "SECURITY_VERSION_MISMATCH",
        emergencyControls: { systemStatus: globalControls.systemStatus },
      };
    }
  }

  return {
    allowed: true,
    status: 200,
    code: "ALLOWED",
    message: "Access permitted under current emergency controls.",
    emergencyControls: { systemStatus: globalControls.systemStatus },
  };
}
