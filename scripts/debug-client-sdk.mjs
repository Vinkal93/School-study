import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAXjKi7fCJrjT6NERRM4OaKIAyT8jRFqAw",
  authDomain: "school-study-c8991.firebaseapp.com",
  projectId: "school-study-c8991",
  storageBucket: "school-study-c8991.firebasestorage.app",
  messagingSenderId: "108412631999",
  appId: "1:108412631999:web:9c8af9689a884d29b4ff0a",
};

async function inspectData() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("======================================================================");
  console.log("🔍 INSPECTING FIRESTORE REAL DATA FOR LORD@GMAIL.COM");
  console.log("======================================================================\n");

  // 1. Fetch user lord@gmail.com
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", "lord@gmail.com"));
  const usersSnap = await getDocs(q);
  console.log("Found users for lord@gmail.com:", usersSnap.docs.length);

  let userSchoolId = "";
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`User Document (${d.id}):`, {
      email: data.email,
      role: data.role,
      schoolId: data.schoolId,
    });
    userSchoolId = data.schoolId;
  });

  // 2. Fetch target school nNuxKZJOvLi3fzDhAtag
  const targetSchoolId = "nNuxKZJOvLi3fzDhAtag";
  const subTargetRef = doc(db, "schoolSubscriptions", targetSchoolId);
  const subTargetSnap = await getDoc(subTargetRef);
  console.log(`\nSubscription for target school (${targetSchoolId}):`, subTargetSnap.exists() ? JSON.stringify(subTargetSnap.data(), null, 2) : "DOES NOT EXIST");

  // 3. Fetch userSchoolId if different
  if (userSchoolId && userSchoolId !== targetSchoolId) {
    console.log(`\n⚠️ CRITICAL MISMATCH: User schoolId is "${userSchoolId}", but Super Admin modified "${targetSchoolId}"!`);
    const subUserRef = doc(db, "schoolSubscriptions", userSchoolId);
    const subUserSnap = await getDoc(subUserRef);
    console.log(`Subscription for userSchoolId (${userSchoolId}):`, subUserSnap.exists() ? JSON.stringify(subUserSnap.data(), null, 2) : "DOES NOT EXIST");
  } else if (userSchoolId) {
    console.log(`\nUser schoolId matches targetSchoolId (${targetSchoolId}).`);
  }

  // 4. Fetch all schoolSubscriptions
  const allSubRef = collection(db, "schoolSubscriptions");
  const allSubSnap = await getDocs(allSubRef);
  console.log("\nAll schoolSubscriptions in DB:", allSubSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

inspectData().catch(console.error);
