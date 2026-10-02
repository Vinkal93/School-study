from pathlib import Path

root = Path(__file__).resolve().parents[1]
def read(path): return (root / path).read_text(encoding='utf-8')
def write(path, text): (root / path).write_text(text, encoding='utf-8')
def replace_body(s, name, body, marker='  const db ='):
    start=s.index('export async function '+name+'(')
    a=s.index(marker,start)
    b=s.index('\n}\n',a)
    return s[:a]+body+'\n'+s[b:]

p='src/lib/services/fee-foundation.service.ts'
s=read(p)
s='import { moneyPaise, sameAcademicYear, normalizePaymentMethod, allocatePayment } from "@/lib/fees/finance-core";\n'+s
s=s.replace('  writeBatch,','  writeBatch,\n  runTransaction,')
a=s.index('  if (!filterYear',s.index('export function matchAcademicYear'))
b=s.index('\n}',a)
s=s[:a]+'  return sameAcademicYear(docYear, filterYear);'+s[b:]
s=s.replace('return Math.round(rupees * 100);','return moneyPaise(rupees);')
for name,call in [('processFeePaymentWithAllocations','collectPayment'),('processFeeRefund','returnPayment'),('processPaymentReversal','returnPayment'),('applyFeeAdjustment','adjustInvoice')]:
    args='schoolId, input'+(', false' if name=='processFeeRefund' else ', true' if name=='processPaymentReversal' else '')
    s=replace_body(s,name,f'  const {{ {call} }} = await import("./fee-mutations.service");\n  return {call}({args});')
start=s.index('export async function processFeePaymentWithAllocations(')
a=s.index('    amountPaidRupees: number;',start)+len('    amountPaidRupees: number;')
s=s[:a]+'\n    discountRupees?: number;\n    feeType?: import("@/types").FeeType;'+s[a:]
a=s.index('  let unallocated =',s.index('export function calculatePaymentAllocationPlan'))
b=s.index('\n}\n',a)
s=s[:a]+'  return allocatePayment(paymentAmountPaise, demands);\n'+s[b:]
start=s.index('export async function applyFeeWaiver(')
a=s.index('  const db =',start)
b=s.index('\n}\n',a)
s=s[:a]+'''  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, "feeDemands", demandId));
  if (!snap.exists()) throw new Error("Fee invoice not found.");
  const demand = snap.data() as FeeDemand;
  return applyFeeAdjustment(schoolId, { studentId, studentName: demand.studentName, academicYearId: demand.academicYearId, demandId, amountRupees, type: "WAIVER", reason, approvedBy, actorId });
'''+s[b:]
# No invented allocation, no data writes during a financial summary read.
a=s.index('    // If no demands exist at all, lazily generate them')
b=s.index('    // 4. Fetch adjustments',a)
s=s[:a]+s[b:]
a=s.index('    // 5. Reconcile demands with actual payments')
b=s.index('    // 6. Aggregate metrics',a)
s=s[:a]+'''    demands = demands.filter(d => d.status !== "CANCELLED");
'''+s[b:]
s=s.replace('const totalPaidPaise = Math.max(totalPaidFromDemands, totalPaidFromPayments);','const totalPaidPaise = totalPaidFromDemands;')
s=s.replace('const totalOutstandingPaise = Math.max(0, totalNetPaise - totalPaidPaise);','const totalOutstandingPaise = demands.reduce((sum, d) => sum + d.balanceAmountPaise, 0);')
s=s.replace('recentDemands: demands.slice(0, 12),','recentDemands: demands,')
s=s.replace('else if (d.status === "OVERDUE") overdueDemandsCount++;','else if (d.balanceAmountPaise > 0 && Date.parse(d.dueDate) < Date.now()) overdueDemandsCount++;')
s=s.replace('new Date(options.endDate).getTime()', 'new Date(options.endDate.length === 10 ? `${options.endDate}T23:59:59.999Z` : options.endDate).getTime()')
s=s.replace('(rawMethod === "CASH" ? "CASH" : rawMethod === "UPI" ? "UPI" : rawMethod === "CHEQUE" ? "CHEQUE" : "CASH") as PaymentMethod','normalizePaymentMethod(rawMethod)')
s=s.replace('"financialReversals"','"paymentReversals"')
write(p,s)

p='src/lib/services/fee.service.ts'
s=read(p)
s='import { assignmentFromDemands, normalizePaymentMethod } from "@/lib/fees/finance-core";\n'+s
a=s.index('    if (academicYearId) {',s.index('export async function getFeeStructures'))
b=s.index('    list.sort',a)
s=s[:a]+'''    if (academicYearId && academicYearId !== "all") {
      list = list.filter(f => f.academicYearId === "all" || matchAcademicYear(f.academicYearId, academicYearId));
    }
'''+s[b:]
start=s.index('export async function getStudentFeeAssignment(')
a=s.index('  try {',start)+len('  try {')
s=s[:a]+'''
    const demands = await getDocs(query(collection(db, "feeDemands"), where("schoolId", "==", schoolId), where("studentId", "==", studentId)));
    const matching = demands.docs.map(d => ({ ...d.data(), id: d.id } as import("@/types/fee-foundation").FeeDemand)).filter(d => matchAcademicYear(d.academicYearId, academicYearId));
    const projected = assignmentFromDemands(matching);
    if (projected) return projected;
'''+s[a:]
a=s.index('        const cleanA =',s.index('export async function getStudentFeeAssignment('))
b=s.index('      }\n      // Return',a)
s=s[:a]+'''        return docs.find(d => matchAcademicYear(d.academicYearId, academicYearId)) || null;
'''+s[b:]
start=s.index('export async function collectFeePayment(')
a=s.index('    paymentDate?: string;',start)+len('    paymentDate?: string;')
s=s[:a]+'\n    idempotencyKey?: string;\n    targetDemandIds?: string[];'+s[a:]
s=replace_body(s,'collectFeePayment','''  const { processFeePaymentWithAllocations } = await import("./fee-foundation.service");
  const db = getFirebaseDb();
  const snap = await getDocs(query(collection(db, "feeDemands"), where("schoolId", "==", schoolId), where("studentId", "==", input.studentId)));
  const demands = snap.docs.map(d => ({ ...d.data(), id: d.id } as import("@/types/fee-foundation").FeeDemand)).filter(d => matchAcademicYear(d.academicYearId, input.academicYearId));
  const targetDemandIds = input.targetDemandIds || demands.filter(d => input.periodMonths.includes(d.period) && (d.feeHeadId.endsWith(input.feeType) || d.feeHeadName.toLowerCase().includes(input.feeType))).map(d => d.id);
  if (!targetDemandIds.length) throw new Error("No matching fee invoices. Generate the fee schedule first.");
  const result = await processFeePaymentWithAllocations(schoolId, { ...input, targetDemandIds, paymentMethod: normalizePaymentMethod(input.paymentMethod), referenceNumber: input.transactionRef, actorId, actorName: actorId });
  const payment: FeePayment = { ...result.payment, feeType: input.feeType, periodMonths: result.payment.periodMonths || [], paymentMethod: input.paymentMethod, amountPaidPaise: result.payment.amountPaise, netAmountPaise: result.payment.amountPaise, discountPaise: Math.round((input.discountRupees || 0) * 100), lateFeePaise: 0, transactionRef: result.payment.referenceNumber };
  appQueryClient.invalidateCache("fee*");
  return { success: true, payment, receiptNumber: payment.receiptNumber };''', '  if (input.amountPaidRupees')
# Preserve snapshot fields when mapping canonical receipts.
s=s.replace('          amountPaidPaise: amtPaise,','          amountPaidPaise: amtPaise,\n          refundedAmountPaise: data.refundedAmountPaise || 0,\n          remainingDuePaise: data.remainingDuePaise,\n          collectedByName: data.collectedByName || data.collectedBy || "Staff",')
write(p,s)
