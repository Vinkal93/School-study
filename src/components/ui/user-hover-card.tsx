"use client";

import React, { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, computeUserActivityStatus } from "./avatar";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

export interface UserProfileData {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role: "super_admin" | "school_admin" | "teacher" | "student" | string;
  schoolId?: string;
  schoolName?: string;
  avatarUrl?: string;
  status?: "ACTIVE" | "SUSPENDED" | "BLOCKED" | string;
  lastActiveAt?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  grade?: string;
  section?: string;
  rollNumber?: string;
  designation?: string;
}

export interface UserHoverCardProps {
  user: UserProfileData;
  children?: React.ReactNode;
  className?: string;
  showClickModal?: boolean;
}

export function UserHoverCard({
  user,
  children,
  className,
  showClickModal = true,
}: UserHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showClickModal) {
      setIsModalOpen(true);
      setIsHovered(false);
    }
  };

  const handleCopy = (text: string, field: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`Copied ${field} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const activity = computeUserActivityStatus(user.lastActiveAt);

  const roleColor = {
    super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    school_admin: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    teacher: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    student: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  }[user.role] || "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <div
        className={cn("relative inline-block cursor-pointer", className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleAvatarClick}
      >
        {children || (
          <Avatar size="default" className="hover:ring-2 hover:ring-blue-500 transition-all">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{initials}</AvatarFallback>
            <AvatarBadge status={activity.status} />
          </Avatar>
        )}

        {/* Hover Popover Box */}
        {isHovered && (
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 animate-in fade-in zoom-in-95 pointer-events-auto"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-start gap-3">
              <Avatar size="lg" className="shrink-0 ring-2 ring-slate-100 dark:ring-slate-800">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
                <AvatarBadge status={activity.status} />
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {user.name}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", roleColor)}>
                    {user.role.replace("_", " ")}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span className={cn("h-1.5 w-1.5 rounded-full", activity.badgeClass)} />
                    {activity.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {user.email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              {(user.schoolName || user.schoolId) && (
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.schoolName || `School: ${user.schoolId}`}</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-between">
              <span>Click to view full details</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </div>
        )}
      </div>

      {/* Complete User Detail Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <Avatar size="xl" className="ring-4 ring-blue-50 dark:ring-blue-950/60 shadow-md">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{initials}</AvatarFallback>
                <AvatarBadge status={activity.status} className="h-4 w-4" />
              </Avatar>

              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {user.name}
                  </h3>
                  <Badge variant={user.status === "BLOCKED" || user.status === "SUSPENDED" ? "destructive-light" : "success"}>
                    {user.status || "ACTIVE"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border", roleColor)}>
                    {user.role.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Status: <strong className="text-slate-700 dark:text-slate-300">{activity.label}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">User ID</span>
                <div className="flex items-center justify-between font-mono text-slate-800 dark:text-slate-200">
                  <span className="truncate">{user.uid}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCopy(user.uid, "User ID", e)}
                    className="p-1 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {copiedField === "User ID" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Email Address</span>
                <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                  <span className="truncate">{user.email || "N/A"}</span>
                  {user.email && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(user.email!, "Email", e)}
                      className="p-1 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {copiedField === "Email" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Phone Number</span>
                <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                  <span>{user.phone || "Not provided"}</span>
                  {user.phone && (
                    <button
                      type="button"
                      onClick={(e) => handleCopy(user.phone!, "Phone", e)}
                      className="p-1 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {copiedField === "Phone" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">School Affiliation</span>
                <div className="text-slate-800 dark:text-slate-200 truncate">
                  {user.schoolName || user.schoolId || "Global / Unassigned"}
                </div>
              </div>

              {user.grade && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Class & Section</span>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold">
                    Grade {user.grade} {user.section ? `• Section ${user.section}` : ""}
                  </div>
                </div>
              )}

              {user.rollNumber && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Roll Number</span>
                  <div className="text-slate-800 dark:text-slate-200 font-semibold">
                    {user.rollNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
