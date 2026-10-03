"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  CreditCard,
  RefreshCw,
  Zap,
  Sparkles,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery, appQueryClient } from "@/lib/cache";
import { doc, onSnapshot, updateDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { PageSkeleton } from "@/components/common/skeletons";
import { toast } from "sonner";
import { getSchoolBillingDashboard } from "@/lib/billing/dashboard";
import { safeFetchJson } from "@/lib/utils/safeFetch";

// Import Command Center Components
import { SubscriptionAlertBanner } from "@/components/billing/SubscriptionAlertBanner";
import { CurrentPlanHeroCard } from "@/components/billing/CurrentPlanHeroCard";
import { PlanFeaturesIncluded } from "@/components/billing/PlanFeaturesIncluded";
import { PlanLimitsProgress } from "@/components/billing/PlanLimitsProgress";
import { UsageGraphSection } from "@/components/billing/UsageGraphSection";
import { DynamicPlanComparison as FeatureComparisonMatrix } from "@/components/billing/DynamicPlanComparison";
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
import { useRealtimeSchoolDashboard } from "@/hooks/useRealtimeSchoolDashboard";

export default function SchoolAdminSubscriptionCommandCenter() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const [verifiedSchool, setVerifiedSchool] = useState("");

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
      const res = await safeFetchJson(`/api/billing/offers?schoolId=${schoolId}`);
      return res.data;
    },
    { enabled: !!schoolId && !authLoading, staleTime: 10_000 }
  );

  const activeOffer = offersBundle?.activeOffer || null;

  // SWR Cached Data Query for Subscription Command Center Bundle
  const {
    data: bundle,
    isLoading: isBundleLoading,
    error: bundleError,
    refetch,
  } = useAppQuery(
    schoolId ? `subscriptionBundle:${schoolId}` : null,
    async () => {
      const fresh = await getSchoolBillingDashboard(schoolId);
      setVerifiedSchool(schoolId);
      return fresh;
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
  const billingProfile = bundle?.billingProfile || { billingName: "", schoolName: "", email: "", phone: "", address: "", gstin: "", pan: "" };
  const paymentMethod = bundle?.paymentMethod || null;
  const invoices = bundle?.invoices || [];
  const payments = bundle?.payments || [];
  const subscriptionEvents = bundle?.subscriptionEvents || [];
  const siteSettings = bundle?.siteSettings || null;

  // Live real-time Firestore synchronization state
  const [liveSub, setLiveSub] = useState<any>(null);
  const [liveSchool, setLiveSchool] = useState<any>(null);

  const effectiveSub = subscription;
  const effectivePlanId = subscription?.planId || "";
  const effectivePlan = plan;
  const computedDaysRemaining = subState?.daysRemaining ?? 0;
  const effectivePlanVersion = planVersion;

  // Real-time live counts fallback directly from client Firestore
  const { counts: liveCounts } = useRealtimeSchoolDashboard(schoolId);

  const planLimits = (effectivePlan?.limits || effectivePlanVersion?.limits || {}) as any;

  const realStudentCount = bundle?.usage?.students?.current ?? 0;
  const realTeacherCount = bundle?.usage?.teachers?.current ?? 0;
  const realClassCount = bundle?.usage?.classes?.current ?? 0;
  const effectiveUsage = {
    students: { current: realStudentCount, limit: bundle?.usage?.students?.limit ?? 0 },
    teachers: { current: realTeacherCount, limit: bundle?.usage?.teachers?.limit ?? 0 },
    classes: { current: realClassCount, limit: bundle?.usage?.classes?.limit ?? 0 },
    staffAccounts: { current: bundle?.usage?.staffAccounts?.current ?? 0, limit: bundle?.usage?.staffAccounts?.limit ?? 0 },
  };

  const loading = authLoading || verifiedSchool !== schoolId || (!bundle && isBundleLoading);

  // Debounced listener refetch to eliminate screen jump and value flicker
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerDebouncedRefetch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (schoolId) {
        appQueryClient.invalidateCache(`subscriptionBundle:${schoolId}`);
      }
      refetch(true);
    }, 200);
  };

  // Cross-tab and window instant plan update notification
  useEffect(() => {
    if (typeof window === "undefined" || !schoolId) return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("school_study_realtime_sync");
      channel.onmessage = (event) => {
        if (!event.data?.schoolId || event.data?.schoolId === schoolId) {
          triggerDebouncedRefetch();
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if ((e.key === "school_study_plan_updated" || e.key === "school_study_plan_updated_raw") && e.newValue) {
        if (e.newValue.includes(schoolId)) {
          triggerDebouncedRefetch();
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [schoolId]);

  // Real-time Firestore Sync with Super Admin updates (debounced to avoid flicker)
  useEffect(() => {
    if (!schoolId) return;
    const db = getFirebaseDb();
    if (!db) return;

    const subRef = doc(db, "schoolSubscriptions", schoolId);
    const unsubsSub = onSnapshot(
      subRef,
      (snap) => {
        if (snap.exists()) {
          setLiveSub({ id: snap.id, ...snap.data() });
        }
        triggerDebouncedRefetch();
      },
      (err) => console.warn("Live sub listener notice:", err)
    );

    const schoolRef = doc(db, "schools", schoolId);
    const unsubsSchool = onSnapshot(
      schoolRef,
      (snap) => {
        if (snap.exists()) {
          setLiveSchool({ id: snap.id, ...snap.data() });
        }
        triggerDebouncedRefetch();
      },
      (err) => console.warn("Live school listener notice:", err)
    );

    const overridesRef = doc(db, "accessOverrides", schoolId);
    const unsubsOverrides = onSnapshot(
      overridesRef,
      () => {
        triggerDebouncedRefetch();
      },
      (err) => console.warn("Live overrides listener notice:", err)
    );

    const offerRef = doc(db, "customOffers", schoolId);
    const unsubsOffer = onSnapshot(
      offerRef,
      () => {
        refetchOffers(false);
      },
      (err) => console.warn("Live offer listener notice:", err)
    );

    const usageRef = doc(db, "schoolUsage", schoolId);
    const unsubsUsage = onSnapshot(
      usageRef,
      () => {
        triggerDebouncedRefetch();
      },
      (err) => console.warn("Live usage listener notice:", err)
    );

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      unsubsSub();
      unsubsSchool();
      unsubsOverrides();
      unsubsOffer();
      unsubsUsage();
    };
  }, [schoolId, refetchOffers]);

  const getNextTierPlanId = (currentPlanId?: string): string => {
    const choices = allPlans.filter((p: any) => p.status === "ACTIVE" && !p.isArchived && p.publicVisible !== false)
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    const current = choices.findIndex((p: any) => p.id === currentPlanId);
    return choices[current + 1]?.id || currentPlanId || choices[0]?.id || "";
  };

  const openRecharge = (planId: string, cycle: "monthly" | "annual" = "monthly") => {
    setSelectedRechargePlan(planId);
    setSelectedRechargeCycle(cycle);
    setShowRechargeModal(true);
  };

  const handleCancelSubscription = async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      const res = await safeFetchJson("/api/billing/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ schoolId, actorId: profile?.uid || "school_admin" }),
      });
      if (!res.ok) throw new Error(res.error || "Failed to set cancellation preference.");

      toast.success("Subscription set to cancel at period end.");
      refetch(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to set cancellation preference.");
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      const res = await safeFetchJson("/api/billing/subscription/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ schoolId, actorId: profile?.uid || "school_admin" }),
      });
      if (!res.ok) throw new Error(res.error || "Failed to resume subscription.");

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
            onClick={() => openRecharge(effectivePlanId, effectiveSub?.billingCycle || "monthly")}
            disabled={effectiveSub?.status === "SUSPENDED"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Renew Plan</span>
          </button>
          <button
            onClick={() => openRecharge(getNextTierPlanId(effectivePlanId), "monthly")}
            disabled={effectiveSub?.status === "SUSPENDED"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Upgrade Plan</span>
          </button>
        </div>
      </div>

      {bundleError ? (<div role="alert" className="rounded-xl border border-red-200 p-6">Billing data could not be loaded. {String(bundleError)}<button onClick={() => refetch(true)} className="ml-4 underline">Retry</button></div>) : loading || !bundle ? (
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
            subscription={effectiveSub}
            daysRemaining={computedDaysRemaining}
            onRenew={() => openRecharge(effectivePlanId, effectiveSub?.billingCycle || "monthly")}
            onUpgrade={() => openRecharge(getNextTierPlanId(effectivePlanId))}
          />

          {/* 3. Current Plan Hero Card */}
          <CurrentPlanHeroCard
            subscription={effectiveSub}
            plan={effectivePlan}
            planVersion={effectivePlanVersion}
            daysRemaining={computedDaysRemaining}
            onRenew={() => openRecharge(effectivePlanId, effectiveSub?.billingCycle || "monthly")}
            onUpgrade={() => openRecharge(getNextTierPlanId(effectivePlanId))}
            onChangePlan={() => openRecharge(effectivePlanId)}
          />

          {/* 4. Plan Limits & Resource Capacity */}
          <PlanLimitsProgress
            planName={effectivePlan?.name || "Base Plan"}
            usage={effectiveUsage}
            onUpgrade={() => openRecharge(getNextTierPlanId(effectivePlanId))}
          />

          {/* 5. Resource Usage Over Time Line Graph */}
          <UsageGraphSection
            studentCount={effectiveUsage.students.current}
            teacherCount={effectiveUsage.teachers.current}
            classCount={effectiveUsage.classes.current}
            storageBytes={0}
            notificationCount={0}
          />

          {/* 6. Included Features Summary */}
          <PlanFeaturesIncluded
            allowedFeatures={Object.keys(entitlement?.features || {}).filter(key => entitlement?.features[key])}
            permissions={entitlement?.features || {}}
            onViewAllFeatures={() => setShowViewAllFeatures(true)}
          />

          {/* 7. Feature Comparison Matrix */}
          <FeatureComparisonMatrix
            prices={bundle?.planPrices}
            currentPlanSlug={effectivePlan?.slug || "starter"}
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
              subscription={effectiveSub}
              planName={effectivePlan?.name || "Active Plan"}
              nextBillingAmountRupees={Math.round(
                (effectiveSub?.amountPaise ?? (effectiveSub?.billingCycle === "annual" ? planVersion?.annualPrice : planVersion?.monthlyPrice) ?? 0) / 100
              )}
              paymentMethodText={effectiveSub?.paymentMethod || "No saved payment method"}
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
        planName={effectivePlan?.name || "Active Plan"}
        allowedFeatures={Object.keys(entitlement?.features || {}).filter(key => entitlement?.features[key])}
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
        key={`${showRechargeModal}:${selectedRechargePlan}:${selectedRechargeCycle}`}
        plans={allPlans}
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
