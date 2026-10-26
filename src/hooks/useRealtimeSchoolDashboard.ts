"use client";

import { useEffect, useState } from "react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getCountFromServer,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { School } from "@/types";

export interface RealtimeDashboardCounts {
  students: number;
  teachers: number;
  classes: number;
  academicYears: number;
  inquiries: number;
}

export interface UseRealtimeSchoolDashboardResult {
  school: School | null;
  counts: RealtimeDashboardCounts;
  subscription: any | null;
  isLoading: boolean;
  lastSyncTime: Date | null;
  isOnline: boolean;
}

export function useRealtimeSchoolDashboard(schoolId: string | undefined): UseRealtimeSchoolDashboardResult {
  const [school, setSchool] = useState<School | null>(null);
  const [counts, setCounts] = useState<RealtimeDashboardCounts>({
    students: 0,
    teachers: 0,
    classes: 0,
    academicYears: 0,
    inquiries: 0,
  });
  const [subscription, setSubscription] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    // Reset state immediately on schoolId change to prevent cross-tenant data bleed
    setSchool(null);
    setCounts({
      students: 0,
      teachers: 0,
      classes: 0,
      academicYears: 0,
      inquiries: 0,
    });
    setSubscription(null);

    if (!schoolId || schoolId === "school_default") {
      setIsLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubs: Unsubscribe[] = [];

    // 1. Real-time School Document Listener (Single document, instant update)
    try {
      const schoolRef = doc(db, "schools", schoolId);
      const unsubSchool = onSnapshot(
        schoolRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setSchool({
              id: snap.id,
              ...data,
            } as School);

            // Instant count paint from school summary metadata if available
            if (typeof data.studentCount === "number" || typeof data.teacherCount === "number") {
              setCounts((prev) => ({
                ...prev,
                students: typeof data.studentCount === "number" ? data.studentCount : prev.students,
                teachers: typeof data.teacherCount === "number" ? data.teacherCount : prev.teachers,
              }));
            }
            setLastSyncTime(new Date());
          }
          setIsLoading(false);
        },
        (err) => {
          console.warn("Realtime school listener notice:", err);
          setIsLoading(false);
        }
      );
      unsubs.push(unsubSchool);
    } catch (e) {
      console.warn("School doc subscription error:", e);
    }

    // 2. Real-time Subscription Listener (Single document)
    try {
      const subRef = doc(db, "schoolSubscriptions", schoolId);
      const unsubSub = onSnapshot(
        subRef,
        (snap) => {
          if (snap.exists()) {
            setSubscription(snap.data());
          }
          setLastSyncTime(new Date());
        },
        (err) => {
          console.warn("Realtime subscription listener notice:", err);
        }
      );
      unsubs.push(unsubSub);
    } catch (e) {
      console.warn("Subscription listener error:", e);
    }

    // 3. Ultra-Fast Server Aggregation Counts (getCountFromServer)
    // Runs in ~20ms, downloads 0 documents, preventing network flooding even with 10,000+ students.
    let isCancelled = false;
    const fetchFastCounts = async () => {
      try {
        const subStudentsRef = collection(db, "schools", schoolId, "students");
        const subTeachersRef = collection(db, "schools", schoolId, "teachers");
        const classesRef = collection(db, "schools", schoolId, "classes");
        const yearsRef = collection(db, "schools", schoolId, "academicYears");
        const inqQ = query(collection(db, "inquiries"), where("schoolId", "==", schoolId));

        const [sSnap, tSnap, cSnap, ySnap, iSnap] = await Promise.all([
          getCountFromServer(subStudentsRef).catch(() => null),
          getCountFromServer(subTeachersRef).catch(() => null),
          getCountFromServer(classesRef).catch(() => null),
          getCountFromServer(yearsRef).catch(() => null),
          getCountFromServer(inqQ).catch(() => null),
        ]);

        if (isCancelled) return;

        let studentsCount = sSnap ? sSnap.data().count : 0;
        let teachersCount = tSnap ? tSnap.data().count : 0;

        // Fallback to root collections if subcollections are empty
        if (studentsCount === 0) {
          const rootStudentsQ = query(collection(db, "students"), where("schoolId", "==", schoolId));
          const rootSnap = await getCountFromServer(rootStudentsQ).catch(() => null);
          if (rootSnap && rootSnap.data().count > 0) studentsCount = rootSnap.data().count;
        }

        if (teachersCount === 0) {
          const rootTeachersQ = query(collection(db, "teachers"), where("schoolId", "==", schoolId));
          const rootSnap = await getCountFromServer(rootTeachersQ).catch(() => null);
          if (rootSnap && rootSnap.data().count > 0) teachersCount = rootSnap.data().count;
        }

        setCounts({
          students: studentsCount,
          teachers: teachersCount,
          classes: cSnap ? cSnap.data().count : 0,
          academicYears: ySnap ? ySnap.data().count : 0,
          inquiries: iSnap ? iSnap.data().count : 0,
        });
        setLastSyncTime(new Date());
      } catch (countErr) {
        console.warn("Notice: Fast counts aggregation notice:", countErr);
      }
    };

    fetchFastCounts();

    return () => {
      isCancelled = true;
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  }, [schoolId]);

  return {
    school,
    counts,
    subscription,
    isLoading,
    lastSyncTime,
    isOnline,
  };
}

export default useRealtimeSchoolDashboard;
