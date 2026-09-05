"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  Copy,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Coffee,
  Bookmark,
  FileText,
  MapPin,
  Bell,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getTeachers } from "@/lib/services/teacher.service";
import {
  subscribeToClassBells,
  getCurrentDayOfWeek,
  calculateBellStatus,
  type BellLiveStatus,
} from "@/lib/services/timetable.service";
import type { SchoolClass, TeacherProfile } from "@/types";
import type { ClassBell, DayOfWeek, CreateClassBellInput } from "@/types/timetable";
import { toast } from "sonner";

const DAYS: { id: DayOfWeek; label: string }[] = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
];

export default function AdminTimetablePage() {
  const { profile } = useAuth();
  const schoolId = profile?.schoolId || "";

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDayOfWeek());
  const [bells, setBells] = useState<ClassBell[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingBellId, setEditingBellId] = useState<string | null>(null);
  const [bellNumber, setBellNumber] = useState<number>(1);
  const [bellName, setBellName] = useState<string>("Period 1");
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("08:40");
  const [subject, setSubject] = useState<string>("");
  const [bookName, setBookName] = useState<string>("");
  const [chapter, setChapter] = useState<string>("");
  const [task, setTask] = useState<string>("");
  const [reminder, setReminder] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [formSectionId, setFormSectionId] = useState<string>("");

  // 1. Initial load of classes and teachers
  useEffect(() => {
    async function loadMeta() {
      if (!schoolId) return;
      try {
        const [cList, tList] = await Promise.all([
          getClassesWithSections(schoolId),
          getTeachers(schoolId),
        ]);
        setClasses(cList);
        setTeachers(tList);
        if (cList.length > 0 && !selectedClassId) {
          setSelectedClassId(cList[0].id);
        }
      } catch (err) {
        console.error("Failed to load classes or teachers:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMeta();
  }, [schoolId]);

  // 2. Real-time subscription to class bells for selected class, section & day
  useEffect(() => {
    if (!schoolId || !selectedClassId) {
      setBells([]);
      return;
    }

    const unsubscribe = subscribeToClassBells(
      schoolId,
      selectedClassId,
      selectedDay,
      (liveBells) => {
        setBells(liveBells);
      },
      selectedSectionId
    );

    return () => unsubscribe();
  }, [schoolId, selectedClassId, selectedDay, selectedSectionId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  // Open modal for new bell
  const handleOpenNew = () => {
    setEditingBellId(null);
    const nextNum = bells.length > 0 ? Math.max(...bells.map((b) => b.bellNumber || 0)) + 1 : 1;
    setBellNumber(nextNum);
    setBellName(`Period ${nextNum}`);

    // Guess next period time based on last period
    if (bells.length > 0) {
      const lastBell = bells[bells.length - 1];
      if (lastBell.endTime) {
        setStartTime(lastBell.endTime);
        const [h, m] = lastBell.endTime.split(":").map((v) => parseInt(v, 10));
        if (!isNaN(h) && !isNaN(m)) {
          const total = h * 60 + m + 40;
          const nh = Math.floor(total / 60) % 24;
          const nm = total % 60;
          setEndTime(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
        }
      }
    } else {
      setStartTime("08:00");
      setEndTime("08:40");
    }

    setSubject("");
    setBookName("");
    setChapter("");
    setTask("");
    setReminder("");
    setMessage("");
    setRoom("");
    setTeacherId("");
    setIsBreak(false);
    setFormSectionId(selectedSectionId !== "all" ? selectedSectionId : "");
    setShowModal(true);
  };

  // Open modal for editing bell
  const handleOpenEdit = (bell: ClassBell) => {
    setEditingBellId(bell.id);
    setBellNumber(bell.bellNumber);
    setBellName(bell.bellName);
    setStartTime(bell.startTime);
    setEndTime(bell.endTime);
    setSubject(bell.subject);
    setBookName(bell.bookName || "");
    setChapter(bell.chapter || "");
    setTask(bell.task || "");
    setReminder(bell.reminder || "");
    setMessage(bell.message || "");
    setRoom(bell.room || "");
    setTeacherId(bell.teacherId || "");
    setIsBreak(bell.isBreak || false);
    setFormSectionId(bell.sectionId || "");
    setShowModal(true);
  };

  // Save Bell (with addAnother support)
  const handleSaveBell = async (e?: React.FormEvent, addAnother: boolean = false) => {
    if (e) e.preventDefault();
    if (!selectedClass) {
      toast.error("Please select a valid class first.");
      return;
    }
    if (!subject.trim() && !isBreak) {
      toast.error("Please enter a subject or mark as recess/break.");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedTeacher = teachers.find((t) => t.id === teacherId);
      const selectedSection = availableSections.find((s) => s.id === formSectionId);

      const input: CreateClassBellInput = {
        classId: selectedClass.id,
        className: selectedClass.name,
        sectionId: formSectionId || undefined,
        sectionName: selectedSection?.name || undefined,
        bellNumber,
        bellName: bellName.trim() || `Period ${bellNumber}`,
        startTime,
        endTime,
        subject: isBreak ? "Recess / Break" : subject.trim(),
        bookName: isBreak ? "" : bookName.trim(),
        chapter: isBreak ? "" : chapter.trim(),
        task: isBreak ? "" : task.trim(),
        reminder: isBreak ? "" : reminder.trim(),
        message: isBreak ? "" : message.trim(),
        room: room.trim(),
        teacherId: isBreak ? "" : (selectedTeacher?.id || ""),
        teacherName: isBreak ? "" : (selectedTeacher?.name || ""),
        dayOfWeek: selectedDay,
        isBreak,
      };

      // Direct API call to guarantee backend persistence & validation
      const res = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          bellId: editingBellId || undefined,
          ...input,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to save period.");
      }

      toast.success(editingBellId ? "Period updated successfully!" : "Period added successfully!");

      if (addAnother) {
        // Setup form for next period
        const nextNum = bellNumber + 1;
        setEditingBellId(null);
        setBellNumber(nextNum);
        setBellName(`Period ${nextNum}`);
        setStartTime(endTime);
        const [h, m] = endTime.split(":").map((v) => parseInt(v, 10));
        if (!isNaN(h) && !isNaN(m)) {
          const total = h * 60 + m + 40;
          const nh = Math.floor(total / 60) % 24;
          const nm = total % 60;
          setEndTime(`${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`);
        }
        setSubject("");
        setBookName("");
        setChapter("");
        setTask("");
        setReminder("");
        setMessage("");
        setIsBreak(false);
      } else {
        setShowModal(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save period.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Bell
  const handleDeleteBell = async (bellId: string) => {
    if (!confirm("Are you sure you want to remove this period? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/timetable?schoolId=${encodeURIComponent(schoolId)}&bellId=${encodeURIComponent(bellId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete period.");
      }
      toast.success("Period deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete period.");
    }
  };

  // Copy schedule to other days
  const handleCopySchedule = async () => {
    if (bells.length === 0) {
      toast.error(`No periods exist on ${selectedDay} to copy.`);
      return;
    }
    const otherDays = DAYS.map((d) => d.id).filter((d) => d !== selectedDay);
    if (
      !confirm(
        `Are you sure you want to copy ${bells.length} period(s) from ${selectedDay.toUpperCase()} to Monday–Saturday? This will replace any existing timetable on those days for this class.`
      )
    ) {
      return;
    }

    setIsCopying(true);
    try {
      const res = await fetch("/api/timetable/apply-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          classId: selectedClassId,
          sectionId: selectedSectionId !== "all" ? selectedSectionId : undefined,
          sourceDay: selectedDay,
          targetDays: otherDays,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to copy schedule.");
      }

      toast.success(data.message || `Copied timetable from ${selectedDay} to all weekdays!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to copy timetable.");
    } finally {
      setIsCopying(false);
    }
  };

  const getStatusBadge = (status: BellLiveStatus) => {
    switch (status) {
      case "Running":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            NOW
          </span>
        );
      case "Completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            Upcoming
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">
            <Clock className="h-4 w-4" />
            <span>Class Timetable & Period Bells</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            Bell / Period Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure daily periods, timings, books, lesson plans, and assigned teachers for each class.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySchedule}
            disabled={isCopying || bells.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
          >
            {isCopying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            <span>Apply to All Weekdays</span>
          </button>

          <button
            onClick={handleOpenNew}
            disabled={!selectedClassId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Period / Bell</span>
          </button>
        </div>
      </div>

      {/* Class & Section Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Class select */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Class:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId("all");
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section select */}
          {availableSections.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Section:
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Sections (Shared)</option>
                {availableSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Day Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {DAYS.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                selectedDay === d.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bells List / Schedule Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedClass?.name || "Class"}
              {selectedSectionId !== "all"
                ? ` • ${availableSections.find((s) => s.id === selectedSectionId)?.name}`
                : ""}{" "}
              Schedule:
            </span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 capitalize">
              {selectedDay} ({bells.length} Periods)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : bells.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-3">
            <Clock className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No periods scheduled for {selectedClass?.name} on {selectedDay}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &quot;Add Period / Bell&quot; to configure Bell 1, Bell 2, subjects, books, and tasks.
            </p>
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Bell 1</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Bell #</th>
                    <th className="py-3.5 px-4">Period Name</th>
                    <th className="py-3.5 px-4">Timing</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Book / Chapter</th>
                    <th className="py-3.5 px-4">Today&apos;s Task & Reminder</th>
                    <th className="py-3.5 px-4">Teacher & Room</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {bells.map((b) => {
                    const status = calculateBellStatus(b.startTime, b.endTime);
                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                          b.isBreak ? "bg-amber-50/30 dark:bg-amber-950/20" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400">
                          Bell {b.bellNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            {b.isBreak ? (
                              <Coffee className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-indigo-500" />
                            )}
                            <span>{b.bellName}</span>
                          </div>
                          {b.sectionName && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {b.sectionName}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {b.startTime} – {b.endTime}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {b.durationMinutes || 40} mins
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {b.isBreak ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Recess / Break
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                              {b.subject}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {b.bookName || "—"}
                          </div>
                          {b.chapter && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Bookmark className="h-3 w-3 text-indigo-400" />
                              <span className="truncate max-w-[140px]">{b.chapter}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs">
                          {b.task && (
                            <div className="text-[11px] font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                              <FileText className="h-3 w-3 text-emerald-500" />
                              <span className="truncate">{b.task}</span>
                            </div>
                          )}
                          {b.reminder && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="h-3 w-3" />
                              <span className="truncate">{b.reminder}</span>
                            </div>
                          )}
                          {!b.task && !b.reminder && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {b.teacherName ? (
                            <div className="flex items-center gap-1.5 font-semibold">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              <span>{b.teacherName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {b.room && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>{b.room}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(status)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Edit period"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBell(b.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                              title="Delete period"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {bells.map((b) => {
                const status = calculateBellStatus(b.startTime, b.endTime);
                return (
                  <div key={b.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                          Bell {b.bellNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {b.bellName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBell(b.id)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        🕒 {b.startTime} – {b.endTime} ({b.durationMinutes || 40}m)
                      </span>
                      {b.isBreak ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Break
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          {b.subject}
                        </span>
                      )}
                    </div>

                    {b.teacherName && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span>Teacher: {b.teacherName}</span>
                        {b.room && <span className="text-slate-400">({b.room})</span>}
                      </div>
                    )}

                    {(b.task || b.chapter) && (
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl text-xs space-y-1">
                        {b.chapter && (
                          <div className="text-slate-700 dark:text-slate-300 font-medium">
                            📖 {b.chapter}
                          </div>
                        )}
                        {b.task && (
                          <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            📝 {b.task}
                          </div>
                        )}
                        {b.reminder && (
                          <div className="text-amber-700 dark:text-amber-400">
                            ⚠️ {b.reminder}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Bell Modal Drawer */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {editingBellId ? "Edit Period / Bell" : "Configure Period / Bell"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedClass?.name} • {selectedDay.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSaveBell(e, false)} className="space-y-4 text-xs">
              {/* Bell Number, Label & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bell Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bellNumber}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      setBellNumber(num);
                      if (!editingBellId) setBellName(`Period ${num}`);
                    }}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Period Label *
                  </label>
                  <input
                    type="text"
                    value={bellName}
                    onChange={(e) => setBellName(e.target.value)}
                    placeholder="e.g. Period 1, Zero Period"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Section (Optional)
                  </label>
                  <select
                    value={formSectionId}
                    onChange={(e) => setFormSectionId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">All Sections (Shared)</option>
                    {availableSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Room / Location
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. Room 204, Lab 1"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Recess toggle */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="isBreak"
                  checked={isBreak}
                  onChange={(e) => setIsBreak(e.target.checked)}
                  className="rounded h-4 w-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label
                  htmlFor="isBreak"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  This is a Recess / Lunch / Assembly Break (No teacher required)
                </label>
              </div>

              {!isBreak && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Subject Name *
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Mathematics, Science, English"
                        required={!isBreak}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Assigned Teacher
                      </label>
                      <select
                        value={teacherId}
                        onChange={(e) => setTeacherId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white font-bold"
                      >
                        <option value="">-- No Teacher Assigned --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Book / Curriculum
                      </label>
                      <input
                        type="text"
                        value={bookName}
                        onChange={(e) => setBookName(e.target.value)}
                        placeholder="e.g. NCERT Ganit Part 1"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Lesson / Chapter
                      </label>
                      <input
                        type="text"
                        value={chapter}
                        onChange={(e) => setChapter(e.target.value)}
                        placeholder="e.g. Chapter 4 — Linear Equations"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Daily Plan & Reminders */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                    <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Class Plan & Teacher Instructions
                    </span>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Today&apos;s Task / Goal
                      </label>
                      <input
                        type="text"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        placeholder="e.g. Complete Exercise 4.2 & solve question 5 on blackboard"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Teacher Reminder
                        </label>
                        <input
                          type="text"
                          value={reminder}
                          onChange={(e) => setReminder(e.target.value)}
                          placeholder="e.g. Collect yesterday's homework"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Message from Admin
                        </label>
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="e.g. Bring notebook and geometry box"
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                {!editingBellId && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveBell(undefined, true)}
                    className="px-4 py-2 rounded-xl border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    Save &amp; Add Another
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>
                    {isSubmitting
                      ? "Saving..."
                      : editingBellId
                      ? "Update Period"
                      : "Save Bell"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
