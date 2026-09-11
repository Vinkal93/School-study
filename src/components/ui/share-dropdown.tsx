"use client";

import React, { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, Download, Printer, Mail, MessageSquare } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

export interface ShareItemData {
  type: "fee_receipt" | "student_detail" | "teacher_detail" | "complaint" | string;
  title: string;
  id: string;
  url?: string;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
}

export interface ShareDropdownProps {
  item: ShareItemData;
  className?: string;
}

export function ShareDropdown({ item, className }: ShareDropdownProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const shareUrl = item.url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => {
      setCopied(false);
      setOpen(false);
    }, 1200);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`School Study - ${item.title}: ${shareUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    setOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(item.title);
    const body = encodeURIComponent(`Please find the requested details here: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  return (
    <div ref={menuRef} className={cn("relative inline-block", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 text-xs font-semibold px-2.5 h-8"
        title="Share"
      >
        <Share2 className="h-3.5 w-3.5 text-slate-500" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="font-bold text-slate-900 dark:text-white truncate block">
              Share {item.type.replace("_", " ")}
            </span>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
            >
              <span className="flex items-center gap-2">
                <Copy className="h-3.5 w-3.5 text-slate-400" />
                <span>Copy link</span>
              </span>
              {copied && <Check className="h-3.5 w-3.5 text-emerald-500" />}
            </button>

            {item.onDownloadPdf && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onDownloadPdf?.();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
              >
                <Download className="h-3.5 w-3.5 text-blue-500" />
                <span>Download PDF</span>
              </button>
            )}

            {item.onPrint && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onPrint?.();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>Print Document</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer text-left font-medium"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Share via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleEmail}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left font-medium"
            >
              <Mail className="h-3.5 w-3.5 text-purple-500" />
              <span>Send Email</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
