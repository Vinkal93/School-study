"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  Pin,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Megaphone,
  CheckCheck,
  Check,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getNoticesForStudent, markNoticeAsRead, trackNoticeDelivery } from "@/lib/services/notice.service";
import type { StudentProfile, Notice } from "@/types";

export default function StudentNoticesPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({});

  const loadNotices = async () => {
    if (!schoolId || !profile?.uid) return;
    setLoading(true);
    try {
      const db = getFirebaseDb();
      const q = query(
        collection(db, "schools", schoolId, "students"),
        where("userId", "==", profile.uid)
      );
      const snap = await getDocs(q);
      let classId = "";

      if (!snap.empty) {
        const s = {
          id: snap.docs[0].id,
          ...snap.docs[0].data(),
        } as StudentProfile;
        setStudent(s);
        classId = s.classId;
      }

      const list = await getNoticesForStudent(schoolId, classId);
      setNotices(list);

      // Track panel delivery in the background (Double Grey Tick)
      list.forEach((n) => {
        if (!n.readBy?.[profile.uid]) {
          trackNoticeDelivery(n.id, profile.uid).catch(() => {});
        }
      });
    } catch (err) {
      console.error("Failed to load notices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (noticeId: string) => {
    if (!profile?.uid || !schoolId || markingIds[noticeId]) return;
    setMarkingIds((prev) => ({ ...prev, [noticeId]: true }));
    try {
      const nowIso = new Date().toISOString();
      await markNoticeAsRead(
        schoolId,
        noticeId,
        profile.uid,
        profile.name || "Student",
        "student"
      );

      // Optimistically update notice state
      setNotices((prev) =>
        prev.map((n) => {
          if (n.id === noticeId) {
            return {
              ...n,
              readBy: {
                ...(n.readBy || {}),
                [profile.uid]: nowIso,
              },
              readCount: (n.readCount || 0) + 1,
            };
          }
          return n;
        })
      );
    } catch (err) {
      console.error("Failed to mark notice as read:", err);
    } finally {
      setMarkingIds((prev) => ({ ...prev, [noticeId]: false }));
    }
  };

  useEffect(() => {
    loadNotices();
  }, [schoolId, profile?.uid]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              School Circulars & Announcements
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Notices targeted to students and {student?.className || "your class"}.
            </p>
          </div>

          <button
            onClick={loadNotices}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : notices.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-950">
          <Megaphone className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
            No active notices
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            School circulars and announcements will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => {
            const isRead = !!(profile?.uid && n.readBy?.[profile.uid]);
            const isMarking = !!markingIds[n.id];

            return (
              <div
                key={n.id}
                className={`rounded-xl border p-5 shadow-sm transition-all ${
                  isRead
                    ? "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                    : "border-purple-200 bg-purple-50/30 dark:border-purple-900/40 dark:bg-purple-950/20"
                } space-y-3`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-purple-100 dark:bg-purple-900/40 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                      <Pin className="h-3 w-3" />
                      {n.audience} {n.className ? `(${n.className})` : ""}
                    </span>
                    <span className="text-xs text-gray-400">• {n.date}</span>
                  </div>

                  <div>
                    {isRead ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <CheckCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Read
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        disabled={isMarking}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {isMarking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5" />
                        )}
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  {n.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {n.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
