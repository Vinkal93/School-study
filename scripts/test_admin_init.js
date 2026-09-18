const fs = require('fs');
const admin = require('firebase-admin');

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

const cert = {
  projectId: envConfig.FIREBASE_PROJECT_ID || envConfig.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: envConfig.FIREBASE_CLIENT_EMAIL,
  privateKey: envConfig.FIREBASE_PRIVATE_KEY ? envConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
};

console.log('Project ID:', cert.projectId);
console.log('Client Email:', cert.clientEmail ? cert.clientEmail.substring(0, 15) + '...' : 'NONE');
console.log('Has Private Key:', Boolean(cert.privateKey));

if (cert.clientEmail && cert.privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert(cert)
  });
  const db = admin.firestore();
  db.collection('users').get().then(async snap => {
    console.log('Successfully connected to Firestore Admin! Users count in users collection:', snap.size);
    const byRole = {};
    snap.docs.forEach(d => {
      const r = d.data().role || 'unknown';
      byRole[r] = (byRole[r] || 0) + 1;
    });
    console.log('Users by role in users collection:', JSON.stringify(byRole));
    
    const topStudents = await db.collection('students').get();
    console.log('Top-level students collection count:', topStudents.size);

    const schoolsSnap = await db.collection('schools').get();
    console.log('Schools count:', schoolsSnap.size);
    for (const s of schoolsSnap.docs) {
      const schoolId = s.id;
      const sData = s.data();
      const stSnap = await db.collection('schools').doc(schoolId).collection('students').get();
      const tcSnap = await db.collection('schools').doc(schoolId).collection('teachers').get();
      console.log('School: ' + sData.name + ' (' + (sData.code || s.id) + ') -> students: ' + stSnap.size + ', teachers: ' + tcSnap.size);
    }
  }).catch(err => {
    console.error('Error connecting:', err);
  });
}
