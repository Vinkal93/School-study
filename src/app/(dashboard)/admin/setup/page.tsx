"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { appQueryClient } from "@/lib/cache";
import {
  Building2,
  Calendar,
  BookOpen,
  Users,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Upload,
  ImageIcon,
  X,
  RefreshCw,
  Check,
  AlertCircle,
  Save,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  Edit3,
} from "lucide-react";
import {
  getSchoolOnboardingState,
  saveSchoolInfoStep,
  saveAcademicYearStep,
  saveClassSectionStep,
  addTeacherInOnboarding,
  addStudentInOnboarding,
  completeSchoolOnboarding,
  updateOnboardingStep,
  type SchoolInfoInput,
  type OnboardingClassItem,
} from "@/lib/services/setup.service";
import {
  uploadSchoolLogoToStorage,
  removeSchoolLogo,
} from "@/lib/services/storage.service";
import { generateNextTeacherId } from "@/lib/services/teacher.service";
import { generateNextStudentId } from "@/lib/services/student.service";
import type { School, AcademicYear, SchoolClass, TeacherProfile, StudentProfile, Gender } from "@/types";
import { toast } from "sonner";

export default function SchoolSetupWizardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const schoolId = profile?.schoolId || "";

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isFullyCompleted, setIsFullyCompleted] = useState(false);

  // STEP 1 STATE: School Information & Branding
  const [school, setSchool] = useState<School | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");

  // Logo upload state
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  // STEP 2 STATE: Academic Year
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("new");
  const [academicYearName, setAcademicYearName] = useState("2026-2027");
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2027-03-31");

  // STEP 3 STATE: Classes & Sections
  const [classesList, setClassesList] = useState<OnboardingClassItem[]>([
    { name: "Class 1", sections: [{ name: "A" }, { name: "B" }] },
    { name: "Class 2", sections: [{ name: "A" }, { name: "B" }] },
    { name: "Class 3", sections: [{ name: "A" }, { name: "B" }] },
    { name: "Class 4", sections: [{ name: "A" }, { name: "B" }] },
    { name: "Class 5", sections: [{ name: "A" }, { name: "B" }] },
  ]);
  const [newClassName, setNewClassName] = useState("");
  const [newSectionInputs, setNewSectionInputs] = useState<Record<number, string>>({});

  // STEP 4 STATE: Teachers (Optional)
  const [teachersList, setTeachersList] = useState<TeacherProfile[]>([]);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [tName, setTName] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tPhone, setTPhone] = useState("");
  const [tCode, setTCode] = useState("");
  const [tPassword, setTPassword] = useState("");
  const [tUsePhoneAsPassword, setTUsePhoneAsPassword] = useState(false);
  const [tClassId, setTClassId] = useState("");
  const [tSectionId, setTSectionId] = useState("");
  const [tSubjects, setTSubjects] = useState("");
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);

  // STEP 5 STATE: Students (Optional)
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [sName, setSName] = useState("");
  const [sAdmNo, setSAdmNo] = useState("");
  const [sClassId, setSClassId] = useState("");
  const [sSectionId, setSSectionId] = useState("");
  const [sRoll, setSRoll] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPassword, setSPassword] = useState("");
  const [sGender, setSGender] = useState<Gender>("male");
  const [sUsePhoneAsPassword, setSUsePhoneAsPassword] = useState(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Load onboarding data from database on mount
  useEffect(() => {
    async function loadData() {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        const state = await getSchoolOnboardingState(schoolId);
        setSchool(state.school);

        if (state.school) {
          setSchoolName(state.school.name || "");
          setSchoolCode(state.school.code || "");
          setLogoUrl(state.school.logoUrl || "");
          setAddress(state.school.address || "");
          setCity(state.school.city || "");
          setState(state.school.state || "");
          setPincode(state.school.pincode || "");
          setPhone(state.school.phone || "");
          setEmail(state.school.email || "");
          setWebsite(state.school.website || "");
          setDescription(state.school.description || "");
          setPrimaryContactName(state.school.primaryContactName || state.school.adminName || "");
          setPrimaryContactPhone(state.school.primaryContactPhone || state.school.phone || "");
          setPrimaryContactEmail(state.school.primaryContactEmail || state.school.email || "");
        }

        if (state.academicYears.length > 0) {
          setAcademicYears(state.academicYears);
          const currentYear = state.academicYears.find((y) => y.isCurrent) || state.academicYears[0];
          setSelectedYearId(currentYear.id);
          setAcademicYearName(currentYear.name);
          setStartDate(currentYear.startDate || "2026-04-01");
          setEndDate(currentYear.endDate || "2027-03-31");
        }

        if (state.classes.length > 0) {
          setClassesList(
            state.classes.map((c) => ({
              id: c.id,
              name: c.name,
              sections: (c.sections && c.sections.length > 0)
                ? c.sections.map((s) => ({ id: s.id, name: s.name }))
                : [{ name: "A" }],
            }))
          );
        }

        setTeachersList(state.teachers || []);
        setStudentsList(state.students || []);
        setCompletedSteps(state.completedSteps || []);
        setIsFullyCompleted(state.isCompleted);

        // Resume from saved step
        if (!state.isCompleted && state.currentStep) {
          setCurrentStep(state.currentStep);
        }
      } catch (err: any) {
        console.error("Failed to load onboarding state:", err);
        toast.error("Could not load saved school configuration.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [schoolId]);

  // Handle Logo Upload to Firebase Storage
  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      toast.error("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    setIsUploadingLogo(true);
    setUploadProgress(10);
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);

    try {
      // 1. Try direct Firebase Storage client upload
      let finalUrl = "";
      try {
        finalUrl = await uploadSchoolLogoToStorage(schoolId, file, (percent) => {
          setUploadProgress(percent);
        });
      } catch (storageErr) {
        // Fallback to API route
        const formData = new FormData();
        formData.append("file", file);
        formData.append("schoolId", schoolId);

        const res = await fetch("/api/school/upload-logo", {
          method: "POST",
          body: formData,
        });
        const resData = await res.json();
        if (!res.ok || !resData.logoUrl) {
          throw new Error(resData.error || "Failed to upload logo.");
        }
        finalUrl = resData.logoUrl;
      }

      setLogoUrl(finalUrl);
      setLogoPreview(null);
      toast.success("School logo uploaded and saved successfully!");
    } catch (err: any) {
      console.error("Logo upload failed:", err);
      toast.error(err.message || "Failed to upload logo. Please try again.");
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  };

  // Handle Logo Removal
  const handleRemoveLogo = async () => {
    if (!schoolId) return;
    setIsRemovingLogo(true);
    try {
      await removeSchoolLogo(schoolId, logoUrl);
      setLogoUrl("");
      setLogoPreview(null);
      toast.success("School logo removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove logo.");
    } finally {
      setIsRemovingLogo(false);
    }
  };

  // STEP 1: Save School Information
  const handleSaveStep1 = async (advance = true) => {
    if (!schoolId) return;
    if (!schoolName.trim()) {
      toast.error("School Name is required.");
      return;
    }
    if (!schoolCode.trim()) {
      toast.error("School Code is required.");
      return;
    }

    setIsSaving(true);
    setSaveStatusText("Saving school profile...");
    try {
      const payload: SchoolInfoInput = {
        name: schoolName.trim(),
        code: schoolCode.trim().toUpperCase(),
        logoUrl,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        website,
        description,
        primaryContactName,
        primaryContactPhone,
        primaryContactEmail,
      };

      await saveSchoolInfoStep(schoolId, payload);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 1])));
      setSaveStatusText("Changes saved");
      toast.success("School information saved!");

      if (advance) {
        setCurrentStep(2);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save school information.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatusText(null), 3000);
    }
  };

  // STEP 2: Save Academic Year
  const handleSaveStep2 = async (advance = true) => {
    if (!schoolId) return;
    if (!academicYearName.trim()) {
      toast.error("Academic Year name is required.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start and End dates are required.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error("Start date must be earlier than End date.");
      return;
    }

    setIsSaving(true);
    setSaveStatusText("Saving academic session...");
    try {
      const yearId = await saveAcademicYearStep(schoolId, {
        name: academicYearName.trim(),
        startDate,
        endDate,
        existingYearId: selectedYearId !== "new" ? selectedYearId : undefined,
      });

      setSelectedYearId(yearId);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 2])));
      setSaveStatusText("Changes saved");
      toast.success(`Academic Year "${academicYearName}" activated!`);

      if (advance) {
        setCurrentStep(3);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save academic year.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatusText(null), 3000);
    }
  };

  // STEP 3: Classes & Sections Helpers & Save
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const clean = newClassName.trim();
    if (classesList.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
      toast.error(`Class "${clean}" already exists.`);
      return;
    }

    setClassesList((prev) => [...prev, { name: clean, sections: [{ name: "A" }] }]);
    setNewClassName("");
  };

  const handleRemoveClass = (index: number) => {
    setClassesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSection = (classIndex: number) => {
    const secVal = (newSectionInputs[classIndex] || "").trim().toUpperCase();
    if (!secVal) return;

    setClassesList((prev) =>
      prev.map((c, idx) => {
        if (idx !== classIndex) return c;
        if (c.sections.some((s) => s.name.toUpperCase() === secVal)) {
          toast.error(`Section "${secVal}" already exists in ${c.name}.`);
          return c;
        }
        return {
          ...c,
          sections: [...c.sections, { name: secVal }],
        };
      })
    );

    setNewSectionInputs((prev) => ({ ...prev, [classIndex]: "" }));
  };

  const handleRemoveSection = (classIndex: number, secIndex: number) => {
    setClassesList((prev) =>
      prev.map((c, idx) => {
        if (idx !== classIndex) return c;
        if (c.sections.length <= 1) {
          toast.warning("A class must have at least one section.");
          return c;
        }
        return {
          ...c,
          sections: c.sections.filter((_, sIdx) => sIdx !== secIndex),
        };
      })
    );
  };

  const applyClassPresets = (preset: "primary" | "secondary" | "k12") => {
    let presetsToAdd: string[] = [];
    if (preset === "primary") {
      presetsToAdd = ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
    } else if (preset === "secondary") {
      presetsToAdd = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
    } else {
      presetsToAdd = ["Nursery", "LKG", "UKG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
    }

    const existingNames = new Set(classesList.map((c) => c.name.toLowerCase()));
    const newItems: OnboardingClassItem[] = presetsToAdd
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({ name, sections: [{ name: "A" }, { name: "B" }] }));

    if (newItems.length === 0) {
      toast.info("Selected preset classes are already added.");
      return;
    }

    setClassesList((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} preset classes.`);
  };

  const handleSaveStep3 = async (advance = true) => {
    if (!schoolId) return;
    if (classesList.length === 0) {
      toast.error("Please add at least one class.");
      return;
    }

    setIsSaving(true);
    setSaveStatusText("Saving classes and sections...");
    try {
      await saveClassSectionStep(schoolId, classesList);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 3])));
      setSaveStatusText("Changes saved");
      toast.success("Classes and sections persisted successfully!");

      if (advance) {
        setCurrentStep(4);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save classes.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatusText(null), 3000);
    }
  };

  // STEP 4: Teachers Helpers & Save
  const handleOpenAddTeacherModal = async () => {
    setTName("");
    setTEmail("");
    setTPhone("");
    setTPassword("");
    setTUsePhoneAsPassword(false);
    setTClassId(classesList[0]?.id || "");
    setTSectionId("");
    setTSubjects("");
    setIsAddTeacherOpen(true);

    if (schoolId) {
      try {
        const autoCode = await generateNextTeacherId(schoolId);
        setTCode(autoCode);
      } catch (e) {
        setTCode("TCH-001");
      }
    }
  };

  const handleCreateTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId || !tName.trim() || !tEmail.trim() || !tPassword) {
      toast.error("Name, Email, and Password are required.");
      return;
    }

    setIsSubmittingTeacher(true);
    try {
      const selectedClass = classesList.find((c) => c.id === tClassId);
      const selectedSection = selectedClass?.sections.find((s) => s.id === tSectionId);

      const res = await addTeacherInOnboarding(schoolId, {
        teacherCode: tCode.trim().toUpperCase(),
        name: tName.trim(),
        email: tEmail.trim().toLowerCase(),
        password: tPassword,
        phone: tPhone.trim(),
        assignedClassId: tClassId,
        assignedClassName: selectedClass?.name || "",
        assignedSectionId: tSectionId,
        assignedSectionName: selectedSection?.name || "",
        subjects: tSubjects ? tSubjects.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });

      // Append locally to list
      const newTeacher: TeacherProfile = {
        id: res.teacherId,
        schoolId,
        userId: res.userId,
        teacherCode: res.teacherCode,
        name: tName.trim(),
        email: tEmail.trim().toLowerCase(),
        phone: tPhone.trim(),
        assignedClassId: tClassId,
        assignedClassName: selectedClass?.name || "",
        assignedSectionId: tSectionId,
        assignedSectionName: selectedSection?.name || "",
        subjects: tSubjects ? tSubjects.split(",").map((s) => s.trim()).filter(Boolean) : [],
        status: "active",
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };

      setTeachersList((prev) => [...prev, newTeacher]);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
      setIsAddTeacherOpen(false);
      toast.success(`Teacher "${tName}" account created successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create teacher.");
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  // STEP 5: Students Helpers & Save
  const handleOpenAddStudentModal = async () => {
    setSName("");
    setSAdmNo("");
    setSClassId(classesList[0]?.id || "");
    setSSectionId("");
    setSRoll("");
    setSPhone("");
    setSEmail("");
    setSPassword("");
    setSGender("male");
    setSUsePhoneAsPassword(false);
    setIsAddStudentOpen(true);

    if (schoolId) {
      try {
        const autoId = await generateNextStudentId(schoolId);
        setSAdmNo(autoId);
      } catch (e) {
        setSAdmNo("SBCI1");
      }
    }
  };

  const handleCreateStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!schoolId || !sName.trim() || !sClassId) {
      toast.error("Student Name and Class are required.");
      return;
    }

    const cleanEmail = sEmail.trim()
      ? sEmail.trim().toLowerCase()
      : `stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@school.com`;
    const cleanPassword = sPassword || (sPhone.replace(/\D/g, "") || "student123");

    if (cleanPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsSubmittingStudent(true);
    try {
      const selectedClass = classesList.find((c) => c.id === sClassId);
      const selectedSection = selectedClass?.sections.find((s) => s.id === sSectionId);

      const res = await addStudentInOnboarding(schoolId, {
        name: sName.trim(),
        admissionNumber: sAdmNo.trim().toUpperCase(),
        email: cleanEmail,
        password: cleanPassword,
        classId: sClassId,
        className: selectedClass?.name || "",
        sectionId: sSectionId,
        sectionName: selectedSection?.name || "A",
        gender: sGender,
        phone: sPhone.trim(),
        rollNumber: sRoll ? parseInt(sRoll) : undefined,
      });

      const newStudent: StudentProfile = {
        id: res.studentId,
        schoolId,
        userId: res.userId,
        studentId: res.admissionNumber,
        admissionNumber: res.admissionNumber,
        rollNumber: res.rollNumber,
        name: sName.trim(),
        email: cleanEmail,
        classId: sClassId,
        className: selectedClass?.name || "",
        sectionId: sSectionId,
        sectionName: selectedSection?.name || "A",
        gender: sGender,
        phone: sPhone.trim(),
        status: "active",
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };

      setStudentsList((prev) => [...prev, newStudent]);
      setCompletedSteps((prev) => Array.from(new Set([...prev, 5])));
      setIsAddStudentOpen(false);
      toast.success(`Student "${sName}" enrolled successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll student.");
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // FINALIZE & COMPLETE ONBOARDING
  const handleFinalizeOnboarding = async () => {
    if (!schoolId) return;
    setIsSaving(true);
    try {
      await completeSchoolOnboarding(schoolId);
      setIsFullyCompleted(true);
      appQueryClient.invalidateCache(`schoolSetupData:${schoolId}`);
      appQueryClient.invalidateCache(`school:${schoolId}`);
      toast.success("🎉 School onboarding completed successfully! Your portal is ready.");
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to step safely
  const handleNavigateStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    updateOnboardingStep(schoolId, stepNumber).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Loading school configuration...
        </p>
      </div>
    );
  }

  const steps = [
    { number: 1, title: "School Info", icon: <Building2 className="h-4 w-4" /> },
    { number: 2, title: "Academic Year", icon: <Calendar className="h-4 w-4" /> },
    { number: 3, title: "Classes & Sections", icon: <BookOpen className="h-4 w-4" /> },
    { number: 4, title: "Teachers (Optional)", icon: <Users className="h-4 w-4" /> },
    { number: 5, title: "Students (Optional)", icon: <GraduationCap className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>School Onboarding Wizard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {schoolName || school?.name || "Your School"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure your academic calendar, divisions, and faculty records. All changes persist in real-time.
          </p>
        </div>

        {/* Live Saving Status Pill */}
        {saveStatusText && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold self-start sm:self-auto shadow-xs">
            <Check className="h-3.5 w-3.5" />
            <span>{saveStatusText}</span>
          </div>
        )}
      </div>

      {/* Progress Stepper Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between overflow-x-auto gap-2 no-scrollbar">
          {steps.map((s) => {
            const isCompleted = completedSteps.includes(s.number);
            const isCurrent = currentStep === s.number;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => handleNavigateStep(s.number)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-xs"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : s.icon}
                <span>{s.number}. {s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          COMPLETED CELEBRATION STATE
      ========================================================================= */}
      {isFullyCompleted ? (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-8 text-center dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-teal-950/20 shadow-sm space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Your School is Ready! 🎓
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
              All core operational data for <strong>{schoolName || "your school"}</strong> has been securely provisioned in the database.
            </p>
          </div>

          {/* Verification Summary Checklist */}
          <div className="max-w-md mx-auto grid grid-cols-1 gap-2.5 text-left bg-white dark:bg-gray-900 p-5 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-xs text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>School Information & Branding Configured</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Active Academic Calendar: {academicYearName}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Classes & Section Divisions: {classesList.length} Grades</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Faculty Directory: {teachersList.length} Teachers</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Student Enrollments: {studentsList.length} Students</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsFullyCompleted(false)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              Review / Edit Settings
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700"
            >
              Go to School Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* STEP CONTENTS */
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-950 space-y-6">
          {/* =========================================================================
              STEP 1: SCHOOL INFO & BRANDING
          ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Step 1: School Information & Brand Logo</span>
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Update school credentials, location, and official branding image.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Required
                </span>
              </div>

              {/* Logo / Brand Upload Dropzone */}
              <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Official School Logo
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Displayed on student ID cards, portal headers, marksheets, and fee receipts.
                    </p>
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={isRemovingLogo}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-semibold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isRemovingLogo ? "Removing..." : "Remove Logo"}
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="relative h-24 w-24 shrink-0 rounded-xl border border-gray-200 bg-white p-1 shadow-xs dark:border-gray-800 dark:bg-gray-950 flex items-center justify-center overflow-hidden">
                    {logoPreview || logoUrl ? (
                      <img
                        src={logoPreview || logoUrl}
                        alt="School Logo"
                        className="h-full w-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="h-7 w-7 mx-auto text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-medium block mt-1">No logo</span>
                      </div>
                    )}

                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{logoUrl ? "Replace Logo" : "Upload School Logo"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          className="sr-only"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                        />
                      </label>
                      <span className="text-[11px] text-gray-400">
                        PNG, JPG, WebP up to 5MB (Stored in Firebase Storage)
                      </span>
                    </div>

                    {uploadProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-blue-600">
                          <span>Uploading to Firebase Storage...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden dark:bg-blue-950">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    School Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Xavier's High School"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    School Short Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SBCI"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono font-bold uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Used as prefix for Unique Student & Teacher IDs</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Official Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 91182 45636"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. principal@school.edu"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Academic Enclave, Civil Lines"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lucknow"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Uttar Pradesh"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Postal / PIN Code
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 226001"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    School Website
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="e.g. https://www.schoolstudy.in"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleSaveStep1(false)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5 text-gray-500" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveStep1(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <span>Save & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: ACADEMIC YEAR
          ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Step 2: Academic Session Configuration
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Define your active academic session. Attendance, grades, and fee records will be tied to this calendar.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Required
                </span>
              </div>

              {/* Existing Academic Years Selection */}
              {academicYears.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Select Active Session
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {academicYears.map((yr) => {
                      const isSel = selectedYearId === yr.id;
                      return (
                        <div
                          key={yr.id}
                          onClick={() => {
                            setSelectedYearId(yr.id);
                            setAcademicYearName(yr.name);
                            setStartDate(yr.startDate);
                            setEndDate(yr.endDate);
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSel
                              ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-700 ring-2 ring-blue-500/20"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                              {yr.name}
                            </span>
                            {yr.isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Currently Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {yr.startDate} → {yr.endDate}
                          </p>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => {
                        setSelectedYearId("new");
                        setAcademicYearName("2026-2027");
                        setStartDate("2026-04-01");
                        setEndDate("2027-03-31");
                      }}
                      className={`p-3.5 rounded-xl border border-dashed cursor-pointer text-center flex items-center justify-center gap-2 text-xs font-bold ${
                        selectedYearId === "new"
                          ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40"
                          : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      Create New Academic Year
                    </div>
                  </div>
                </div>
              )}

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Academic Session Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={academicYearName}
                    onChange={(e) => setAcademicYearName(e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Session Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Session End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveStep2(false)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5 text-gray-500" />
                    Save Draft
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveStep2(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <span>Save & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 3: CLASSES & SECTIONS
          ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Step 3: Classes & Section Divisions
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Structure the grades and section classrooms for your school.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Required
                </span>
              </div>

              {/* Quick Add Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">Quick-Add Presets:</span>
                <button
                  type="button"
                  onClick={() => applyClassPresets("primary")}
                  className="px-2.5 py-1 rounded bg-white dark:bg-gray-900 text-xs font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 shadow-xs"
                >
                  + Pre-Primary & Primary (Nursery - 5)
                </button>
                <button
                  type="button"
                  onClick={() => applyClassPresets("secondary")}
                  className="px-2.5 py-1 rounded bg-white dark:bg-gray-900 text-xs font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 shadow-xs"
                >
                  + Middle & High School (Class 6 - 10)
                </button>
                <button
                  type="button"
                  onClick={() => applyClassPresets("k12")}
                  className="px-2.5 py-1 rounded bg-white dark:bg-gray-900 text-xs font-bold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 shadow-xs"
                >
                  + Complete K-12 (Nursery - 12)
                </button>
              </div>

              {/* Custom Add Class Row */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class 11 (Commerce)"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddClass();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddClass}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add Class
                </button>
              </div>

              {/* Class Cards Grid */}
              <div className="space-y-3">
                {classesList.map((c, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          ({c.sections.length} {c.sections.length === 1 ? "Section" : "Sections"})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveClass(cIdx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        title="Delete class"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Section Badges & Add Section */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                        Sections:
                      </span>
                      {c.sections.map((s, sIdx) => (
                        <div
                          key={sIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800 text-xs font-bold text-blue-800 dark:text-blue-300"
                        >
                          <span>Section {s.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSection(cIdx, sIdx)}
                            className="text-blue-400 hover:text-red-500 ml-1 cursor-pointer"
                            title="Remove section"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {/* Quick Add Section Input */}
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="text"
                          value={newSectionInputs[cIdx] || ""}
                          onChange={(e) =>
                            setNewSectionInputs((prev) => ({
                              ...prev,
                              [cIdx]: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="e.g. C"
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-xs uppercase font-mono font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white text-center"
                          maxLength={3}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSection(cIdx);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSection(cIdx)}
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveStep3(false)}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5 text-gray-500" />
                    Save Draft
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveStep3(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  <span>Save & Continue</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 4: TEACHERS (OPTIONAL)
          ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Step 4: Faculty & Teachers (Optional)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Provision login credentials for class teachers. You can add them now or later in the Faculty Hub.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Optional
                </span>
              </div>

              {/* Add Teacher Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Registered Faculty: {teachersList.length}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddTeacherModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add Teacher
                </button>
              </div>

              {/* Teachers List */}
              {teachersList.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-800 space-y-2">
                  <Users className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    No faculty members added yet. You can add them now or skip this step.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  {teachersList.map((t, idx) => (
                    <div key={t.id || idx} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-blue-700 dark:text-blue-300 text-xs">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{t.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                              {t.teacherCode}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t.email}</span>
                        </div>
                      </div>

                      {t.assignedClassName && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {t.assignedClassName} {t.assignedSectionName ? `(${t.assignedSectionName})` : ""}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Teacher Inline/Modal Form */}
              {isAddTeacherOpen && (
                <form
                  onSubmit={handleCreateTeacher}
                  className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/30 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2 dark:border-blue-900">
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                      Add New Faculty Member
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddTeacherOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Teacher ID / Code
                      </label>
                      <input
                        type="text"
                        value={tCode}
                        onChange={(e) => setTCode(e.target.value.toUpperCase())}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-mono font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. SBCI-T1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Teacher Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={tName}
                        onChange={(e) => setTName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. Priya Sharma"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={tEmail}
                        onChange={(e) => setTEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. priya@school.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={tPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTPhone(val);
                          if (tUsePhoneAsPassword) {
                            setTPassword(val.replace(/\D/g, ""));
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Initial Password <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !tUsePhoneAsPassword;
                            setTUsePhoneAsPassword(next);
                            if (next && tPhone) {
                              setTPassword(tPhone.replace(/\D/g, ""));
                            }
                          }}
                          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          {tUsePhoneAsPassword ? "✓ Phone as Password" : "Use Phone as Password"}
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={tPassword}
                        onChange={(e) => setTPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="Min 6 characters"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Assigned Class & Section
                      </label>
                      <select
                        value={tClassId}
                        onChange={(e) => setTClassId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="">None (Subject Teacher)</option>
                        {classesList.map((c) => (
                          <option key={c.id || c.name} value={c.id || c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddTeacherOpen(false)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTeacher}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isSubmittingTeacher ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save Teacher
                    </button>
                  </div>
                </form>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedSteps((prev) => Array.from(new Set([...prev, 4])));
                    setCurrentStep(5);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
                >
                  <span>{teachersList.length > 0 ? "Continue to Students" : "Skip / Continue"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 5: STUDENTS (OPTIONAL)
          ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Step 5: Student Enrollments (Optional)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Enroll your initial batch of students. You can also import them in bulk anytime from Admissions.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Optional
                </span>
              </div>

              {/* Add Student Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Enrolled Students: {studentsList.length}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddStudentModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Enroll Student
                </button>
              </div>

              {/* Students List */}
              {studentsList.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-800 space-y-2">
                  <GraduationCap className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    No students added yet. You can enroll your first batch or finish onboarding now.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
                  {studentsList.map((s, idx) => (
                    <div key={s.id || idx} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                              {s.studentId || s.admissionNumber}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {s.className} ({s.sectionName}) • Roll #{s.rollNumber || "1"}
                          </span>
                        </div>
                      </div>

                      {s.phone && (
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {s.phone}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Student Form */}
              {isAddStudentOpen && (
                <form
                  onSubmit={handleCreateStudent}
                  className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/30 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2 dark:border-emerald-900">
                    <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Enroll New Student
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddStudentOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Admission / Student ID
                      </label>
                      <input
                        type="text"
                        value={sAdmNo}
                        onChange={(e) => setSAdmNo(e.target.value.toUpperCase())}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-mono font-bold dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. SBCI1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Student Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sName}
                        onChange={(e) => setSName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. Aarav Patel"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Assign Class <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={sClassId}
                        onChange={(e) => setSClassId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        {classesList.map((c) => (
                          <option key={c.id || c.name} value={c.id || c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Guardian Phone Number
                      </label>
                      <input
                        type="tel"
                        value={sPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSPhone(val);
                          if (sUsePhoneAsPassword) {
                            setSPassword(val.replace(/\D/g, ""));
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="e.g. +91 98765 43210"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Portal Login Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !sUsePhoneAsPassword;
                            setSUsePhoneAsPassword(next);
                            if (next && sPhone) {
                              setSPassword(sPhone.replace(/\D/g, ""));
                            }
                          }}
                          className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                        >
                          {sUsePhoneAsPassword ? "✓ Phone as Password" : "Use Phone as Password"}
                        </button>
                      </div>
                      <input
                        type="password"
                        value={sPassword}
                        onChange={(e) => setSPassword(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        placeholder="Optional (defaults to phone digits)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Gender
                      </label>
                      <select
                        value={sGender}
                        onChange={(e) => setSGender(e.target.value as Gender)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddStudentOpen(false)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingStudent}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {isSubmittingStudent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Enroll Student
                    </button>
                  </div>
                </form>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeOnboarding}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Complete Setup & Finish</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
