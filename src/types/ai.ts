export type AiPortalType =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "student"
  | "parent"
  | "accountant"
  | "receptionist";

export interface AiGlobalSettings {
  enabledGlobally: boolean;
  portalAccess: Record<AiPortalType, boolean>;
  allowedModels: string[];
  defaultModel: string;
  maxTokensPerRequest: number;
  monthlyQuotaPerPlan: Record<string, number>; // planId -> message quota, -1 for unlimited
  rateLimitPerMinute: number;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_AI_SETTINGS: AiGlobalSettings = {
  enabledGlobally: true,
  portalAccess: {
    super_admin: true,
    school_admin: true,
    teacher: true,
    student: true,
    parent: true,
    accountant: true,
    receptionist: false,
  },
  allowedModels: ["gemini-1.5-flash", "gemini-2.0-flash", "gpt-4o-mini"],
  defaultModel: "gemini-1.5-flash",
  maxTokensPerRequest: 2048,
  monthlyQuotaPerPlan: {
    plan_free: 20,
    plan_base: 200,
    plan_professional: 1000,
    plan_enterprise: 5000,
    FULL_CONTROL: -1,
  },
  rateLimitPerMinute: 20,
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
};

export interface AiEntitlementResult {
  allowed: boolean;
  reason?: string;
  status: number; // 200, 403, 503
  portal: AiPortalType;
  planId?: string;
  planName?: string;
  quotaRemaining?: number;
  quotaTotal?: number;
  rolloutState?: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    quickLinks?: Array<{ label: string; href: string }>;
    suggestedFollowUps?: string[];
    metrics?: Record<string, string | number>;
  };
}

export interface AiConversation {
  id: string;
  userId: string;
  instituteId: string;
  portal: AiPortalType;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  messageCount: number;
}

export interface AiUsageRecord {
  id: string;
  userId: string;
  instituteId: string;
  portal: AiPortalType;
  planId: string;
  conversationId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: "SUCCESS" | "FAILED" | "RATE_LIMITED";
  error?: string;
  model: string;
  timestamp: string;
  monthKey: string; // e.g. "2026-09"
}

export type RolloutStage = "DRAFT" | "TESTING" | "ACTIVE" | "PAUSED" | "DISABLED";

export interface FeatureRolloutDefinition {
  id: string;
  featureKey: string;
  name: string;
  description: string;
  stage: RolloutStage;
  targetPlans: string[]; // ["plan_professional", "plan_enterprise"] or ["ALL"]
  targetPortals: AiPortalType[];
  targetInstituteIds: string[]; // empty for all allowed
  rolloutPercentage: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type ShowcaseFrequency = "ONCE" | "UNTIL_DISMISSED" | "EVERY_VERSION" | "ALWAYS";

export interface FeatureShowcase {
  id: string;
  featureKey: string;
  version: string;
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  bannerImage?: string;
  ctaText: string;
  ctaUrl: string;
  secondaryCtaText?: string;
  showOnLandingPage: boolean;
  showOnDashboard: boolean;
  targetPlans: string[]; // ["ALL"] or specific plan IDs
  targetPortals: AiPortalType[];
  frequency: ShowcaseFrequency;
  maxImpressions?: number; // Maximum times to show per user (e.g. 1, 2, 3)
  enabled?: boolean;
  status: "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
  startDate?: string;
  endDate?: string;
  priority: number; // Higher is prioritized
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureShowcaseView {
  id: string;
  userId: string;
  showcaseId: string;
  featureKey: string;
  version: string;
  seenAt: string;
  dismissedAt?: string;
  clickedCtaAt?: string;
}

export const DEFAULT_AI_SHOWCASE: FeatureShowcase = {
  id: "showcase_ai_mode",
  featureKey: "ai_mode",
  version: "1.0",
  title: "Introducing School Study AI",
  subtitle: "Context-Aware School Study Assistant",
  description: "Experience the next-generation AI copilot tailored for modern schools. Analyze attendance, track fee collection, and summarize academic operations effortlessly.",
  badgeText: "NEW AI FEATURE",
  bannerImage: "",
  ctaText: "Try AI Mode",
  ctaUrl: "/admin/ai",
  secondaryCtaText: "Maybe Later",
  showOnLandingPage: true,
  showOnDashboard: true,
  targetPlans: ["ALL"],
  targetPortals: ["super_admin", "school_admin", "teacher", "student"],
  frequency: "UNTIL_DISMISSED",
  status: "PUBLISHED",
  priority: 10,
  createdAt: "2026-09-13T00:00:00.000Z",
  updatedAt: "2026-09-13T00:00:00.000Z",
  updatedBy: "system",
};

