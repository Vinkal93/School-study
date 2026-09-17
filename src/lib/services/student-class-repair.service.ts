/**
 * STUDENT & CLASS MASTER DATA REPAIR SERVICE
 * 
 * Safely and idempotently repairs data-flow inconsistencies:
 * 1. Deduplicates multiple class records with the same canonical name.
 * 2. Unites sections from duplicate classes under the primary canonical class.
 * 3. Reassigns students lacking classId or attached to duplicate classes to the canonical classId & sectionId.
 * 4. Normalizes student gender, status, and names.
 * 5. NEVER deletes student records.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import {
  normalizeClassName,
  getCanonicalClassKey,
  getCanonicalClassOrder,
  normalizeSectionName,
  getCanonicalSectionKey,
  normalizeGender,
} from "@/lib/utils/academic-normalizer";

export interface RepairExecutionSummary {
  schoolId: string;
  totalClassesFound: number;
  canonicalClassesKept: number;
  duplicateClassesMerged: number;
  totalStudentsInspected: number;
  studentsUpdated: number;
  studentsAlreadyValid: number;
  details: string[];
}

/**
 * Runs the authoritative repair routine for a school using client Firestore.
 */
export async function repairSchoolClassesAndStudentsClient(
  schoolId: string
): Promise<RepairExecutionSummary> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore client not available.");
  if (!schoolId) throw new Error("schoolId is required for data repair.");

  const details: string[] = [];
  details.push(`Starting academic data repair for school: ${schoolId}`);

  // 1. Fetch all class documents
  const classesSnap = await getDocs(collection(db, "schools", schoolId, "classes"));
  const classDocs = classesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  details.push(`Found ${classDocs.length} total class documents in Firestore.`);

  // Group classes by canonical key
  const classGroups = new Map<string, any[]>();
  for (const c of classDocs) {
    const key = getCanonicalClassKey(c.name);
    if (!classGroups.has(key)) classGroups.set(key, []);
    classGroups.get(key)!.push(c);
  }

  const canonicalClassMap = new Map<
    string,
    {
      canonicalId: string;
      canonicalName: string;
      order: number;
      sections: Map<string, { id: string; name: string }>;
    }
  >();

  const classIdRedirects = new Map<string, string>();
  const sectionIdRedirects = new Map<string, string>();
  const duplicateClassIdsToDelete: string[] = [];

  let duplicateClassesMerged = 0;

  for (const [key, group] of classGroups.entries()) {
    // Choose primary canonical class doc
    // Prefer doc with lowest order or earliest createdAt
    group.sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : 999;
      const orderB = b.order !== undefined ? b.order : 999;
      return orderA - orderB;
    });

    const primaryDoc = group[0];
    const canonicalName = normalizeClassName(primaryDoc.name);
    const canonicalOrder =
      primaryDoc.order !== undefined && primaryDoc.order !== 999
        ? primaryDoc.order
        : getCanonicalClassOrder(canonicalName);

    // Update primary class doc with canonical name & order if needed
    await setDoc(
      doc(db, "schools", schoolId, "classes", primaryDoc.id),
      {
        name: canonicalName,
        order: canonicalOrder,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Load existing sections for primary doc
    const primarySecSnap = await getDocs(
      collection(db, "schools", schoolId, "classes", primaryDoc.id, "sections")
    );
    const sectionsMap = new Map<string, { id: string; name: string }>();

    primarySecSnap.docs.forEach((s) => {
      const sName = normalizeSectionName(s.data().name);
      const sKey = getCanonicalSectionKey(sName);
      sectionsMap.set(sKey, { id: s.id, name: sName });
    });

    // If group has duplicate classes, merge sections into primary
    if (group.length > 1) {
      details.push(
        `Class "${canonicalName}" has ${group.length} duplicate documents. Merging into canonical ID: ${primaryDoc.id}`
      );

      for (let i = 1; i < group.length; i++) {
        const dupDoc = group[i];
        classIdRedirects.set(dupDoc.id, primaryDoc.id);
        duplicateClassIdsToDelete.push(dupDoc.id);
        duplicateClassesMerged++;

        // Fetch duplicate doc's sections
        const dupSecSnap = await getDocs(
          collection(db, "schools", schoolId, "classes", dupDoc.id, "sections")
        );

        for (const ds of dupSecSnap.docs) {
          const dsName = normalizeSectionName(ds.data().name);
          const dsKey = getCanonicalSectionKey(dsName);

          let targetSection = sectionsMap.get(dsKey);
          if (!targetSection) {
            // Copy section over to primary class
            const newSecRef = doc(
              collection(db, "schools", schoolId, "classes", primaryDoc.id, "sections")
            );
            await setDoc(newSecRef, {
              id: newSecRef.id,
              schoolId,
              classId: primaryDoc.id,
              name: dsName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            targetSection = { id: newSecRef.id, name: dsName };
            sectionsMap.set(dsKey, targetSection);
            details.push(
              `Moved section "${dsName}" from duplicate class ${dupDoc.id} to primary ${primaryDoc.id}`
            );
          }
          sectionIdRedirects.set(ds.id, targetSection.id);

          // Delete duplicate section doc
          await deleteDoc(
            doc(db, "schools", schoolId, "classes", dupDoc.id, "sections", ds.id)
          ).catch(() => {});
        }
      }
    }

    // Ensure at least "Section A" exists under primary
    if (sectionsMap.size === 0) {
      const defaultSecRef = doc(
        collection(db, "schools", schoolId, "classes", primaryDoc.id, "sections")
      );
      await setDoc(defaultSecRef, {
        id: defaultSecRef.id,
        schoolId,
        classId: primaryDoc.id,
        name: "Section A",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      sectionsMap.set("a", { id: defaultSecRef.id, name: "Section A" });
    }

    canonicalClassMap.set(key, {
      canonicalId: primaryDoc.id,
      canonicalName,
      order: canonicalOrder,
      sections: sectionsMap,
    });
  }

  // 2. Fetch all students in school
  let studentsSnap = await getDocs(collection(db, "schools", schoolId, "students"));
  if (studentsSnap.empty) {
    studentsSnap = await getDocs(
      query(collection(db, "students"), where("schoolId", "==", schoolId))
    );
  }

  const totalStudents = studentsSnap.docs.length;
  details.push(`Found ${totalStudents} students to inspect and re-align.`);

  let studentsUpdated = 0;
  let studentsAlreadyValid = 0;

  // Process students in concurrent batches of 20
  const BATCH_SIZE = 20;
  const studentDocs = studentsSnap.docs;

  for (let i = 0; i < studentDocs.length; i += BATCH_SIZE) {
    const chunk = studentDocs.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (docSnap) => {
        const data = docSnap.data();
        let targetClassId = data.classId;
        let targetClassName = data.className;
        let targetSectionId = data.sectionId;
        let targetSectionName = data.sectionName;

        let needsUpdate = false;

        // Check if classId needs redirect or resolution
        if (targetClassId && classIdRedirects.has(targetClassId)) {
          targetClassId = classIdRedirects.get(targetClassId)!;
          needsUpdate = true;
        }

        // If classId missing or invalid, resolve by className
        const rawCls = targetClassName || data.class || "Class 1";
        const canonicalClsName = normalizeClassName(rawCls);
        const clsKey = getCanonicalClassKey(canonicalClsName);

        const classInfo = canonicalClassMap.get(clsKey);
        if (classInfo) {
          if (targetClassId !== classInfo.canonicalId) {
            targetClassId = classInfo.canonicalId;
            needsUpdate = true;
          }
          if (targetClassName !== classInfo.canonicalName) {
            targetClassName = classInfo.canonicalName;
            needsUpdate = true;
          }

          // Resolve section
          if (targetSectionId && sectionIdRedirects.has(targetSectionId)) {
            targetSectionId = sectionIdRedirects.get(targetSectionId)!;
            needsUpdate = true;
          }

          const rawSec = targetSectionName || data.section || "A";
          const canonicalSecName = normalizeSectionName(rawSec);
          const secKey = getCanonicalSectionKey(canonicalSecName);

          let secInfo = classInfo.sections.get(secKey);
          if (!secInfo) {
            // Pick the first available section or default
            secInfo = classInfo.sections.values().next().value;
          }

          if (secInfo) {
            if (targetSectionId !== secInfo.id) {
              targetSectionId = secInfo.id;
              needsUpdate = true;
            }
            if (targetSectionName !== secInfo.name) {
              targetSectionName = secInfo.name;
              needsUpdate = true;
            }
          }
        }

        // Normalize gender
        const normalizedGender = normalizeGender(data.gender);
        if (data.gender !== normalizedGender) {
          needsUpdate = true;
        }

        // Ensure active status
        const validStatus = data.status || "active";
        if (!data.status) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          const updatePayload: Record<string, any> = {
            classId: targetClassId || "",
            className: targetClassName || "",
            sectionId: targetSectionId || "",
            sectionName: targetSectionName || "",
            gender: normalizedGender,
            status: validStatus,
            updatedAt: serverTimestamp(),
          };

          // Update in schools/{schoolId}/students/{docSnap.id}
          await setDoc(
            doc(db, "schools", schoolId, "students", docSnap.id),
            updatePayload,
            { merge: true }
          );

          // Dual update in top-level students/{docSnap.id}
          await setDoc(
            doc(db, "students", docSnap.id),
            { ...updatePayload, schoolId },
            { merge: true }
          ).catch(() => {});

          studentsUpdated++;
        } else {
          studentsAlreadyValid++;
        }
      })
    );
  }

  // 3. Now delete orphaned duplicate class documents safely
  for (const dupClassId of duplicateClassIdsToDelete) {
    try {
      await deleteDoc(doc(db, "schools", schoolId, "classes", dupClassId));
      details.push(`Cleaned up orphaned duplicate class document: ${dupClassId}`);
    } catch (e: any) {
      details.push(`Warning deleting duplicate class ${dupClassId}: ${e?.message}`);
    }
  }

  details.push(
    `Repair complete! Summary: ${classGroups.size} canonical classes kept, ${duplicateClassesMerged} duplicate classes merged, ${studentsUpdated} students updated, ${studentsAlreadyValid} students already valid.`
  );

  return {
    schoolId,
    totalClassesFound: classDocs.length,
    canonicalClassesKept: classGroups.size,
    duplicateClassesMerged,
    totalStudentsInspected: totalStudents,
    studentsUpdated,
    studentsAlreadyValid,
    details,
  };
}

