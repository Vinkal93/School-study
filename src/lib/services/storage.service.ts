import { compressImageToBase64 } from "@/lib/utils/image-compression";

/**
 * Standardized Photo Upload Service for multi-tenant users.
 * Uses client-side canvas compression to generate lightweight Base64 data URLs.
 * Works 100% reliably across all plans, with zero CORS and zero Storage bucket dependencies.
 */

/**
 * Compresses and returns school brand logo.
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
