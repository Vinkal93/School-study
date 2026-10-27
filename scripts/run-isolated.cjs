// Run builds/dev/tests without inheriting local production credentials.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/FIREBASE|GOOGLE_APPLICATION_CREDENTIALS|RAZORPAY|TWILIO|SENTRY|EMAIL_|COMMUNICATION_|CRON_SECRET/.test(key)) env[key] = '';
}
for (const file of fs.readdirSync('.').filter(name => /^\.env(?:\.|$)/.test(name))) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) env[match[1]] = '';
}
Object.assign(env, {
  FIREBASE_PROJECT_ID: 'demo-school-study', GCLOUD_PROJECT: 'demo-school-study',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-school-study',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-school-study.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-school-study.appspot.com',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789012:web:0123456789abcdef',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789012',
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
  NEXT_TELEMETRY_DISABLED: '1', NEXT_BUILD_DIR: '.next-verification',
});
const args = process.argv.slice(2);
if (!args.length) throw Error('Pass a Node entry point and arguments.');
const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
