"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, Loader2, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface StudentAvatarProps {
  fullName: string;
  photoUrl?: string;
  onClick?: () => void;
  email?: string;
  className?: string;
  sectionName?: string;
}

export function StudentAvatar({
  fullName,
  photoUrl,
  onClick,
  email,
  className: studentClass,
  sectionName,
}: StudentAvatarProps) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = fullName || profile?.name || "Student";
  const displayEmail = email || profile?.email || "";
  const initialLetter = displayName.trim().charAt(0).toUpperCase() || "S";
  const studentClassName = studentClass || (profile as any)?.className || "";
  const studentSection = sectionName || (profile as any)?.sectionName || "";

  // Close on outside click and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast.success("Logged out successfully");
      setIsOpen(false);
      router.push("/student/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Failed to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleToggle = () => {
    if (onClick) {
      onClick();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`User menu for ${displayName}`}
        aria-expanded={isOpen}
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 bg-slate-200 dark:bg-slate-800 cursor-pointer"
      >
        {photoUrl && !imageError ? (
          <img
            src={photoUrl}
            alt={`${displayName}'s profile`}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center rounded-full">
            {initialLetter}
          </div>
        )}
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-64 origin-top-right rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black/5 dark:ring-white/10 border border-slate-100 dark:border-slate-800 z-50 p-2 divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Header Details */}
          <div className="px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                {displayName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                <GraduationCap className="h-2.5 w-2.5" />
                Student
              </span>
            </div>
            {displayEmail && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayEmail}</p>
            )}
            {(studentClassName || studentSection) && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Class: {studentClassName} {studentSection && `(Sec ${studentSection})`}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          <div className="py-1.5 space-y-0.5">
            <Link
              href="/student/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="h-4 w-4 text-slate-400" />
              <span>My Profile</span>
            </Link>

            <Link
              href="/student/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Logout Action */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-2.5">
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                ) : (
                  <LogOut className="h-4 w-4 text-red-600" />
                )}
                <span>{loggingOut ? "Signing out..." : "Log Out"}</span>
              </div>
              <span className="text-[10px] text-red-400 font-medium">Exit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
