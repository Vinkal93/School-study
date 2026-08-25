/**
 * Super Admin Account Creation Script
 * Usage: node scripts/create-super-admin.mjs <email> <password> <name>
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local using Node.js built-in env loader
try {
  process.loadEnvFile(resolve(__dirname, "../.env.local"));
} catch (e) {
  console.warn("Could not load .env.local automatically:", e.message);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const email = process.argv[2] || "superadmin@schoolstudy.com";
const password = process.argv[3] || "Admin@12345";
const name = process.argv[4] || "Super Administrator";

console.log("🚀 Initializing Firebase App with Project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log(`\n👤 Creating Super Admin account:`);
  console.log(`   Email: ${email}`);
  console.log(`   Name:  ${name}`);
  console.log(`   Role:  super_admin`);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    console.log(`✅ Firebase Auth user created! (UID: ${uid})`);

    const userDoc = {
      uid,
      name,
      email: email.toLowerCase(),
      role: "super_admin",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", uid), userDoc);
    console.log(`✅ Firestore user profile created at users/${uid}`);
    console.log(`\n🎉 Super Admin setup completed successfully!`);
    console.log(`👉 You can now log in at: http://localhost:3000/login with:`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}\n`);
    process.exit(0);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log(`\nℹ️ Note: Account ${email} is already registered on Firebase.`);
      console.log(`👉 You can log in directly at http://localhost:3000/login with your password.`);
      process.exit(0);
    }
    console.error(`\n❌ Error creating Super Admin:`, error.message);
    process.exit(1);
  }
}

main();
