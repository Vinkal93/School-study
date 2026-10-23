const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
let configured = false, tokenValid = true, role = 'school_admin', configuredDb = null, lookups = 0, planAllowed = true;
const database = {};
const mocks = {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  '@/lib/firebase/admin': { getSafeAdminAuth: () => configured ? { verifyIdToken: async token => { if (!tokenValid || token !== 'signed-token') throw Error('Invalid'); } } : null, getSafeAdminDb: () => configured ? database : null },
  '@/lib/auth/serverAuth': { authenticateRequest: async () => { lookups++; return { isAuthenticated: true, user: { role, schoolId: 'own-school' } }; } },
  '@/lib/billing/featureAccess': {requireFeatureAccess:async()=>{if(!planAllowed)throw Error('Plan expired');}},
  './firestore': { configureFeeServerDatabase: db => { configuredDb = db; } },
};
const exportsObject = {};
const code = ts.transpileModule(fs.readFileSync('src/lib/fees/server-access.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(code, { exports: exportsObject, require: id => { assert.ok(mocks[id], 'Unexpected dependency: '+id); return mocks[id]; } });
const request = token => ({ headers: new Headers(token ? { authorization: 'Bearer '+token } : {}) });
(async () => {
  assert.equal((await exportsObject.requireFeeAccess(request('signed-token'))).errorResponse.status,503);
  assert.equal(lookups,0);
  configured = true;
  assert.equal((await exportsObject.requireFeeAccess(request())).errorResponse.status,401);
  assert.equal((await exportsObject.requireFeeAccess(request('forged-uid'))).errorResponse.status,401);
  assert.equal(lookups,0);
  role = 'student';
  assert.equal((await exportsObject.requireFeeAccess(request('signed-token'))).errorResponse.status,403);
  assert.equal(configuredDb,null);
  role = 'school_admin';
  const result = await exportsObject.requireFeeAccess(request('signed-token'));
  assert.equal(result.user.schoolId,'own-school');
  assert.equal(configuredDb,database);
  planAllowed=false;
  assert.equal((await exportsObject.requireFeeAccess(request('signed-token'))).errorResponse.status,403);
  console.log('PASS 6 fee-server configuration/authentication scenarios (isolated mocks).');
})().catch(error => { console.error(error); process.exitCode = 1; });
