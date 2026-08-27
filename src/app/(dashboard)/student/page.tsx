"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StudentDashboardLayout } from "@/components/student/StudentDashboardLayout";
import { StudentProfileCard } from "@/components/student/card/StudentProfileCard";
import { TodayOverview } from "@/components/student/overview/TodayOverview";
import { AttentionCenter } from "@/components/student/attention/AttentionCenter";
import { QuickActions } from "@/components/student/quick-actions/QuickActions";
import { TodaysSchedule } from "@/components/student/schedule/TodaysSchedule";
import {
  getStudentDashboardData,
  ConsolidatedStudentDashboardData,
} from "@/lib/services/student-dashboard.service";

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [dashboardData, setDashboardData] =
    useState<ConsolidatedStudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!schoolId || !profile?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Single optimized dashboard data query (Section 4 & 30)
      const data = await getStudentDashboardData(
        schoolId,
        profile.uid,
        profile.name || "Student"
      );
      setDashboardData(data);
    } catch (err: any) {
      console.error("Failed to load student dashboard data:", err);
      setError("Unable to load student dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId, profile?.uid]);

  // Fallback structures during initial loading
  const headerData = dashboardData?.header || {
    id: profile?.uid || "student_demo",
    firstName: profile?.name?.trim().split(" ")[0] || "Rahul",
    fullName: profile?.name || "Rahul Kumar",
  };

  const notificationData = dashboardData?.notifications || {
    unreadCount: 3,
  };

  const studentCardData = dashboardData?.studentCard || {
    id: profile?.uid || "student_demo",
    fullName: profile?.name || "Rahul Kumar",
    verificationStatus: "verified" as const,
    className: "Class 10",
    section: "A",
    rollNumber: "24",
    admissionNumber: "2024/01024",
    status: "active" as const,
  };

  const tenantCardData = dashboardData?.tenantCard || {
    id: schoolId || "tenant_sbci",
    name: "SBCI Computer Institute",
    shortName: "SBCI",
  };

  return (
    <StudentDashboardLayout
      student={headerData}
      notifications={notificationData}
      tenantEnabledModules={dashboardData?.tenantEnabledModules}
    >
      {/* 1. Phase 2 — Student Profile Card */}
      <StudentProfileCard
        student={studentCardData}
        tenant={tenantCardData}
        loading={loading}
        error={error}
        onRetry={loadData}
      />

      {/* 2. Phase 3 — Today Overview Section */}
      <TodayOverview
        data={dashboardData?.overview}
        loading={loading}
        error={error}
        onRetry={loadData}
      />

      {/* 3. Phase 4 — What Needs Your Attention? */}
      <AttentionCenter
        items={dashboardData?.attentionItems}
        maxItems={3}
        loading={loading}
        error={error}
        onRetry={loadData}
      />

      {/* 4. Phase 4 — Quick Actions */}
      <QuickActions
        tenantEnabledModules={dashboardData?.tenantEnabledModules}
        loading={loading}
        error={error}
      />

      {/* 5. Phase 5 — Today's Schedule */}
      <TodaysSchedule
        schedule={dashboardData?.schedule}
        loading={loading}
        error={error}
        onRetry={loadData}
      />
    </StudentDashboardLayout>
  );
}
