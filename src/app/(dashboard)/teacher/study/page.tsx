"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Video,
  Image as ImageIcon,
  Link2,
  Calendar,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import {
  getTeacherDashboardContext,
  subscribeToStudyMaterials,
  createStudyMaterial,
  deleteStudyMaterial,
  type AssignedClassInfo,
} from "@/lib/services/teacher-portal.service";
import type { StudyMaterial } from "@/types";
import { toast } from "sonner";

export default function TeacherStudyMaterialPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const urlClassId = searchParams.get("classId");

  const schoolId = profile?.schoolId || "";
  const teacherUid = profile?.uid || "";
  const teacherName = profile?.name || "Teacher";
  const teacherEmail = profile?.email || "";

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<AssignedClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalClassId, setModalClassId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState<
    "pdf" | "document" | "image" | "link" | "video"
  >("pdf");
  const [externalUrl, setExternalUrl] = useState("");
  const [chapter, setChapter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Load: Teacher Profile & Classes
  useEffect(() => {
    async function init() {
      if (!schoolId || !teacherUid) {
        setLoading(false);
        return;
      }
      try {
        const ctx = await getTeacherDashboardContext(schoolId, teacherUid, teacherEmail);
        setClasses(ctx.assignedClasses);
        const match = ctx.assignedClasses.find((c) => c.classId === urlClassId);
        if (match) {
          setSelectedClassId(match.classId);
        } else if (ctx.assignedClasses.length > 0) {
          setSelectedClassId(ctx.assignedClasses[0].classId);
        }
      } catch (err) {
        console.error("Failed to load teacher context:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [schoolId, teacherUid, teacherEmail, urlClassId]);

  // 2. Real-time Subscription to Study Materials
  useEffect(() => {
    if (!schoolId) return;
    const unsub = subscribeToStudyMaterials(schoolId, selectedClassId, (liveList) => {
      setMaterials(liveList);
    });
    return () => unsub();
  }, [schoolId, selectedClassId]);

  // Handle Form Submit
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim()) {
      toast.error("Please enter a title and subject");
      return;
    }

    const cls = classes.find((c) => c.classId === (modalClassId || selectedClassId));
    if (!cls) {
      toast.error("Please select a target class");
      return;
    }

    setIsSubmitting(true);
    try {
      await createStudyMaterial(schoolId, {
        schoolId,
        teacherId: teacherUid,
        teacherName,
        classId: cls.classId,
        className: cls.className,
        sectionId: cls.sectionId,
        sectionName: cls.sectionName,
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim(),
        type: materialType,
        externalUrl: externalUrl.trim(),
        chapter: chapter.trim(),
      });

      toast.success("Study material shared with students!");
      setShowModal(false);
      setTitle("");
      setDescription("");
      setExternalUrl("");
      setChapter("");
    } catch (err) {
      console.error("Failed to upload study material:", err);
      toast.error("Failed to share material");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this study material?")) return;
    try {
      await deleteStudyMaterial(schoolId, id);
      toast.success("Study material removed");
    } catch {
      toast.error("Failed to remove material");
    }
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.chapter?.toLowerCase().includes(q)
    );
  }, [materials, searchQuery]);

  const typeIconMap = {
    pdf: <FileText className="h-5 w-5 text-rose-500" />,
    document: <FileText className="h-5 w-5 text-blue-500" />,
    video: <Video className="h-5 w-5 text-indigo-500" />,
    image: <ImageIcon className="h-5 w-5 text-emerald-500" />,
    link: <Link2 className="h-5 w-5 text-amber-500" />,
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-12 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div>
        <Link
          href="/teacher"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Study Materials & Student Notes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Upload revision notes, question banks, textbook PDFs, and video links. Materials appear instantly on the Student Portal.
            </p>
          </div>

          <button
            onClick={() => {
              setModalClassId(selectedClassId);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Study Material
          </button>
        </div>
      </div>

      {/* Class Selector & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        {/* Class Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedClassId("")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedClassId === ""
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            All Classes
          </button>
          {classes.map((cls) => {
            const isSelected = cls.classId === selectedClassId;
            return (
              <button
                key={cls.classId}
                onClick={() => setSelectedClassId(cls.classId)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cls.className} {cls.sectionName ? `(${cls.sectionName})` : ""}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search material title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
          <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No study material uploaded yet
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Click &ldquo;Upload Study Material&rdquo; above to share notes or guides with your class.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {typeIconMap[item.type] || <FileText className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                        {item.subject}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.className}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-3 leading-snug">
                  {item.title}
                </h3>

                {item.chapter && (
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                    Chapter: {item.chapter}
                  </p>
                )}

                {item.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">By {item.teacherName}</span>
                {item.externalUrl && (
                  <a
                    href={item.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Open Resource <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-purple-600" />
                Upload Study Material
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Classroom *
                </label>
                <select
                  value={modalClassId || selectedClassId}
                  onChange={(e) => setModalClassId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.className} {c.sectionName ? `(${c.sectionName})` : ""} - {c.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={materialType}
                    onChange={(e: any) => setMaterialType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="document">Text Notes / Document</option>
                    <option value="video">Video Lecture (YouTube/Drive)</option>
                    <option value="image">Diagram / Image</option>
                    <option value="link">Web Reference Link</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Material Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 5: Trigonometric Identities & Practice Questions"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chapter / Unit (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 - Algebra"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resource URL / Link (Drive / YouTube / Web) *
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://youtube.com/..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Guidance
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of concepts or homework instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Publishing..." : "Publish Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
