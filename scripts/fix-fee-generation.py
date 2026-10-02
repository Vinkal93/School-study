from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'src/lib/services/fee-foundation.service.ts'
s=p.read_text(encoding='utf-8')
start=s.index('export async function generateStudentFeeDemands(')
a=s.index('  const db =',start); b=s.index('\n}\n',a)
s=s[:a]+'''  if (!academicYearId || ["all", "ay_current", "current"].includes(academicYearId)) throw new Error("Select a specific academic session before generating fees.");
  const result = await generateBulkFeeDemands(schoolId, { academicYearId, academicYearName, studentIds: [student.id], actorId });
  if (result.errors.length) throw new Error(result.errors.join("; "));
  return getFeeDemands(schoolId, student.id, academicYearId);
'''+s[b:]
s=s.replace('  academicYearName: string = "2026-27",','  academicYearName?: string,')
# Normalize legacy structures, retain the selected year even when it is empty.
s=s.replace('    const allStructures = structSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FeeStructureDefinition));','''    const allStructures = structSnap.docs.map(d => {
      const data = d.data();
      return { ...data, id: d.id, feeHeadId: data.feeHeadId || `fh_${data.feeType || "tuition"}`, feeHeadName: data.feeHeadName || data.title || "Fee" } as FeeStructureDefinition;
    }).filter(s => matchAcademicYear(s.academicYearId, options.academicYearId));''')
s=s.replace('      where("academicYearId", "==", options.academicYearId),\n','')
s=s.replace('      where("schoolId", "==", schoolId),\n      where("academicYearId", "==", options.academicYearId)\n','      where("schoolId", "==", schoolId)\n')
s=s.replace('    const existingDemandIds = new Set(demandSnap.docs.map((d) => d.id));','''    const existingDemands = demandSnap.docs.map(d => ({ ...d.data(), id: d.id } as FeeDemand)).filter(d => matchAcademicYear(d.academicYearId, options.academicYearId));
    const existingDemandIds = new Set(existingDemands.map(d => d.id));''')
s=s.replace('    const academicName = options.academicYearName || "2026-27";','''    const academicName = options.academicYearName || allStructures[0]?.academicYearName || options.academicYearId;
    if (!academicName.match(/20\\d{2}/)) throw new Error("Academic session dates are not configured.");''')
s=s.replace('        const freqPeriods = getFrequencyPeriods(struct.frequency, academicName);','''        const freqPeriods = getFrequencyPeriods(struct.frequency, academicName).filter(p =>
          !["monthly", "custom"].includes(struct.frequency) || !struct.applicableMonths?.length || struct.applicableMonths.some(m => p.displayName.toLowerCase().startsWith(m.toLowerCase()))
        );''')
s=s.replace('          if (existingDemandIds.has(demandId)) {','''          const dueDate = resolveSafeDueDate(p.dueYear, p.dueMonthIndex, struct.dueDayOfMonth || 10);
          const existingPeriod = existingDemands.some(d => d.studentId === student.id && d.feeHeadId === struct.feeHeadId && (d.period === p.displayName || d.dueDate?.slice(0, 7) === dueDate.slice(0, 7)));
          if (existingDemandIds.has(demandId) || existingPeriod) {''')
s=s.replace('            newlyGeneratedCount++;','            existingDemandIds.add(demandId);\n            newlyGeneratedCount++;')
s=s.replace('            const grossPaise = struct.amountPaise;','            const grossPaise = moneyPaise(struct.amountPaise / 100, true);')
s=s.replace('    const batch = writeBatch(db);\n\n    for (const demand of chunk) {\n      const demandRef = doc(db, "feeDemands", demand.id);\n      batch.set(demandRef, demand, { merge: true });\n    }\n\n    try {\n      await batch.commit();\n      committedDemands.push(...chunk);','''    try {
      const created = await runTransaction(db, async tx => {
        const refs = chunk.map(d => doc(db, "feeDemands", d.id));
        const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
        const fresh = chunk.filter((_, index) => !snapshots[index].exists());
        for (const demand of fresh) tx.set(doc(db, "feeDemands", demand.id), demand);
        return fresh;
      });
      committedDemands.push(...created);''')
s+='''
/** Authoritative read shared by collection, discounts, and student fees. */
export async function getFeeDemands(schoolId: string, studentId?: string, academicYearId?: string): Promise<FeeDemand[]> {
  const db = getFirebaseDb();
  const constraints = [where("schoolId", "==", schoolId)];
  if (studentId) constraints.push(where("studentId", "==", studentId));
  const snap = await getDocs(query(collection(db, "feeDemands"), ...constraints));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as FeeDemand))
    .filter(d => matchAcademicYear(d.academicYearId, academicYearId))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}
'''
p.write_text(s,encoding='utf-8')
