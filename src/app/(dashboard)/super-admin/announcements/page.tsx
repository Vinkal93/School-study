"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  CmsAnnouncement,
  AnnouncementType,
  computeAnnouncementStatus,
  SiteSettings,
  DEFAULT_SITE_SETTINGS,
  sanitizeSiteSettings,
} from "@/lib/cms/siteSettings";
import { AnnouncementBanner } from "@/components/common/AnnouncementBanner";
import { getAllSchools } from "@/lib/services/school.service";
import type { School } from "@/types";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Megaphone,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Eye,
  Plus,
  ArrowRight,
  Shield,
  Search,
  Building2,
  RefreshCw,
  Power,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminAnnouncementsPage() {
  const { profile, firebaseUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [announcements, setAnnouncements] = useState<CmsAnnouncement[]>([]);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CmsAnnouncement>>({
    title: "",
    message: "",
    type: "INFO",
    startAt: "",
    endAt: "",
    active: true,
    marquee: true,
    priority: 5,
    targetScope: "ALL",
    targetSchoolIds: [],
    targetPublicArea: "ALL",
    linkText: "",
    linkUrl: "",
  });

  // Load Settings & Schools
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch schools for target selector
      try {
        const schoolList = await getAllSchools();
        setSchools(schoolList);
      } catch (err) {
        console.warn("Could not load schools list for selector:", err);
      }

      // 2. Fetch site settings from API or Firestore
      let loaded = false;
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";
      try {
        const res = await fetch("/api/super-admin/site-settings", {
          headers: {
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            ...(firebaseUser?.uid ? { "x-user-id": firebaseUser.uid } : {}),
            ...(profile?.role ? { "x-user-role": profile.role } : {}),
          },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const target = json.draft || json.published || DEFAULT_SITE_SETTINGS;
          setSiteSettings(target);
          setAnnouncements(target.announcements || []);
          loaded = true;
        }
      } catch (apiErr) {
        console.warn("API site settings fetch notice:", apiErr);
      }

      // Direct client Firestore fallback
      if (!loaded) {
        const db = getFirebaseDb();
        if (db) {
          const pubSnap = await getDoc(doc(db, "siteSettings", "global"));
          if (pubSnap.exists()) {
            const data = sanitizeSiteSettings(pubSnap.data() as Partial<SiteSettings>);
            setSiteSettings(data);
            setAnnouncements(data.announcements || []);
            loaded = true;
          }
        }
      }

      if (!loaded) {
        setSiteSettings(DEFAULT_SITE_SETTINGS);
        setAnnouncements(DEFAULT_SITE_SETTINGS.announcements || []);
      }
    } catch (e: any) {
      console.error("Load announcements error:", e);
      toast.error("Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [firebaseUser]);

  // Persist announcements to backend & publish
  const saveAndPublish = async (updatedAnnouncements: CmsAnnouncement[], successMsg: string) => {
    setSaving(true);
    try {
      const updatedSettings: SiteSettings = {
        ...siteSettings,
        announcements: updatedAnnouncements,
        updatedAt: new Date().toISOString(),
      };

      let saved = false;
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => "") : "";

      try {
        const res = await fetch("/api/super-admin/site-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            ...(firebaseUser?.uid ? { "x-user-id": firebaseUser.uid } : {}),
            ...(profile?.role ? { "x-user-role": profile.role } : {}),
          },
          body: JSON.stringify({
            action: "publish",
            settings: updatedSettings,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          setSiteSettings(json.settings || updatedSettings);
          setAnnouncements(json.settings?.announcements || updatedAnnouncements);
          saved = true;
        }
      } catch (apiErr) {
        console.warn("API save failed, using direct client fallback:", apiErr);
      }

      if (!saved) {
        const db = getFirebaseDb();
        if (db) {
          const sanitized = sanitizeSiteSettings(updatedSettings);
          await setDoc(doc(db, "siteSettings", "global"), {
            ...sanitized,
            version: (sanitized.version || 1) + 1,
            publishedAt: new Date().toISOString(),
            publishedBy: profile?.email || profile?.name || "super_admin",
          });
          setSiteSettings(sanitized);
          setAnnouncements(sanitized.announcements || updatedAnnouncements);
          saved = true;
        }
      }

      toast.success(successMsg);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save announcements.");
    } finally {
      setSaving(false);
    }
  };

  // Form Submit (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim() || !formData.message?.trim()) {
      toast.error("Please enter both an Announcement Title and Message.");
      return;
    }

    const nowIso = new Date().toISOString();
    let updatedList: CmsAnnouncement[] = [];

    if (editingId) {
      // Edit existing
      updatedList = announcements.map((a) => {
        if (a.id === editingId) {
          return {
            ...a,
            title: formData.title!.trim(),
            message: formData.message!.trim(),
            type: formData.type || "INFO",
            startAt: formData.startAt ? new Date(formData.startAt).toISOString() : a.startAt || nowIso,
            endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
            active: formData.active ?? true,
            marquee: formData.marquee ?? true,
            priority: Number(formData.priority) || 1,
            targetScope: formData.targetScope || "ALL",
            targetSchoolIds: formData.targetScope === "SELECTED" ? formData.targetSchoolIds || [] : [],
            targetPublicArea: formData.targetPublicArea || "ALL",
            linkText: formData.linkText?.trim() || undefined,
            linkUrl: formData.linkUrl?.trim() || undefined,
          };
        }
        return a;
      });
      await saveAndPublish(updatedList, "Announcement updated and published live!");
      handleResetForm();
    } else {
      // Create new
      const newAnn: CmsAnnouncement = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: formData.title!.trim(),
        message: formData.message!.trim(),
        type: formData.type || "INFO",
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : nowIso,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
        active: formData.active ?? true,
        marquee: formData.marquee ?? true,
        priority: Number(formData.priority) || 1,
        targetScope: formData.targetScope || "ALL",
        targetSchoolIds: formData.targetScope === "SELECTED" ? formData.targetSchoolIds || [] : [],
        targetPublicArea: formData.targetPublicArea || "ALL",
        linkText: formData.linkText?.trim() || undefined,
        linkUrl: formData.linkUrl?.trim() || undefined,
        createdAt: nowIso,
      };

      updatedList = [newAnn, ...announcements];
      await saveAndPublish(updatedList, "New announcement created and published live!");
      handleResetForm();
    }
  };

  const handleEdit = (ann: CmsAnnouncement) => {
    setEditingId(ann.id);
    setFormData({
      title: ann.title,
      message: ann.message,
      type: ann.type,
      startAt: ann.startAt ? ann.startAt.slice(0, 16) : "",
      endAt: ann.endAt ? ann.endAt.slice(0, 16) : "",
      active: ann.active,
      marquee: ann.marquee ?? true,
      priority: ann.priority ?? 1,
      targetScope: ann.targetScope || "ALL",
      targetSchoolIds: ann.targetSchoolIds || [],
      targetPublicArea: ann.targetPublicArea || "ALL",
      linkText: ann.linkText || "",
      linkUrl: ann.linkUrl || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    const updated = announcements.filter((a) => a.id !== id);
    await saveAndPublish(updated, "Announcement removed successfully.");
    if (editingId === id) {
      handleResetForm();
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const updated = announcements.map((a) => (a.id === id ? { ...a, active: !currentActive } : a));
    await saveAndPublish(
      updated,
      currentActive ? "Announcement disabled." : "Announcement enabled and live!"
    );
  };

  const handleResetForm = () => {
    setEditingId(null);
    setFormData({
      title: "",
      message: "",
      type: "INFO",
      startAt: "",
      endAt: "",
      active: true,
      marquee: true,
      priority: 5,
      targetScope: "ALL",
      targetSchoolIds: [],
      targetPublicArea: "ALL",
      linkText: "",
      linkUrl: "",
    });
  };

  const handleSchoolToggle = (schoolId: string) => {
    const current = formData.targetSchoolIds || [];
    if (current.includes(schoolId)) {
      setFormData({
        ...formData,
        targetSchoolIds: current.filter((id) => id !== schoolId),
      });
    } else {
      setFormData({
        ...formData,
        targetSchoolIds: [...current, schoolId],
      });
    }
  };

  // Filtered Schools for Picker
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools.slice(0, 15);
    const q = schoolSearch.toLowerCase();
    return schools
      .filter((s) => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .slice(0, 15);
  }, [schools, schoolSearch]);

  // Computed Stats
  const nowMs = Date.now();
  const stats = useMemo(() => {
    let active = 0;
    let scheduled = 0;
    let expired = 0;
    let archived = 0;

    announcements.forEach((a) => {
      const status = computeAnnouncementStatus(a, nowMs);
      if (status === "ACTIVE") active++;
      else if (status === "SCHEDULED") scheduled++;
      else if (status === "EXPIRED") expired++;
      else archived++;
    });

    return { total: announcements.length, active, scheduled, expired, archived };
  }, [announcements, nowMs]);

  // Live Preview Object
  const previewAnnouncementObj: CmsAnnouncement = {
    id: editingId || "preview_ann",
    title: formData.title || "ADMISSION SEASON 2026-27",
    message: formData.message || "Online registration is now open for Grades Nursery through XII. Early bird discount applies!",
    type: formData.type || "INFO",
    startAt: formData.startAt ? new Date(formData.startAt).toISOString() : new Date().toISOString(),
    endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
    active: formData.active ?? true,
    marquee: formData.marquee ?? true,
    priority: Number(formData.priority) || 1,
    targetScope: formData.targetScope || "ALL",
    targetSchoolIds: formData.targetSchoolIds || [],
    targetPublicArea: formData.targetPublicArea || "ALL",
    linkText: formData.linkText || "Apply Online",
    linkUrl: formData.linkUrl || "#",
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans text-slate-900 dark:text-slate-100">
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-50 via-pink-50 to-indigo-50 dark:from-rose-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-rose-200/80 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold uppercase tracking-wider shadow-xs">
            <Megaphone className="h-3.5 w-3.5" />
            <span>Platform Announcement Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Top Announcement Banner Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Control live ticker announcements across public websites and authenticated school portals. Guaranteed single-line fixed compact height with smooth horizontal marquee animation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          <Link
            href="/super-admin/site-settings"
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Sliders className="h-4 w-4 text-purple-600" />
            <span>Site Settings (CMS)</span>
          </Link>
        </div>
      </div>

      {/* 2. Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Currently Active</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.active}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Live on public / portal banners</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-bold">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Scheduled</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.scheduled}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Will go live on start date</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-bold">
            <XCircle className="h-4 w-4 text-rose-500" />
            <span>Expired / Inactive</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.expired + stats.archived}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Past expiry date or turned off</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-bold">
            <Megaphone className="h-4 w-4 text-purple-500" />
            <span>Total Configured</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Global announcements database</p>
        </div>
      </div>

      {/* 3. Live Interactive Preview Box */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Live Preview: Single-Line Top Banner
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              formData.marquee ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}>
              {formData.marquee ? "Horizontal Marquee Ticker: ON" : "Static Line (Overflow Ticker Protected)"}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Guaranteed single-line compact height (32-36px). Fixed left icon, smooth continuous horizontal marquee, pause-on-hover, and fixed right close button.
        </p>

        {/* Live Banner Mounted Here */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
          <AnnouncementBanner previewAnnouncement={previewAnnouncementObj} />
        </div>
      </div>

      {/* 4. Create / Edit Announcement Form */}
      <form onSubmit={handleSubmitForm} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? "Edit Announcement" : "Create New Announcement"}
              </h3>
              <p className="text-xs text-slate-500">
                {editingId ? "Modify existing announcement properties below." : "Configure banner copy, dates, visual style, targeting, and marquee ticker."}
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Announcement Title * <span className="text-slate-400 font-normal">(Bold prefix)</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ADMISSION OPEN 2026-27 or SYSTEM MAINTENANCE"
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          {/* Type / Style */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Announcement Type / Color Style
            </label>
            <select
              value={formData.type || "INFO"}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as AnnouncementType })}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="INFO">Info (Vibrant Blue)</option>
              <option value="PROMO">Promotion / Admissions (Emerald Green)</option>
              <option value="WARNING">Warning / Notice (Amber Orange)</option>
              <option value="ALERT">Urgent / Emergency Alert (Rose Red)</option>
            </select>
          </div>
        </div>

        {/* Message */}
        <div className="text-xs">
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            Announcement Message * <span className="text-slate-400 font-normal">(Displayed in the single-line banner)</span>
          </label>
          <textarea
            rows={2}
            required
            placeholder="Enter the announcement copy that will scroll horizontally on the banner..."
            value={formData.message || ""}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Timing, Marquee & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Start Date & Time <span className="text-slate-400 font-normal">(Live from)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.startAt || ""}
              onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Expiry Date & Time <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="datetime-local"
              value={formData.endAt || ""}
              onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Display Priority <span className="text-slate-400 font-normal">(1 to 10)</span>
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={formData.priority ?? 5}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 1 })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Marquee / Ticker Mode
            </label>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, marquee: !formData.marquee })}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between font-bold transition-all cursor-pointer ${
                formData.marquee
                  ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300"
                  : "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              <span>{formData.marquee ? "Ticker ON" : "Static OFF"}</span>
              {formData.marquee ? (
                <ToggleRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Targeting Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Target Audience / Scope
            </label>
            <select
              value={formData.targetScope || "ALL"}
              onChange={(e) => setFormData({ ...formData, targetScope: e.target.value as "ALL" | "SELECTED" })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Schools & Public Visitors (Global)</option>
              <option value="SELECTED">Selected Schools Only</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Display Area
            </label>
            <select
              value={formData.targetPublicArea || "ALL"}
              onChange={(e) => setFormData({ ...formData, targetPublicArea: e.target.value as any })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Pages (Portals + Homepage + Pricing)</option>
              <option value="PORTALS">Portals Only (Admin, Teacher, Student)</option>
              <option value="HOMEPAGE">Homepage Only</option>
              <option value="PRICING">Pricing Page Only</option>
            </select>
          </div>
        </div>

        {/* Selected Schools Multi-Select Box (Rendered when targetScope === "SELECTED") */}
        {formData.targetScope === "SELECTED" && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-200 block">
                  Target Schools Selection ({formData.targetSchoolIds?.length || 0} selected)
                </label>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Only authenticated users logged into these schools will see this announcement.
                </p>
              </div>

              {formData.targetSchoolIds && formData.targetSchoolIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, targetSchoolIds: [] })}
                  className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* School Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search school by name, code, or ID..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* School Chips / Checkbox List */}
            <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {filteredSchools.map((s) => {
                const isSelected = formData.targetSchoolIds?.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSchoolToggle(s.id)}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-700 shadow-2xs"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="truncate text-[11px]">
                      <p className="font-bold truncate">{s.name}</p>
                      <p className={`text-[9px] truncate ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                        {s.code ? `Code: ${s.code}` : `ID: ${s.id.slice(0, 10)}...`}
                      </p>
                    </div>
                    {isSelected ? <Check className="h-4 w-4 shrink-0 text-white" /> : <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Optional Action Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Action Link Text <span className="text-slate-400 font-normal">(Optional, e.g. "Learn More")</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Register Now, Download Circular, View Details"
              value={formData.linkText || ""}
              onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Action Link URL <span className="text-slate-400 font-normal">(Optional, e.g. "/admissions")</span>
            </label>
            <input
              type="text"
              placeholder="e.g. /admissions, /pricing, https://..."
              value={formData.linkUrl || ""}
              onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bottom Form Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, active: !formData.active })}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                formData.active
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                  : "bg-slate-100 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{formData.active ? "Enabled (Active)" : "Disabled (Inactive)"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{editingId ? "Save & Publish Update" : "Save & Publish Announcement"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 5. Existing Announcements Table */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Configured Announcements ({announcements.length})
            </h3>
            <p className="text-xs text-slate-500">
              Manage active, scheduled, and past announcements across the network.
            </p>
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Megaphone className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No announcements configured</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Use the form above to publish your first platform-wide banner announcement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="pb-3 pl-2">Type & Priority</th>
                  <th className="pb-3">Title & Message</th>
                  <th className="pb-3">Schedule</th>
                  <th className="pb-3">Targeting</th>
                  <th className="pb-3">Ticker</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {announcements.map((ann) => {
                  const status = computeAnnouncementStatus(ann, nowMs);

                  const typePill = {
                    INFO: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
                    PROMO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
                    WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    ALERT: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                  }[ann.type || "INFO"];

                  const statusPill = {
                    ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800",
                    SCHEDULED: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800",
                    EXPIRED: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700",
                    ARCHIVED: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-800",
                    DRAFT: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800",
                  }[status];

                  return (
                    <tr key={ann.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Type & Priority */}
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${typePill}`}>
                            {ann.type || "INFO"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            P:{ann.priority ?? 1}
                          </span>
                        </div>
                      </td>

                      {/* Title & Message */}
                      <td className="py-3.5 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{ann.title}</p>
                        <p className="text-slate-500 dark:text-slate-400 truncate text-[11px] mt-0.5">
                          {ann.message}
                        </p>
                        {ann.linkUrl && (
                          <span className="text-[10px] text-blue-600 font-bold inline-flex items-center gap-0.5 mt-0.5">
                            <span>Link: {ann.linkText || ann.linkUrl}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 text-[11px]">
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {ann.startAt ? new Date(ann.startAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Immediate"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {ann.endAt ? `Expires ${new Date(ann.endAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "No expiration"}
                        </p>
                      </td>

                      {/* Targeting */}
                      <td className="py-3.5 text-[11px]">
                        {ann.targetScope === "SELECTED" ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px]">
                            {ann.targetSchoolIds?.length || 0} Schools
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                            All Schools
                          </span>
                        )}
                      </td>

                      {/* Ticker */}
                      <td className="py-3.5 text-[11px]">
                        {ann.marquee !== false ? (
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px]">Marquee Ticker</span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Static Line</span>
                        )}
                      </td>

                      {/* Status & Quick Toggle */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusPill}`}>
                            {status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(ann.id, ann.active)}
                            disabled={saving}
                            className="cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={ann.active ? "Click to disable" : "Click to enable"}
                          >
                            {ann.active ? (
                              <ToggleRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(ann)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                            title="Edit announcement"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(ann.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete announcement"
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
        )}
      </div>
    </div>
  );
}
