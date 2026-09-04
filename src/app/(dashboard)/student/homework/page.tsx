"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  ClipboardList,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import { subscribeToClassHomework } from "@/lib/services/homework.service";
import type { StudentProfile } from "@/types";
import type { HomeworkItem } from "@/types/timetable";

export default function StudentHomeworkPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "pending">("all");

  // 1. Resolve student profile
  useEffect(() => {
    async function loadStudent() {
      if (!schoolId || !profile?.uid) {
        setLoading(false);
        return;
      }
      try {
        const db = getFirebaseDb();
        let studentDoc: any = null;

        const q = query(
          collection(db, "schools", schoolId, "students"),
          where("userId", "==", profile.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          studentDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } else if (profile.email) {
          const qEmail = query(
            collection(db, "schools", schoolId, "students"),
            where("email", "==", profile.email.toLowerCase())
          );
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            studentDoc = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
          }
        }

        if (studentDoc) {
          setStudent(studentDoc as StudentProfile);
        }
      } catch (err) {
        console.error("Failed to load student for homework:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [schoolId, profile?.uid, profile?.email]);

  // 2. Real-time subscription to class homework
  useEffect(() => {
    if (!schoolId || !student?.classId) return;

    const unsubscribe = subscribeToClassHomework(
      schoolId,
      student.classId,
      student.sectionId,
      (items) => {
        setHomeworkList(items);
      }
    );

    return () => unsubscribe();
  }, [schoolId, student?.classId, student?.sectionId]);

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredItems = homeworkList.filter((h) => {
    if (filter === "today") return h.assignedDate === todayStr;
    if (filter === "pending") return h.dueDate >= todayStr;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs tracking-wider uppercase">
            <ClipboardList className="h-4 w-4" />
            <span>Daily Academic Tasks</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            My Homework & Assignments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {student?.className ? `${student.className} (Section ${student.sectionName || "A"})` : "Your class"}{" "}
            • Real-time homework posted by your subject teachers
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-xs">
          {(["all", "today", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === f
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {f === "all" ? `All (${homeworkList.length})` : f}
            </button>
          ))}
        </div>
      </div>

      {/* Homework Cards List */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No homework assigned for {filter === "today" ? "today" : "this view"}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When your teacher assigns exercises or reading material for your class periods, they will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((h) => {
            const isDueToday = h.dueDate === todayStr;
            const isPastDue = h.dueDate < todayStr;

            return (
              <div
                key={h.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                        {h.subject}
                      </span>
                      {h.bellNumber && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg">
                          <Clock className="h-3 w-3" />
                          Bell {h.bellNumber}
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isDueToday
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : isPastDue
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      }`}
                    >
                      {isDueToday ? "Due Today!" : isPastDue ? "Past Due" : `Due ${h.dueDate}`}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {h.title}
                    </h3>
                    {h.bookName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 font-medium">
                        <BookOpen className="h-3.5 w-3.5 text-amber-500" />
                        <span>Book: {h.bookName}</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line leading-relaxed">
                      {h.description}
                    </p>
                  </div>
                </div>

                {/* Footer Meta */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {h.teacherName || "Subject Teacher"}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3 w-3" />
                    Assigned {h.assignedDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
