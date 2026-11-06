import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/serverAuth";
import { getSafeAdminDb } from "@/lib/firebase/admin";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { SCHOOL_ADMIN_NAV_ITEMS } from "@/lib/search/navigation-items";

export interface AdminSearchResultItem {
  id: string;
  type: "student" | "teacher" | "receipt" | "account" | "navigation";
  category: "students" | "teachers" | "fees" | "accounts" | "navigation";
  name: string;
  title?: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  url: string;
  score?: number;
  metadata?: Record<string, any>;
}

// In-Memory Search Cache (30s TTL) to prevent repeated Firestore reads on typing
interface CacheEntry {
  timestamp: number;
  results: AdminSearchResultItem[];
}
const SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function getCachedResults(cacheKey: string): AdminSearchResultItem[] | null {
  const entry = SEARCH_CACHE.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    SEARCH_CACHE.delete(cacheKey);
    return null;
  }
  return entry.results;
}

function setCachedResults(cacheKey: string, results: AdminSearchResultItem[]): void {
  // Cap cache size to avoid unbounded memory
  if (SEARCH_CACHE.size > 200) {
    const oldestKey = SEARCH_CACHE.keys().next().value;
    if (oldestKey) SEARCH_CACHE.delete(oldestKey);
  }
  SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), results });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get("q")?.trim() || "";
    const q = rawQ.toLowerCase();
    const filterCategory = searchParams.get("category")?.toLowerCase() || "all";

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, count: 0, results: [] });
    }

    // 1. Authorize Caller with resilient auth boundary
    const authResult = await authenticateRequest(req);
    const user = authResult.user;
    const isAuthorized =
      authResult.isAuthenticated &&
      user &&
      (user.role === "school_admin" || user.role === "admin" || user.role === "super_admin");

    if (!isAuthorized) {
      return (
        authResult.errorResponse ||
        NextResponse.json({ error: "Access denied." }, { status: 403 })
      );
    }

    const schoolId =
      user?.schoolId || (user?.role === "super_admin" ? searchParams.get("schoolId") : "") || "";

    const cacheKey = `${schoolId}:${filterCategory}:${q}`;
    const cached = getCachedResults(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        count: cached.length,
        results: cached,
        cached: true,
      });
    }

    const itemsMap = new Map<string, AdminSearchResultItem>();

    // 2. Search Navigation Shortcuts (0ms instant match)
    if (filterCategory === "all" || filterCategory === "navigation") {
      SCHOOL_ADMIN_NAV_ITEMS.forEach((nav) => {
        const titleLower = nav.title.toLowerCase();
        const subLower = nav.subtitle.toLowerCase();
        const keyMatch = nav.keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()));

        let score = 0;
        if (titleLower === q) score = 100;
        else if (titleLower.startsWith(q)) score = 80;
        else if (titleLower.includes(q)) score = 50;
        else if (subLower.includes(q) || keyMatch) score = 30;

        if (score > 0) {
          itemsMap.set(`nav_${nav.id}`, {
            id: nav.id,
            type: "navigation",
            category: "navigation",
            name: nav.title,
            title: nav.title,
            subtitle: nav.subtitle,
            badge: "Page",
            badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            url: nav.url,
            score,
          });
        }
      });
    }

    if (!schoolId) {
      const results = Array.from(itemsMap.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
      return NextResponse.json({ success: true, count: results.length, results });
    }

    // 3. Search Database Entities
    const adminDb = getSafeAdminDb();

    if (adminDb) {
      const searchPromises: Promise<any>[] = [];

      // A. Students
      if (filterCategory === "all" || filterCategory === "students") {
        searchPromises.push(
          (async () => {
            try {
              // Primary: schools/{schoolId}/students subcollection
              const subSnap = await adminDb
                .collection("schools")
                .doc(schoolId)
                .collection("students")
                .limit(80)
                .get();

              let studentDocs = subSnap.docs;

              // Fallback to root students collection if subcollection is empty
              if (studentDocs.length === 0) {
                const rootSnap = await adminDb
                  .collection("students")
                  .where("schoolId", "==", schoolId)
                  .limit(80)
                  .get()
                  .catch(() => null);
                if (rootSnap) studentDocs = rootSnap.docs;
              }

              studentDocs.forEach((d) => {
                const s = d.data();
                const name = String(s.name || s.fullName || "").trim();
                const admNo = String(s.admissionNumber || s.studentId || "").trim();
                const roll = s.rollNumber ? String(s.rollNumber).trim() : "";
                const cls = String(s.className || "").trim();
                const sec = String(s.sectionName || "").trim();
                const guardian = String(s.guardianName || s.fatherName || "").trim();
                const phone = String(s.guardianPhone || s.phone || "").trim();
                const email = String(s.email || "").trim();

                const nameLower = name.toLowerCase();
                const admLower = admNo.toLowerCase();

                let score = 0;
                if (admLower === q || (roll && roll === q)) score = 100;
                else if (nameLower === q) score = 95;
                else if (admLower.startsWith(q)) score = 85;
                else if (nameLower.startsWith(q)) score = 80;
                else if (nameLower.includes(q)) score = 60;
                else if (phone.includes(q)) score = 55;
                else if (cls.toLowerCase().includes(q) || guardian.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
                  score = 40;
                }

                if (score > 0) {
                  itemsMap.set(`student_${d.id}`, {
                    id: d.id,
                    type: "student",
                    category: "students",
                    name,
                    title: name,
                    subtitle: `Class ${cls}${sec ? `-${sec}` : ""} · Reg: ${admNo || d.id}${
                      guardian ? ` · Parent: ${guardian}` : ""
                    }${phone ? ` · 📞 ${phone}` : ""}`,
                    badge: "Student",
                    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                    url: `/admin/students?search=${encodeURIComponent(name || admNo)}`,
                    score,
                    metadata: { studentId: d.id, name, admissionNumber: admNo, className: cls },
                  });
                }
              });
            } catch (err) {
              console.warn("Student search notice:", err);
            }
          })()
        );
      }

      // B. Teachers & Faculty
      if (filterCategory === "all" || filterCategory === "teachers") {
        searchPromises.push(
          (async () => {
            try {
              const subSnap = await adminDb
                .collection("schools")
                .doc(schoolId)
                .collection("teachers")
                .limit(50)
                .get();

              let teacherDocs = subSnap.docs;
              if (teacherDocs.length === 0) {
                const rootSnap = await adminDb
                  .collection("teachers")
                  .where("schoolId", "==", schoolId)
                  .limit(50)
                  .get()
                  .catch(() => null);
                if (rootSnap) teacherDocs = rootSnap.docs;
              }

              teacherDocs.forEach((d) => {
                const t = d.data();
                const name = String(t.name || "").trim();
                const empId = String(t.employeeId || "").trim();
                const desig = String(t.designation || "Faculty").trim();
                const phone = String(t.phone || "").trim();
                const email = String(t.email || "").trim();
                const subjects = Array.isArray(t.subjects)
                  ? t.subjects.join(", ")
                  : String(t.specialization || "");

                const nameLower = name.toLowerCase();
                const empLower = empId.toLowerCase();

                let score = 0;
                if (empLower === q) score = 100;
                else if (nameLower === q) score = 95;
                else if (empLower.startsWith(q)) score = 85;
                else if (nameLower.startsWith(q)) score = 80;
                else if (nameLower.includes(q)) score = 60;
                else if (phone.includes(q)) score = 55;
                else if (desig.toLowerCase().includes(q) || subjects.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
                  score = 40;
                }

                if (score > 0) {
                  itemsMap.set(`teacher_${d.id}`, {
                    id: d.id,
                    type: "teacher",
                    category: "teachers",
                    name,
                    title: name,
                    subtitle: `${desig}${empId ? ` · ID: ${empId}` : ""}${
                      subjects ? ` · (${subjects})` : ""
                    }${phone ? ` · 📞 ${phone}` : ""}`,
                    badge: "Teacher",
                    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                    url: `/admin/teachers?search=${encodeURIComponent(name || empId)}`,
                    score,
                    metadata: { teacherId: d.id, name, employeeId: empId },
                  });
                }
              });
            } catch (err) {
              console.warn("Teacher search notice:", err);
            }
          })()
        );
      }

      // C. Fee Receipts & Payments
      if (filterCategory === "all" || filterCategory === "fees") {
        searchPromises.push(
          (async () => {
            try {
              const snap = await adminDb
                .collection("financialPayments")
                .where("schoolId", "==", schoolId)
                .limit(60)
                .get();

              snap.docs.forEach((d) => {
                const p = d.data();
                const rec = String(p.receiptNumber || "").trim();
                const stu = String(p.studentName || "").trim();
                const adm = String(p.admissionNumber || p.studentId || "").trim();
                const cls = String(p.className || "").trim();
                const amt = p.amountPaidPaise ? p.amountPaidPaise / 100 : p.amount || 0;
                const period = Array.isArray(p.periodMonths)
                  ? p.periodMonths.join(", ")
                  : String(p.feeMonth || "");
                const method = String(p.paymentMethod || "").replace(/_/g, " ");

                const recLower = rec.toLowerCase();
                const stuLower = stu.toLowerCase();

                let score = 0;
                if (recLower === q) score = 100;
                else if (recLower.startsWith(q)) score = 85;
                else if (recLower.includes(q)) score = 70;
                else if (stuLower.startsWith(q)) score = 65;
                else if (stuLower.includes(q) || adm.toLowerCase().includes(q) || cls.toLowerCase().includes(q)) {
                  score = 45;
                }

                if (score > 0) {
                  itemsMap.set(`receipt_${d.id}`, {
                    id: d.id,
                    type: "receipt",
                    category: "fees",
                    name: `Receipt #${rec}`,
                    title: `Receipt #${rec}`,
                    subtitle: `Student: ${stu}${cls ? ` (${cls})` : ""} · Paid: ₹${amt.toFixed(2)}${
                      method ? ` · ${method}` : ""
                    }${period ? ` · ${period}` : ""}`,
                    badge: "Fee Receipt",
                    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                    url: `/admin/fees/paid-slip?receipt=${encodeURIComponent(rec)}`,
                    score,
                    metadata: { receiptNumber: rec, studentName: stu, amount: amt },
                  });
                }
              });
            } catch (err) {
              console.warn("Fee receipt search notice:", err);
            }
          })()
        );
      }

      // D. Accounts, Journal Vouchers & Ledger Accounts
      if (filterCategory === "all" || filterCategory === "accounts") {
        searchPromises.push(
          (async () => {
            try {
              // 1. Journal Entries / Vouchers
              const jSnap = await adminDb
                .collection("journalEntries")
                .where("schoolId", "==", schoolId)
                .limit(50)
                .get();

              jSnap.docs.forEach((d) => {
                const j = d.data();
                const vNum = String(j.voucherNumber || "").trim();
                const vType = String(j.voucherType || "VOUCHER").trim();
                const narr = String(j.narration || "").trim();
                const ref = String(j.referenceNumber || "").trim();
                const amt = j.totalDebitRupees ?? (j.totalDebitPaise ? j.totalDebitPaise / 100 : 0);
                const linesStr = Array.isArray(j.lines)
                  ? j.lines.map((l: any) => l.accountName || l.accountCode || "").join(" ")
                  : "";

                const vNumLower = vNum.toLowerCase();

                let score = 0;
                if (vNumLower === q) score = 100;
                else if (vNumLower.startsWith(q)) score = 85;
                else if (vNumLower.includes(q)) score = 70;
                else if (ref.toLowerCase().includes(q)) score = 60;
                else if (narr.toLowerCase().includes(q) || linesStr.toLowerCase().includes(q) || vType.toLowerCase().includes(q)) {
                  score = 45;
                }

                if (score > 0) {
                  itemsMap.set(`voucher_${d.id}`, {
                    id: d.id,
                    type: "account",
                    category: "accounts",
                    name: `Voucher #${vNum} (${vType})`,
                    title: `Voucher #${vNum}`,
                    subtitle: `₹${amt.toFixed(2)} · ${narr || "Journal Entry"}`,
                    badge: `${vType} Voucher`,
                    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    url: `/admin/fees/accounting?tab=journal&voucher=${encodeURIComponent(vNum)}`,
                    score,
                    metadata: { voucherNumber: vNum, voucherType: vType, amount: amt },
                  });
                }
              });

              // 2. Chart of Accounts / Ledgers
              const coaSnap = await adminDb
                .collection("chartOfAccounts")
                .where("schoolId", "==", schoolId)
                .limit(40)
                .get();

              coaSnap.docs.forEach((d) => {
                const a = d.data();
                const code = String(a.code || "").trim();
                const name = String(a.name || "").trim();
                const cat = String(a.category || "").trim();
                const bal = a.currentBalanceRupees ?? (a.currentBalancePaise ? a.currentBalancePaise / 100 : 0);

                const codeLower = code.toLowerCase();
                const nameLower = name.toLowerCase();

                let score = 0;
                if (codeLower === q) score = 100;
                else if (nameLower === q) score = 95;
                else if (codeLower.startsWith(q)) score = 85;
                else if (nameLower.startsWith(q)) score = 80;
                else if (nameLower.includes(q) || cat.toLowerCase().includes(q)) score = 50;

                if (score > 0) {
                  itemsMap.set(`account_${d.id}`, {
                    id: d.id,
                    type: "account",
                    category: "accounts",
                    name: `${name} (${code})`,
                    title: name,
                    subtitle: `Account #${code} · ${cat} · Balance: ₹${bal.toFixed(2)}`,
                    badge: "Ledger Account",
                    badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
                    url: `/admin/fees/accounting?tab=general_ledger&code=${encodeURIComponent(code)}`,
                    score,
                    metadata: { code, name, category: cat },
                  });
                }
              });
            } catch (err) {
              console.warn("Accounting search notice:", err);
            }
          })()
        );
      }

      await Promise.all(searchPromises);
    } else {
      // Server-side client Firestore fallback (for edge or local runtime)
      try {
        const db = getFirebaseDb();
        if (db) {
          const clientPromises: Promise<any>[] = [];

          if (filterCategory === "all" || filterCategory === "students") {
            clientPromises.push(
              getDocs(query(collection(db, "schools", schoolId, "students"), limit(60)))
                .then((snap) => {
                  snap.docs.forEach((d) => {
                    const s = d.data();
                    const name = String(s.name || "");
                    const admNo = String(s.admissionNumber || s.studentId || "");
                    const cls = String(s.className || "");
                    const sec = String(s.sectionName || "");

                    if (
                      name.toLowerCase().includes(q) ||
                      admNo.toLowerCase().includes(q) ||
                      cls.toLowerCase().includes(q)
                    ) {
                      itemsMap.set(`student_${d.id}`, {
                        id: d.id,
                        type: "student",
                        category: "students",
                        name,
                        title: name,
                        subtitle: `Class ${cls}${sec ? `-${sec}` : ""} · Reg: ${admNo || d.id}`,
                        badge: "Student",
                        badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                        url: `/admin/students?search=${encodeURIComponent(name || admNo)}`,
                      });
                    }
                  });
                })
                .catch(() => {})
            );
          }

          if (filterCategory === "all" || filterCategory === "teachers") {
            clientPromises.push(
              getDocs(query(collection(db, "schools", schoolId, "teachers"), limit(30)))
                .then((snap) => {
                  snap.docs.forEach((d) => {
                    const t = d.data();
                    const name = String(t.name || "");
                    const desig = String(t.designation || "Teacher");
                    const emp = String(t.employeeId || "");

                    if (name.toLowerCase().includes(q) || desig.toLowerCase().includes(q) || emp.toLowerCase().includes(q)) {
                      itemsMap.set(`teacher_${d.id}`, {
                        id: d.id,
                        type: "teacher",
                        category: "teachers",
                        name,
                        title: name,
                        subtitle: `${desig}${emp ? ` · ID: ${emp}` : ""}`,
                        badge: "Teacher",
                        badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
                        url: `/admin/teachers?search=${encodeURIComponent(name || emp)}`,
                      });
                    }
                  });
                })
                .catch(() => {})
            );
          }

          if (filterCategory === "all" || filterCategory === "fees") {
            clientPromises.push(
              getDocs(query(collection(db, "financialPayments"), where("schoolId", "==", schoolId), limit(40)))
                .then((snap) => {
                  snap.docs.forEach((d) => {
                    const p = d.data();
                    const rec = String(p.receiptNumber || "");
                    const stu = String(p.studentName || "");
                    const amt = p.amountPaidPaise ? p.amountPaidPaise / 100 : p.amount || 0;

                    if (rec.toLowerCase().includes(q) || stu.toLowerCase().includes(q)) {
                      itemsMap.set(`receipt_${d.id}`, {
                        id: d.id,
                        type: "receipt",
                        category: "fees",
                        name: `Receipt #${rec}`,
                        title: `Receipt #${rec}`,
                        subtitle: `Student: ${stu} · ₹${amt.toFixed(2)}`,
                        badge: "Fee Receipt",
                        badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                        url: `/admin/fees/paid-slip?receipt=${encodeURIComponent(rec)}`,
                      });
                    }
                  });
                })
                .catch(() => {})
            );
          }

          if (filterCategory === "all" || filterCategory === "accounts") {
            clientPromises.push(
              getDocs(query(collection(db, "journalEntries"), where("schoolId", "==", schoolId), limit(30)))
                .then((snap) => {
                  snap.docs.forEach((d) => {
                    const j = d.data();
                    const vNum = String(j.voucherNumber || "");
                    const narr = String(j.narration || "");
                    const amt = j.totalDebitRupees ?? (j.totalDebitPaise ? j.totalDebitPaise / 100 : 0);

                    if (vNum.toLowerCase().includes(q) || narr.toLowerCase().includes(q)) {
                      itemsMap.set(`voucher_${d.id}`, {
                        id: d.id,
                        type: "account",
                        category: "accounts",
                        name: `Voucher #${vNum}`,
                        title: `Voucher #${vNum}`,
                        subtitle: `₹${amt.toFixed(2)} · ${narr}`,
                        badge: "Voucher",
                        badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                        url: `/admin/fees/accounting?tab=journal&voucher=${encodeURIComponent(vNum)}`,
                      });
                    }
                  });
                })
                .catch(() => {})
            );
          }

          await Promise.all(clientPromises);
        }
      } catch (clientErr) {
        // Fallback gracefully to instant navigation shortcuts
      }
    }

    const sortedResults = Array.from(itemsMap.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 40);

    setCachedResults(cacheKey, sortedResults);

    return NextResponse.json({
      success: true,
      count: sortedResults.length,
      results: sortedResults,
    });
  } catch (error: any) {
    console.error("School admin global search notice:", error);
    return NextResponse.json({ success: true, count: 0, results: [] });
  }
}
