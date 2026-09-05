import { NextResponse } from "next/server";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/client";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { COLLECTIONS } from "@/lib/utils/constants";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 1. Handle JSON removal action: { action: "remove", schoolId }
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const { schoolId, currentLogoUrl } = body;

      if (!schoolId) {
        return NextResponse.json({ success: false, error: "schoolId is required." }, { status: 400 });
      }

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
        } catch (e) {
          console.warn("Storage logo file delete notice:", e);
        }
      }

      return NextResponse.json({ success: true, message: "Logo removed successfully." });
    }

    // 2. Handle Multipart Form-Data upload: file & schoolId
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const schoolId = formData.get("schoolId") as string | null;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "schoolId is required." }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No image file provided." }, { status: 400 });
    }

    // Validate MIME type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Invalid file format. Please upload JPG, PNG, or WebP." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 5MB limit." },
        { status: 400 }
      );
    }

    const storage = getFirebaseStorage();
    if (!storage) {
      return NextResponse.json({ success: false, error: "Storage service unavailable." }, { status: 503 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const storagePath = `schools/${schoolId}/branding/logo_${Date.now()}.${ext}`;
    const storageRef = ref(storage, storagePath);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const uploadTask = uploadBytesResumable(storageRef, uint8Array, {
      contentType: file.type,
      customMetadata: { schoolId },
    });

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        (err) => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });

    // Update the school document with the new logoUrl
    const db = getFirebaseDb();
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
    await updateDoc(schoolRef, {
      logoUrl: downloadUrl,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      logoUrl: downloadUrl,
      message: "Logo uploaded and saved successfully.",
    });
  } catch (error: any) {
    console.error("Upload logo API error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to upload logo." },
      { status: 500 }
    );
  }
}
