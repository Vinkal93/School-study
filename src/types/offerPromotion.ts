export type OfferDiscountType =
  | "PERCENTAGE"
  | "FIXED_AMOUNT"
  | "FREE_TRIAL_EXTENSION"
  | "CUSTOM_PLAN_PRICE";

export type OfferStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SCHEDULED"
  | "PAUSED"
  | "EXPIRED"
  | "ARCHIVED";

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "ARCHIVED";

export type TargetAudience =
  | "ALL"
  | "NEW_CUSTOMERS_ONLY"
  | "EXISTING_CUSTOMERS_ONLY"
  | "SPECIFIC_SCHOOLS";

export interface OfferPromotion {
  id: string; // e.g. OFR-102938
  name: string; // Internal name / Title
  title?: string;
  description?: string;
  code: string; // Normalized uppercase coupon code e.g. DIWALI50
  discountType: OfferDiscountType;
  discountValue: number; // % (e.g. 25) or Fixed Paise (e.g. 50000 = ₹500)
  maxDiscountCapPaise?: number; // e.g. 100000 = ₹1,000 max cap for % discounts
  minOrderAmountPaise: number; // 0 for no minimum
  maxTotalRedemptions: number; // -1 for unlimited
  maxRedemptionsPerSchool: number; // 1 or -1 for unlimited
  maxRedemptionsPerUser: number; // 1 or -1 for unlimited
  startDate: string; // ISO date
  endDate: string | null; // ISO date or null for never expires
  applicablePlans: string[]; // ["plan_starter", "plan_professional", "plan_enterprise"] or ["ALL"]
  applicableBillingCycles: ("monthly" | "annual" | "all")[];
  targetAudience: TargetAudience;
  targetSchoolIds?: string[];
  autoApply: boolean;
  priority: number; // Higher number = higher precedence
  isStackable: boolean;
  campaignId?: string;
  campaignName?: string;
  status: OfferStatus;
  termsAndConditions?: string;
  notes?: string;
  internalReason?: string;
  usedCount: number;
  totalDiscountGivenPaise: number;
  totalRevenueGeneratedPaise: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionCampaign {
  id: string; // CMP-892102
  name: string;
  description?: string;
  startDate: string; // ISO
  endDate: string | null; // ISO
  budgetLimitPaise?: number; // Cap on total discount given
  totalSpentPaise: number; // Total discount given
  totalRevenuePaise: number; // Total revenue generated
  attachedOfferIds: string[];
  targetPlans: string[];
  status: CampaignStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CouponRedemptionRecord {
  id: string;
  offerId: string;
  couponCode: string;
  campaignId?: string;
  schoolId: string;
  schoolName?: string;
  userId: string;
  userEmail?: string;
  orderId: string;
  paymentId: string;
  invoiceId?: string;
  planId: string;
  planName: string;
  billingCycle: "monthly" | "annual";
  baseAmountPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  finalAmountPaise: number;
  redeemedAt: string;
  status: "SUCCESS" | "REFUNDED" | "CANCELLED";
}

export interface OffersDashboardMetrics {
  totalOffers: number;
  activeOffers: number;
  scheduledOffers: number;
  expiredOffers: number;
  pausedOffers: number;
  totalRedemptions: number;
  totalDiscountGivenPaise: number;
  totalDiscountGivenRupees: number;
  totalRevenueGeneratedPaise: number;
  totalRevenueGeneratedRupees: number;
  conversionRate: number; // Percentage e.g. 14.5%
  totalCampaigns: number;
  activeCampaigns: number;
}

export interface ValidateCouponInput {
  code: string;
  planId: string;
  billingCycle: "monthly" | "annual";
  schoolId?: string;
  userId?: string;
  baseAmountPaise?: number;
  isFirstPurchase?: boolean;
}

export interface ValidateCouponResponse {
  isValid: boolean;
  code: string;
  offerId?: string;
  discountPaise: number;
  discountRupees: number;
  discountType?: OfferDiscountType;
  discountValue?: number;
  appliedCap?: boolean;
  baseAmountPaise: number;
  taxableAmountPaise: number;
  gstAmountPaise: number;
  finalAmountPaise: number;
  finalAmountRupees: number;
  terms?: string;
  error?: string;
}

export interface CreateOfferPromotionInput {
  name: string;
  title?: string;
  description?: string;
  code: string;
  discountType: OfferDiscountType;
  discountValue: number;
  maxDiscountCapPaise?: number;
  minOrderAmountPaise?: number;
  maxTotalRedemptions?: number;
  maxRedemptionsPerSchool?: number;
  maxRedemptionsPerUser?: number;
  startDate?: string;
  endDate?: string | null;
  applicablePlans?: string[];
  applicableBillingCycles?: ("monthly" | "annual" | "all")[];
  targetAudience?: TargetAudience;
  targetSchoolIds?: string[];
  autoApply?: boolean;
  priority?: number;
  isStackable?: boolean;
  campaignId?: string;
  status?: OfferStatus;
  termsAndConditions?: string;
  notes?: string;
  internalReason?: string;
}
