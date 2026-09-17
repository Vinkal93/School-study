"use client";

import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { WifiOff, Wifi } from "lucide-react";

export function NativeOfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    let handle: any = null;

    async function initNetwork() {
      try {
        const status = await Network.getStatus();
        setIsOffline(!status.connected);

        handle = await Network.addListener("networkStatusChange", (newStatus) => {
          if (!newStatus.connected) {
            setIsOffline(true);
            setWasOffline(true);
          } else {
            setIsOffline(false);
            // Hide the "back online" state after 3 seconds
            setTimeout(() => {
              setWasOffline(false);
            }, 3000);
          }
        });
      } catch {
        // Fallback for non-native browsers
        const handleOffline = () => {
          setIsOffline(true);
          setWasOffline(true);
        };
        const handleOnline = () => {
          setIsOffline(false);
          setTimeout(() => setWasOffline(false), 3000);
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
          window.removeEventListener("offline", handleOffline);
          window.removeEventListener("online", handleOnline);
        };
      }
    }

    initNetwork();

    return () => {
      if (handle) {
        handle.remove().catch(() => {});
      }
    };
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 pointer-events-none ${
        isOffline ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100"
      }`}
    >
      {isOffline ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-lg border border-amber-500 backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-200" />
          <span>You are offline. Reconnecting...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg border border-emerald-500 backdrop-blur-md animate-fade-in">
          <Wifi className="w-3.5 h-3.5 text-emerald-200" />
          <span>Back online</span>
        </div>
      )}
    </div>
  );
}
