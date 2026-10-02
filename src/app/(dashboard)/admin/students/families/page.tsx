"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getStudents, updateStudent } from "@/lib/services/student.service";
import type { StudentProfile } from "@/types";
import { toast } from "sonner";
import {
  Users,
  Search,
  Phone,
  Mail,
  GraduationCap,
  MessageCircle,
  ExternalLink,
  Lock,
  Plus,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
  UserCheck,
  Building2,
  Copy,
  Check,
} from "lucide-react";

interface FamilyGroup {
  familyKey: string;
  guardianName: string;
  fatherName?: string;
  motherName?: string;
  phone: string;
  email?: string;
  address?: string;
  children: StudentProfile[];
}

export default function ManageFamiliesPage() {
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const isQueryEnabled = !authLoading && !!firebaseUser && !!schoolId && schoolId !== "system";

  const { data: cachedStudents, isLoading } = useAppQuery<StudentProfile[]>(
    isQueryEnabled ? `students:${schoolId}` : null,
    () => getStudents(schoolId),
    { enabled: isQueryEnabled, staleTime: 30_000 }
  );

  const students = useMemo(() => cachedStudents || [], [cachedStudents]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "siblings" | "single">("all");
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Link Sibling Modal State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedFamilyForLink, setSelectedFamilyForLink] = useState<FamilyGroup | null>(null);
  const [studentSearchForLink, setStudentSearchForLink] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  // Group students by family (matching phone / guardianPhone / fatherName)
  const families: FamilyGroup[] = useMemo(() => {
    const map = new Map<string, FamilyGroup>();

    students.forEach((student) => {
      // Clean phone number for grouping
      const rawPhone = String(student.guardianPhone || student.phone || "");
      const cleanPhone = rawPhone.replace(/[^0-9]/g, "");
      const guardian = String(student.guardianName || student.fatherName || "Family Guardian");

      // Group key preference: cleaned phone number if available, else fatherName + address
      const fatherStr = String(student.fatherName || "").trim();
      const addrStr = String(student.address || "").toLowerCase().slice(0, 10);
      const groupKey =
        cleanPhone.length >= 8
          ? `phone_${cleanPhone}`
          : fatherStr.length > 2
          ? `father_${fatherStr.toLowerCase()}_${addrStr}`
          : `student_${student.id}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          familyKey: groupKey,
          guardianName: guardian,
          fatherName: student.fatherName ? String(student.fatherName) : undefined,
          motherName: student.motherName ? String(student.motherName) : undefined,
          phone: rawPhone || "N/A",
          email: student.guardianEmail ? String(student.guardianEmail) : undefined,
          address: student.address ? String(student.address) : undefined,
          children: [student],
        });
      } else {
        const existing = map.get(groupKey)!;
        existing.children.push(student);
        if (!existing.address && student.address) existing.address = String(student.address);
        if (!existing.email && student.guardianEmail) existing.email = String(student.guardianEmail);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Sort multi-child families first, then by name
      if (b.children.length !== a.children.length) {
        return b.children.length - a.children.length;
      }
      return a.guardianName.localeCompare(b.guardianName);
    });
  }, [students]);

  // Filtered families based on search and sibling filter
  const filteredFamilies = useMemo(() => {
    return families.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(f.guardianName || "").toLowerCase().includes(q) ||
        (f.fatherName && String(f.fatherName).toLowerCase().includes(q)) ||
        String(f.phone || "").includes(q) ||
        (f.address && String(f.address).toLowerCase().includes(q)) ||
        f.children.some(
          (c) =>
            String(c.name || "").toLowerCase().includes(q) ||
            (c.studentId && String(c.studentId).toLowerCase().includes(q)) ||
            (c.className && String(c.className).toLowerCase().includes(q))
        );

      const matchesFilter =
        filterType === "all"
          ? true
          : filterType === "siblings"
          ? f.children.length >= 2
          : f.children.length === 1;

      return matchesSearch && matchesFilter;
    });
  }, [families, searchQuery, filterType]);

  // Statistics
  const stats = useMemo(() => {
    const totalFamilies = families.length;
    const siblingFamilies = families.filter((f) => f.children.length >= 2);
    const totalSiblingsEnrolled = siblingFamilies.reduce(
      (sum, f) => sum + f.children.length,
      0
    );
    return {
      totalFamilies,
      multiChildCount: siblingFamilies.length,
      totalSiblingsEnrolled,
      avgChildren: totalFamilies > 0 ? (students.length / totalFamilies).toFixed(1) : "0",
    };
  }, [families, students]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    toast.success("Phone number copied to clipboard!");
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleLinkSibling = async (studentToLink: StudentProfile) => {
    if (!selectedFamilyForLink || !schoolId) return;

    setIsLinking(true);
    try {
      // Update the student's guardianPhone, guardianName, and fatherName to match the family
      await updateStudent(schoolId, studentToLink.id, {
        guardianPhone: selectedFamilyForLink.phone,
        guardianName: selectedFamilyForLink.guardianName,
        fatherName: selectedFamilyForLink.fatherName || selectedFamilyForLink.guardianName,
      });

      toast.success(
        `Linked ${studentToLink.name} into the ${selectedFamilyForLink.guardianName} family!`
      );
      setIsLinkModalOpen(false);
      setSelectedFamilyForLink(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to link sibling.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin" className="hover:text-blue-600 transition">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin/students" className="hover:text-blue-600 transition">
              Students
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200 font-semibold">
              Manage Families
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400">
              <Users className="h-6 w-6" />
            </div>
            Manage Families & Siblings
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800">
              <Lock className="h-3 w-3" />
              <span>Family Hub</span>
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Intelligent sibling grouping, combined parent contacts, family notices, and multi-child fee coordination.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Students</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Enrolled Families
            </span>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.totalFamilies}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Distinct household parent records
          </p>
        </div>

        <div className="rounded-2xl border border-pink-200/80 dark:border-pink-900/40 bg-pink-50/40 dark:bg-pink-950/15 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 uppercase tracking-wider">
              Sibling Families
            </span>
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-pink-700 dark:text-pink-300 mt-2">
            {stats.multiChildCount}
          </div>
          <p className="text-xs text-pink-600 dark:text-pink-400 mt-1">
            Families with 2 or more siblings
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Siblings Enrolled
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.totalSiblingsEnrolled}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Students eligible for sibling benefits
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Avg Children / Family
            </span>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {stats.avgChildren}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Average enrollment per household
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Parent Name, Guardian Phone, Child Name, or Address..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-medium">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === "all"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              All Families ({families.length})
            </button>
            <button
              onClick={() => setFilterType("siblings")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === "siblings"
                  ? "bg-white dark:bg-gray-900 text-pink-600 dark:text-pink-400 shadow-xs font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-pink-600"
              }`}
            >
              Siblings Only ({stats.multiChildCount})
            </button>
            <button
              onClick={() => setFilterType("single")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === "single"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Single Child
            </button>
          </div>
        </div>
      </div>

      {/* Families Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800/60 animate-pulse border border-gray-200 dark:border-gray-800"
            />
          ))}
        </div>
      ) : filteredFamilies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-12 text-center">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No family records found
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or add parent guardian details during student enrollment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredFamilies.map((family) => {
            const isMultiChild = family.children.length >= 2;
            const whatsappNumber = String(family.phone || "").replace(/[^0-9]/g, "");

            return (
              <div
                key={family.familyKey}
                className={`rounded-2xl border transition shadow-xs hover:shadow-md bg-white dark:bg-gray-900 p-5 ${
                  isMultiChild
                    ? "border-pink-200 dark:border-pink-900/60 bg-gradient-to-br from-pink-50/20 to-transparent"
                    : "border-gray-200 dark:border-gray-800"
                }`}
              >
                {/* Family Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isMultiChild
                          ? "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300"
                          : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {family.guardianName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {family.guardianName}
                        </h3>
                        {isMultiChild && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 dark:bg-pink-950/80 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                            {family.children.length} Siblings
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>Parent / Guardian</span>
                        {family.fatherName && family.fatherName !== family.guardianName && (
                          <span>• Father: {family.fatherName}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions for this Family */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {whatsappNumber && (
                      <a
                        href={`https://wa.me/${whatsappNumber}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition"
                        title="Chat with Parent on WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                    {family.phone && family.phone !== "N/A" && (
                      <button
                        onClick={() => copyToClipboard(family.phone)}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition"
                        title="Copy Phone Number"
                      >
                        {copiedPhone === family.phone ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Contact & Address Bar */}
                <div className="py-2.5 text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{family.phone}</span>
                  </span>
                  {family.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span>{family.email}</span>
                    </span>
                  )}
                  {family.address && (
                    <span className="text-gray-500 truncate max-w-xs" title={family.address}>
                      📍 {family.address}
                    </span>
                  )}
                </div>

                {/* Enrolled Children Sub-List */}
                <div className="mt-3 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Enrolled Students ({family.children.length})
                  </div>
                  <div className="space-y-1.5">
                    {family.children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <Link
                              href={`/admin/students/${child.id}`}
                              className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition"
                            >
                              {child.name}
                            </Link>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              ID: {child.studentId || child.admissionNumber || child.id.slice(0, 6)} • Roll #{child.rollNumber || "-"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                            {child.className} - {child.sectionName}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              child.status === "active" || !child.status
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {child.status || "active"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sibling Link Button */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {isMultiChild
                      ? "Family linked via matching phone/guardian"
                      : "Single child registered under this contact"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFamilyForLink(family);
                      setIsLinkModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Link Sibling</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SIBLING LINK MODAL */}
      {isLinkModalOpen && selectedFamilyForLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Link Sibling to {selectedFamilyForLink.guardianName}&apos;s Family
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select an enrolled student to synchronize guardian contacts and link as a sibling under phone:{" "}
              <strong className="text-gray-700 dark:text-gray-200">{selectedFamilyForLink.phone}</strong>.
            </p>

            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={studentSearchForLink}
                  onChange={(e) => setStudentSearchForLink(e.target.value)}
                  placeholder="Search student by name or student ID..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {students
                  .filter((s) => {
                    const q = studentSearchForLink.toLowerCase().trim();
                    const notAlreadyInFamily = !selectedFamilyForLink.children.some(
                      (c) => c.id === s.id
                    );
                    const matches =
                      !q ||
                      s.name.toLowerCase().includes(q) ||
                      (s.studentId && s.studentId.toLowerCase().includes(q));
                    return notAlreadyInFamily && matches;
                  })
                  .slice(0, 10)
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {student.className} - {student.sectionName} • ID: {student.studentId || student.id.slice(0, 6)}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isLinking}
                        onClick={() => handleLinkSibling(student)}
                        className="px-3 py-1 rounded-md bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition disabled:opacity-50"
                      >
                        Link
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setSelectedFamilyForLink(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
