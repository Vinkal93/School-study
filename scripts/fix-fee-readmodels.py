from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(p): return (root/p).read_text(encoding='utf-8')
def write(p,s): (root/p).write_text(s,encoding='utf-8')
p='src/lib/services/fee-ledger.service.ts'; s=read(p)
s='import { postedPayment, normalizePaymentMethod } from "@/lib/fees/finance-core";\n'+s
s=s.replace('    if (p.status === "FAILED" || p.status === "CANCELLED") continue;','    if (!postedPayment(p.status)) continue;')
s=s.replace('timestamp: ts + 5000,','timestamp: Date.parse(p.updatedAt || dateStr),')
s=s.replace('(p.paymentMethod || "CASH").toUpperCase() as PaymentMethod','normalizePaymentMethod(p.paymentMethod || "CASH")').replace('(r.refundMethod || "CASH").toUpperCase() as PaymentMethod','normalizePaymentMethod(r.refundMethod || "CASH")')
# Demand fields already contain separately recorded adjustments; only include embedded remainder.
marker='    // Structure Discount if embedded on demand'
a=s.index(marker)
s=s[:a]+'''    const recorded = adjustments.filter(a => a.status === "APPLIED" && a.demandId === d.id);
    const embeddedDiscount = Math.max(0, (d.discountAmountPaise || 0) - recorded.filter(a => !["CONCESSION", "SCHOLARSHIP"].includes(a.type)).reduce((sum, a) => sum + a.amountPaise, 0));
    const embeddedConcession = Math.max(0, (d.concessionAmountPaise || 0) - recorded.filter(a => ["CONCESSION", "SCHOLARSHIP"].includes(a.type)).reduce((sum, a) => sum + a.amountPaise, 0));
'''+s[a:]
s=s.replace('if (d.discountAmountPaise && d.discountAmountPaise > 0)', 'if (embeddedDiscount > 0)').replace('creditPaise: d.discountAmountPaise,','creditPaise: embeddedDiscount,')
s=s.replace('if (d.concessionAmountPaise && d.concessionAmountPaise > 0)', 'if (embeddedConcession > 0)').replace('creditPaise: d.concessionAmountPaise,','creditPaise: embeddedConcession,')
s=s.replace('if (d.lateFeePaise && d.lateFeePaise > 0)', 'if ((d.lateFeePaise || 0) + (d.finePaise || 0) > 0)').replace('debitPaise: d.lateFeePaise,','debitPaise: (d.lateFeePaise || 0) + (d.finePaise || 0),')
s=s.replace('let runningBalancePaise = 0;','let openingBalancePaise = 0;\n  let runningBalancePaise = 0;')
# Inclusive date filter carries earlier movements into opening balance.
old='    if (options.startDate && ev.date.slice(0, 10) < options.startDate) continue;'
first='''    if (options.startDate && ev.date.slice(0, 10) < options.startDate) {
      openingBalancePaise += ev.debitPaise - ev.creditPaise;
      runningBalancePaise = openingBalancePaise;
      continue;
    }'''
second=first.replace('ev.debitPaise - ev.creditPaise','ev.inflowDebitPaise - ev.outflowCreditPaise')
s=s.replace(old,first,1).replace(old,second,1)
s=s.replace('openingBalancePaise: 0,','openingBalancePaise,').replace('openingBalanceRupees: 0,','openingBalanceRupees: paiseToRupees(openingBalancePaise),')
s=s.replace('ev.type === "WAIVER")', 'ev.type === "WAIVER" || ev.type === "ADJUSTMENT")')
s=s.replace('ev.type === "REFUND")', 'ev.type === "REFUND" || ev.type === "REVERSAL")')
s=s.replace('    Math.abs(runningBalancePaise - demandTotalBalancePaise) < 100;', '    !options.endDate && !options.feeHeadId && runningBalancePaise === demandTotalBalancePaise - payments.filter(p => postedPayment(p.status) && p.status !== "REVERSED").reduce((sum, p) => sum + (p.unallocatedPaise || 0), 0);')
s=s.replace('academicYearName: "2026-2027",','academicYearName: demands[0]?.academicYearName || targetYear,')
s=s.replace('const targetYear = options.academicYearId || "ay_2026_27";', 'const targetYear = options.academicYearId || "all";')
write(p,s)

p='src/lib/services/fee-analytics.service.ts'; s=read(p)
s='import { postedPayment, normalizePaymentMethod } from "@/lib/fees/finance-core";\n'+s
s=s.replace('    if (matched.length > 0) {\n      allDemands = matched;\n    }','    allDemands = matched;')
s=s.replace('          const assign = docSnap.data() as any;', '          const assign = docSnap.data() as any;\n          if (selectedYear && !matchAcademicYear(assign.academicYearId, selectedYear)) return;',1)
s=s.replace('rawMethod === "CASH" ? "CASH" : rawMethod === "UPI" ? "UPI" : rawMethod === "CHEQUE" ? "CHEQUE" : "CASH"','normalizePaymentMethod(rawMethod)')
a=s.index('  // Reconcile totalOutstandingPaise with actual collections'); b=s.index('  // Refunds calculation',a)
s=s[:a]+s[b:]
s=s.replace('return !st || st === "SUCCESS" || st === "PAID" || st === "COMPLETED" || st === "PARTIALLY_REFUNDED";','return postedPayment(st) && st !== "REVERSED";')
a=s.index('  if (selectedMonth) {\n    // Filter by demands')
b=s.index('  // Refunds calculation',a)
s=s[:a]+'''  const validPaymentIds = new Set(validSuccessfulPayments.map(p => p.id));
  const activeDemandIds = new Set(activeDemands.map(d => d.id));
  if (selectedMonth) {
    totalCollectedPaise = allAllocations.filter(a => activeDemandIds.has(a.demandId) && validPaymentIds.has(a.paymentId)).reduce((sum, a) => sum + a.allocatedAmountPaise, 0);
  } else {
    totalCollectedPaise = validSuccessfulPayments.reduce((sum, p) => sum + getPaymentAmountPaise(p), 0);
  }

'''+s[b:]
s=s.replace('  totalRefundedPaise = allRefunds.reduce(\n    (sum, r) => sum + (r.amountPaise || 0),\n    0\n  );','''  totalRefundedPaise = allRefunds.filter(r => validPaymentIds.has(r.paymentId)).reduce((sum, r) => sum + (selectedMonth ? (r.allocatedRefunds || []).filter(a => activeDemandIds.has(a.demandId)).reduce((n, a) => n + a.refundedAmountPaise, 0) : r.amountPaise || 0), 0);''')
a=s.index('    // If demands don\'t track paid amount directly'); b=s.index('    const mRate',a)
s=s[:a]+s[b:]
a=s.index('    // Reconcile student\'s demands against'); b=s.index('    if (entry.totalOutstandingPaise <= 0)',a)
s=s[:a]+s[b:]
s=s.replace('((totalCollectedPaise / totalExpectedPaise) * 100)', '(((totalExpectedPaise - totalOutstandingPaise) / totalExpectedPaise) * 100)')
s=s.replace('    if (p.status === "FAILED" || p.status === "CANCELLED") continue;', '    if (!postedPayment(p.status)) continue;')
s=s.replace('methodMap[mKey].refunded += p.refundedAmountPaise || 0;', 'methodMap[mKey].refunded += p.status === "REVERSED" ? p.amountPaise : p.refundedAmountPaise || 0;')
s=s.replace('new Date(filter.endDate).getTime()', 'new Date(`${filter.endDate.slice(0, 10)}T23:59:59.999Z`).getTime()')
s=s.replace('(p) => p.academicYearId === filter.academicYearId','(p) => matchAcademicYear(p.academicYearId, filter.academicYearId)')
write(p,s)
