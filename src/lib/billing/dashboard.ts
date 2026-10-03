import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getSchoolSubscription } from "./subscriptions";
import { getEffectiveEntitlement } from "./entitlement";
import { getActivePlan, getActivePlanVersion, getAllPlans, DEFAULT_STATIC_PLANS, DEFAULT_STATIC_PLAN_VERSIONS } from "./plans";
import { getGlobalAccessPolicy } from "./accessPolicy";
import { calculateSubscriptionState } from "./accessEngine";
import type { BillingProfileData } from "@/components/billing/BillingInfoCard";
import type { PaymentMethodData } from "@/components/billing/PaymentMethodCard";

/** Read with the signed-in client's Firestore identity; never invent billing records. */
export async function getSchoolBillingDashboard(schoolId: string) {
  const db = getFirebaseDb();
  if (!db || !schoolId) throw new Error("School billing database is unavailable.");
  const subscription = await getSchoolSubscription(schoolId);
  const [entitlement, plan, planVersion, allPlans, policy] = await Promise.all([
    getEffectiveEntitlement(schoolId), getActivePlan(subscription.planId),
    getActivePlanVersion(subscription.planId), getAllPlans(), getGlobalAccessPolicy(),
  ]);

  const resolvedPlan =
    plan ||
    DEFAULT_STATIC_PLANS.find(p => p.id === subscription.planId) ||
    DEFAULT_STATIC_PLANS.find(p => p.id === "plan_starter") ||
    DEFAULT_STATIC_PLANS[0];

  const resolvedVersion =
    planVersion ||
    DEFAULT_STATIC_PLAN_VERSIONS[subscription.planId] ||
    (resolvedPlan ? DEFAULT_STATIC_PLAN_VERSIONS[resolvedPlan.id] : null) ||
    DEFAULT_STATIC_PLAN_VERSIONS["plan_starter"];

  if (!resolvedPlan || !resolvedVersion) throw new Error("Assigned plan or pricing version is unavailable. Contact the school administrator.");

  const effectivePlans = allPlans && allPlans.length > 0 ? allPlans : DEFAULT_STATIC_PLANS;
  const versions = await Promise.all(effectivePlans.map(p => getActivePlanVersion(p.id)));
  const planPrices = Object.fromEntries(versions.filter(v => v !== null).map(v => [v.planId, { monthlyPrice: v.monthlyPrice, annualPrice: v.annualPrice, currency: v.currency || "INR" }]));
  const readDocument = async (name: string) => {
    const snap = await getDoc(doc(db, name, schoolId));
    return snap.exists() ? snap.data() : null;
  };
  const readRecords = async (name: string) => {
    const snap = await getDocs(query(collection(db, name), where("schoolId", "==", schoolId)));
    return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) =>
      new Date((b as { createdAt?: string }).createdAt || 0).getTime() - new Date((a as { createdAt?: string }).createdAt || 0).getTime());
  };
  // Optional collections can be unavailable to the role; keep absence explicit.
  const [billingProfile, paymentMethod, invoices, payments] = await Promise.all([
    readDocument("billingProfiles").catch(() => null), readDocument("paymentMethods").catch(() => null),
    readRecords("invoices").catch(() => []), readRecords("payments").catch(() => []),
  ]);
  return {
    schoolId, subscription, subState: calculateSubscriptionState(subscription, policy), planPrices,
    plan: resolvedPlan, planVersion: resolvedVersion, allPlans: effectivePlans, entitlement,
    billingProfile: { billingName: "", schoolName: "", email: "", phone: "", address: "", gstin: "", pan: "", ...billingProfile } as BillingProfileData,
    paymentMethod: paymentMethod as PaymentMethodData | null,
    invoices, payments, subscriptionEvents: [], siteSettings: null,
    usage: {
      students: entitlement.limits.students, teachers: entitlement.limits.teachers,
      classes: entitlement.limits.classes, staffAccounts: entitlement.limits.staff,
    },
  };
}
