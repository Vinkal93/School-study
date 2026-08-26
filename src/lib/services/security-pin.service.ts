import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";

const SECURITY_DOC_PATH = "system_settings/security";
export const DEFAULT_SUPER_ADMIN_PIN = "630649";

/**
 * Fetches the current Super Admin 6-digit Security PIN from Firestore.
 * Fallbacks to default "630649" if not set.
 */
export async function getSuperAdminPin(): Promise<string> {
  try {
    const db = getFirebaseDb();
    if (!db) return DEFAULT_SUPER_ADMIN_PIN;

    const docRef = doc(db, "system_settings", "security");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data()?.pin) {
      return String(docSnap.data().pin).trim();
    }
  } catch (error) {
    console.warn("Unable to fetch Security PIN from Firestore, using default PIN:", error);
  }

  return DEFAULT_SUPER_ADMIN_PIN;
}

/**
 * Verifies if the entered 6-digit code matches the stored Super Admin PIN.
 */
export async function verifySuperAdminPin(enteredPin: string): Promise<boolean> {
  const currentPin = await getSuperAdminPin();
  return enteredPin.trim() === currentPin.trim();
}

/**
 * Updates the Super Admin Security PIN in Firestore.
 */
export async function updateSuperAdminPin(
  currentPinInput: string,
  newPinInput: string
): Promise<{ success: boolean; message: string }> {
  const trimmedNew = newPinInput.trim();
  const trimmedCurrent = currentPinInput.trim();

  if (!/^\d{6}$/.test(trimmedNew)) {
    return { success: false, message: "New Security PIN must be exactly 6 numeric digits." };
  }

  const isCurrentValid = await verifySuperAdminPin(trimmedCurrent);
  if (!isCurrentValid) {
    return { success: false, message: "Current Security PIN is incorrect." };
  }

  try {
    const db = getFirebaseDb();
    if (!db) {
      return { success: false, message: "Database connection unavailable." };
    }

    const docRef = doc(db, "system_settings", "security");
    await setDoc(
      docRef,
      {
        pin: trimmedNew,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, message: "Super Admin Security PIN updated successfully!" };
  } catch (error: any) {
    console.error("Failed to update Security PIN:", error);
    return {
      success: false,
      message: error?.message || "Failed to update Security PIN. Please try again.",
    };
  }
}
