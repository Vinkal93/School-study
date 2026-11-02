"use client";

import { useState, useMemo, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useAppQuery } from "@/lib/cache";
import { getClassesWithSections } from "@/lib/services/academic.service";
import {
  createStudentWithAuth,
  uploadStudentPhoto,
  generateNextStudentId,
  generateNextRollNumber,
} from "@/lib/services/student.service";
import type { SchoolClass, Gender } from "@/types";
import { toast } from "sonner";
import {
  GraduationCap,
  ArrowLeft,
  User,
  BookOpen,
  Users,
  KeyRound,
  Upload,
  Camera,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Printer,
  CreditCard,
  Plus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function AddNewStudentPage() {
  const router = useRouter();
  const { profile, firebaseUser, loading: authLoading } = useAuth();
  const schoolId = profile?.schoolId || "";
  const isQueryEnabled = !authLoading && !!firebaseUser && !!schoolId && schoolId !== "system";

  // Fetch classes and sections
  const { data: cachedClasses, isLoading: isClassesLoading } = useAppQuery<SchoolClass[]>(
    isQueryEnabled ? `classes:${schoolId}` : null,
    () => getClassesWithSections(schoolId),
    { enabled: isQueryEnabled, staleTime: 60_000 }
  );

  const classes = useMemo(() => cachedClasses || [], [cachedClasses]);

  // Form State
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("male");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Academic State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [rollNumber, setRollNumber] = useState<number | "">("");
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isAutoRoll, setIsAutoRoll] = useState(true);

  // Parent / Guardian State
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("Father");

  // Portal Login Credentials State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("Student@123");
  const [showPassword, setShowPassword] = useState(false);
  const [isAutoEmail, setIsAutoEmail] = useState(true);

  // Photo Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdStudentResult, setCreatedStudentResult] = useState<{
    studentId: string;
    admissionNumber: string;
    rollNumber: number;
    name: string;
    className: string;
    sectionName: string;
    loginEmail: string;
    loginPassword: string;
  } | null>(null);

  // Available sections based on selected class
  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  const availableSections = useMemo(() => {
    return selectedClass?.sections || [];
  }, [selectedClass]);

  // When class changes, reset section or pick first section
  const handleClassChange = async (newClassId: string) => {
    setSelectedClassId(newClassId);
    const cls = classes.find((c) => c.id === newClassId);
    if (cls && cls.sections && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId("");
    }

    // Auto-calculate next roll number for this class
    if (schoolId && newClassId && isAutoRoll) {
      try {
        const nextRoll = await generateNextRollNumber(schoolId, newClassId);
        setRollNumber(nextRoll);
      } catch (e) {
        console.warn("Could not generate roll number:", e);
      }
    }
  };

  // Auto-generate suggested email based on student name and school code
  const handleNameChange = (newName: string) => {
    setName(newName);
    if (isAutoEmail) {
      const sanitized = newName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 12);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      setLoginEmail(`${sanitized || "student"}${randomSuffix}@schoolstudy.app`);
    }
  };

  // Generate strong random password
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setLoginPassword(pwd);
  };

  // Handle Photo selection
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo size must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!schoolId) {
      toast.error("Institution context not ready. Please refresh.");
      return;
    }

    if (!name.trim()) {
      toast.error("Student full name is required.");
      return;
    }

    if (!selectedClassId) {
      toast.error("Please select an academic class.");
      return;
    }

    if (!loginEmail.trim() || !loginPassword.trim()) {
      toast.error("Student portal login email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const sectionObj = availableSections.find((s) => s.id === selectedSectionId);
      const className = selectedClass?.name || "";
      const sectionName = sectionObj?.name || "Section A";

      // 1. Upload photo if selected
      let photoUrl = "";
      if (photoFile) {
        photoUrl = await uploadStudentPhoto(photoFile, schoolId, admissionNumber || "new");
      }

      // 2. Create student record with Auth, roll number, and initial fee assignment
      const result = await createStudentWithAuth(schoolId, {
        name: name.trim(),
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
        gender,
        dob: dob || undefined,
        bloodGroup: bloodGroup || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        classId: selectedClassId,
        className,
        sectionId: selectedSectionId || "sec_default",
        sectionName,
        rollNumber: typeof rollNumber === "number" ? rollNumber : undefined,
        admissionNumber: admissionNumber.trim() || undefined,
        admissionDate,
        photoUrl: photoUrl || undefined,
        fatherName: fatherName.trim() || undefined,
        motherName: motherName.trim() || undefined,
        guardianName: guardianName.trim() || fatherName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || phone.trim() || undefined,
        guardianEmail: guardianEmail.trim() || undefined,
        guardianRelation: guardianRelation || undefined,
      });

      toast.success(`Student "${name}" enrolled successfully!`);
      if (result.feeSetupPending) toast.warning("Admission saved. Invoice setup is pending; open Fee Management → Generate Invoice to retry.");

      setCreatedStudentResult({
        studentId: result.studentId,
        admissionNumber: result.admissionNumber,
        rollNumber: result.rollNumber,
        name: name.trim(),
        className,
        sectionName,
        loginEmail: loginEmail.trim().toLowerCase(),
        loginPassword,
      });
    } catch (err: any) {
      console.error("Student enrollment error:", err);
      toast.error(err.message || "Failed to enroll student. Please check input.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName("");
    setDob("");
    setBloodGroup("");
    setPhone("");
    setAddress("");
    setAdmissionNumber("");
    setRollNumber("");
    setFatherName("");
    setMotherName("");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setCreatedStudentResult(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
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
              Add New
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            New Student Admission
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enroll a new student with automated ID generation, roll number allocation, and parent portal setup.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Students</span>
          </Link>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL / CARD */}
      {createdStudentResult && (
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-emerald-600 text-white shrink-0 shadow-sm">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                  Admission Completed Successfully!
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Student profile, unique identifier, class allocation, and login credentials have been generated.
                </p>
              </div>

              {/* Student Credentials Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white/90 dark:bg-gray-900/90 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Student ID
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5 font-mono text-blue-600 dark:text-blue-400">
                    {createdStudentResult.studentId}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Student Name
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                    {createdStudentResult.name}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Class & Section
                  </div>
                  <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                    {createdStudentResult.className} - {createdStudentResult.sectionName}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Roll Number
                  </div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    #{createdStudentResult.rollNumber}
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Portal Login Email
                  </div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5 font-mono select-all">
                    {createdStudentResult.loginEmail}
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Portal Password
                  </div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5 font-mono select-all">
                    {createdStudentResult.loginPassword}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={`/admin/students/admission-letter?studentId=${createdStudentResult.studentId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-xs transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Admission Letter</span>
                </Link>

                <Link
                  href={`/admin/students/id-cards?studentId=${createdStudentResult.studentId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-xs transition"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Generate ID Card</span>
                </Link>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enroll Another Student</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN ENROLLMENT FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Information */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                1. Personal Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Primary candidate identity and biographical details.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Photo Upload Box */}
            <div className="md:col-span-3 flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
              <div className="relative h-24 w-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shrink-0">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Student Photograph
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Passport-size photo (JPEG or PNG, max 5MB). Automatically compressed for fast loading.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Student Full Name */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Aryan Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <span>Date of Birth</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Blood Group */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            {/* Student Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <span>Student Contact Phone</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                <span>Residential Address</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No, Street, Colony, City, Pin Code"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic & Enrollment Information */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                2. Academic & Class Enrollment
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Class allocation, section assignment, and roll number sequencing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Class Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Academic Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Section <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {availableSections.length > 0 ? (
                  availableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))
                ) : (
                  <option value="">Section A (Default)</option>
                )}
              </select>
            </div>

            {/* Roll Number */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Roll Number
                </label>
                <button
                  type="button"
                  onClick={() => setIsAutoRoll(!isAutoRoll)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {isAutoRoll ? "Custom Roll No" : "Auto Roll No"}
                </button>
              </div>
              <input
                type="number"
                min="1"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value ? Number(e.target.value) : "")}
                placeholder={isAutoRoll ? "Auto-assigned (1, 2, 3...)" : "Enter roll no"}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Admission Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Admission Number / Ref No
              </label>
              <input
                type="text"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="Leave blank for auto-generated ID"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Admission Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Admission Date
              </label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Parent & Family Details */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                3. Parent & Family Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Father, Mother, and primary emergency guardian contact info.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Father's Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Father&apos;s Name
              </label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Mother's Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Mother&apos;s Name
              </label>
              <input
                type="text"
                value={motherName}
                onChange={(e) => setMotherName(e.target.value)}
                placeholder="e.g. Sunita Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Guardian Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Primary Guardian Name
              </label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="If different from father"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Guardian Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                <span>Guardian Phone (WhatsApp & SMS)</span>
              </label>
              <input
                type="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="e.g. +91 98765 00000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Guardian Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span>Guardian Email</span>
              </label>
              <input
                type="email"
                value={guardianEmail}
                onChange={(e) => setGuardianEmail(e.target.value)}
                placeholder="e.g. parent@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Relation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Relation
              </label>
              <select
                value={guardianRelation}
                onChange={(e) => setGuardianRelation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Uncle">Uncle</option>
                <option value="Aunt">Aunt</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Portal Login Credentials */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xs">
          <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100 dark:border-gray-800">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                4. Student & Parent Portal Login Credentials
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Credentials used by the student & parent to log in to the School Study Web & Mobile App.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Login Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Login Email / Username <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAutoEmail(!isAutoEmail)}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {isAutoEmail ? "Custom Email" : "Auto Suggest"}
                </button>
              </div>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="student@schoolstudy.app"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
              />
            </div>

            {/* Login Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Generate Password</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/students"
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Enrolling Student...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Confirm & Enroll Student</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
