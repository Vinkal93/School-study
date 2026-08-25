import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { compressImage } from "@/lib/utils/image-compression";

/**
 * Standardized Firebase Storage Service for multi-tenant uploads.
 * Paths:
 * - Schools:  schools/{schoolId}/logo/{filename}
 * - Students: students/{studentId}/profile/{filename}
 * - Teachers: teachers/{teacherId}/profile/{filename}
 */

/**
 * Compresses and uploads a school brand logo.
 */
export async function uploadSchoolLogo(
  schoolId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, { maxWidth: 512, maxHeight: 512 });
  const storage = getFirebaseStorage();
  const storageRef = ref(
    storage,
    `schools/${schoolId}/logo/${Date.now()}_logo.jpg`
  );

  const snapshot = await uploadBytes(storageRef, compressed, {
    contentType: "image/jpeg",
  });
  return await getDownloadURL(snapshot.ref);
}

/**
 * Compresses and uploads a student profile photo.
 */
export async function uploadStudentPhoto(
  schoolId: string,
  studentId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600 });
  const storage = getFirebaseStorage();
  const storageRef = ref(
    storage,
    `students/${studentId}/profile/${Date.now()}_profile.jpg`
  );

  const snapshot = await uploadBytes(storageRef, compressed, {
    contentType: "image/jpeg",
  });
  return await getDownloadURL(snapshot.ref);
}

/**
 * Compresses and uploads a teacher profile photo.
 */
export async function uploadTeacherPhoto(
  schoolId: string,
  teacherId: string,
  file: File
): Promise<string> {
  const compressed = await compressImage(file, { maxWidth: 600, maxHeight: 600 });
  const storage = getFirebaseStorage();
  const storageRef = ref(
    storage,
    `teachers/${teacherId}/profile/${Date.now()}_profile.jpg`
  );

  const snapshot = await uploadBytes(storageRef, compressed, {
    contentType: "image/jpeg",
  });
  return await getDownloadURL(snapshot.ref);
}
