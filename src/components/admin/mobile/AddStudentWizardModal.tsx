"use client";

import React, { useState } from "react";
import {
  X,
  Camera,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Calendar,
  Phone,
  Mail,
  User,
  School,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { SchoolClass, CreateStudentInput } from "@/types";
import { createStudentWithAuth } from "@/lib/services/student.service";
import { normalizeGender } from "@/lib/utils/academic-normalizer";

interface AddStudentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  uniqueClasses: SchoolClass[];
  onStudentCreated: () => void;
}

export function AddStudentWizardModal({
  isOpen,
  onClose,
  schoolId,
  uniqueClasses,
  onStudentCreated,
}: AddStudentWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    name: "",
    gender: "male" as "male" | "female" | "other",
    dob: "",
    bloodGroup: "",
    aadhaarNumber: "",
    photoUrl: "",

    // Step 2: Academic
    admissionNumber: `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    classId: "",
    sectionId: "",
    admissionDate: new Date().toISOString().split("T")[0],
    previousSchool: "",
    rollNumber: "",

    // Step 3: Parent / Guardian
    fatherName: "",
    motherName: "",
    guardianName: "",
    guardianRelation: "Father",
    phone: "",
    email: "",
    address: "",

    // Step 4: Additional / Transport
    transportEnrolled: false,
    medicalNotes: "",
    password: "",
  });

  if (!isOpen) return null;

  const selectedClass = uniqueClasses.find((c) => c.id === formData.classId);
  const availableSections = selectedClass?.sections || [];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        toast.error("Please enter student's full name.");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.classId) {
        toast.error("Please select a class.");
        return;
      }
      if (!formData.sectionId) {
        toast.error("Please select a section.");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!formData.phone.trim() && !formData.email.trim()) {
        toast.error("Please provide at least a contact phone number or email.");
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!schoolId) {
      toast.error("School ID is missing.");
      return;
    }

    setSubmitting(true);
    try {
      const chosenClass = uniqueClasses.find((c) => c.id === formData.classId);
      const chosenSection = chosenClass?.sections?.find((s) => s.id === formData.sectionId);

      const studentEmail =
        formData.email.trim() ||
        `${formData.admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, "")}@school.local`;

      const input: CreateStudentInput = {
        name: formData.name.trim(),
        email: studentEmail,
        password: formData.password || "Student@123",
        className: chosenClass?.name || "Class 1",
        sectionName: chosenSection?.name || "A",
        classId: chosenClass?.id || formData.classId || "default_class",
        sectionId: chosenSection?.id || formData.sectionId || "default_section",
        rollNumber: formData.rollNumber ? parseInt(formData.rollNumber, 10) : undefined,
        admissionNumber: formData.admissionNumber,
        admissionDate: formData.admissionDate,
        dob: formData.dob,
        gender: normalizeGender(formData.gender),
        bloodGroup: formData.bloodGroup,
        phone: formData.phone,
        address: formData.address,
        guardianName: formData.guardianName || formData.fatherName,
        guardianPhone: formData.phone,
        guardianRelation: formData.guardianRelation,
        photoUrl: formData.photoUrl,
      };

      await createStudentWithAuth(schoolId, input);
      toast.success(`Successfully enrolled ${formData.name}!`);
      onStudentCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creating student:", err);
      toast.error(err?.message || "Failed to create student.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Wizard Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[92vh]">
        {/* Header with Step Indicator */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
                {currentStep}/4
              </span>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Add Student
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { step: 1, title: "Personal" },
              { step: 2, title: "Academic" },
              { step: 3, title: "Parent" },
              { step: 4, title: "Additional" },
            ].map((s) => (
              <div key={s.step} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    s.step <= currentStep
                      ? "bg-blue-600"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block truncate">
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center py-2">
                <div className="relative mx-auto w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 cursor-pointer">
                  <Camera className="h-6 w-6 mb-1" />
                  <span className="text-[9px] font-bold">Add Photo</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Singh"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Gender Radio Pills */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-2.5 rounded-xl font-bold capitalize transition-all border ${
                        formData.gender === g
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="">Select</option>
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
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aadhaar Number (Optional)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="12-digit Aadhaar number"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC INFORMATION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.admissionNumber}
                  onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.classId}
                    onChange={(e) => {
                      const newClassId = e.target.value;
                      const c = uniqueClasses.find((cls) => cls.id === newClassId);
                      const defaultSec = c?.sections?.[0]?.id || "";
                      setFormData({ ...formData, classId: newClassId, sectionId: defaultSec });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="">Select Class</option>
                    {uniqueClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!formData.classId}
                    value={formData.sectionId}
                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold disabled:opacity-50"
                  >
                    <option value="">Select Section</option>
                    {availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Admission Date
                  </label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Roll Number
                  </label>
                  <input
                    type="number"
                    placeholder="Auto or enter"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Previous School (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter previous school name"
                  value={formData.previousSchool}
                  onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PARENT / GUARDIAN */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    placeholder="Father's name"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mother's Name
                  </label>
                  <input
                    type="text"
                    placeholder="Mother's name"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Guardian Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Singh"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="parent@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter complete residential address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 4: ADDITIONAL */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">School Transport (Bus/Van)</span>
                  <span className="text-[11px] text-slate-400">Enroll student in daily bus route</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.transportEnrolled}
                  onChange={(e) => setFormData({ ...formData, transportEnrolled: e.target.checked })}
                  className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Portal Login Initial Password
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for default (Student@123)"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Notes & Allergies (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter any medical conditions, blood group notes or emergency instructions"
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Complete Enrollment</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
