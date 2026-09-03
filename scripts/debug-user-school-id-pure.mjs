import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function run() {
  if (getApps().length === 0) {
    initializeApp({
      projectId: "school-study-app",
    });
  }

  const db = getFirestore();
  console.log("======================================================================");
  console.log("🔍 INSPECTING FIRESTORE DATA FOR USER & SUBSCRIPTIONS");
  console.log("======================================================================\n");

  const usersSnap = await db.collection("users").where("email", "==", "lord@gmail.com").get();
  console.log("Found users matching lord@gmail.com:", usersSnap.docs.length);
  let userSchoolId = "";

  usersSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`User Document ID: ${d.id}`, {
      email: data.email,
      role: data.role,
      schoolId: data.schoolId,
    });
    userSchoolId = data.schoolId;
  });

  const targetSchoolId = "nNuxKZJOvLi3fzDhAtag";
  console.log(`\nChecking schoolSubscriptions for targetSchoolId: ${targetSchoolId}`);
  const targetSub = await db.collection("schoolSubscriptions").doc(targetSchoolId).get();
  if (targetSub.exists) {
    console.log("Target Subscription Data:", JSON.stringify(targetSub.data(), null, 2));
  } else {
    console.log("Target Subscription document DOES NOT EXIST!");
  }

  if (userSchoolId && userSchoolId !== targetSchoolId) {
    console.log(`\n⚠️ CRITICAL MISMATCH: User lord@gmail.com is attached to schoolId "${userSchoolId}", but Super Admin modified "${targetSchoolId}"!`);
    const userSub = await db.collection("schoolSubscriptions").doc(userSchoolId).get();
    if (userSub.exists) {
      console.log(`Subscription for userSchoolId (${userSchoolId}):`, JSON.stringify(userSub.data(), null, 2));
    } else {
      console.log(`Subscription document for userSchoolId (${userSchoolId}) DOES NOT EXIST!`);
    }
  }

  console.log("\nAll schoolSubscriptions in DB:");
  const allSubs = await db.collection("schoolSubscriptions").get();
  allSubs.docs.forEach((d) => {
    console.log(`Sub Doc [${d.id}]:`, JSON.stringify(d.data(), null, 2));
  });
}

run().catch(console.error);
