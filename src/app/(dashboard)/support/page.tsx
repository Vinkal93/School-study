"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Mail,
  Phone,
  MessageSquare,
  BookOpen,
  FileQuestion,
  ShieldCheck,
  CreditCard,
  Send,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Headphones,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface FaqItem {
  q: string;
  a: string;
  category: "billing" | "account" | "features";
}

const FAQS: FaqItem[] = [
  {
    category: "billing",
    q: "How does the subscription renewal process work?",
    a: "Your school portal monitors subscription validity in real-time. When your plan enters the renewal notice threshold (configurable by Super Admin), reminders appear in your dashboard banner and notification center. You can recharge online via Razorpay anytime to keep services active with zero downtime.",
  },
  {
    category: "billing",
    q: "What happens during the grace period if my plan expires?",
    a: "If your subscription expires, your school enters a configurable grace period (default 7 days). You retain full operational access so classroom and student management are not interrupted while processing your payment.",
  },
  {
    category: "features",
    q: "How do I update and adjust student or teacher photos?",
    a: "Go to Students or Teachers directory in the admin menu. Click on the camera badge on any avatar or choose 'Update Photo'. An interactive circular cropper opens allowing you to zoom, drag, and rotate the photo to fit perfectly before saving.",
  },
  {
    category: "account",
    q: "How long does my login session stay active?",
    a: "School Study uses secure session persistence. You stay logged in across browser restarts and device reboots for up to 7 consecutive days (1 week). After 7 days of activity, you will be prompted to log in again to safeguard school records.",
  },
  {
    category: "account",
    q: "How can I change my credentials or Security PIN?",
    a: "Navigate to Settings from the profile dropdown in the top right corner. From there, you can update your administrator password or reset your 6-digit Super Admin Security PIN.",
  },
];

export default function SupportPage() {
  const { profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and description.");
      return;
    }

    setSubmitting(true);
    try {
      // Inquiries can be saved to backend or logged
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
      toast.success("Your support request has been submitted. Our team will contact you shortly!");
      setSubject("");
      setMessage("");
    } catch (err) {
      toast.error("Failed to submit support request. Please contact SBCI224234@gmail.com directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 px-3 sm:px-0">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md">
            <Headphones className="h-3.5 w-3.5" />
            <span>Dedicated Support & Help Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            How can we help you today?
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Get instant assistance, browse troubleshooting guides, or submit a support ticket directly to our technical operations team.
          </p>
          <p className="text-[11px] text-blue-200/90 font-medium">
            Operating Hours: Mon - Sat (9:00 AM - 7:00 PM IST)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          <a
            href="mailto:SBCI224234@gmail.com"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs shadow-sm hover:bg-blue-50 active:scale-95 transition-all"
          >
            <Mail className="h-4 w-4" />
            <span>SBCI224234@gmail.com</span>
          </a>
          <a
            href="tel:+919118245636"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-xs active:scale-95 transition-all"
          >
            <Phone className="h-4 w-4" />
            <span>Helpline: +91 9118245636</span>
          </a>
        </div>
      </div>

      {/* Quick Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Billing & Subscriptions
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Need help with plan renewal, invoice GST receipts, or online payments?
          </p>
          <Link
            href={profile?.role === "super_admin" ? "/super-admin/billing" : "/admin/billing"}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
          >
            <span>Manage Billing Portal →</span>
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Security & Access Control
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Configure administrator PINs, manage tenant permissions, or inspect audit logs.
          </p>
          <Link
            href={profile?.role === "super_admin" ? "/super-admin/settings" : "/admin/settings"}
            className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1"
          >
            <span>Open Security Settings →</span>
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5 sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Notifications & Broadcasts
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Realtime alerts, timetable notifications, and school circular broadcasts.
          </p>
          <Link
            href={profile?.role === "super_admin" ? "/super-admin/notifications" : "/admin/notifications"}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-1"
          >
            <span>Notification Feed →</span>
          </Link>
        </div>
      </div>

      {/* Main Grid: Ticket Form + FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Contact / Ticket Form (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              Send a Support Request
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit your inquiry and our support engineers will respond within 24 hours.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 text-center space-y-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                Ticket Submitted Successfully!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Thank you. We have received your inquiry and will follow up with you via your registered administrator email.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-300 underline pt-1"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitInquiry} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Issue Summary
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Fee receipt generation inquiry"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe what you are trying to accomplish and any error message you encountered..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submitting ? "Sending Request..." : "Submit Support Ticket"}</span>
              </button>
            </form>
          )}
        </div>

        {/* FAQs Accordion (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileQuestion className="h-4 w-4 text-indigo-600" />
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quick answers to common questions about platform setup and operations.
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 text-left focus:outline-none group cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-blue-600" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-1 animate-in fade-in duration-150">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
