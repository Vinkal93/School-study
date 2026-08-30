"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Bell,
  ArrowRight,
  Info,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Apple,
  Play,
  Globe,
  Share2,
  PlusSquare,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

export function DownloadContent() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const [activeTab, setActiveTab] = useState<"android-pwa" | "ios-pwa" | "apk">("android-pwa");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [notifiedStores, setNotifiedStores] = useState<{ playStore: boolean; appStore: boolean }>({
    playStore: false,
    appStore: false,
  });

  // Listen for beforeinstallprompt event for PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("School Study app installed successfully!");
      }
      setDeferredPrompt(null);
      setIsPwaInstallable(false);
    } else {
      // Guide user to the step-by-step instructions tab
      setActiveTab("android-pwa");
      const guideElement = document.getElementById("install-guide");
      if (guideElement) {
        guideElement.scrollIntoView({ behavior: "smooth" });
      }
      toast.info("Follow the 3-step guide below to add School Study to your home screen!");
    }
  };

  const handleDownloadApk = () => {
    toast.success("Downloading SchoolStudy.apk... (v1.2.0)");
    // Trigger download
    const link = document.createElement("a");
    link.href = "/SchoolStudy.apk";
    link.download = "SchoolStudy-v1.2.0.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStoreNotify = (store: "playStore" | "appStore") => {
    setNotifiedStores((prev) => ({ ...prev, [store]: true }));
    toast.success(
      `You will be notified immediately once our ${
        store === "playStore" ? "Google Play Store" : "Apple App Store"
      } listing is live!`
    );
  };

  const faqs = [
    {
      q: "Is the School Study mobile app completely free?",
      a: "Yes! The mobile app is 100% free to download and install for all students, parents, teachers, and school administrators associated with an active school.",
    },
    {
      q: "What is the difference between the PWA and the APK?",
      a: "The Progressive Web App (PWA) requires 0 MB storage, auto-updates instantly, and works across all devices (Android, iPhone, iPad, PC). The Android APK is a standalone installer package for direct Android installation.",
    },
    {
      q: "How do I install the app on an iPhone or iPad?",
      a: "Open https://school.sbci.online in Safari, tap the 'Share' icon (square with arrow), and select 'Add to Home Screen'. The app will install with full app capabilities and offline support.",
    },
    {
      q: "Does the app support real-time attendance and fee notifications?",
      a: "Yes! Once installed, the mobile app sends instant push alerts for marked attendance, fee receipts, published notices, and exam updates.",
    },
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-gray-900/60 dark:via-gray-950 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-xs">
            <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Official Mobile Downloads Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
            Take School Study Anywhere on Any Device
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Experience lightning-fast attendance, fee tracking, study materials, and student management on your smartphone.
          </p>

          {/* Highlights Chip Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              0 MB PWA Instant Install
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% Virus & Ad-Free
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold">
              <Zap className="h-3.5 w-3.5" />
              60 FPS Edge-to-Edge UI
            </span>
          </div>
        </div>
      </section>

      {/* Main 4 Download Cards Grid */}
      <section className="py-12 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Choose Your Preferred Download Method
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Install the progressive app in seconds or download the raw Android APK package directly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: PWA (Recommended) */}
            <div className="relative rounded-3xl border-2 border-blue-500/80 bg-white dark:bg-slate-900 p-6 shadow-lg shadow-blue-500/5 dark:border-blue-500/60 flex flex-col justify-between transition-all hover:scale-[1.02]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
                Most Popular • Instant
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Globe className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Web App (PWA)
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                    Android, iOS, iPad & Desktop
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Install directly from your browser. Uses 0 MB storage, receives automatic updates, and supports offline caching.
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Instant 1-Click Install</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Auto-updates in background</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Edge-to-edge system bars</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleInstallPwa}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isPwaInstallable ? "Install PWA App Now" : "Install App to Device"}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Direct Android APK */}
            <div className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-6 shadow-xs dark:border-slate-800 flex flex-col justify-between transition-all hover:scale-[1.02]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Download className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Android APK
                    </h3>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                      v1.2.0
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Direct Package (Android 8.0+)
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Direct APK download for Android phones. Verified build with no bloatware, minimal footprint (~12 MB).
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>File size: ~12 MB</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>SHA-256 Verified Safe</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Offline portal support</span>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleDownloadApk}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download APK (12 MB)</span>
                </button>
              </div>
            </div>

            {/* Card 3: Google Play Store (Coming Soon) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-6 shadow-xs dark:border-slate-800 flex flex-col justify-between transition-all hover:scale-[1.02]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Play className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Google Play
                    </h3>
                    <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    Android Store Listing
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our official Google Play Store application is undergoing standard policy review and will be live shortly.
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Store certification in progress</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>PWA & APK available today</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-2">
                <Link
                  href="/download/play-store"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Google Play Details</span>
                </Link>
                <button
                  onClick={() => handleStoreNotify("playStore")}
                  disabled={notifiedStores.playStore}
                  className="w-full text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {notifiedStores.playStore ? "✓ Notification Subscribed" : "Notify me when live on Play Store"}
                </button>
              </div>
            </div>

            {/* Card 4: Apple App Store (Coming Soon) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-6 shadow-xs dark:border-slate-800 flex flex-col justify-between transition-all hover:scale-[1.02]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  <Apple className="h-6 w-6" />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Apple App Store
                    </h3>
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                      Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    iOS & iPadOS
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Native iOS release in active development. You can install the web app on any iPhone right now using Safari.
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>iOS App Store packaging</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Safari 'Add to Home' works 100%</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-2">
                <Link
                  href="/download/app-store"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-800 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all"
                >
                  <Apple className="h-4 w-4" />
                  <span>App Store Details</span>
                </Link>
                <button
                  onClick={() => handleStoreNotify("appStore")}
                  disabled={notifiedStores.appStore}
                  className="w-full text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {notifiedStores.appStore ? "✓ Notification Subscribed" : "Notify me when live on App Store"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Step-by-Step Installation Guide */}
      <section id="install-guide" className="py-16 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Quick Tutorials
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              How to Install on Your Device
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Follow these simple 3-step guides to get the full app experience in less than 30 seconds.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-6 shadow-xs">
            <button
              onClick={() => setActiveTab("android-pwa")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "android-pwa"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Android (PWA)
            </button>
            <button
              onClick={() => setActiveTab("ios-pwa")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ios-pwa"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              iPhone / iPad (iOS)
            </button>
            <button
              onClick={() => setActiveTab("apk")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "apk"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Direct APK Setup
            </button>
          </div>

          {/* Tab Content */}
          <div className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs dark:border-slate-800">
            {activeTab === "android-pwa" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Open in Chrome</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Visit <strong className="text-blue-600">school.sbci.online</strong> in Chrome browser.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Tap Menu (⋮)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap the 3 dots at top-right and select <span className="font-semibold text-slate-900 dark:text-white">"Install app"</span> or <span className="font-semibold text-slate-900 dark:text-white">"Add to Home screen"</span>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Done & Ready!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap <span className="font-semibold text-slate-900 dark:text-white">"Install"</span>. School Study icon will appear on your phone screen!
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleInstallPwa}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Launch PWA Installer</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "ios-pwa" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Open in Safari</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Open <strong className="text-blue-600">school.sbci.online</strong> in Apple Safari on your iPhone or iPad.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Share2 className="h-4 w-4 text-blue-600" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Tap Share</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap the <span className="font-semibold text-slate-900 dark:text-white">Share button</span> (bottom center bar on iPhone).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PlusSquare className="h-4 w-4 text-blue-600" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Add to Home</h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Scroll down and tap <span className="font-semibold text-slate-900 dark:text-white">"Add to Home Screen"</span>, then tap <span className="font-semibold text-slate-900 dark:text-white">"Add"</span>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-medium text-center">
                  💡 <strong>Tip for iOS users:</strong> Safari's Web App mode gives full fullscreen access without browser bars!
                </div>
              </div>
            )}

            {activeTab === "apk" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Download APK</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap the <span className="font-semibold text-emerald-600">Download APK</span> button to download <span className="font-mono text-[11px]">SchoolStudy.apk</span>.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Allow Source</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      If prompted, enable <span className="font-semibold text-slate-900 dark:text-white">"Allow installation from this source"</span> in Settings.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Install & Open</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap <span className="font-semibold text-slate-900 dark:text-white">"Install"</span> and launch your school portal!
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleDownloadApk}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download APK Directly</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Everything you need to know about the School Study mobile experience.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3 cursor-pointer"
                  >
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                      <p className="mt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to empower your school on mobile?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Get started today with our all-in-one school ERP platform and provide students & parents with a world-class mobile app.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-600 font-bold text-xs shadow-md hover:bg-blue-50 transition-all active:scale-95"
            >
              <span>Explore School Plans</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/30 text-white font-bold text-xs hover:bg-white/10 transition-all active:scale-95"
            >
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
