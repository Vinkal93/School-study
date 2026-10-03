import type { PlanVersion } from "@/types";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getSchoolSubscription } from "./subscriptions";
import { getEffectiveEntitlement } from "./entitlement";
import { getActivePlan, getActivePlanVersion, getAllPlans } from "./plans";
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

  const resolvedPlan = plan;
  const versionSnap = await getDoc(doc(db, "planVersions", subscription.planVersionId));
  const resolvedVersion = versionSnap.exists() ? { ...versionSnap.data(), id: versionSnap.id } as PlanVersion : planVersion;
  if (!resolvedPlan || !resolvedVersion || resolvedVersion.planId !== subscription.planId) throw new Error("Assigned plan or pricing version is unavailable. Contact the school administrator.");
  const effectivePlans = allPlans;
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
