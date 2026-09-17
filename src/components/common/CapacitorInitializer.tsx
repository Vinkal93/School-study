"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { toast } from "sonner";
import { useNativePush } from "@/hooks/use-native-push";
import { setupGlobalDownloadInterceptor } from "@/lib/native/nativeDownload";
import { NativeOfflineBanner } from "./NativeOfflineBanner";

export function CapacitorInitializer() {
  // 1. Initialize FCM Push Notifications for Native Platforms
  useNativePush();

  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // 2. Setup Global Native Download Interceptor for blobs & exports
    const cleanupDownloads = setupGlobalDownloadInterceptor();

    // 3. Configure Status Bar with Light Theme and White Background
    try {
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#ffffff" }).catch(() => {});
    } catch {}

    // 4. Smoothly Fade Out Native Splash Screen (eliminates black/white flashes)
    try {
      SplashScreen.hide({ fadeOutDuration: 350 }).catch(() => {});
    } catch {}

    // 5. Intelligent Android Back Navigation
    let backHandle: { remove: () => Promise<void> } | null = null;
    try {
      CapApp.addListener("backButton", ({ canGoBack }) => {
        // A. If an open modal/dialog or drawer exists, close it first
        const openModal = document.querySelector(
          '[role="dialog"], [data-state="open"], .fixed.inset-0:not(.pointer-events-none)'
        );
        if (openModal) {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
          return;
        }

        const path = window.location.pathname;
        const isRoot =
          path === "/" ||
          path === "/login" ||
          path === "/student-login" ||
          path === "/teacher-login" ||
          path === "/admin/login" ||
          path === "/super-admin-login" ||
          path === "/student" ||
          path === "/teacher" ||
          path === "/admin";

        // B. If not at root, navigate back in history
        if (!isRoot && (canGoBack || window.history.length > 1)) {
          window.history.back();
          return;
        }

        // C. At root screen: double-tap back to exit
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          toast("Press back again to exit School Study", {
            duration: 2000,
          });
        }
      }).then((handle) => {
        backHandle = handle;
      });
    } catch {}

    return () => {
      cleanupDownloads();
      if (backHandle) {
        backHandle.remove().catch(() => {});
      }
    };
  }, []);

  return <NativeOfflineBanner />;
}
