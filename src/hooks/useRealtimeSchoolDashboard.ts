"use client";

import { useEffect, useState } from "react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getCountFromServer,
  getDoc,
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

// Authoritative live counts populated from schoolUsage and active rosters
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

    // 2b. Real-time School Usage Listener (Synchronized single-source-of-truth)
    try {
      const usageRef = doc(db, "schoolUsage", schoolId);
      const unsubUsage = onSnapshot(
        usageRef,
        (snap) => {
          if (snap.exists()) {
            const uData = snap.data();
            setCounts((prev) => ({
              ...prev,
              students: typeof uData.students === "number" ? uData.students : prev.students,
              teachers: typeof uData.teachers === "number" ? uData.teachers : prev.teachers,
              classes: typeof uData.classes === "number" ? uData.classes : prev.classes,
            }));
            setLastSyncTime(new Date());
          }
        },
        (err) => {
          console.warn("Realtime schoolUsage listener notice:", err);
        }
      );
      unsubs.push(unsubUsage);
    } catch (e) {
      console.warn("Usage listener error:", e);
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

        const [sSnap, tSnap, cSnap, ySnap, iSnap, usageSnap] = await Promise.all([
          getCountFromServer(subStudentsRef).catch(() => null),
          getCountFromServer(subTeachersRef).catch(() => null),
          getCountFromServer(classesRef).catch(() => null),
          getCountFromServer(yearsRef).catch(() => null),
          getCountFromServer(inqQ).catch(() => null),
          getDoc(doc(db, "schoolUsage", schoolId)).catch(() => null),
        ]);

        if (isCancelled) return;

        let studentsCount = 0;
        let teachersCount = 0;
        let classesCount = 0;

        // 1. Authoritative active students count (server aggregation strictly excluding deleted and archived)
        try {
          const activeStudentsQ = query(
            subStudentsRef,
            where("status", "in", ["active", "inactive", "tc_issued", "transferred", "pending"])
          );
          const activeSnap = await getCountFromServer(activeStudentsQ).catch(() => null);
          if (activeSnap && typeof activeSnap.data().count === "number") {
            studentsCount = activeSnap.data().count;
          } else if (usageSnap && usageSnap.exists() && typeof usageSnap.data().students === "number") {
            studentsCount = usageSnap.data().students;
          } else {
            studentsCount = sSnap ? sSnap.data().count : 0;
          }
        } catch {
          if (usageSnap && usageSnap.exists() && typeof usageSnap.data().students === "number") {
            studentsCount = usageSnap.data().students;
          } else {
            studentsCount = sSnap ? sSnap.data().count : 0;
          }
        }

        // 2. Authoritative active teachers count (server aggregation excluding deleted/archived)
        try {
          const activeTeachersQ = query(
            subTeachersRef,
            where("status", "in", ["active", "inactive"])
          );
          const activeSnap = await getCountFromServer(activeTeachersQ).catch(() => null);
          if (activeSnap && typeof activeSnap.data().count === "number") {
            teachersCount = activeSnap.data().count;
          } else if (usageSnap && usageSnap.exists() && typeof usageSnap.data().teachers === "number") {
            teachersCount = usageSnap.data().teachers;
          } else {
            teachersCount = tSnap ? tSnap.data().count : 0;
          }
        } catch {
          if (usageSnap && usageSnap.exists() && typeof usageSnap.data().teachers === "number") {
            teachersCount = usageSnap.data().teachers;
          } else {
            teachersCount = tSnap ? tSnap.data().count : 0;
          }
        }

        // 3. Classes count
        if (usageSnap && usageSnap.exists() && typeof usageSnap.data().classes === "number") {
          classesCount = usageSnap.data().classes;
        } else {
          classesCount = cSnap ? cSnap.data().count : 0;
        }

        // Zero-waste: do not trigger client-side usage reconciliations
        // Usage reconciliations require Admin SDK privileges and are performed on the server.

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
          classes: classesCount,
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
