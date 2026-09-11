"use client";

import { useEffect, useState, useRef } from "react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { School, SchoolSubscription } from "@/types";

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

    // 1. Real-time School Document Listener
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

    // 2. Real-time Subscription Listener
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

    // 3. Real-time Students Listener (Subcollection with Top-Level Fallback)
    try {
      const subStudentsRef = collection(db, "schools", schoolId, "students");
      const unsubSubStudents = onSnapshot(
        subStudentsRef,
        (snap) => {
          if (!snap.empty) {
            setCounts((prev) => ({
              ...prev,
              students: snap.docs.filter((d) => d.data().status !== "deleted").length,
            }));
            setLastSyncTime(new Date());
          } else {
            // Check top-level students collection
            try {
              const topQ = query(collection(db, "students"), where("schoolId", "==", schoolId));
              const unsubTopStudents = onSnapshot(
                topQ,
                (topSnap) => {
                  setCounts((prev) => ({
                    ...prev,
                    students: topSnap.docs.filter((d) => d.data().status !== "deleted").length,
                  }));
                  setLastSyncTime(new Date());
                },
                () => {}
              );
              unsubs.push(unsubTopStudents);
            } catch {}
          }
        },
        (err) => {
          console.warn("Students subcollection notice, trying top-level:", err);
        }
      );
      unsubs.push(unsubSubStudents);
    } catch (e) {
      console.warn("Students listener error:", e);
    }

    // 4. Real-time Teachers Listener (Subcollection with Top-Level Fallback)
    try {
      const subTeachersRef = collection(db, "schools", schoolId, "teachers");
      const unsubSubTeachers = onSnapshot(
        subTeachersRef,
        (snap) => {
          if (!snap.empty) {
            setCounts((prev) => ({
              ...prev,
              teachers: snap.docs.filter((d) => d.data().status !== "deleted").length,
            }));
            setLastSyncTime(new Date());
          } else {
            try {
              const topQ = query(collection(db, "teachers"), where("schoolId", "==", schoolId));
              const unsubTopTeachers = onSnapshot(
                topQ,
                (topSnap) => {
                  setCounts((prev) => ({
                    ...prev,
                    teachers: topSnap.docs.filter((d) => d.data().status !== "deleted").length,
                  }));
                  setLastSyncTime(new Date());
                },
                () => {}
              );
              unsubs.push(unsubTopTeachers);
            } catch {}
          }
        },
        (err) => {
          console.warn("Teachers listener notice:", err);
        }
      );
      unsubs.push(unsubSubTeachers);
    } catch (e) {
      console.warn("Teachers listener error:", e);
    }

    // 5. Real-time Classes Listener
    try {
      const classesRef = collection(db, "schools", schoolId, "classes");
      const unsubClasses = onSnapshot(
        classesRef,
        (snap) => {
          setCounts((prev) => ({
            ...prev,
            classes: snap.size,
          }));
          setLastSyncTime(new Date());
        },
        (err) => {
          console.warn("Classes listener notice:", err);
        }
      );
      unsubs.push(unsubClasses);
    } catch (e) {
      console.warn("Classes listener error:", e);
    }

    // 6. Real-time Academic Years Listener
    try {
      const yearsRef = collection(db, "schools", schoolId, "academicYears");
      const unsubYears = onSnapshot(
        yearsRef,
        (snap) => {
          setCounts((prev) => ({
            ...prev,
            academicYears: snap.size,
          }));
          setLastSyncTime(new Date());
        },
        (err) => {
          console.warn("Academic years listener notice:", err);
        }
      );
      unsubs.push(unsubYears);
    } catch (e) {
      console.warn("Academic years listener error:", e);
    }

    // 7. Real-time Inquiries Listener
    try {
      const inqQ = query(collection(db, "inquiries"), where("schoolId", "==", schoolId));
      const unsubInquiries = onSnapshot(
        inqQ,
        (snap) => {
          setCounts((prev) => ({
            ...prev,
            inquiries: snap.size,
          }));
          setLastSyncTime(new Date());
        },
        () => {}
      );
      unsubs.push(unsubInquiries);
    } catch {}

    return () => {
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
