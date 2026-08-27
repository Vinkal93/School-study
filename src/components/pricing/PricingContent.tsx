"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Minus, Plus, Building, Shield, Users, Smartphone, Headphones, Loader2, CreditCard } from "lucide-react";
import { getAllPlans, getActivePlanVersion } from "@/lib/billing";
import type { Plan, PlanVersion } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { triggerRazorpayCheckout } from "@/lib/payments/clientCheckout";
import { toast } from "sonner";

const DEFAULT_FALLBACK_PLANS: Plan[] = [
  {
    id: "plan_starter",
    name: "Starter Plan",
    slug: "starter",
    description: "Essential school management tools for small institutions.",
    status: "ACTIVE",
    displayOrder: 1,
    isPopular: false,
    features: ["Student Management", "Teacher Management", "Class & Section Management", "Basic Attendance", "Student Portal", "Teacher Portal", "Basic Support"],
    limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan_professional",
    name: "Professional Plan",
    slug: "professional",
    description: "Advanced controls & analytics for growing institutions.",
    status: "ACTIVE",
    displayOrder: 2,
    isPopular: true,
    features: ["Everything in Starter", "Advanced Attendance & Leave", "School Admin Dashboard", "Notices & Announcements", "Advanced Reports & Analytics", "Priority Support", "More Staff Accounts"],
    limits: { maxStudents: 2000, maxTeachers: 100, maxClasses: 60, maxStaffAccounts: 10 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "plan_enterprise",
    name: "Enterprise Plan",
    slug: "enterprise",
    description: "Custom limits and dedicated support for large networks.",
    status: "ACTIVE",
    displayOrder: 3,
    isPopular: false,
    features: ["Everything in Professional", "Multiple School Support", "Custom Requirements & Modules", "Dedicated Account Manager", "Advanced Data Controls", "Custom Onboarding"],
    limits: { maxStudents: -1, maxTeachers: -1, maxClasses: -1, maxStaffAccounts: -1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_FALLBACK_VERSIONS: Record<string, PlanVersion> = {
  plan_starter: {
    id: "plan_starter_v1",
    planId: "plan_starter",
    version: 1,
    monthlyPrice: 99900,
    annualPrice: 79900,
    currency: "INR",
    features: [],
    limits: { maxStudents: 500, maxTeachers: 20, maxClasses: 15, maxStaffAccounts: 2 },
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
  plan_professional: {
    id: "plan_professional_v1",
    planId: "plan_professional",
    version: 1,
    monthlyPrice: 199900,
    annualPrice: 159900,
    currency: "INR",
    features: [],
    limits: { maxStudents: 2000, maxTeachers: 100, maxClasses: 60, maxStaffAccounts: 10 },
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
  plan_enterprise: {
    id: "plan_enterprise_v1",
    planId: "plan_enterprise",
    version: 1,
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "INR",
    features: [],
    limits: { maxStudents: -1, maxTeachers: -1, maxClasses: -1, maxStaffAccounts: -1 },
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  },
};

export function PricingContent() {
  const { profile } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeVersions, setActiveVersions] = useState<Record<string, PlanVersion>>({});
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPublicPlans() {
      try {
        const fetchedPlans = await getAllPlans();
        if (fetchedPlans && fetchedPlans.length > 0) {
          setPlans(fetchedPlans);
          const versionMap: Record<string, PlanVersion> = {};
          for (const p of fetchedPlans) {
            const v = await getActivePlanVersion(p.id);
            if (v) versionMap[p.id] = v;
          }
          setActiveVersions(versionMap);
        } else {
          setPlans(DEFAULT_FALLBACK_PLANS);
          setActiveVersions(DEFAULT_FALLBACK_VERSIONS);
        }
      } catch (err) {
        console.warn("Failed to fetch public pricing catalog, using defaults:", err);
        setPlans(DEFAULT_FALLBACK_PLANS);
        setActiveVersions(DEFAULT_FALLBACK_VERSIONS);
      } finally {
        setLoading(false);
      }
    }
    loadPublicPlans();
  }, []);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (plan.slug === "enterprise") {
      window.location.href = "/contact";
      return;
    }

    if (!profile?.uid || !profile?.schoolId) {
      toast.info("Please log in with your School Admin account to subscribe.");
      window.location.href = `/login?redirect=/pricing`;
      return;
    }

    setProcessingPlanId(plan.id);

    try {
      await triggerRazorpayCheckout({
        planId: plan.id,
        billingCycle: isAnnual ? "annual" : "monthly",
        schoolId: profile.schoolId,
        userId: profile.uid,
        prefillData: {
          name: profile.name || "",
          email: profile.email || "",
        },
        onSuccess: (orderId) => {
          toast.success("Payment verified! Subscription activated.");
        },
        onError: (err) => {
          toast.error(err || "Payment failed or was cancelled.");
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate payment checkout.");
    } finally {
      setProcessingPlanId(null);
    }
  };

  const compareFeatures = [
    { name: "Students", starter: "Up to 500", pro: "Up to 2000", ent: "Unlimited" },
    { name: "Teachers", starter: "Up to 20", pro: "Up to 100", ent: "Unlimited" },
    { name: "Attendance", starter: "Basic", pro: "Advanced", ent: "Advanced" },
    { name: "Reports", starter: "Standard", pro: "Advanced", ent: "Custom" },
    { name: "Support", starter: "Email", pro: "Priority", ent: "Dedicated 24/7" },
    { name: "Multi School", starter: "No", pro: "No", ent: "Yes" },
    { name: "Custom Features", starter: "No", pro: "No", ent: "Yes" },
    { name: "Dedicated Onboarding", starter: "No", pro: "No", ent: "Yes" },
  ];

  const faqs = [
    {
      question: "Can I change my plan later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, the prorated difference will be applied to your next billing cycle.",
    },
    {
      question: "Is there a monthly and annual option?",
      answer: "Yes, we offer both monthly and annual billing. If you choose annual billing, you can save 20% compared to the monthly option.",
    },
    {
      question: "Can I cancel my subscription?",
      answer: "Absolutely. You can cancel your subscription anytime from your billing dashboard. You will retain access until the end of your current billing period.",
    },
    {
      question: "Can I contact support before choosing a plan?",
      answer: "Of course! Our sales and support teams are happy to help you decide which plan is best for your school's specific needs.",
    },
    {
      question: "What happens if I need more students?",
      answer: "You can seamlessly upgrade to a higher tier plan as your student body grows. Our team will assist with a zero-downtime transition.",
    },
  ];

  const activePlans = plans.length > 0 ? plans : DEFAULT_FALLBACK_PLANS;

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800">
          <span>Simple, Transparent Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Choose the Right Plan for Your School
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
          Everything you need to manage your educational institution effectively.
        </p>

        {/* Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-sm font-semibold ${!isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative w-14 h-8 bg-blue-600 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span
              className={`block w-6 h-6 bg-white rounded-full transition-transform ${
                isAnnual ? "transform translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${isAnnual ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
            Annual <span className="text-xs bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12 text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-sm">Fetching active plans catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {activePlans.map((p) => {
            const ver = activeVersions[p.id] || DEFAULT_FALLBACK_VERSIONS[p.id];
            const monthlyRs = ver ? Math.round(ver.monthlyPrice / 100) : (p.slug === "starter" ? 999 : p.slug === "professional" ? 1999 : 0);
            const annualRs = ver ? Math.round(ver.annualPrice / 100) : (p.slug === "starter" ? 799 : p.slug === "professional" ? 1599 : 0);

            const displayPrice = p.slug === "enterprise" || monthlyRs === 0 ? "Custom" : `₹${(isAnnual ? annualRs : monthlyRs).toLocaleString("en-IN")}`;

            const isProcessing = processingPlanId === p.id;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col justify-between p-8 rounded-2xl border transition-all ${
                  p.isPopular
                    ? "border-blue-600 dark:border-blue-500 shadow-xl shadow-blue-500/10 bg-white dark:bg-gray-900 ring-2 ring-blue-600 dark:ring-blue-500 scale-105 z-10"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-md"
                }`}
              >
                {p.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{displayPrice}</span>
                    {p.slug !== "enterprise" && displayPrice !== "Custom" && (
                      <span className="text-xs font-semibold text-slate-500">/ month</span>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Features Included:</p>
                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {(p.features.length > 0 ? p.features : DEFAULT_FALLBACK_PLANS.find((df) => df.slug === p.slug)?.features || []).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => handleSelectPlan(p)}
                    disabled={isProcessing}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                      p.isPopular
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                        : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95"
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : p.slug === "enterprise" ? (
                      "Contact Sales"
                    ) : (
                      `Choose ${p.name}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compare Plans Table */}
      <div className="space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Compare Plan Features</h2>
          <p className="text-sm text-slate-500">Detailed breakdown of capabilities per subscription plan.</p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-gray-950 shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                <th className="p-4 font-bold text-slate-900 dark:text-white">Feature</th>
                <th className="p-4 font-bold text-slate-900 dark:text-white">Starter</th>
                <th className="p-4 font-bold text-blue-600 dark:text-blue-400">Professional</th>
                <th className="p-4 font-bold text-slate-900 dark:text-white">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {compareFeatures.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">{row.name}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{row.starter}</td>
                  <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">{row.pro}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{row.ent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-8 pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-sm text-slate-500">Everything you need to know about our pricing and subscription model.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-gray-950 space-y-2"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full text-left font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center gap-2"
              >
                <span>{faq.question}</span>
                <span className="text-blue-600">{openFaq === idx ? "−" : "+"}</span>
              </button>
              {openFaq === idx && (
                <p className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-900">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
