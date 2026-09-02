"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Zap,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { PageSkeleton } from "@/components/common/skeletons";
import { toast } from "sonner";

// Import Command Center Components
import { SubscriptionAlertBanner } from "@/components/billing/SubscriptionAlertBanner";
import { CurrentPlanHeroCard } from "@/components/billing/CurrentPlanHeroCard";
import { PlanFeaturesIncluded } from "@/components/billing/PlanFeaturesIncluded";
import { PlanLimitsProgress } from "@/components/billing/PlanLimitsProgress";
import { UsageGraphSection } from "@/components/billing/UsageGraphSection";
import { FeatureComparisonMatrix } from "@/components/billing/FeatureComparisonMatrix";
import { ViewAllFeaturesModal } from "@/components/billing/ViewAllFeaturesModal";
import { BillingInfoCard } from "@/components/billing/BillingInfoCard";
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard";
import { BillingHistoryTable } from "@/components/billing/BillingHistoryTable";
import { InvoiceDetailsDrawer, type InvoiceData } from "@/components/billing/InvoiceDetailsDrawer";
import { SubscriptionTimeline } from "@/components/billing/SubscriptionTimeline";
import { SubscriptionSettingsCard } from "@/components/billing/SubscriptionSettingsCard";
import { SupportHelpSection } from "@/components/billing/SupportHelpSection";
import { RechargeModal } from "@/components/billing/RechargeModal";
import { SpecialOfferBanner } from "@/components/billing/SpecialOfferBanner";
import { SpecialOfferCheckoutModal } from "@/components/billing/SpecialOfferCheckoutModal";

export default function SchoolAdminSubscriptionCommandCenter() {
  const { profile, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";

  // Interactive Modals State
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedRechargePlan, setSelectedRechargePlan] = useState("plan_starter");
  const [selectedRechargeCycle, setSelectedRechargeCycle] = useState<"monthly" | "annual">("monthly");

  const [showViewAllFeatures, setShowViewAllFeatures] = useState(false);
  const [showOfferCheckoutModal, setShowOfferCheckoutModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);

  // SWR Active Custom Offer Query
  const { data: offersBundle, refetch: refetchOffers } = useAppQuery(
    schoolId ? `activeSchoolOffer:${schoolId}` : null,
    async () => {
      const res = await fetch(`/api/billing/offers?schoolId=${schoolId}`);
      const json = await res.json();
      return json;
    },
    { enabled: !!schoolId && !authLoading, staleTime: 10_000 }
  );

  const activeOffer = offersBundle?.activeOffer || null;

  // SWR Cached Data Query for Subscription Command Center Bundle
  const {
    data: bundle,
    isLoading: isBundleLoading,
    refetch,
  } = useAppQuery(
    schoolId ? `subscriptionBundle:${schoolId}` : null,
    async () => {
      const res = await fetch(`/api/billing/dashboard-bundle?schoolId=${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load subscription command center.");
      return json;
    },
    { enabled: !!schoolId && !authLoading, staleTime: 15_000 }
  );

  const subscription = bundle?.subscription || null;
  const subState = bundle?.subState || null;
  const plan = bundle?.plan || null;
  const planVersion = bundle?.planVersion || null;
  const allPlans = bundle?.allPlans || [];
  const entitlement = bundle?.entitlement || null;
  const usage = bundle?.usage || {
    students: { current: 0, limit: 500 },
    teachers: { current: 0, limit: 20 },
    classes: { current: 0, limit: 15 },
    staffAccounts: { current: 1, limit: 2 },
  };
  const billingProfile = bundle?.billingProfile || null;
  const paymentMethod = bundle?.paymentMethod || null;
  const invoices = bundle?.invoices || [];
  const payments = bundle?.payments || [];
  const subscriptionEvents = bundle?.subscriptionEvents || [];
  const siteSettings = bundle?.siteSettings || null;

  const loading = isBundleLoading && !bundle;

  const openRecharge = (planId: string, cycle: "monthly" | "annual" = "monthly") => {
    setSelectedRechargePlan(planId);
    setSelectedRechargeCycle(cycle);
    setShowRechargeModal(true);
  };

  const handleCancelSubscription = async () => {
    const res = await fetch("/api/billing/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, actorId: profile?.uid || "school_admin" }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to set cancellation preference.");

    toast.success("Subscription set to cancel at period end.");
    refetch(true);
  };

  const handleResumeSubscription = async () => {
    try {
      const res = await fetch("/api/billing/subscription/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, actorId: profile?.uid || "school_admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resume subscription.");

      toast.success("Subscription resumed successfully.");
      refetch(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to resume subscription.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <span>Subscription & Billing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your school's plan, usage, features, billing, payments and subscription settings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => refetch(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => openRecharge(subscription?.planId || "plan_starter", subscription?.billingCycle || "monthly")}
            disabled={subscription?.status === "SUSPENDED"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Renew Plan</span>
          </button>
          <button
            onClick={() => openRecharge("plan_professional", "monthly")}
            disabled={subscription?.status === "SUSPENDED"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Upgrade Plan</span>
          </button>
        </div>
      </div>

      {loading ? (
        <PageSkeleton hasStats={true} hasTable={true} className="py-2" />
      ) : (
        <>
          {/* SPECIAL OFFER PROMOTIONAL BANNER */}
          <SpecialOfferBanner
            offer={activeOffer}
            onViewOffer={() => setShowOfferCheckoutModal(true)}
          />

          {/* 2. Contextual Subscription Alert */}
          <SubscriptionAlertBanner
            subscription={subscription}
            daysRemaining={subState?.daysRemaining || 30}
            onRenew={() => openRecharge(subscription?.planId || "plan_starter")}
            onUpgrade={() => openRecharge("plan_professional")}
          />

          {/* 3. Current Plan Hero Card */}
          <CurrentPlanHeroCard
            subscription={subscription}
            plan={plan}
            planVersion={planVersion}
            daysRemaining={subState?.daysRemaining || 30}
            onRenew={() => openRecharge(subscription?.planId || "plan_starter")}
            onUpgrade={() => openRecharge("plan_professional")}
            onChangePlan={() => openRecharge("plan_starter")}
          />

          {/* 4. Plan Limits & Resource Capacity */}
          <PlanLimitsProgress
            usage={usage}
            onUpgrade={() => openRecharge("plan_professional")}
          />

          {/* 5. Resource Usage Over Time Line Graph */}
          <UsageGraphSection
            studentCount={usage.students.current}
            teacherCount={usage.teachers.current}
            classCount={usage.classes.current}
            storageBytes={usage.storage?.currentBytes || 480 * 1024 * 1024}
            notificationCount={usage.monthlyNotifications?.current || 0}
          />

          {/* 6. Included Features Summary */}
          <PlanFeaturesIncluded
            allowedFeatures={entitlement?.allowedFeatures || plan?.features || []}
            permissions={entitlement?.features || {}}
            onViewAllFeatures={() => setShowViewAllFeatures(true)}
          />

          {/* 7. Feature Comparison Matrix */}
          <FeatureComparisonMatrix
            currentPlanSlug={plan?.slug || "starter"}
            allPlans={allPlans}
            onSelectUpgrade={(targetPlanId) => openRecharge(targetPlanId)}
          />

          {/* 8 & 9. Billing Information & Payment Method Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BillingInfoCard
              schoolId={schoolId}
              profile={billingProfile}
              onProfileUpdated={() => refetch(true)}
            />
            <PaymentMethodCard
              paymentMethod={paymentMethod}
              onUpdate={() => refetch(true)}
            />
          </div>

          {/* 10. Billing History Table */}
          <BillingHistoryTable
            invoices={invoices}
            payments={payments}
            onViewInvoice={(inv) => setSelectedInvoice(inv)}
          />

          {/* 11 & 12. Subscription Timeline & Subscription Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SubscriptionTimeline events={subscriptionEvents} />
            <SubscriptionSettingsCard
              schoolId={schoolId}
              subscription={subscription}
              planName={plan?.name || "Professional Plan"}
              nextBillingAmountRupees={Math.round(
                (subscription?.amountPaise || planVersion?.monthlyPrice || 299900) / 100
              )}
              paymentMethodText={subscription?.paymentMethod || "Razorpay Autopay (UPI / Card)"}
              onCancel={handleCancelSubscription}
              onResume={handleResumeSubscription}
              onRefresh={() => refetch(true)}
            />
          </div>

          {/* 13. Support & Assistance Section */}
          <SupportHelpSection siteSettings={siteSettings} />
        </>
      )}

      {/* VIEW ALL FEATURES MODAL */}
      <ViewAllFeaturesModal
        isOpen={showViewAllFeatures}
        onClose={() => setShowViewAllFeatures(false)}
        planName={plan?.name || "Professional Plan"}
        allowedFeatures={entitlement?.allowedFeatures || plan?.features || []}
        permissions={entitlement?.features || {}}
      />

      {/* INVOICE DETAILS DRAWER */}
      <InvoiceDetailsDrawer
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />

      {/* RECHARGE / RENEWAL / UPGRADE MODAL */}
      <RechargeModal
        isOpen={showRechargeModal}
        schoolId={schoolId}
        userId={profile?.uid || "school_admin"}
        initialPlanId={selectedRechargePlan}
        initialBillingCycle={selectedRechargeCycle}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={() => {
          toast.success("Subscription updated & payment verified!");
          setShowRechargeModal(false);
          refetch(true);
          refetchOffers();
        }}
      />

      {/* SPECIAL OFFER CHECKOUT MODAL */}
      <SpecialOfferCheckoutModal
        isOpen={showOfferCheckoutModal}
        onClose={() => setShowOfferCheckoutModal(false)}
        offer={activeOffer}
        schoolId={schoolId}
        userId={profile?.uid || "school_admin"}
        onSuccess={() => {
          refetch(true);
          refetchOffers();
        }}
      />
    </div>
  );
}
