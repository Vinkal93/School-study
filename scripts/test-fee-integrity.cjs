// Tests production fee calculations and transactions without touching a school database.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '..');
let records = new Map(), failJournal = false, queue = Promise.resolve();
const clone = value => value === undefined ? undefined : structuredClone(value);
const ref = (...parts) => ({ path: parts.join('/'), id: parts.at(-1) });
const snap = reference => ({ id: reference.id, ref: reference, exists: () => records.has(reference.path), data: () => clone(records.get(reference.path)) });
const repo = {
  getFirebaseDb: () => ({}),
  doc: (_db, ...parts) => ref(...parts),
  collection: (_db, ...parts) => ref(...parts),
  getDoc: async reference => snap(reference),
  setDoc: async (reference, value, options) => records.set(reference.path, clone(options?.merge ? { ...records.get(reference.path), ...value } : value)),
  where: (field, op, value) => ({ field, op, value }),
  serverTimestamp: () => new Date(),
  query: (reference, ...filters) => ({ ...reference, filters: [...reference.filters || [], ...filters] }),
  limit: count => ({ limit: count }),
  getDocs: async reference => {
    const docs = [...records.entries()].filter(([key, value]) => key.startsWith(reference.path + '/') && key.split('/').length === reference.path.split('/').length + 1 && (reference.filters || []).every(f => f.limit || f.op === '==' && value[f.field] === f.value)).map(([key]) => snap(ref(...key.split('/'))));
    return { docs, empty: !docs.length, size: docs.length, forEach: fn => docs.forEach(fn) };
  },
  runTransaction: async (_db, fn) => {
    const execute = async () => {
      const writes = []; let writeStarted = false;
      const result = await fn({
        get: async reference => { assert.equal(writeStarted, false, 'Firestore transaction reads must precede writes'); return snap(reference); },
        set: (reference, value, options) => { writeStarted = true; writes.push([reference, value, options?.merge]); },
        update: (reference, value) => { writeStarted = true; assert(records.has(reference.path)); writes.push([reference, value, true]); },
      });
      if (failJournal && writes.some(([r]) => r.path.startsWith('journalEntries/'))) throw new Error('Simulated journal write failure');
      for (const [r, value, merge] of writes) records.set(r.path, clone(merge ? { ...records.get(r.path), ...value } : value));
      return result;
    };
    const promise = queue.then(execute); queue = promise.catch(() => {}); return promise;
  },
};
const accounts = ['1010','1020','1030','1040','2010','4010','4020','4030','4040','4050','4090','5010'].map(code => ({ id: code, schoolId:'s', code, name: code, category: code[0] === '1' ? 'ASSET' : code[0] === '4' ? 'INCOME' : 'EXPENSE', normalBalance: ['1','5'].includes(code[0]) ? 'DEBIT' : 'CREDIT', isActive: true }));
const modules = new Map();
function load(file) {
  const full = path.resolve(root, file);
  if (modules.has(full)) return modules.get(full).exports;
  const module = { exports: {} }; modules.set(full, module);
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const foundationHelpers = { matchAcademicYear: (...args) => core.sameAcademicYear(...args), paiseToRupees: value => value / 100, rupeesToPaise: value => core.moneyPaise(value), formatINR: value => String(value / 100) };
  const localRequire = name => name === '@/lib/fees/firestore' ? repo : name === './accounting.service' ? { getChartOfAccounts: async () => accounts } : name === './fee-mutations.service' ? load('src/lib/services/fee-mutations.service.ts') : ['./fee-foundation.service','@/lib/services/fee-foundation.service'].includes(name) ? foundationHelpers : name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts') : require(name);
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { crypto: { randomUUID }, Date, console, Map, Set })(localRequire,module,module.exports);
  return module.exports;
}
const core = load('src/lib/fees/finance-core.ts');
const mutations = load('src/lib/services/fee-mutations.service.ts');
const ledger = load('src/lib/services/fee-ledger.service.ts');
const accounting = load('src/lib/services/accounting.service.ts');
const foundation = load('src/lib/services/fee-foundation.service.ts');
const analytics = load('src/lib/services/fee-analytics.service.ts');
const demand = (id, amount, period='April 2026', year='2026-27') => ({ id, schoolId:'s', studentId:'student', academicYearId:year, feeHeadId:id, feeHeadName:id, period, dueDate:'2026-04-10', grossAmountPaise:amount, discountAmountPaise:0, concessionAmountPaise:0, lateFeePaise:0, finePaise:0, netAmountPaise:amount, paidAmountPaise:0, balanceAmountPaise:amount, status:'DUE' });
function seed() {
  records = new Map([['schools/s/students/student',{ name:'A', className:'1', sectionName:'A', admissionNumber:'1' }], ['feeSettings/s',{ receiptPrefix:'REC', receiptSequence:0, paymentMethods:['Cash'] }], ['feeDemands/tuition',demand('tuition',10000)], ['feeDemands/transport',demand('transport',5000)], ['feeDemands/otherYear',demand('otherYear',9000,'April 2025','2025-26')]]);
  failJournal = false;
  for (const account of accounts) records.set(`chartOfAccounts/${account.id}`,account);
}
const input = { studentId:'student', studentName:'A', className:'1', sectionName:'A', admissionNumber:'1', academicYearId:'2026-27', amountPaidRupees:80, paymentMethod:'CASH', paymentDate:'2026-10-03', actorId:'admin', idempotencyKey:'one', targetDemandIds:['tuition','transport'] };
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS', name); }
(async () => {
  await test('Money validation and exact session isolation', () => {
    assert.equal(core.moneyPaise(0.29),29); for (const v of [NaN, Infinity, -1]) assert.throws(() => core.moneyPaise(v));
    assert(core.sameAcademicYear('ay_2026_27','2026-2027')); assert(!core.sameAcademicYear('','2026-27')); assert(!core.sameAcademicYear('2025-26','2026-27'));
  });
  await test('Duplicate structure creation is serialized; update cannot change tenant identity', async () => {
    seed();
    const config={academicYearId:'2026-27',academicYearName:'2026-27',feeHeadId:'tuition',feeHeadName:'Tuition',className:'1',title:'Tuition',amountRupees:100,frequency:'monthly'};
    const results=await Promise.allSettled([foundation.createFeeStructureDefinition('s',config),foundation.createFeeStructureDefinition('s',config)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const structure=results.find(r=>r.status==='fulfilled').value;
    const updated=await foundation.updateFeeStructureDefinition('s',structure.id,{schoolId:'other',academicYearId:'2025-26',amountRupees:101});
    assert.equal(updated.schoolId,'s'); assert.equal(updated.academicYearId,'2026-27'); assert.equal(updated.version,2);
    await assert.rejects(()=>foundation.createFeeStructureDefinition('s',{...config,amountRupees:NaN}),/finite/);
  });
  await test('Single and bulk fee generation agree and retries preserve paid invoices', async () => {
    seed(); for(const key of [...records.keys()]) if(key.startsWith('feeDemands/')) records.delete(key);
    records.get('schools/s/students/student').status='active';
    await foundation.createFeeStructureDefinition('s',{academicYearId:'2026-27',academicYearName:'2026-27',feeHeadId:'tuition',feeHeadName:'Tuition',className:'1',title:'Tuition',amountRupees:100,frequency:'monthly'});
    const first=await foundation.generateBulkFeeDemands('s',{academicYearId:'2026-27',academicYearName:'2026-27',studentIds:['student']});
    assert.deepEqual(Array.from(first.errors),[]); assert.equal(first.newlyGenerated,12);
    const invoice=first.demands[0]; await mutations.collectPayment('s',{...input,targetDemandIds:[invoice.id],amountPaidRupees:50});
    const repeated=await foundation.generateStudentFeeDemands('s',{id:'student'},'2026-27','2026-27');
    assert.equal(repeated.length,12); assert.equal(records.get(`feeDemands/${invoice.id}`).paidAmountPaise,5000);
    assert.equal([...records.keys()].filter(key=>key.startsWith('journalEntries/') && records.get(key).referenceType==='FEE_DEMAND').length,12);
  });
  await test('Partial multi-head payment preserves invoice charges and posts balanced journal', async () => {
    seed(); const result = await mutations.collectPayment('s',input);
    assert.equal(result.payment.amountPaise,8000); assert.equal(records.get('feeDemands/tuition').grossAmountPaise,10000);
    assert.equal([...records.values()].filter(v=>v.schoolId==='s' && v.studentId==='student' && v.balanceAmountPaise !== undefined && v.academicYearId==='2026-27').reduce((sum,d)=>sum+d.balanceAmountPaise,0),7000);
    assert.equal(records.get('feeDemands/otherYear').paidAmountPaise,0);
    const journals=[...records.entries()].filter(([p])=>p.startsWith('journalEntries/')).map(([,v])=>v); assert.equal(journals.length,1); assert.equal(journals[0].totalDebitPaise,journals[0].totalCreditPaise);
  });
  await test('Concurrent duplicate payment produces one receipt and one allocation set', async () => {
    seed(); const [a,b]=await Promise.all([mutations.collectPayment('s',input),mutations.collectPayment('s',input)]);
    assert.equal(a.payment.id,b.payment.id); assert.equal(records.get('feeSettings/s').receiptSequence,1); assert.equal(records.get('feeDemands/tuition').paidAmountPaise+records.get('feeDemands/transport').paidAmountPaise,8000);
    await assert.rejects(()=>mutations.collectPayment('s',{...input,amountPaidRupees:79}),/different payment/);
  });
  await test('Reject overpayment, wrong-session target, disabled method and missing student', async () => {
    seed(); await assert.rejects(()=>mutations.collectPayment('s',{...input,amountPaidRupees:151}),/exceeds/);
    await assert.rejects(()=>mutations.collectPayment('s',{...input,targetDemandIds:['otherYear']}),/invalid/);
    await assert.rejects(()=>mutations.collectPayment('s',{...input,paymentMethod:'UPI',referenceNumber:'123'}),/disabled/);
    await assert.rejects(()=>mutations.collectPayment('s',{...input,studentId:'missing'}),/Student not found/);
    assert.equal(records.get('feeSettings/s').receiptSequence,0);
  });
  await test('Discount is relief, not cash: invoices and journal agree', async () => {
    seed(); const r=await mutations.collectPayment('s',{...input,discountRupees:20});
    assert.equal(r.payment.amountPaise,8000); assert.equal(records.get('feeDemands/tuition').discountAmountPaise+records.get('feeDemands/transport').discountAmountPaise,2000);
    assert.equal(records.get('feeDemands/tuition').balanceAmountPaise+records.get('feeDemands/transport').balanceAmountPaise,5000);
    for (const [key,v] of records) if (key.startsWith('journalEntries/')) assert.equal(v.totalDebitPaise,v.totalCreditPaise);
  });
  await test('Repeated partial refunds consume allocations once and restore dues', async () => {
    seed(); const {payment}=await mutations.collectPayment('s',input);
    await mutations.returnPayment('s',{paymentId:payment.id,amountRupees:30,reason:'Correction',actorId:'admin'},false);
    const r=await mutations.returnPayment('s',{paymentId:payment.id,amountRupees:50,reason:'Correction',actorId:'admin'},false);
    assert.equal(r.updatedPayment.status,'REFUNDED'); assert.equal(r.updatedPayment.refundedAmountPaise,8000);
    assert.equal(records.get('feeDemands/tuition').balanceAmountPaise+records.get('feeDemands/transport').balanceAmountPaise,15000);
    await assert.rejects(()=>mutations.returnPayment('s',{paymentId:payment.id,amountRupees:1,reason:'Again'},false),/refundable/);
  });
  await test('Network retry of a partial refund does not return money twice', async () => {
    seed(); const {payment}=await mutations.collectPayment('s',input);
    const request={paymentId:payment.id,amountRupees:20,reason:'Return',idempotencyKey:'retry'};
    const [a,b]=await Promise.all([mutations.returnPayment('s',request,false),mutations.returnPayment('s',request,false)]);
    assert.equal(a.refund.id,b.refund.id); assert.equal(records.get(`financialPayments/${payment.id}`).refundedAmountPaise,2000);
  });
  await test('Concurrent adjustment retries apply the relief once', async () => {
    seed(); const request={demandId:'tuition',studentId:'student',academicYearId:'2026-27',type:'DISCOUNT',amountRupees:20,reason:'Approved',approvedBy:'admin',idempotencyKey:'relief'};
    await Promise.all([mutations.adjustInvoice('s',request),mutations.adjustInvoice('s',request)]);
    assert.equal(records.get('feeDemands/tuition').discountAmountPaise,2000);
    assert.equal([...records.keys()].filter(key=>key.startsWith('feeAdjustments/')).length,1);
  });
  await test('Penalty relief cannot be applied beyond the original penalty across requests', () => {
    const invoice=core.recalculateDemand({...demand('fine',10000),finePaise:1000});
    const first=core.adjustedDemand(invoice,'FINE_REDUCTION',800);
    assert.throws(()=>core.adjustedDemand(first,'FINE_REDUCTION',300),/penalties/);
  });
  await test('Production student ledger, cashbook and trial balance reconcile after discount and refund', async () => {
    seed();
    await repo.runTransaction({},tx=>{for(const id of ['tuition','transport']) mutations.writeDemandJournal(tx,accounts,records.get(`feeDemands/${id}`),'admin');});
    const {payment}=await mutations.collectPayment('s',{...input,discountRupees:20});
    await mutations.returnPayment('s',{paymentId:payment.id,amountRupees:30,reason:'Return'},false);
    const student=await ledger.getStudentLedger('s','student',{academicYearId:'2026-27'});
    assert.equal(student.summary.closingOutstandingPaise,8000);
    const cash=await ledger.getAccountLedger('s','ALL',{academicYearId:'2026-27'}); assert.equal(cash.summary.closingBalancePaise,5000);
    const trial=await accounting.getTrialBalance('s',{academicYearId:'2026-27'}); assert.equal(trial.isBalanced,true);
    assert.equal(trial.rows.find(a=>a.accountCode==='1040').netDebitPaise,8000);
  });
  await test('Student and general ledgers carry transactions before the selected start date', async () => {
    seed(); await repo.runTransaction({},tx=>{for(const id of ['tuition','transport']) mutations.writeDemandJournal(tx,accounts,records.get(`feeDemands/${id}`),'admin');});
    await mutations.collectPayment('s',input);
    const student=await ledger.getStudentLedger('s','student',{academicYearId:'2026-27',startDate:'2026-10-01'});
    assert.equal(student.summary.openingBalancePaise,15000); assert.equal(student.summary.closingOutstandingPaise,7000);
    const general=await accounting.getGeneralLedger('s','1040',{academicYearId:'2026-27',startDate:'2026-10-01'});
    assert.equal(general.openingBalancePaise,15000); assert.equal(general.closingBalancePaise,7000);
  });
  await test('Reversal restores invoice and rejects reversal after partial refund', async () => {
    seed(); const {payment}=await mutations.collectPayment('s',input);
    const r=await mutations.returnPayment('s',{paymentId:payment.id,reason:'Duplicate',actorId:'admin'},true); assert.equal(r.updatedPayment.status,'REVERSED'); assert.equal(core.netPaymentPaise(r.updatedPayment),0);
    seed(); const p=await mutations.collectPayment('s',input); await mutations.returnPayment('s',{paymentId:p.payment.id,amountRupees:1,reason:'Return'},false);
    await assert.rejects(()=>mutations.returnPayment('s',{paymentId:p.payment.id,reason:'Reverse'},true),/partially refunded/);
  });
  await test('Journal failure rolls back receipt, allocation, invoice and sequence together', async () => {
    seed(); failJournal=true; await assert.rejects(()=>mutations.collectPayment('s',input),/journal write failure/);
    assert.equal(records.get('feeDemands/tuition').paidAmountPaise,0); assert.equal(records.get('feeSettings/s').receiptSequence,0); assert.equal([...records.keys()].filter(k=>k.startsWith('financialPayments/')).length,0);
  });
  await test('Expense and voucher commit atomically and cashbook records the outflow', async () => {
    seed();
    const data={academicYearId:'2026-27',expenseAccountId:'5010',expenseAccountCode:'5010',expenseAccountName:'Expense',paymentMethod:'CASH',paymentAccountId:'1010',paymentAccountName:'Cash',amountPaise:1000,expenseDate:'2026-10-03',payeeName:'Vendor',category:'Supplies',description:'Stationery'};
    const result=await accounting.recordSchoolExpense('s',data,{id:'admin'});
    assert.equal(records.get(`schoolExpenses/${result.expense.id}`).voucherNumber,result.journalEntry.voucherNumber);
    const cash=await ledger.getAccountLedger('s','ALL',{academicYearId:'2026-27'}); assert.equal(cash.summary.closingBalancePaise,-1000);
    seed(); failJournal=true; await assert.rejects(()=>accounting.recordSchoolExpense('s',data,{id:'admin'}),/journal write failure/);
    assert.equal([...records.keys()].filter(key=>key.startsWith('schoolExpenses/')).length,0);
  });
  await test('Class reports isolate academic years and count each student in one payment category', async () => {
    seed();
    for (const key of ['tuition','transport','otherYear']) records.get(`feeDemands/${key}`).className='1';
    Object.assign(records.get('feeDemands/tuition'), {paidAmountPaise:10000,balanceAmountPaise:0,status:'PAID'});
    const current=await analytics.getClassCollectionSummary('s',{academicYearId:'2026-27'});
    assert.equal(current.length,1); assert.equal(current[0].expectedPaise,15000);
    assert.equal(current[0].studentCount,1); assert.equal(current[0].paidStudentsCount,0); assert.equal(current[0].partialStudentsCount,1); assert.equal(current[0].dueStudentsCount,0);
    const past=await analytics.getClassCollectionSummary('s',{academicYearId:'2025-26'}); assert.equal(past[0].expectedPaise,9000);
  });
  console.log(`${count} production integrity scenarios passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
