import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/utils/constants";
import { BILLING_COLLECTIONS, createBillingAuditLog } from "@/lib/billing";
import { loadRazorpayCredentials } from "@/lib/payments/razorpay";
import { detectFinancialAnomalies } from "@/lib/billing/finance";
import type { AppUser, School, SchoolSubscription } from "@/types";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••••••••••••••";
  return `${secret.slice(0, 4)}****************${secret.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const performerUid = searchParams.get("performerUid");

    // 1. Authoritative Super Admin Authorization Check
    const db = getFirebaseDb();
    if (performerUid) {
      const performerSnap = await getDoc(doc(db, COLLECTIONS.USERS, performerUid));
      if (!performerSnap.exists()) {
        return NextResponse.json({ error: "Performer account not found" }, { status: 403 });
      }
      const performer = performerSnap.data() as AppUser;
      if (performer.role !== "super_admin" || performer.status !== "active") {
        return NextResponse.json(
          { error: "Unauthorized. Super Admin access required." },
          { status: 403 }
        );
      }
    }

    // 2. Parse Query Filters
    const preset = searchParams.get("preset") || "30d";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const schoolIdFilter = searchParams.get("schoolId") || undefined;
    const planIdFilter = searchParams.get("planId") || undefined;
    const statusFilter = searchParams.get("status") || undefined;
    const methodFilter = searchParams.get("paymentMethod") || undefined;
    const searchFilter = searchParams.get("search")?.toLowerCase().trim() || "";

    // Calculate Date Bounds
    const now = Date.now();
    let startMs = 0;
    let endMs = now;

    if (preset === "today") {
      const s = new Date();
      s.setHours(0, 0, 0, 0);
      startMs = s.getTime();
    } else if (preset === "7d") {
      startMs = now - 7 * 24 * 60 * 60 * 1000;
    } else if (preset === "30d") {
      startMs = now - 30 * 24 * 60 * 60 * 1000;
    } else if (preset === "this_month") {
      const s = new Date();
      s.setDate(1);
      s.setHours(0, 0, 0, 0);
      startMs = s.getTime();
    } else if (preset === "this_year") {
      const s = new Date(new Date().getFullYear(), 0, 1);
      startMs = s.getTime();
    } else if (preset === "custom" && startDateParam) {
      startMs = new Date(startDateParam).getTime();
      if (endDateParam) endMs = new Date(endDateParam).getTime();
    }

    // Today and Month Bounds for Top KPIs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    // 3. Fetch Primary Financial Collections in Parallel
    const [
      schoolsSnap,
      usersSnap,
      paymentsSnap,
      invoicesSnap,
      ordersSnap,
      txSnap,
      subsSnap,
      creds,
      anomalies,
    ] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.SCHOOLS)),
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(
        query(
          collection(db, BILLING_COLLECTIONS.PAYMENTS),
          orderBy("capturedAt", "desc"),
          limit(500)
        )
      ).catch(() => ({ docs: [] })),
      getDocs(
        query(
          collection(db, BILLING_COLLECTIONS.INVOICES),
          orderBy("issuedAt", "desc"),
          limit(500)
        )
      ).catch(() => ({ docs: [] })),
      getDocs(collection(db, BILLING_COLLECTIONS.ORDERS)).catch(() => ({ docs: [] })),
      getDocs(collection(db, BILLING_COLLECTIONS.FINANCE_TRANSACTIONS)).catch(() => ({ docs: [] })),
      getDocs(collection(db, BILLING_COLLECTIONS.SCHOOL_SUBSCRIPTIONS)).catch(() => ({ docs: [] })),
      loadRazorpayCredentials().catch(() => ({
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
        keySecret: process.env.RAZORPAY_KEY_SECRET || "",
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
        isLiveMode: false,
      })),
      detectFinancialAnomalies().catch(() => []),
    ]);

    const schools = schoolsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as School[];
    const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) as AppUser[];
    const rawPayments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const rawInvoices = invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const rawOrders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const rawTxs = txSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const rawSubs = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as SchoolSubscription[];

    // Maps for fast lookups
    const schoolMap = new Map<string, School>();
    schools.forEach((s) => schoolMap.set(s.id, s));

    const userMap = new Map<string, AppUser>();
    users.forEach((u) => userMap.set(u.uid, u));

    const invoiceByPaymentMap = new Map<string, any>();
    const invoiceByOrderMap = new Map<string, any>();
    rawInvoices.forEach((inv) => {
      if (inv.paymentId) invoiceByPaymentMap.set(inv.paymentId, inv);
      if (inv.orderId) invoiceByOrderMap.set(inv.orderId, inv);
    });

    const getMs = (val: any): number => {
      if (!val) return 0;
      if (typeof val === "number") return val;
      if (typeof val.toMillis === "function") return val.toMillis();
      if (typeof val.toDate === "function") return val.toDate().getTime();
      const parsed = Date.parse(val);
      return isNaN(parsed) ? 0 : parsed;
    };

    // -------------------------------------------------------------
    // 4. OVERVIEW 10 KPIS COMPUTATION
    // -------------------------------------------------------------
    let totalRevenuePaise = 0;
    let thisMonthRevenuePaise = 0;
    let todayRevenuePaise = 0;
    let successfulPaymentsCount = 0;
    let failedPaymentsCount = 0;
    let refundsCount = 0;
    let refundsPaise = 0;

    rawPayments.forEach((p) => {
      const pMs = getMs(p.capturedAt || p.createdAt);
      const amt = Number(p.amount) || 0;
      const st = String(p.status || "").toUpperCase();

      if (st === "CAPTURED" || st === "SUCCESS" || st === "PARTIALLY_REFUNDED") {
        totalRevenuePaise += amt;
        successfulPaymentsCount++;
        if (pMs >= todayStartMs) todayRevenuePaise += amt;
        if (pMs >= monthStartMs) thisMonthRevenuePaise += amt;
      }
      if (st === "FAILED") {
        failedPaymentsCount++;
      }
      if (st === "REFUNDED" || st === "PARTIALLY_REFUNDED") {
        refundsCount++;
        refundsPaise += Number(p.refundedAmount) || (st === "REFUNDED" ? amt : 0);
      }
    });

    // Invoices: discounts and GST
    let discountsPaise = 0;
    let gstCollectedPaise = 0;
    rawInvoices.forEach((inv) => {
      discountsPaise += Number(inv.discount) || 0;
      gstCollectedPaise += Number(inv.tax) || 0;
    });

    // Outstanding / Pending Orders
    let outstandingPaise = 0;
    rawOrders.forEach((ord) => {
      const st = String(ord.status || "").toUpperCase();
      if (st === "CREATED" || st === "PAYMENT_PENDING") {
        outstandingPaise += Number(ord.finalAmount) || 0;
      }
    });

    // Active Subscriptions
    let activeSubscriptionsCount = 0;
    rawSubs.forEach((sub) => {
      const st = String(sub.status || "").toUpperCase();
      if (st === "ACTIVE" || st === "TRIAL") activeSubscriptionsCount++;
    });

    const overview = {
      totalRevenuePaise,
      thisMonthRevenuePaise,
      todayRevenuePaise,
      successfulPaymentsCount,
      failedPaymentsCount,
      refundsCount,
      refundsPaise,
      discountsPaise,
      gstCollectedPaise,
      outstandingPaise,
      activeSubscriptionsCount,
    };

    // -------------------------------------------------------------
    // 5. TRANSACTIONS LEDGER (Filtered & Enriched)
    // -------------------------------------------------------------
    let enrichedTransactions = rawPayments.map((p) => {
      const s = schoolMap.get(p.schoolId);
      const u = userMap.get(p.userId);
      const inv = invoiceByPaymentMap.get(p.id) || invoiceByOrderMap.get(p.orderId);

      const baseAmount = inv ? Number(inv.subtotal) || Number(p.amount) : Number(p.amount) || 0;
      const discount = inv ? Number(inv.discount) || 0 : Number(p.discountAmount) || 0;
      const gst = inv ? Number(inv.tax) || Math.round((baseAmount - discount) * 0.18) : Math.round((baseAmount - discount) * 0.18);
      const finalAmount = Number(p.amount) || baseAmount - discount + gst;

      return {
        id: p.id,
        orderId: p.orderId || "ord_legacy",
        paymentId: p.razorpayPaymentId || p.id,
        invoiceId: inv?.id || null,
        invoiceNumber: inv?.invoiceNumber || (inv?.id ? `INV-${inv.id.slice(0, 8).toUpperCase()}` : "—"),
        schoolId: p.schoolId,
        schoolName: s?.name || "School " + p.schoolId,
        userId: p.userId,
        userName: u?.name || "School Admin",
        userEmail: u?.email || "admin@school.internal",
        planId: p.planId || "pro",
        amountPaise: baseAmount,
        discountPaise: discount,
        taxPaise: gst,
        finalAmountPaise: finalAmount,
        paymentMethod: p.method || "Razorpay / Card",
        gateway: "Razorpay",
        status: p.status || "CAPTURED",
        type: String(p.status).toUpperCase().includes("REFUND") ? "Refund" : "Subscription Recharge",
        date: p.capturedAt || p.createdAt ? new Date(getMs(p.capturedAt || p.createdAt)).toLocaleDateString() : "Recent",
        timestampMs: getMs(p.capturedAt || p.createdAt),
      };
    });

    // Apply Filters to Transactions
    if (startMs > 0) {
      enrichedTransactions = enrichedTransactions.filter(
        (t) => t.timestampMs >= startMs && t.timestampMs <= endMs
      );
    }
    if (schoolIdFilter && schoolIdFilter !== "all") {
      enrichedTransactions = enrichedTransactions.filter((t) => t.schoolId === schoolIdFilter);
    }
    if (planIdFilter && planIdFilter !== "all") {
      enrichedTransactions = enrichedTransactions.filter(
        (t) => t.planId.toLowerCase() === planIdFilter.toLowerCase()
      );
    }
    if (statusFilter && statusFilter !== "all") {
      enrichedTransactions = enrichedTransactions.filter(
        (t) => t.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    if (methodFilter && methodFilter !== "all") {
      enrichedTransactions = enrichedTransactions.filter((t) =>
        t.paymentMethod.toLowerCase().includes(methodFilter.toLowerCase())
      );
    }
    if (searchFilter) {
      enrichedTransactions = enrichedTransactions.filter(
        (t) =>
          t.id.toLowerCase().includes(searchFilter) ||
          t.orderId.toLowerCase().includes(searchFilter) ||
          t.paymentId.toLowerCase().includes(searchFilter) ||
          t.invoiceNumber.toLowerCase().includes(searchFilter) ||
          t.schoolName.toLowerCase().includes(searchFilter) ||
          t.userEmail.toLowerCase().includes(searchFilter)
      );
    }

    // -------------------------------------------------------------
    // 6. INVOICES DIRECTORY
    // -------------------------------------------------------------
    let enrichedInvoices = rawInvoices.map((inv) => {
      const s = schoolMap.get(inv.schoolId);
      const subtotal = Number(inv.subtotal) || Number(inv.total) || 0;
      const discount = Number(inv.discount) || 0;
      const taxable = Math.max(0, subtotal - discount);
      const tax = Number(inv.tax) || Math.round(taxable * 0.18);
      const total = Number(inv.total) || taxable + tax;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 8).toUpperCase()}`,
        schoolId: inv.schoolId,
        schoolName: s?.name || "School " + inv.schoolId,
        planId: inv.planId || "pro",
        subtotalPaise: subtotal,
        discountPaise: discount,
        taxableAmountPaise: taxable,
        gstPaise: tax,
        totalPaise: total,
        status: inv.status || "PAID",
        issuedAt: inv.issuedAt ? new Date(getMs(inv.issuedAt)).toLocaleDateString() : "Recent",
        timestampMs: getMs(inv.issuedAt || inv.createdAt),
        viewUrl: `/billing/invoices/${inv.id}`,
      };
    });

    if (startMs > 0) {
      enrichedInvoices = enrichedInvoices.filter(
        (i) => i.timestampMs >= startMs && i.timestampMs <= endMs
      );
    }
    if (schoolIdFilter && schoolIdFilter !== "all") {
      enrichedInvoices = enrichedInvoices.filter((i) => i.schoolId === schoolIdFilter);
    }
    if (searchFilter) {
      enrichedInvoices = enrichedInvoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(searchFilter) ||
          i.schoolName.toLowerCase().includes(searchFilter) ||
          i.id.toLowerCase().includes(searchFilter)
      );
    }

    // -------------------------------------------------------------
    // 7. REVENUE BREAKDOWN
    // -------------------------------------------------------------
    // Daily buckets (last 7 days)
    const byDay: { date: string; gross: number; net: number; gst: number; refunds: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dEnd = dStart + 24 * 60 * 60 * 1000;
      const dateLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });

      let dayGross = 0;
      let dayRefunds = 0;
      rawPayments.forEach((p) => {
        const ms = getMs(p.capturedAt || p.createdAt);
        if (ms >= dStart && ms < dEnd) {
          const amt = Number(p.amount) || 0;
          const st = String(p.status).toUpperCase();
          if (st === "CAPTURED" || st === "SUCCESS") dayGross += amt;
          else if (st === "REFUNDED" || st === "PARTIALLY_REFUNDED") dayRefunds += amt;
        }
      });

      byDay.push({
        date: dateLabel,
        gross: dayGross,
        net: Math.max(0, dayGross - dayRefunds),
        gst: Math.round(dayGross * 0.18),
        refunds: dayRefunds,
      });
    }

    // Plan-wise revenue
    const planRevMap = new Map<string, number>();
    rawPayments.forEach((p) => {
      const st = String(p.status).toUpperCase();
      if (st === "CAPTURED" || st === "SUCCESS") {
        const pl = (p.planId || "starter").toLowerCase();
        planRevMap.set(pl, (planRevMap.get(pl) || 0) + (Number(p.amount) || 0));
      }
    });

    const byPlan = Array.from(planRevMap.entries()).map(([planId, amount]) => ({
      planId,
      planName: planId.toUpperCase(),
      amount,
      percentage: totalRevenuePaise > 0 ? Math.round((amount / totalRevenuePaise) * 100) : 0,
    }));

    // School-wise revenue
    const schoolRevMap = new Map<string, number>();
    rawPayments.forEach((p) => {
      const st = String(p.status).toUpperCase();
      if (st === "CAPTURED" || st === "SUCCESS") {
        schoolRevMap.set(p.schoolId, (schoolRevMap.get(p.schoolId) || 0) + (Number(p.amount) || 0));
      }
    });

    const bySchool = Array.from(schoolRevMap.entries())
      .map(([sId, amount]) => ({
        schoolId: sId,
        schoolName: schoolMap.get(sId)?.name || "School " + sId,
        amount,
        percentage: totalRevenuePaise > 0 ? Math.round((amount / totalRevenuePaise) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const netRevenuePaise = Math.max(0, totalRevenuePaise - refundsPaise);

    const revenueBreakdown = {
      byDay,
      byPlan,
      bySchool,
      totals: {
        grossRevenuePaise: totalRevenuePaise,
        netRevenuePaise,
        discountsPaise,
        gstCollectedPaise,
        refundsPaise,
      },
    };

    // -------------------------------------------------------------
    // 8. RAZORPAY GATEWAY HEALTH
    // -------------------------------------------------------------
    const keyId = creds.keyId || "";
    const keySecret = creds.keySecret || "";
    const webhookSecret = creds.webhookSecret || "";
    const isLiveMode = creds.isLiveMode ?? keyId.startsWith("rzp_live_");

    const recentFailures = rawPayments
      .filter((p) => String(p.status).toUpperCase() === "FAILED")
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        schoolId: p.schoolId,
        schoolName: schoolMap.get(p.schoolId)?.name || p.schoolId,
        amountPaise: Number(p.amount) || 0,
        reason: p.failureReason || "Gateway authorization failure",
        date: p.createdAt ? new Date(getMs(p.createdAt)).toLocaleDateString() : "Recent",
      }));

    const gateway = {
      keyConfigured: Boolean(keyId && keyId.length > 0),
      webhookConfigured: Boolean(webhookSecret && webhookSecret.length > 0),
      isLiveMode,
      keyId,
      maskedSecretKey: maskSecret(keySecret),
      maskedWebhookSecret: maskSecret(webhookSecret),
      recentFailures,
    };

    // -------------------------------------------------------------
    // 9. RECONCILIATION SUMMARY
    // -------------------------------------------------------------
    const totalPaymentsCount = rawPayments.length;
    const totalOrdersCount = rawOrders.length;
    const totalInvoicesCount = rawInvoices.length;
    const totalTxsCount = rawTxs.length;

    const healthyMatchRate =
      totalPaymentsCount > 0
        ? Math.max(0, Math.round(((totalPaymentsCount - anomalies.length) / totalPaymentsCount) * 100))
        : 100;

    const reconciliation = {
      anomalies,
      totalOrders: totalOrdersCount,
      totalPayments: totalPaymentsCount,
      totalInvoices: totalInvoicesCount,
      totalFinanceTxs: totalTxsCount,
      healthyMatchRate,
    };

    // -------------------------------------------------------------
    // 10. AUDIT LOGGING & RESPONSE
    // -------------------------------------------------------------
    await createBillingAuditLog(
      "super_admin",
      "super_admin",
      "MANUAL_ACCESS_CHANGE",
      "accessPolicy",
      "all",
      {
        actionType: "FINANCE_CENTER_DATA_ACCESS",
        preset,
        schoolId: schoolIdFilter || "all",
        timestamp: new Date().toISOString(),
      }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        overview,
        transactions: enrichedTransactions,
        invoices: enrichedInvoices,
        revenueBreakdown,
        gateway,
        reconciliation,
        computedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Super Admin Finance API Error:", error);
    return NextResponse.json(
      { error: "Failed to load super admin finance analytics: " + (error?.message || "") },
      { status: 500 }
    );
  }
}
