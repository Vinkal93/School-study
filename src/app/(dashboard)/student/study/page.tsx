"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Clock,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Users,
  Coffee,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  subscribeToClassBells,
  getCurrentDayOfWeek,
} from "@/lib/services/timetable.service";
import { subscribeToClassHomework } from "@/lib/services/homework.service";
import { subscribeToStudyMaterials } from "@/lib/services/teacher-portal.service";
import type { StudentProfile, StudyMaterial } from "@/types";
import type { ClassBell, HomeworkItem } from "@/types/timetable";
import { ExternalLink, FileText } from "lucide-react";

export default function StudentStudyPage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [todayBells, setTodayBells] = useState<ClassBell[]>([]);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDay = getCurrentDayOfWeek();

  // 1. Resolve student record
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
        console.error("Failed to load student for study:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStudent();
  }, [schoolId, profile?.uid, profile?.email]);

  // 2. Real-time subscription to today's timetable bells
  useEffect(() => {
    if (!schoolId || !student?.classId) return;

    const unsubBells = subscribeToClassBells(
      schoolId,
      student.classId,
      currentDay,
      (liveBells) => {
        setTodayBells(liveBells);
      }
    );

    const unsubHomework = subscribeToClassHomework(
      schoolId,
      student.classId,
      student.sectionId,
      (liveHomework) => {
        setHomeworkList(liveHomework);
      }
    );

    const unsubMaterials = subscribeToStudyMaterials(
      schoolId,
      student.classId,
      (liveMaterials) => {
        setStudyMaterials(liveMaterials);
      }
    );

    return () => {
      unsubBells();
      unsubHomework();
      unsubMaterials();
    };
  }, [schoolId, student?.classId, student?.sectionId, currentDay]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">
          <BookOpen className="h-4 w-4" />
          <span>Study & Class Schedule</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
          Today's Timetable & Period Homework
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {student?.className || "Class"} • Dynamic daily period bells, textbook curriculum, and assigned tasks in bell order.
        </p>
      </div>

      {/* Teacher Shared Study Materials & Notes Section */}
      {studyMaterials.length > 0 && (
        <div className="rounded-3xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white dark:from-slate-900 dark:to-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Classroom Notes & Study Materials ({studyMaterials.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Shared directly by your teachers for revision and self-study
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {studyMaterials.map((mat) => (
              <div
                key={mat.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                    {mat.subject}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                    {mat.title}
                  </h4>
                  {mat.chapter && (
                    <p className="text-[11px] text-slate-500 mt-1">Chapter: {mat.chapter}</p>
                  )}
                  {mat.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {mat.description}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">By {mat.teacherName}</span>
                  {mat.externalUrl && (
                    <a
                      href={mat.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule & Period-Wise Homework Timeline */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : todayBells.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <Clock className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
            No class periods scheduled for {currentDay}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your school administrator has not configured periods for {currentDay} yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Today's Bells & Subjects ({todayBells.length} Periods)
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 capitalize">
              {currentDay} • {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          <div className="space-y-3.5">
            {todayBells.map((bell) => {
              // Find homework matching this bell or this subject
              const bellHomework = homeworkList.filter(
                (h) =>
                  (h.bellNumber === bell.bellNumber ||
                    (h.subject.toLowerCase() === bell.subject.toLowerCase() && !h.bellNumber)) &&
                  (h.assignedDate === todayStr || h.dueDate >= todayStr)
              );

              return (
                <div
                  key={bell.id}
                  className={`rounded-3xl border p-5 shadow-xs transition-all ${
                    bell.isBreak
                      ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30"
                      : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                          bell.isBreak
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                        }`}
                      >
                        {bell.isBreak ? <Coffee className="h-5 w-5" /> : `B${bell.bellNumber}`}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {bell.bellName}
                          </h3>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            • {bell.subject}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold">
                            {bell.startTime} – {bell.endTime}
                          </span>
                          {bell.bookName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-medium">
                                <BookOpen className="h-3 w-3" />
                                {bell.bookName}
                              </span>
                            </>
                          )}
                          {bell.teacherName && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {bell.teacherName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {!bell.isBreak && (
                      <div>
                        {bellHomework.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                            <ClipboardList className="h-3.5 w-3.5" />
                            {bellHomework.length} Assignment(s)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            No active tasks
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Associated Homework for this Bell */}
                  {bellHomework.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                        Assigned Tasks for this Period:
                      </p>
                      {bellHomework.map((hw) => (
                        <div
                          key={hw.id}
                          className="rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/30 p-3.5 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-extrabold text-slate-900 dark:text-white">
                              {hw.title}
                            </h4>
                            <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              Due: {hw.dueDate}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                            {hw.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
