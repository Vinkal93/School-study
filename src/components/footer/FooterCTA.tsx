"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Send, Smartphone, Globe, Check } from "lucide-react";

export function FooterCTA() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setEmail("");
    }
  };

  return (
    <div className="relative mt-12 overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 dark:bg-slate-900/90 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* LEFT SECTION: Take School Study Anywhere */}
        <div className="lg:col-span-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Mini Phone Graphic */}
          <div className="relative w-24 h-32 bg-blue-600 rounded-2xl p-1.5 shadow-lg flex-shrink-0 flex flex-col justify-between items-center text-white">
            <div className="w-6 h-1 bg-white/40 rounded-full mx-auto" />
            <div className="w-full h-20 bg-white dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center p-1 text-center shadow-inner">
              <span className="text-sm">🎓</span>
              <span className="text-[7px] font-black text-slate-900 dark:text-white mt-0.5">School Study</span>
            </div>
            <div className="w-3 h-3 rounded-full border border-white/60 mx-auto" />
          </div>

          {/* Text & Download Buttons */}
          <div className="space-y-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Take School Study Anywhere
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Access powerful features on the go. Fast, secure & always with you.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <Link
                href="/download"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span>🤖</span>
                <span>Download APK</span>
              </Link>

              <Link
                href="/download"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Open in PWA</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Divider on Desktop */}
        <div className="hidden lg:block lg:col-span-1 flex justify-center">
          <div className="w-px h-20 bg-slate-200 dark:bg-slate-800 mx-auto" />
        </div>

        {/* RIGHT SECTION: Stay Updated */}
        <div className="lg:col-span-5 flex items-start gap-4">
          {/* Purple Paper Airplane Icon */}
          <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-1">
            <Send className="h-5 w-5" />
          </div>

          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Stay Updated
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Subscribe to our newsletter for product updates, features and education insights.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                {subscribed ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <span>Subscribe</span>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
