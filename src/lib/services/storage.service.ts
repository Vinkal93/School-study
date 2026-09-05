import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseStorage, getFirebaseDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/utils/constants";
import { compressImageToBase64 } from "@/lib/utils/image-compression";

/**
 * Standardized Photo Upload Service for multi-tenant users.
 * Supports both real Firebase Storage bucket uploads and lightweight compressed fallbacks.
 */

/**
 * Real Firebase Storage Logo Uploader with real-time percentage progress.
 * Stores at tenant-safe path: schools/{schoolId}/branding/logo_{timestamp}.ext
 * Updates schools/{schoolId}.logoUrl with authoritative download URL.
 */
export async function uploadSchoolLogoToStorage(
  schoolId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!schoolId) throw new Error("School ID is required for storage upload.");
  if (!file) throw new Error("File is required for upload.");

  const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!validMimes.includes(file.type.toLowerCase())) {
    throw new Error("Invalid file format. Please upload a PNG, JPG, JPEG, or WebP image.");
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSizeBytes) {
    throw new Error(`File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds the 5MB limit.`);
  }

  const storage = getFirebaseStorage();
  if (!storage) throw new Error("Firebase storage is offline.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const storagePath = `schools/${schoolId}/branding/logo_${Date.now()}.${ext}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: { schoolId },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.error("Firebase Storage logo upload error:", error);
        reject(new Error(error.message || "Failed to upload school logo to storage."));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

          // Authoritatively save logoUrl to the school document
          const db = getFirebaseDb();
          const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
          await updateDoc(schoolRef, {
            logoUrl: downloadUrl,
            updatedAt: serverTimestamp(),
          });

          resolve(downloadUrl);
        } catch (dbErr: any) {
          console.error("Failed to persist logo URL to school doc:", dbErr);
          reject(new Error(dbErr.message || "Failed to save logo URL to school profile."));
        }
      }
    );
  });
}

/**
 * Removes the school logo from both the school document and storage.
 */
export async function removeSchoolLogo(schoolId: string, currentLogoUrl?: string): Promise<void> {
  if (!schoolId) return;

  const db = getFirebaseDb();
  const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
  await updateDoc(schoolRef, {
    logoUrl: "",
    updatedAt: serverTimestamp(),
  });

  if (currentLogoUrl && currentLogoUrl.includes("firebasestorage.googleapis.com")) {
    try {
      const storage = getFirebaseStorage();
      const storageRef = ref(storage, currentLogoUrl);
      await deleteObject(storageRef);
    } catch (err) {
      console.warn("Notice: Old storage object cleanup notice:", err);
    }
  }
}

/**
 * Compresses and returns school brand logo (fallback/compatibility helper).
 */
export async function uploadSchoolLogo(
  arg1: string | File,
  arg2?: File
): Promise<string> {
  const file = (arg1 instanceof File ? arg1 : arg2) as File;
  if (!file) return "";
  return await compressImageToBase64(file, 400, 400, 0.8);
}

/**
 * Compresses and returns student profile photo.
 * Supports flexible argument order: (file, schoolId, id) or (schoolId, id, file).
 */
export async function uploadStudentPhoto(
  arg1: string | File,
  arg2?: string,
  arg3?: string | File
): Promise<string> {
  const file = arg1 instanceof File ? arg1 : (arg3 instanceof File ? arg3 : undefined);
  if (!file) return "";
  return await compressImageToBase64(file, 400, 400, 0.75);
}

/**
 * Compresses and returns teacher profile photo.
 * Supports flexible argument order: (file, schoolId, code) or (schoolId, code, file).
 */
export async function uploadTeacherPhoto(
  arg1: string | File,
  arg2?: string,
  arg3?: string | File
): Promise<string> {
  const file = arg1 instanceof File ? arg1 : (arg3 instanceof File ? arg3 : undefined);
  if (!file) return "";
  return await compressImageToBase64(file, 400, 400, 0.75);
}
