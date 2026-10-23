"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useSchoolCommunication } from "@/hooks/useSchoolCommunication";
import {
  TEMPLATE_VARIABLE_REGISTRY,
  resolveMessageTemplate,
} from "@/lib/services/communication-variables";
import { getStudents } from "@/lib/services/student.service";
import { getClassesWithSections } from "@/lib/services/academic.service";
import { getFeeStructures } from "@/lib/services/fee.service";
import type {
  CommunicationChannel,
  CommunicationLogEntry,
  CommunicationTemplate,
  FeeAutomationRule,
} from "@/types/communication";
import type { StudentProfile, SchoolClass } from "@/types";
import {
  Send,
  MessageSquare,
  Mail,
  Bell,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  Layers,
  RotateCcw,
  Check,
  ShieldCheck,
  Calendar,
  ExternalLink,
  Loader2,
  Info,
  Copy,
  Smartphone,
  CheckCheck,
  Settings2,
  FileText,
  History,
  Bot,
  Plus,
  Trash2,
  Play,
  UserCheck,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type HubTab = "overview" | "compose" | "templates" | "history" | "automations";

function SchoolCommunicationHubContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as HubTab | null;

  const { profile, firebaseUser } = useAuth();
  const effectiveSchoolId =
    profile?.schoolId ||
    (typeof window !== "undefined" ? localStorage.getItem("currentSchoolId") || "" : "");
  const schoolId = effectiveSchoolId;
  const schoolName = (profile as any)?.schoolName || "Institution";

  const getAuthHeaders = async () => {
    const token = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const { access, templates, rules, recentLogs, loading, refresh } =
    useSchoolCommunication(schoolId);

  // Active Tab
  const [activeTab, setActiveTab] = useState<HubTab>(
    tabParam === "compose" || tabParam === "templates" || tabParam === "history" || tabParam === "automations"
      ? tabParam
      : "overview"
  );

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // ----------------------------------------------------
  // DATA FOR COMPOSE TAB (STUDENTS, CLASSES, FEES)
  // ----------------------------------------------------
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    setIsLoadingStudents(true);

    Promise.all([
      getStudents(schoolId).catch(() => []),
      getClassesWithSections(schoolId).catch(() => []),
    ])
      .then(([stuList, clsList]) => {
        if (!isMounted) return;
        setStudents(stuList as StudentProfile[]);
        setClasses(clsList as SchoolClass[]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingStudents(false);
      });

    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  // ----------------------------------------------------
  // COMPOSE TAB STATE
  // ----------------------------------------------------
  const [composeChannel, setComposeChannel] = useState<"whatsapp" | "sms" | "manual_whatsapp">("whatsapp");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [feeStatusFilter, setFeeStatusFilter] = useState<"all" | "pending">("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Test Message Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Filter students based on selection
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (s.status && s.status.toLowerCase() !== "active") return false;
      if (selectedClassId !== "all") {
        if (s.classId !== selectedClassId && s.className !== selectedClassId) return false;
      }
      if (selectedSection !== "all" && s.sectionName && s.sectionName !== selectedSection) {
        return false;
      }
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchAdm = s.admissionNumber?.toLowerCase().includes(q) || s.rollNumber?.toString().includes(q);
        const matchPhone = s.phone?.includes(q) || s.guardianPhone?.includes(q);
        if (!matchName && !matchAdm && !matchPhone) return false;
      }
      return true;
    });
  }, [students, selectedClassId, selectedSection, studentSearch]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  // Selected students objects
  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  // Preview interpolation based on first selected student
  const sampleStudent = selectedStudents[0] || filteredStudents[0] || {
    name: "Aarav Sharma",
    admissionNumber: "ADM-2026-042",
    className: "Class 10",
    sectionName: "A",
    fatherName: "Mr. Rajesh Sharma",
    phone: "9876543210",
  };

  const sampleResolutionContext = useMemo(() => {
    return {
      student: {
        name: sampleStudent.name,
        admissionNumber: sampleStudent.admissionNumber || sampleStudent.rollNumber,
        className: sampleStudent.className || "Class 10",
        sectionName: sampleStudent.sectionName || "A",
        fatherName: (sampleStudent as any).fatherName || (sampleStudent as any).guardianName || "Parent",
        phone: sampleStudent.phone || (sampleStudent as any).guardianPhone || "9876543210",
      },
      school: {
        name: access?.schoolName || schoolName,
      },
      fee: {
        feeAmount: "₹4,500",
        outstandingAmount: "₹4,500",
        dueDate: "10th of this month",
        paymentLink: `https://school.sbci.online/pay/${schoolId}/${sampleStudent.id || "preview"}`,
      },
      customVariables: {
        due_date: "10th of this month",
        payment_link: `https://school.sbci.online/pay/${schoolId}/${sampleStudent.id || "preview"}`,
      },
    };
  }, [sampleStudent, access?.schoolName, schoolName, schoolId]);

  const previewInterpolatedBody = useMemo(() => {
    if (!composeBody) return "Enter your message text or select an approved template above...";
    return resolveMessageTemplate(composeBody, sampleResolutionContext);
  }, [composeBody, sampleResolutionContext]);

  // Insert token chip into textarea
  const insertToken = (token: string) => {
    setComposeBody((prev) => `${prev} ${token} `);
  };

  // Template select in composer
  const handleTemplateSelect = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === "custom") {
      setComposeTitle("");
      setComposeBody("");
      return;
    }
    const match = templates.find((t) => t.id === tplId);
    if (match) {
      setComposeTitle(match.titleTemplate || "");
      setComposeBody(match.bodyTemplate || "");
    }
  };

  // Dispatch message batch or single
  const handleDispatchMessage = async () => {
    if (!schoolId) {
      toast.error("School context missing.");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student recipient.");
      return;
    }

    if (!composeBody.trim()) {
      toast.error("Please enter a message body or select a template.");
      return;
    }

    // Permission checks
    if (composeChannel === "whatsapp" && !access?.canSendWhatsApp) {
      toast.error("WhatsApp API messaging is locked on your current plan. You can use Manual WhatsApp Mode for free.");
      return;
    }
    if (composeChannel === "sms" && !access?.canSendSms) {
      toast.error("SMS messaging is not enabled for your plan.");
      return;
    }

    setIsDispatching(true);
    try {
      const recipientsPayload = selectedStudents.map((s) => ({
        studentId: s.id,
        studentName: s.name,
        admissionNumber: s.admissionNumber || s.rollNumber,
        className: s.className,
        parentName: (s as any).fatherName || (s as any).guardianName,
        recipientPhone: s.phone || (s as any).guardianPhone,
        recipientEmail: s.email,
        userId: s.userId || s.id,
      }));

      const res = await fetch("/api/communication/send", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          schoolId,
          isBatch: recipientsPayload.length > 1,
          channel: composeChannel === "manual_whatsapp" ? "whatsapp" : composeChannel,
          titleTemplate: composeTitle,
          contentTemplate: composeBody,
          triggerType: "manual",
          recipients: recipientsPayload,
          // Single payload fallback
          ...(recipientsPayload.length === 1
            ? {
                studentId: recipientsPayload[0].studentId,
                studentName: recipientsPayload[0].studentName,
                admissionNumber: recipientsPayload[0].admissionNumber,
                className: recipientsPayload[0].className,
                parentName: recipientsPayload[0].parentName,
                recipientPhone: recipientsPayload[0].recipientPhone,
                recipientEmail: recipientsPayload[0].recipientEmail,
                userId: recipientsPayload[0].userId,
                title: composeTitle,
                content: previewInterpolatedBody,
              }
            : {}),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Dispatched successfully to ${data.sent || recipientsPayload.length} recipients!`);
        setShowConfirmModal(false);
        setSelectedStudentIds(new Set());
        refresh();
      } else {
        toast.error(data.error || "Failed to dispatch message.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error dispatching message.");
    } finally {
      setIsDispatching(false);
    }
  };

  // Test Message Handler
  const handleSendTestMessage = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error("Please enter a valid recipient phone number.");
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch("/api/communication/test", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          schoolId,
          channel: composeChannel === "sms" ? "sms" : "whatsapp",
          recipientPhone: testPhoneNumber.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Test message sent successfully! Please check your device.");
        setShowTestModal(false);
        setTestPhoneNumber("");
        refresh();
      } else {
        toast.error(data.error || "Failed to send test message.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error sending test message.");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Record Manual WhatsApp Actions
  const handleManualAction = async (student: StudentProfile, action: "manual_opened" | "manual_copied") => {
    const phone = (student.phone || (student as any).guardianPhone || "").replace(/[^0-9]/g, "");
    if (!phone) {
      toast.error("No phone number found for this student.");
      return;
    }

    const varCtx = {
      student: {
        name: student.name,
        admissionNumber: student.admissionNumber || student.rollNumber,
        className: student.className,
        fatherName: (student as any).fatherName || (student as any).guardianName,
      },
      school: { name: access?.schoolName || schoolName },
      fee: {
        dueDate: "10th of this month",
        paymentLink: `https://school.sbci.online/pay/${schoolId}/${student.id}`,
      },
      customVariables: {
        due_date: "10th of this month",
        payment_link: `https://school.sbci.online/pay/${schoolId}/${student.id}`,
      },
    };

    const personalized = resolveMessageTemplate(composeBody || "Notice from School", varCtx);

    if (action === "manual_copied") {
      navigator.clipboard.writeText(personalized);
      toast.success(`Copied personalized message for ${student.name}!`);
    } else {
      const cleanPhone = phone.startsWith("91") && phone.length === 12 ? phone : `91${phone}`;
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalized)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast.success(`Opening WhatsApp chat for ${student.name}...`);
    }

    // Record action log
    try {
      await fetch("/api/communication/manual-action", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          schoolId,
          logId: `manual_${Date.now()}_${student.id}`,
          action,
        }),
      });
    } catch {
      // Non-blocking audit record
    }
  };

  // ----------------------------------------------------
  // TEMPLATES TAB STATE
  // ----------------------------------------------------
  const [templateChannelFilter, setTemplateChannelFilter] = useState<string>("all");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>("all");
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState<any>("fee_reminder");
  const [newTemplateChannel, setNewTemplateChannel] = useState<CommunicationChannel>("whatsapp");
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (templateChannelFilter !== "all" && t.channel !== templateChannelFilter) return false;
      if (templateCategoryFilter !== "all" && t.category !== templateCategoryFilter) return false;
      return true;
    });
  }, [templates, templateChannelFilter, templateCategoryFilter]);

  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      toast.error("Please provide both a template name and message body.");
      return;
    }

    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/communication/templates", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          schoolId,
          template: {
            name: newTemplateName.trim(),
            category: newTemplateCategory,
            channel: newTemplateChannel,
            titleTemplate: newTemplateTitle.trim() || newTemplateName.trim(),
            bodyTemplate: newTemplateBody.trim(),
            providerStatus: "draft",
            isSystemDefault: false,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Custom template saved successfully!");
        setShowCreateTemplateModal(false);
        setNewTemplateName("");
        setNewTemplateTitle("");
        setNewTemplateBody("");
        refresh();
      } else {
        toast.error(data.error || "Failed to save template.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save template.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to remove this custom template?")) return;
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/communication/templates?schoolId=${encodeURIComponent(schoolId)}&templateId=${encodeURIComponent(templateId)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Template archived.");
        refresh();
      } else {
        toast.error(data.error || "Failed to remove template.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to remove template.");
    }
  };

  // ----------------------------------------------------
  // HISTORY TAB STATE
  // ----------------------------------------------------
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyChannelFilter, setHistoryChannelFilter] = useState("all");
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return recentLogs.filter((l) => {
      if (historyChannelFilter !== "all" && l.channel !== historyChannelFilter) return false;
      if (historyStatusFilter !== "all" && l.status !== historyStatusFilter) return false;
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        return (
          l.studentName?.toLowerCase().includes(q) ||
          l.recipient?.toLowerCase().includes(q) ||
          l.title?.toLowerCase().includes(q) ||
          l.content?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [recentLogs, historyChannelFilter, historyStatusFilter, historySearch]);

  const handleRetryMessage = async (log: CommunicationLogEntry) => {
    setRetryingLogId(log.id);
    try {
      const res = await fetch("/api/communication/retry", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ logId: log.id, schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Message redelivered successfully!");
        refresh();
      } else {
        toast.error(data.message || data.error || "Retry failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Retry request failed.");
    } finally {
      setRetryingLogId(null);
    }
  };

  // ----------------------------------------------------
  // AUTOMATIONS TAB STATE
  // ----------------------------------------------------
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [automationReport, setAutomationReport] = useState<any | null>(null);
  const [activeRulesState, setActiveRulesState] = useState<FeeAutomationRule[]>(rules);

  useEffect(() => {
    setActiveRulesState(rules);
  }, [rules]);

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    const updated = activeRulesState.map((r) =>
      r.id === ruleId ? { ...r, enabled: !currentEnabled } : r
    );
    setActiveRulesState(updated);

    const targetRule = updated.find((r) => r.id === ruleId);
    if (!targetRule) return;

    try {
      const res = await fetch("/api/communication/automation/run", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          schoolId,
          action: "save_rule",
          rule: targetRule,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Rule ${targetRule.enabled ? "enabled" : "disabled"}`);
        refresh();
      }
    } catch {
      toast.error("Failed to update rule state.");
    }
  };

  const handleRunAutomation = async () => {
    setIsRunningAutomation(true);
    try {
      const res = await fetch("/api/communication/automation/run", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        setAutomationReport(data.report);
        toast.success("Automation engine executed successfully!");
        refresh();
      } else {
        toast.error(data.error || "Automation run failed.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute fee automation.");
    } finally {
      setIsRunningAutomation(false);
    }
  };

  // Delivery stats
  const stats = useMemo(() => {
    const total = recentLogs.length;
    const delivered = recentLogs.filter((l) => l.status === "delivered" || l.status === "sent" || l.status === "read").length;
    const failed = recentLogs.filter((l) => l.status === "failed").length;
    const manualActions = recentLogs.filter((l) => l.status === "manual_opened" || l.status === "manual_copied").length;
    return { total, delivered, failed, manualActions };
  }, [recentLogs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ---------------- Top Header ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <Send className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Communication Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {access?.planName || access?.tierName || (loading ? "Loading..." : "Current Plan")}
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Automated WhatsApp alerts, high-priority SMS circulars, and instant parent engagement for {schoolName}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("compose");
              setComposeChannel("whatsapp");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>New Message</span>
          </button>
        </div>
      </div>

      {/* ---------------- 5 Hub Navigation Tabs ---------------- */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "compose"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Compose Message</span>
          {selectedStudentIds.size > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-600 text-white font-black">
              {selectedStudentIds.size}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "templates"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Templates</span>
          <span className="text-[10px] text-slate-400">({templates.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Message History</span>
          {stats.failed > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black">
              {stats.failed}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("automations")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "automations"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>Automations</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {/* Platform Twilio Configuration Warning */}
      {access?.twilioWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold">Provider Configuration Notice</p>
            <p className="mt-0.5 opacity-90">{access.twilioWarning}</p>
          </div>
        </div>
      )}

      {/* Plan Restricted Banner (only if school plan does not include automated messaging) */}
      {!access?.canSendWhatsApp && !access?.canSendSms && access?.lockReason && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold">Automated Channel Access</p>
              <p className="mt-0.5 opacity-90">{access.lockReason}</p>
            </div>
          </div>
          <Link
            href="/admin/billing"
            className="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ==================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Monthly Quota Meter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* WhatsApp Quota */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp API Quota</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {access?.limits?.monthlyWhatsAppAllowance === -1 ? "Unlimited" : `${access?.limits?.monthlyWhatsAppAllowance || 500} / mo`}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {access?.monthlyUsage?.whatsappSent || 0}
                </span>
                <span className="text-xs text-slate-400">
                  {access?.limits?.monthlyWhatsAppAllowance === -1
                    ? "Messages Dispatched"
                    : `of ${access?.limits?.monthlyWhatsAppAllowance || 500} limit`}
                </span>
              </div>
              {access?.limits?.monthlyWhatsAppAllowance !== -1 && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((access?.monthlyUsage?.whatsappSent || 0) / (access?.limits?.monthlyWhatsAppAllowance || 500)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* SMS Quota */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">SMS Gateway Quota</span>
                </div>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  {access?.limits?.monthlySmsAllowance === -1 ? "Unlimited" : `${access?.limits?.monthlySmsAllowance || 200} / mo`}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {access?.monthlyUsage?.emailSent || 0}
                </span>
                <span className="text-xs text-slate-400">
                  {access?.limits?.monthlySmsAllowance === -1
                    ? "SMS Delivered"
                    : `of ${access?.limits?.monthlySmsAllowance || 200} limit`}
                </span>
              </div>
              {access?.limits?.monthlySmsAllowance !== -1 && (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((access?.monthlyUsage?.emailSent || 0) / (access?.limits?.monthlySmsAllowance || 200)) * 100)
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Manual WhatsApp Mode */}
            <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">Manual WhatsApp</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                  100% Free
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-3">
                <span className="text-2xl font-black text-emerald-950 dark:text-white">
                  Zero Cost
                </span>
                <span className="text-xs text-emerald-700/80 dark:text-emerald-400">
                  Direct wa.me links
                </span>
              </div>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-2">
                Instant one-click WhatsApp web chat links with pre-filled student details. No API fees.
              </p>
            </div>
          </div>

          {/* Channel Gateway Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Twilio WhatsApp API</span>
                <span className={`h-2.5 w-2.5 rounded-full ${access?.canSendWhatsApp ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {access?.canSendWhatsApp ? "Active & Verified" : "Plan Restricted"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Centralized business cloud sending
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">High-Priority SMS</span>
                <span className={`h-2.5 w-2.5 rounded-full ${access?.canSendSms ? "bg-emerald-500" : "bg-slate-300"}`} />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {access?.canSendSms ? "Ready for Dispatch" : "Plan Restricted"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Direct SMS gateway integration
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Fee Reminder Engine</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {access?.canAutomate ? "Active & Scheduled" : "Disabled"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Automated due date alerts
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Delivery Tracking</span>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Real-Time Webhooks
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Read receipts & delivery tracking
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Dispatches
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Logs</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                {recentLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No communication messages sent yet. Click &quot;New Message&quot; to begin!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`p-2 rounded-xl shrink-0 ${
                              log.channel === "whatsapp"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : log.channel === "sms"
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                                : "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                            }`}
                          >
                            {log.channel === "whatsapp" ? (
                              <MessageSquare className="h-3.5 w-3.5" />
                            ) : log.channel === "sms" ? (
                              <Smartphone className="h-3.5 w-3.5" />
                            ) : (
                              <Bell className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {log.studentName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {log.recipient} • {log.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              log.status === "delivered" || log.status === "read"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : log.status === "sent"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : log.status === "manual_opened" || log.status === "manual_copied"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {log.status.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Helper / Actions Panel */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Communication Quick Start
              </h3>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("compose");
                    setComposeChannel("whatsapp");
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Bulk WhatsApp Notice</p>
                      <p className="text-[10px] text-slate-400">Send fee or exam reminders</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("compose");
                    setComposeChannel("manual_whatsapp");
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Manual WhatsApp Assistant</p>
                      <p className="text-[10px] text-slate-400">Direct wa.me links with zero cost</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("automations");
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Fee Automations</p>
                      <p className="text-[10px] text-slate-400">Manage auto reminders & quiet hours</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: COMPOSE MESSAGE */}
      {/* ==================================================== */}
      {activeTab === "compose" && (
        <div className="space-y-6">
          {/* Channel Selector */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Step 1: Select Communication Channel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setComposeChannel("whatsapp")}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition cursor-pointer text-left ${
                  composeChannel === "whatsapp"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">WhatsApp Cloud API</h4>
                    {!access?.canSendWhatsApp && (
                      <span className="p-0.5 rounded text-amber-500"><Lock className="h-3 w-3" /></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Automated delivery via Twilio WhatsApp Gateway
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setComposeChannel("sms")}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition cursor-pointer text-left ${
                  composeChannel === "sms"
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 shrink-0">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">High Priority SMS</h4>
                    {!access?.canSendSms && (
                      <span className="p-0.5 rounded text-amber-500"><Lock className="h-3 w-3" /></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Reliable SMS delivery to parent mobile numbers
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setComposeChannel("manual_whatsapp")}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition cursor-pointer text-left ${
                  composeChannel === "manual_whatsapp"
                    ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Manual WhatsApp Mode</h4>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                      FREE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Direct wa.me links with zero API cost
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Recipient Selector & Message Composer */}
            <div className="lg:col-span-7 space-y-6">
              {/* Recipient Filter & Table */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Step 2: Choose Recipients
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Selected: <strong className="text-indigo-600 dark:text-indigo-400">{selectedStudentIds.size}</strong> of {filteredStudents.length} students
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                      ? "Deselect All"
                      : "Select All Filtered"}
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Fee Status</label>
                    <select
                      value={feeStatusFilter}
                      onChange={(e) => setFeeStatusFilter(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">All Students</option>
                      <option value="pending">With Pending Dues</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Student</label>
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Name / Adm No / Phone..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Student Selection Scroll Area */}
                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoadingStudents ? (
                    <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <span>Loading students...</span>
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No students found matching current filters.
                    </div>
                  ) : (
                    filteredStudents.map((stu) => {
                      const isSelected = selectedStudentIds.has(stu.id);
                      return (
                        <div
                          key={stu.id}
                          onClick={() => toggleSelectStudent(stu.id)}
                          className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-indigo-50/60 dark:bg-indigo-950/40"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {stu.name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                Adm: {stu.admissionNumber || stu.rollNumber || "N/A"} • {stu.className || "Class"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              {stu.phone || (stu as any).guardianPhone || "No Phone"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(stu as any).fatherName || "Parent"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Message Composer & Variable Toolbar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Step 3: Compose Content
                  </h3>

                  {/* Template Picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-semibold">Template:</span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200"
                    >
                      <option value="custom">Custom Draft</option>
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({tpl.channel})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Variable Tokens Toolbar */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Click to insert dynamic variable token:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLE_REGISTRY.slice(0, 8).map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertToken(v.token)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 text-[11px] font-mono font-medium border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer"
                        title={v.description}
                      >
                        +{v.token}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title (for SMS/Email/In-App) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Subject / Header (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Important Fee Notification: {{student_name}}"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Content Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Message Body
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {composeBody.length} characters
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    placeholder="Dear {{parent_name}}, this is a reminder regarding {{student_name}}'s pending fee balance of {{outstanding_amount}} due on {{due_date}}..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
                  />
                </div>

                {/* Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTestModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Send Test Message</span>
                  </button>

                  {composeChannel === "manual_whatsapp" ? (
                    <div className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                      Use the &quot;Manual WhatsApp Action Panel&quot; on the right to open chats or copy!
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isDispatching || selectedStudentIds.size === 0}
                      onClick={() => setShowConfirmModal(true)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                    >
                      {isDispatching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      <span>
                        Dispatch to {selectedStudentIds.size} {selectedStudentIds.size === 1 ? "Recipient" : "Recipients"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Personalized Live Preview & Manual Assistant */}
            <div className="lg:col-span-5 space-y-6">
              {/* WhatsApp Live Preview Shell */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Live Personalized Preview
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Target: {sampleStudent.name}
                  </span>
                </div>

                {/* Phone Simulator Box */}
                <div className="rounded-2xl bg-slate-900 p-3 shadow-inner text-white">
                  <div className="rounded-xl bg-slate-800/80 p-3 space-y-2 border border-slate-700/50">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                          S
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white">{access?.schoolName || schoolName}</p>
                          <p className="text-[9px] text-emerald-400">Official Communication</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400">Just now</span>
                    </div>

                    <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans py-1">
                      {previewInterpolatedBody}
                    </div>

                    <div className="text-right text-[9px] text-slate-400 flex items-center justify-end gap-1">
                      <span>12:00 PM</span>
                      <CheckCheck className="h-3 w-3 text-emerald-400" />
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  All variables like <code className="text-indigo-500 font-mono text-[10px]">{`{{student_name}}`}</code> and <code className="text-indigo-500 font-mono text-[10px]">{`{{outstanding_amount}}`}</code> will dynamically resolve to each individual recipient&apos;s real database values.
                </p>
              </div>

              {/* Manual WhatsApp Mode Action List */}
              {composeChannel === "manual_whatsapp" && (
                <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-teal-950 dark:text-teal-200">
                        Manual WhatsApp One-Click Action Panel
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300">
                      {selectedStudents.length} Selected
                    </span>
                  </div>

                  <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80">
                    Click &quot;Open WhatsApp&quot; to initiate a direct chat with pre-filled message, or &quot;Copy&quot; to paste manually. No Twilio API balance required.
                  </p>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedStudents.length === 0 ? (
                      <div className="p-4 text-center text-xs text-teal-700/60 dark:text-teal-400/60">
                        Select students on the left to activate one-click sending.
                      </div>
                    ) : (
                      selectedStudents.map((stu) => (
                        <div
                          key={stu.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-900 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {stu.name}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {stu.phone || "No phone"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleManualAction(stu, "manual_copied")}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1"
                              title="Copy personalized text"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleManualAction(stu, "manual_opened")}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold text-white transition cursor-pointer flex items-center gap-1"
                              title="Open wa.me chat"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Open WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: TEMPLATES */}
      {/* ==================================================== */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Message Templates Library
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Standardized templates approved for WhatsApp Cloud API, Twilio SMS, and In-App notifications.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateTemplateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Custom Template</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTemplateChannelFilter("all")}
              className={`px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                templateChannelFilter === "all"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              }`}
            >
              All Channels
            </button>
            <button
              type="button"
              onClick={() => setTemplateChannelFilter("whatsapp")}
              className={`px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                templateChannelFilter === "whatsapp"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setTemplateChannelFilter("sms")}
              className={`px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                templateChannelFilter === "sms"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              }`}
            >
              SMS
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tpl.channel === "whatsapp"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {tpl.channel}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        tpl.providerStatus === "approved"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : tpl.providerStatus === "submitted"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {tpl.providerStatus || "System Approved"}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tpl.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                    Category: {tpl.category.replace("_", " ")}
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans line-clamp-4">
                    {tpl.bodyTemplate}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setComposeChannel(tpl.channel === "sms" ? "sms" : "whatsapp");
                      setSelectedTemplateId(tpl.id);
                      setComposeTitle(tpl.titleTemplate || "");
                      setComposeBody(tpl.bodyTemplate);
                      setActiveTab("compose");
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Use in Composer</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>

                  {!tpl.isSystemDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Archive template"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: MESSAGE HISTORY */}
      {/* ==================================================== */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Communication Audit Log
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time delivery verification, read receipts, and provider audit trails.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={historyChannelFilter}
                onChange={(e) => setHistoryChannelFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="in_app">In-App</option>
              </select>

              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="manual_opened">Manual Opened</option>
                <option value="manual_copied">Manual Copied</option>
              </select>

              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No communication records found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Student & Recipient</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Subject & Content</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} •{" "}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>

                        <td className="px-4 py-3 min-w-[160px]">
                          <p className="font-bold text-slate-900 dark:text-white">{log.studentName}</p>
                          <p className="text-[11px] text-slate-400">{log.recipient}</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.channel === "whatsapp"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : log.channel === "sms"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}
                          >
                            {log.channel}
                          </span>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{log.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{log.content}</p>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              log.status === "delivered" || log.status === "read"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : log.status === "sent"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : log.status === "manual_opened" || log.status === "manual_copied"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {log.status === "delivered" ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : log.status === "read" ? (
                              <CheckCheck className="h-3 w-3 text-blue-500" />
                            ) : log.status === "failed" ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            <span>{log.status.replace("_", " ")}</span>
                          </span>
                          {log.deliveryReport?.errorMessage && (
                            <p className="text-[10px] text-rose-500 truncate max-w-xs mt-0.5">
                              {log.deliveryReport.errorMessage}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {log.status === "failed" && (
                            <button
                              type="button"
                              onClick={() => handleRetryMessage(log)}
                              disabled={retryingLogId === log.id}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-300 font-bold transition cursor-pointer text-[10px] disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <RotateCcw className={`h-3 w-3 ${retryingLogId === log.id ? "animate-spin" : ""}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: AUTOMATIONS */}
      {/* ==================================================== */}
      {activeTab === "automations" && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-200 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Intelligent Fee Reminder Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Evaluates live fee ledgers. Automatically suppresses reminders if balance is cleared or during quiet hours (21:00 - 08:00 IST).
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isRunningAutomation}
              onClick={handleRunAutomation}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isRunningAutomation ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span>Run Automation Engine Now</span>
            </button>
          </div>

          {/* Execution Report Modal if ran */}
          {automationReport && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Latest Automation Execution Summary</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setAutomationReport(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {automationReport.totalStudentsScanned}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Scanned</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {automationReport.messagesDispatched}
                  </span>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">Dispatched</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {automationReport.suppressedCount || 0}
                  </span>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">Cleared Suppressed</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {automationReport.quietHoursSuppressed || 0}
                  </span>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">Quiet Hours</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-lg font-black text-slate-600 dark:text-slate-300">
                    {automationReport.duplicatesSkipped || 0}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dedup Skipped</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Fee Reminder Rules List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Fee Automation Lifecycle Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRulesState.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-2xl border transition ${
                    rule.enabled
                      ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {rule.name}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rule.type.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Offset:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {rule.daysOffset < 0
                            ? `${Math.abs(rule.daysOffset)} days before due date`
                            : rule.daysOffset === 0
                            ? "On due date"
                            : `${rule.daysOffset} days overdue`}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        rule.enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-sans line-clamp-3">
                    {rule.bodyTemplate}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Channels: {rule.channels.join(", ")}</span>
                    <span>Min Dues: ₹{rule.minOutstandingAmount || 100}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Confirm Send Modal ---------------- */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Dispatch
                </h3>
                <p className="text-xs text-slate-500">
                  Ready to send via {composeChannel.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p>
                Recipients: <strong>{selectedStudentIds.size} students</strong>
              </p>
              <p>
                Channel: <strong className="uppercase">{composeChannel}</strong>
              </p>
              <p>
                Subject: <strong>{composeTitle || "Default Notification"}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDispatching}
                onClick={handleDispatchMessage}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Test Message Modal ---------------- */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Send Genuine Test Message
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify your WhatsApp or SMS delivery by sending a genuine live test message to your personal mobile number.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Recipient Phone Number (with Country Code)
              </label>
              <input
                type="text"
                placeholder="+919876543210"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingTest}
                onClick={handleSendTestMessage}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Test</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Create Custom Template Modal ---------------- */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Create School Template
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sports Day Invitation"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Channel
                  </label>
                  <select
                    value={newTemplateChannel}
                    onChange={(e) => setNewTemplateChannel(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                    <option value="in_app">In-App</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Category
                  </label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  >
                    <option value="fee_reminder">Fee Reminder</option>
                    <option value="academic">Academic Notice</option>
                    <option value="admission_welcome">Admission Welcome</option>
                    <option value="general">General Circular</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Message Body (Insert variable chips below)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Dear {{parent_name}}, notice regarding {{student_name}}..."
                  value={newTemplateBody}
                  onChange={(e) => setNewTemplateBody(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARIABLE_REGISTRY.slice(0, 6).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setNewTemplateBody((prev) => `${prev} ${v.token} `)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    +{v.token}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTemplateModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SchoolCommunicationHubPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-500">Loading Communication Center...</p>
        </div>
      }
    >
      <SchoolCommunicationHubContent />
    </Suspense>
  );
}
