import { getSafeAdminDb } from "../src/lib/firebase/admin.ts";

async function debugUserAndSchool() {
  const adminDb = getSafeAdminDb();
  if (!adminDb) {
    console.error("No Admin DB");
    process.exit(1);
  }

  console.log("======================================================================");
  console.log("🔍 DEBUGGING USER AND SCHOOL ID MISMATCH");
  console.log("======================================================================\n");

  // 1. Search for user lord@gmail.com
  const usersSnap = await adminDb.collection("users").where("email", "==", "lord@gmail.com").get();
  console.log("Found users for lord@gmail.com:", usersSnap.docs.length);

  let userSchoolId = "";
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(`User Doc (${d.id}):`, {
      uid: d.id,
      email: data.email,
      role: data.role,
      schoolId: data.schoolId,
      tenantId: data.tenantId,
    });
    userSchoolId = data.schoolId;
  });

  // 2. Search for school Lord buddha public school (nNuxKZJOvLi3fzDhAtag)
  const targetSchoolId = "nNuxKZJOvLi3fzDhAtag";
  const schoolDoc = await adminDb.collection("schools").doc(targetSchoolId).get();
  console.log(`\nTarget School Doc (${targetSchoolId}):`, schoolDoc.exists ? schoolDoc.data() : "DOES NOT EXIST");

  // 3. Fetch schoolSubscriptions for targetSchoolId (nNuxKZJOvLi3fzDhAtag)
  const subTarget = await adminDb.collection("schoolSubscriptions").doc(targetSchoolId).get();
  console.log(`\nSubscription for targetSchoolId (${targetSchoolId}):`, subTarget.exists ? subTarget.data() : "DOES NOT EXIST");

  // 4. If userSchoolId is different from targetSchoolId, fetch subscription for userSchoolId!
  if (userSchoolId && userSchoolId !== targetSchoolId) {
    console.log(`\n⚠️ MISMATCH DETECTED! User schoolId is "${userSchoolId}", but Super Admin edited "${targetSchoolId}"!`);
    const subUserSchool = await adminDb.collection("schoolSubscriptions").doc(userSchoolId).get();
    console.log(`Subscription for userSchoolId (${userSchoolId}):`, subUserSchool.exists ? subUserSchool.data() : "DOES NOT EXIST");
  } else {
    console.log(`\nUser schoolId matches targetSchoolId (${targetSchoolId}).`);
  }

  // 5. Fetch ALL schoolSubscriptions in Firestore
  const allSubs = await adminDb.collection("schoolSubscriptions").get();
  console.log("\nAll schoolSubscriptions documents in Firestore:", allSubs.docs.map((d) => ({ id: d.id, ...d.data() })));
}

debugUserAndSchool().catch(console.error);
