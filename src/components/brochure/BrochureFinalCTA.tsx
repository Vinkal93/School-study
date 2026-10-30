"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  ArrowRight,
  School,
  Sparkles,
  QrCode,
  CheckCircle2,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BROCHURE_CONTACT, BROCHURE_SECTIONS } from "@/lib/cms/brochureData";
import { BrochureDownloadButton } from "./BrochureDownloadButton";
import { generateQRCodeSVG } from "@/lib/utils/qr-code";

export function BrochureFinalCTA() {
  const section = BROCHURE_SECTIONS.finalCta;
  const qrSvg = generateQRCodeSVG(BROCHURE_CONTACT.brochureUrl, {
    size: 130,
    color: "#102A43",
    bgColor: "#ffffff",
    quietZone: 2,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    schoolName: "",
    city: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/super-admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          schoolName: form.schoolName.trim(),
          organization: form.schoolName.trim(),
          city: form.city.trim(),
          location: form.city.trim(),
          message: form.message.trim() || "Requested 1-on-1 guided live demo from Digital Brochure.",
          source: "Digital Brochure Page",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit inquiry. Please reach us via WhatsApp or Phone.");
      }

      setSubmitted(true);
      setForm({ name: "", phone: "", email: "", schoolName: "", city: "", message: "" });
    } catch (err: unknown) {
      console.warn("Inquiry submission fallback:", err);
      // If network or endpoint fails, prefill WhatsApp link
      const encodedMsg = encodeURIComponent(
        `Hello School Study Team, I am ${form.name} from ${form.schoolName} (${form.city}). I would like to schedule a live demo of School Study. Phone: ${form.phone}`
      );
      window.open(`https://wa.me/${BROCHURE_CONTACT.whatsappNumber}?text=${encodedMsg}`, "_blank");
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    {
      step: "01",
      title: "Schedule a Guided Demo",
      desc: "Connect with our implementation team on WhatsApp or phone to see the platform configured for your school's exact structure.",
    },
    {
      step: "02",
      title: "Bulk Upload Rosters",
      desc: "Upload your existing student and teacher rosters in minutes using our intuitive Excel/CSV onboarding tool.",
    },
    {
      step: "03",
      title: "Go Live in 24 Hours",
      desc: "Distribute logins to faculty, start 1-tap attendance roll-call, and issue official fee receipts without disruption.",
    },
  ];

  return (
    <section
      id="section-12-cta"
      className="py-12 sm:py-20 border-t border-slate-200/80 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Section 12 • Getting Started & Direct Contacts</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {section.title}
          </h2>

          <p className="text-sm sm:text-base font-semibold text-teal-700 dark:text-teal-400">
            {section.subtitle}
          </p>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {section.description}
          </p>
        </div>

        {/* 3-Step Roadmap Banner */}
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 mb-12 shadow-xl border border-slate-800">
          <div className="max-w-2xl mb-6">
            <span className="text-xs font-extrabold text-teal-400 tracking-wider uppercase block">
              Rapid Institutional Onboarding
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              Your 3-Step Path to a Completely Modern School
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((st, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 backdrop-blur-sm"
              >
                <div className="text-2xl font-black text-sky-400">{st.step}</div>
                <h4 className="text-sm font-bold text-white">{st.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid: Left Contacts & Form, Right QR & Action Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Contact Cards + Demo Request Form */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3 Official Contact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href={BROCHURE_CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100/60 transition-colors group block"
              >
                <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  WhatsApp Support
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                  {BROCHURE_CONTACT.phoneDisplay}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1">
                  Instant Reply
                </span>
              </a>

              <a
                href={`tel:${BROCHURE_CONTACT.phone}`}
                className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 hover:bg-blue-100/60 transition-colors group block"
              >
                <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 block">
                  Direct Phone Call
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white block mt-0.5">
                  {BROCHURE_CONTACT.phoneDisplay}
                </span>
                <span className="text-[10px] text-blue-700 dark:text-blue-400 block mt-1">
                  Mon-Sat: 9am-7pm
                </span>
              </a>

              <a
                href={`mailto:${BROCHURE_CONTACT.email}?subject=School%20Study%20Product%20Inquiry`}
                className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100/60 transition-colors group block"
              >
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 block">
                  Official Email
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white block mt-0.5 truncate">
                  {BROCHURE_CONTACT.email}
                </span>
                <span className="text-[10px] text-indigo-700 dark:text-indigo-400 block mt-1">
                  24h Response
                </span>
              </a>
            </div>

            {/* Quick Demo Booking Form Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 sm:p-7 shadow-xs">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Request a 1-on-1 Guided Demo & Pricing Quote
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                Our education specialist will arrange a live walkthrough via Google Meet or WhatsApp screen-share.
              </p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thank You! We Have Received Your Demo Request.
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Our team will contact you at your phone number within a few hours. For immediate assistance, feel free to ping us directly on WhatsApp at {BROCHURE_CONTACT.phoneDisplay}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="brochure-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        id="brochure-name"
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Dr. Ramesh Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="brochure-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Phone / WhatsApp *
                      </label>
                      <input
                        id="brochure-phone"
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="brochure-school" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        School / Institution Name *
                      </label>
                      <input
                        id="brochure-school"
                        type="text"
                        required
                        value={form.schoolName}
                        onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                        placeholder="e.g. St. Xavier's Academy"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="brochure-city" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        City / State
                      </label>
                      <input
                        id="brochure-city"
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="e.g. Lucknow, Uttar Pradesh"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="brochure-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Official Email Address
                    </label>
                    <input
                      id="brochure-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="principal@school.edu.in"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="brochure-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Specific Requirements / Student Strength
                    </label>
                    <textarea
                      id="brochure-notes"
                      rows={2}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="e.g. We have ~650 students and want to automate attendance and monthly fee collection."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all disabled:opacity-75"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Demo Request...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Live Demo Request</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Download Brochure Card & Location Info */}
          <div className="lg:col-span-5 space-y-6">
            {/* Download Brochure Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-slate-900/90 dark:via-slate-950 dark:to-teal-950/40 p-6 sm:p-7 shadow-lg space-y-5">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/70 px-2.5 py-1 rounded-full">
                  Offline Reference
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Download Official Vector PDF Brochure
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Get the complete 12-page vector PDF brochure covering all modules, comparison matrix, pricing tiers, and contact details for institutional board review.
                </p>
              </div>

              <BrochureDownloadButton className="w-full" />

              {/* QR Code inside CTA */}
              <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-4">
                <div
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                  className="h-20 w-20 flex-shrink-0 rounded-xl bg-white p-1 shadow-inner border border-slate-200"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Share With School Board
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                    Scan or share this QR code directly with committee members or trustees.
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">
                    school.sbci.online/brochure
                  </span>
                </div>
              </div>
            </div>

            {/* Office & Operations Card */}
            <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/60 p-6 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Platform Operations & Headquarters
              </h4>
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{BROCHURE_CONTACT.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>{BROCHURE_CONTACT.workingHours}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Ready to start immediately?
                </span>
                <Link
                  href="/register"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Register School Now</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
