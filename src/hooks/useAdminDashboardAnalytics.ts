"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { getFeeDashboardMetrics, getDefaultersList, getFeeTransactions } from "@/lib/services/fee.service";
import { getNoticesForAdmin } from "@/lib/services/notice.service";
import { getCurrentDayOfWeek } from "@/lib/services/timetable.service";
import type { Notice, ClassBell, StudentFeeAssignment, FeePayment } from "@/types";

export interface StudentGrowthMonth {
  month: string;
  count: number;
  heightPercent: string;
}

export interface FeeMonthlyData {
  month: string;
  amountRupees: number;
}

export interface DashboardStudentItem {
  id: string;
  name: string;
  class: string;
  admissionNumber?: string;
  rollNumber?: number;
  date: string;
  initial: string;
}

export interface DashboardTeacherItem {
  id: string;
  name: string;
  subject?: string;
  designation?: string;
  date: string;
  initial: string;
}

export interface DashboardDefaulterItem {
  id: string;
  name: string;
  class: string;
  pendingRupees: number;
  initial: string;
}

export interface AdminDashboardAnalytics {
  isLoading: boolean;
  // Financial metrics
  thisMonthCollectionPaise: number;
  totalCollectedPaise: number;
  totalPendingPaise: number;
  defaultersCount: number;
  // Today's attendance
  attendancePercentage: number | null; // null if no attendance recorded today
  attendancePresentCount: number;
  attendanceTotalCount: number;
  // Charts data
  studentGrowth: StudentGrowthMonth[];
  growthRatePercent: number | null;
  feeMonthlyTrend: FeeMonthlyData[];
  // Actionable schedule & tasks
  todayBells: ClassBell[];
  latestNotices: Notice[];
  recentStudents: DashboardStudentItem[];
  recentTeachers: DashboardTeacherItem[];
  feeDefaulters: DashboardDefaulterItem[];
  // Refresh
  refetch: () => Promise<void>;
}

export function useAdminDashboardAnalytics(schoolId: string | undefined): AdminDashboardAnalytics {
  const [data, setData] = useState<Omit<AdminDashboardAnalytics, "isLoading" | "refetch">>({
    thisMonthCollectionPaise: 0,
    totalCollectedPaise: 0,
    totalPendingPaise: 0,
    defaultersCount: 0,
    attendancePercentage: null,
    attendancePresentCount: 0,
    attendanceTotalCount: 0,
    studentGrowth: [],
    growthRatePercent: null,
    feeMonthlyTrend: [],
    todayBells: [],
    latestNotices: [],
    recentStudents: [],
    recentTeachers: [],
    feeDefaulters: [],
  });

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!schoolId || schoolId === "school_default") {
      setIsLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const currentDay = getCurrentDayOfWeek();

      // 1. Fee Metrics & Transactions & Defaulters
      const [feeMetrics, feeTransactions, rawDefaulters] = await Promise.all([
        getFeeDashboardMetrics(schoolId).catch(() => null),
        getFeeTransactions(schoolId).catch(() => []),
        getDefaultersList(schoolId).catch(() => []),
      ]);

      const thisMonthCollectionPaise = feeMetrics?.thisMonthCollectionPaise || 0;
      const totalCollectedPaise = feeMetrics?.totalCollectedPaise || 0;
      const totalPendingPaise = feeMetrics?.totalPendingPaise || 0;
      const defaultersCount = feeMetrics?.defaultersCount || 0;

      // Fee Monthly Trend (last 6 months)
      const monthsBack: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsBack.push(d.toISOString().slice(0, 7)); // YYYY-MM
      }

      const feeTrendMap: Record<string, number> = {};
      monthsBack.forEach((m) => {
        feeTrendMap[m] = 0;
      });

      feeTransactions.forEach((tx) => {
        if (tx.status === "SUCCESS" && tx.createdAt) {
          const m = tx.createdAt.slice(0, 7);
          if (feeTrendMap[m] !== undefined) {
            feeTrendMap[m] += tx.amountPaidPaise / 100;
          }
        }
      });

      const feeMonthlyTrend: FeeMonthlyData[] = monthsBack.map((m) => {
        const dateObj = new Date(`${m}-01`);
        const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short" });
        return {
          month: monthLabel,
          amountRupees: Math.round(feeTrendMap[m] || 0),
        };
      });

      // Defaulters List mapping (Top 5)
      const feeDefaulters: DashboardDefaulterItem[] = rawDefaulters.slice(0, 5).map((d) => {
        const nameParts = (d.studentName || "Student").trim().split(" ");
        const initial =
          nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
            : (nameParts[0].slice(0, 2) || "ST").toUpperCase();

        return {
          id: d.id,
          name: d.studentName || "Student",
          class: d.className ? `Class ${d.className}${d.sectionName ? `-${d.sectionName}` : ""}` : "Unassigned",
          pendingRupees: Math.round(d.totalPendingPaise / 100),
          initial,
        };
      });

      // 2. Today's Attendance Query
      let attendancePercentage: number | null = null;
      let attendancePresentCount = 0;
      let attendanceTotalCount = 0;

      try {
        const attQuery = query(
          collection(db, "attendance"),
          where("schoolId", "==", schoolId),
          where("date", "==", todayStr)
        );
        const attSnap = await getDocs(attQuery);
        if (!attSnap.empty) {
          attendanceTotalCount = attSnap.size;
          attendancePresentCount = attSnap.docs.filter((docSnap) => {
            const status = docSnap.data().status;
            return status === "PRESENT" || status === "LATE";
          }).length;
          attendancePercentage = Math.round((attendancePresentCount / attendanceTotalCount) * 100);
        }
      } catch (attErr) {
        console.warn("Attendance query notice:", attErr);
      }

      // 3. Today's Timetable Bells
      let todayBells: ClassBell[] = [];
      try {
        const bellSnap = await getDocs(collection(db, "schools", schoolId, "bells"));
        todayBells = (bellSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ClassBell[])
          .filter((b) => b.dayOfWeek === currentDay || b.dayOfWeek === "all")
          .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      } catch (bellErr) {
        console.warn("Timetable bells notice:", bellErr);
      }

      // 4. Latest Active Notices
      let latestNotices: Notice[] = [];
      try {
        const notices = await getNoticesForAdmin(schoolId, { status: "active" });
        latestNotices = notices.slice(0, 5);
      } catch (noticeErr) {
        console.warn("Notices notice:", noticeErr);
      }

      // 5. Recent Students (Top 5)
      let recentStudents: DashboardStudentItem[] = [];
      try {
        let stuList: any[] = [];
        try {
          const subSnap = await getDocs(collection(db, "schools", schoolId, "students"));
          stuList = subSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter((s) => s.status !== "deleted");
        } catch {}

        if (stuList.length === 0) {
          try {
            const stuQuery = query(
              collection(db, "students"),
              where("schoolId", "==", schoolId)
            );
            const stuSnap = await getDocs(stuQuery);
            stuList = stuSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .filter((s) => s.status !== "deleted");
          } catch {}
        }

        stuList.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

        recentStudents = stuList.slice(0, 5).map((s) => {
          const name = s.name || s.fullName || "Student";
          const nameParts = name.trim().split(" ");
          const initial =
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : (nameParts[0].slice(0, 2) || "ST").toUpperCase();

          const classLabel = s.className
            ? `Class ${s.className}${s.sectionName ? `-${s.sectionName}` : ""}`
            : s.grade
            ? `Grade ${s.grade}`
            : "Class N/A";

          const dateLabel = s.createdAt
            ? new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : "Recent";

          return {
            id: s.id,
            name,
            class: `${classLabel}${s.rollNumber ? ` | Roll: ${s.rollNumber}` : s.admissionNumber ? ` | ID: ${s.admissionNumber}` : ""}`,
            admissionNumber: s.admissionNumber,
            rollNumber: s.rollNumber,
            date: dateLabel,
            initial,
          };
        });

        // 6. Student Growth Months
        const growthMonthMap: Record<string, number> = {};
        monthsBack.forEach((m) => {
          growthMonthMap[m] = 0;
        });

        stuList.forEach((s) => {
          if (s.createdAt) {
            const m = s.createdAt.slice(0, 7);
            if (growthMonthMap[m] !== undefined) {
              growthMonthMap[m] += 1;
            }
          }
        });

        const maxCount = Math.max(...Object.values(growthMonthMap), 1);
        const studentGrowth: StudentGrowthMonth[] = monthsBack.map((m) => {
          const dateObj = new Date(`${m}-01`);
          const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short" });
          const count = growthMonthMap[m] || 0;
          return {
            month: monthLabel,
            count,
            heightPercent: `${Math.max(12, Math.round((count / maxCount) * 85))}%`,
          };
        });

        // Compute Growth Rate
        let growthRatePercent: number | null = null;
        if (monthsBack.length >= 2) {
          const prevMonthCount = growthMonthMap[monthsBack[monthsBack.length - 2]] || 0;
          const curMonthCount = growthMonthMap[monthsBack[monthsBack.length - 1]] || 0;
          if (prevMonthCount > 0) {
            growthRatePercent = Math.round(((curMonthCount - prevMonthCount) / prevMonthCount) * 100);
          }
        }

        setData((prev) => ({
          ...prev,
          studentGrowth,
          growthRatePercent,
        }));
      } catch (stuErr) {
        console.warn("Recent students notice:", stuErr);
      }

      // 7. Recent Teachers (Top 5)
      let recentTeachers: DashboardTeacherItem[] = [];
      try {
        let tchList: any[] = [];
        try {
          const subSnap = await getDocs(collection(db, "schools", schoolId, "teachers"));
          tchList = subSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter((t) => t.status !== "deleted");
        } catch {}

        if (tchList.length === 0) {
          try {
            const tchQuery = query(
              collection(db, "teachers"),
              where("schoolId", "==", schoolId)
            );
            const tchSnap = await getDocs(tchQuery);
            tchList = tchSnap.docs
              .map((d) => ({ id: d.id, ...d.data() } as any))
              .filter((t) => t.status !== "deleted");
          } catch {}
        }

        tchList.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

        recentTeachers = tchList.slice(0, 5).map((t) => {
          const name = t.name || t.fullName || "Teacher";
          const nameParts = name.trim().split(" ");
          const initial =
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : (nameParts[0].slice(0, 2) || "TC").toUpperCase();

          const dateLabel = t.createdAt
            ? `Joined ${new Date(t.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
            : "Faculty";

          return {
            id: t.id,
            name,
            subject: t.subject || t.department || (Array.isArray(t.subjects) ? t.subjects[0] : "General"),
            designation: t.designation || "Teacher",
            date: dateLabel,
            initial,
          };
        });
      } catch (tchErr) {
        console.warn("Recent teachers notice:", tchErr);
      }

      setData((prev) => ({
        ...prev,
        thisMonthCollectionPaise,
        totalCollectedPaise,
        totalPendingPaise,
        defaultersCount,
        attendancePercentage,
        attendancePresentCount,
        attendanceTotalCount,
        feeMonthlyTrend,
        todayBells,
        latestNotices,
        recentStudents,
        recentTeachers,
        feeDefaulters,
      }));
    } catch (globalErr) {
      console.warn("Dashboard analytics fetch notice:", globalErr);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    // Reset state immediately on schoolId change to avoid cross-tenant data bleed
    setData({
      thisMonthCollectionPaise: 0,
      totalCollectedPaise: 0,
      totalPendingPaise: 0,
      defaultersCount: 0,
      attendancePercentage: null,
      attendancePresentCount: 0,
      attendanceTotalCount: 0,
      studentGrowth: [],
      growthRatePercent: null,
      feeMonthlyTrend: [],
      todayBells: [],
      latestNotices: [],
      recentStudents: [],
      recentTeachers: [],
      feeDefaulters: [],
    });
    setIsLoading(true);
    fetchData();
  }, [schoolId, fetchData]);

  return {
    ...data,
    isLoading,
    refetch: fetchData,
  };
}
