"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Copy,
  Check,
  ShieldAlert,
  Edit,
  ExternalLink,
  Ban,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export interface UserContextMenuProps {
  user: {
    uid: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    status?: string;
    schoolId?: string;
  };
  children: React.ReactNode;
  onViewDetails?: () => void;
  className?: string;
}

export function UserContextMenu({
  user,
  children,
  onViewDetails,
  className,
}: UserContextMenuProps) {
  const router = useRouter();
  const { profile, impersonateUser } = useAuth();
  const isSuperAdmin = profile?.role === "super_admin";

  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 260);
    setPosition({ x, y });
    setVisible(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };

    if (visible) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => {
      setCopiedField(null);
      setVisible(false);
    }, 800);
  };

  const handleImpersonate = async () => {
    setVisible(false);
    if (!isSuperAdmin) return;
    try {
      await impersonateUser(user as any);
      toast.success(`Entered live mode as ${user.name}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to enter live mode");
    }
  };

  return (
    <div onContextMenu={handleContextMenu} className={cn("relative", className)}>
      {children}

      {visible && (
        <div
          ref={menuRef}
          style={{ top: position.y, left: position.x }}
          className="fixed z-[9999] w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 animate-in fade-in zoom-in-95 text-xs select-none"
        >
          {/* User Header Summary */}
          <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400 capitalize truncate">{user.role.replace("_", " ")}</p>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                onViewDetails?.();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
            >
              <User className="h-3.5 w-3.5 text-blue-600" />
              <span>View Profile Details</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(user.uid, "User ID")}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
            >
              <span className="flex items-center gap-2.5">
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy User ID</span>
              </span>
              {copiedField === "User ID" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            </button>

            {user.email && (
              <button
                type="button"
                onClick={() => handleCopy(user.email!, "Email")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
              >
                <span className="flex items-center gap-2.5">
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy Email</span>
                </span>
                {copiedField === "Email" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
              </button>
            )}

            {user.phone && (
              <button
                type="button"
                onClick={() => handleCopy(user.phone!, "Phone")}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
              >
                <span className="flex items-center gap-2.5">
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy Phone</span>
                </span>
                {copiedField === "Phone" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
              </button>
            )}

            {isSuperAdmin && user.role !== "super_admin" && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={handleImpersonate}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer text-left font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Impersonate User</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
