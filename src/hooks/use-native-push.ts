"use client";

import { useContext, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from "@capacitor/push-notifications";
import { AuthContext } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFirebaseDb } from "@/lib/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * Initializes Native FCM Push Notifications on Android/iOS via Capacitor
 * Registers FCM token to School Study backend (including teacher devices)
 * Handles Android 13+ permission prompts, notification tap routing, and foreground alerts.
 */
export function useNativePush() {
  const authContext = useContext(AuthContext);
  const profile = authContext?.profile ?? null;
  const router = useRouter();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isMounted = true;

    async function initPush() {
      try {
        // 1. Check & Request Notification Permissions (Android 13+ support)
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          console.warn("FCM push notification permission not granted:", permStatus.receive);
          return;
        }

        // 2. Register Device with APNs / FCM
        await PushNotifications.register();

        // 3. Listener: Registration Token Received
        await PushNotifications.addListener("registration", async (token: Token) => {
          if (!isMounted || !token.value) return;

          // Prevent duplicate registration calls for the same token
          if (registeredTokenRef.current === token.value) return;
          registeredTokenRef.current = token.value;

          try {
            localStorage.setItem("school_study_fcm_token", token.value);
          } catch {}

          // Register token with backend if user profile is loaded
          if (profile?.uid && profile?.schoolId) {
            await syncDeviceTokenWithBackend(token.value, profile);
          }
        });

        // 4. Listener: Registration Error
        await PushNotifications.addListener("registrationError", (err: any) => {
          console.warn("FCM registration error:", err);
        });

        // 5. Listener: Foreground Notification Received
        await PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
          const actionUrl = (notification.data?.url || notification.data?.link) as string | undefined;

          toast(notification.title || "School Study Notification", {
            description: notification.body || "",
            duration: 8000,
            action: actionUrl
              ? {
                  label: "Open →",
                  onClick: () => router.push(actionUrl),
                }
              : undefined,
          });
        });

        // 6. Listener: Notification Tapped / Opened by User
        await PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
          const data = action.notification.data || {};
          const targetUrl = data.url || data.link || data.actionUrl;

          if (targetUrl && typeof targetUrl === "string") {
            router.push(targetUrl);
          } else if (data.bellId) {
            router.push(`/teacher/timetable?bellId=${data.bellId}`);
          } else if (data.noticeId) {
            router.push(`/student/notices?id=${data.noticeId}`);
          }
        });
      } catch (err) {
        console.warn("Push notification initialization notice:", err);
      }
    }

    initPush();

    return () => {
      isMounted = false;
      PushNotifications.removeAllListeners().catch(() => {});
    };
  }, [profile?.uid, profile?.schoolId, profile?.role, router]);

  // When profile updates, ensure the stored token is synced with current user identity
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !profile?.uid || !profile?.schoolId) return;

    try {
      const savedToken = localStorage.getItem("school_study_fcm_token");
      if (savedToken && registeredTokenRef.current !== savedToken) {
        registeredTokenRef.current = savedToken;
        syncDeviceTokenWithBackend(savedToken, profile);
      }
    } catch {}
  }, [profile]);
}

/**
 * Persists the FCM token to the backend.
 * For teachers: registers to /api/teacher/devices so class alerts and timetable bells reach the device.
 * For all users: stores device reference in Firestore for targeted announcements.
 */
async function syncDeviceTokenWithBackend(fcmToken: string, profile: any) {
  const schoolId = profile.schoolId;
  const userId = profile.uid;
  const role = profile.role || "user";

  const registrationKey = `synced_fcm_${userId}_${fcmToken.slice(-10)}`;
  if (sessionStorage.getItem(registrationKey)) return;

  try {
    // 1. Teacher Device Registration
    if (role === "teacher") {
      await fetch("/api/teacher/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          "x-school-id": schoolId,
          "x-user-role": "teacher",
        },
        body: JSON.stringify({
          schoolId,
          teacherId: userId,
          tokenOrSubscription: {
            fcmToken,
            platform: "android",
          },
          deviceInfo: "Android Mobile App (Capacitor)",
          notificationPermission: "granted",
        }),
      });
    }

    // 2. Universal Firestore User Device Registration
    const db = getFirebaseDb();
    if (db && schoolId && userId) {
      const deviceDocId = `${userId}_android`;
      await setDoc(
        doc(db, "schools", schoolId, "userDevices", deviceDocId),
        {
          userId,
          schoolId,
          role,
          fcmToken,
          platform: "android",
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    sessionStorage.setItem(registrationKey, "true");
  } catch (err) {
    console.warn("Device token sync notice:", err);
  }
}
