const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let configured = true, lookups = 0, checks = 0;
let profile = { role: 'school_admin', schoolId: 'school-a', status: 'active', email: 'admin@example.test' };
const mocks = {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  '@/lib/firebase/client': { getFirebaseDb: () => { throw Error('Unexpected client fallback'); } },
  'firebase/firestore': {},
  '@/lib/firebase/admin': {
    getSafeAdminAuth: () => configured ? { verifyIdToken: async (token, revoked) => {
      checks++; assert.equal(revoked, true);
      if (token !== 'verified-token') throw Error('Invalid token');
      return { uid: 'verified-user', email: 'admin@example.test' };
    } } : null,
    getSafeAdminDb: () => ({ collection: () => ({ doc: uid => {
      lookups++; assert.equal(uid, 'verified-user');
      return { get: async () => ({ exists: true, data: () => profile }) };
    } }) }),
  },
  './schoolValidation': {
    validateSchoolStatus: async (schoolId) => ({ valid: true, allowed: true, status: 'active', statusHttp: 200 }),
    validateTenantMember: async (user, targetSchoolId) => {
      if (user.status && user.status !== 'active') return { valid: false, allowed: false, statusHttp: 403, error: 'User inactive' };
      if (targetSchoolId && user.schoolId !== targetSchoolId) return { valid: false, allowed: false, statusHttp: 403, error: 'Cross-tenant' };
      return { valid: true, allowed: true, status: 'active', statusHttp: 200 };
    },
    buildValidationErrorResponse: (result) => ({ status: result.statusHttp || 403, body: { error: result.error } }),
  },
};
const subject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/auth/serverAuth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: subject, require: id => {
  assert.ok(mocks[id], 'Unexpected dependency: ' + id); return mocks[id];
}, process: { env: {} }, Buffer, fetch: () => { throw Error('Unexpected REST fallback'); } });
const req = headers => ({ headers: new Headers(headers) });
(async () => {
  const forged = 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ sub: 'victim', email: 'admin@schoolstudy.com' })).toString('base64url') + '.';
  const invalid = [{}, { 'x-user-id': 'victim' }, { authorization: 'Bearer victim' },
    { authorization: 'Bearer ' + forged }, { cookie: 'fake__session=verified-token' },
    { authorization: 'Bearer expired', cookie: '__session=verified-token' },
    { cookie: 'auth_token=' + forged }];
  for (const headers of invalid) assert.equal((await subject.authenticateRequest(req(headers))).errorResponse.status, 401);
  assert.equal(lookups, 0, 'Unverified identities must never reach profile storage');
  configured = false;
  assert.equal((await subject.authenticateRequest(req({ authorization: 'Bearer verified-token' }))).errorResponse.status, 503);
  assert.equal(lookups, 0);
  configured = true;
  for (const headers of [{ authorization: 'Bearer verified-token', 'x-user-id': 'victim' },
    { cookie: '__session=verified-token' }, { cookie: 'other=x; auth_token=verified-token' }]) {
    assert.equal((await subject.authenticateRequest(req(headers))).user.uid, 'verified-user');
  }
  const signed = req({ authorization: 'Bearer verified-token' });
  assert.equal((await subject.requireSchoolAdmin(signed, 'school-b')).errorResponse.status, 403);
  assert.equal((await subject.requireSchoolAdmin(signed, 'school-a')).user.schoolId, 'school-a');
  profile.email = 'admin@schoolstudy.com';
  assert.equal((await subject.requireSuperAdmin(signed)).errorResponse.status, 403, 'Editable email cannot grant platform access');
  profile.status = 'disabled';
  assert.equal((await subject.authenticateRequest(signed)).errorResponse.status, 403);
  profile.status = 'active'; profile.forceLogout = true;
  assert.equal((await subject.authenticateRequest(signed)).errorResponse.status, 401);
  profile.forceLogout = false; profile.role = 'super_admin';
  assert.equal((await subject.requireSuperAdmin(signed)).user.role, 'super_admin');
  assert.ok(checks > 0);
  console.log('PASS server auth boundary: 17 actual-module scenarios; Firebase dependencies mocked.');
})().catch(error => { console.error(error); process.exitCode = 1; });
