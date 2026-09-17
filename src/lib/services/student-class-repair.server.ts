// Server-only — this file must NEVER be imported in client components
import { getSafeAdminDb } from "@/lib/firebase/admin";
import {
  normalizeClassName,
  getCanonicalClassKey,
  getCanonicalClassOrder,
  normalizeSectionName,
  getCanonicalSectionKey,
  normalizeGender,
} from "@/lib/utils/academic-normalizer";
import type { RepairExecutionSummary } from "./student-class-repair.service";

/**
 * Server-side Admin SDK version of the repair routine.
 */
export async function repairSchoolClassesAndStudentsAdmin(
  schoolId: string
): Promise<RepairExecutionSummary & { fallbackToClient?: boolean }> {
  const adminDb = getSafeAdminDb();

  if (!adminDb) {
    return {
      schoolId,
      totalClassesFound: 0,
      canonicalClassesKept: 0,
      duplicateClassesMerged: 0,
      totalStudentsInspected: 0,
      studentsUpdated: 0,
      studentsAlreadyValid: 0,
      fallbackToClient: true,
      details: ["Server Firebase Admin SDK unavailable. Falling back to client-side repair."],
    };
  }

  const details: string[] = [];
  details.push(`Starting server-side academic data repair for school: ${schoolId}`);

  const classesSnap = await adminDb.collection("schools").doc(schoolId).collection("classes").get();
  const classDocs = classesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

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

    await adminDb.collection("schools").doc(schoolId).collection("classes").doc(primaryDoc.id).set(
      {
        name: canonicalName,
        order: canonicalOrder,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const primarySecSnap = await adminDb
      .collection("schools")
      .doc(schoolId)
      .collection("classes")
      .doc(primaryDoc.id)
      .collection("sections")
      .get();

    const sectionsMap = new Map<string, { id: string; name: string }>();
    primarySecSnap.docs.forEach((s: any) => {
      const sName = normalizeSectionName(s.data().name);
      const sKey = getCanonicalSectionKey(sName);
      sectionsMap.set(sKey, { id: s.id, name: sName });
    });

    if (group.length > 1) {
      for (let i = 1; i < group.length; i++) {
        const dupDoc = group[i];
        classIdRedirects.set(dupDoc.id, primaryDoc.id);
        duplicateClassIdsToDelete.push(dupDoc.id);
        duplicateClassesMerged++;

        const dupSecSnap = await adminDb
          .collection("schools")
          .doc(schoolId)
          .collection("classes")
          .doc(dupDoc.id)
          .collection("sections")
          .get();

        for (const ds of dupSecSnap.docs) {
          const dsName = normalizeSectionName(ds.data().name);
          const dsKey = getCanonicalSectionKey(dsName);

          let targetSection = sectionsMap.get(dsKey);
          if (!targetSection) {
            const newSecRef = adminDb
              .collection("schools")
              .doc(schoolId)
              .collection("classes")
              .doc(primaryDoc.id)
              .collection("sections")
              .doc();
            await newSecRef.set({
              id: newSecRef.id,
              schoolId,
              classId: primaryDoc.id,
              name: dsName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            targetSection = { id: newSecRef.id, name: dsName };
            sectionsMap.set(dsKey, targetSection);
          }
          sectionIdRedirects.set(ds.id, targetSection.id);
          await ds.ref.delete().catch(() => {});
        }
      }
    }

    if (sectionsMap.size === 0) {
      const defaultSecRef = adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("classes")
        .doc(primaryDoc.id)
        .collection("sections")
        .doc();
      await defaultSecRef.set({
        id: defaultSecRef.id,
        schoolId,
        classId: primaryDoc.id,
        name: "Section A",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  // 2. Fetch and realign students
  let studentsSnap = await adminDb.collection("schools").doc(schoolId).collection("students").get();
  if (studentsSnap.empty) {
    studentsSnap = await adminDb.collection("students").where("schoolId", "==", schoolId).get();
  }

  let studentsUpdated = 0;
  let studentsAlreadyValid = 0;

  for (const docSnap of studentsSnap.docs) {
    const data = docSnap.data();
    let targetClassId = data.classId;
    let targetClassName = data.className;
    let targetSectionId = data.sectionId;
    let targetSectionName = data.sectionName;
    let needsUpdate = false;

    if (targetClassId && classIdRedirects.has(targetClassId)) {
      targetClassId = classIdRedirects.get(targetClassId)!;
      needsUpdate = true;
    }

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

      if (targetSectionId && sectionIdRedirects.has(targetSectionId)) {
        targetSectionId = sectionIdRedirects.get(targetSectionId)!;
        needsUpdate = true;
      }

      const rawSec = targetSectionName || data.section || "A";
      const canonicalSecName = normalizeSectionName(rawSec);
      const secKey = getCanonicalSectionKey(canonicalSecName);

      let secInfo = classInfo.sections.get(secKey) || classInfo.sections.values().next().value;
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

    const normalizedGender = normalizeGender(data.gender);
    if (data.gender !== normalizedGender) needsUpdate = true;
    const validStatus = data.status || "active";
    if (!data.status) needsUpdate = true;

    if (needsUpdate) {
      const updatePayload = {
        classId: targetClassId || "",
        className: targetClassName || "",
        sectionId: targetSectionId || "",
        sectionName: targetSectionName || "",
        gender: normalizedGender,
        status: validStatus,
        updatedAt: new Date().toISOString(),
      };

      await adminDb
        .collection("schools")
        .doc(schoolId)
        .collection("students")
        .doc(docSnap.id)
        .set(updatePayload, { merge: true });

      await adminDb
        .collection("students")
        .doc(docSnap.id)
        .set({ ...updatePayload, schoolId }, { merge: true })
        .catch(() => {});

      studentsUpdated++;
    } else {
      studentsAlreadyValid++;
    }
  }

  for (const dupClassId of duplicateClassIdsToDelete) {
    await adminDb.collection("schools").doc(schoolId).collection("classes").doc(dupClassId).delete().catch(() => {});
  }

  details.push(
    `Server repair complete: ${classGroups.size} canonical classes kept, ${duplicateClassesMerged} duplicate classes merged, ${studentsUpdated} students updated.`
  );

  return {
    schoolId,
    totalClassesFound: classDocs.length,
    canonicalClassesKept: classGroups.size,
    duplicateClassesMerged,
    totalStudentsInspected: studentsSnap.docs.length,
    studentsUpdated,
    studentsAlreadyValid,
    details,
  };
}
