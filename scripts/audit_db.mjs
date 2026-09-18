import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const envFile = fs.readFileSync('.env.local', 'utf8');
const envConfig = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    envConfig[match[1]] = val;
  }
});

const firebaseConfig = {
  apiKey: envConfig.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: envConfig.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("--- AUDITING DATABASE ---");
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log('Total users in users collection:', usersSnap.size);
  
  const byRole = {};
  usersSnap.docs.forEach(d => {
    const r = d.data().role || 'unknown';
    byRole[r] = (byRole[r] || 0) + 1;
  });
  console.log('Users in users collection by role:', byRole);

  const topStudents = await getDocs(collection(db, 'students'));
  console.log('Total top-level students collection:', topStudents.size);

  const topTeachers = await getDocs(collection(db, 'teachers')).catch(() => ({ size: 0 }));
  console.log('Total top-level teachers collection:', topTeachers.size);

  const schoolsSnap = await getDocs(collection(db, 'schools'));
  console.log('Total schools:', schoolsSnap.size);

  for (const s of schoolsSnap.docs) {
    const schoolId = s.id;
    const sData = s.data();
    const stSnap = await getDocs(collection(db, 'schools', schoolId, 'students'));
    const tcSnap = await getDocs(collection(db, 'schools', schoolId, 'teachers'));
    console.log(`School: ${sData.name} (${sData.code || s.id}) -> subcollection students: ${stSnap.size}, teachers: ${tcSnap.size}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
