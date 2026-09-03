import { getSafeAdminDb } from "../src/lib/firebase/admin.ts";

async function checkSchoolState() {
  const adminDb = getSafeAdminDb();
  if (!adminDb) {
    console.error("No Admin DB");
    process.exit(1);
  }

  const schoolId = "nNuxKZJOvLi3fzDhAtag"; // Lord Budha public school
  console.log(`Checking state for school: ${schoolId}...`);

  const subSnap = await adminDb.collection("schoolSubscriptions").doc(schoolId).get();
  console.log("schoolSubscriptions doc exists:", subSnap.exists);
  if (subSnap.exists) {
    console.log("schoolSubscriptions data:", JSON.stringify(subSnap.data(), null, 2));
  }

  const overridesSnap = await adminDb.collection("accessOverrides").where("schoolId", "==", schoolId).get();
  console.log("accessOverrides count:", overridesSnap.docs.length);
  overridesSnap.docs.forEach((d) => {
    console.log(`Override ${d.id}:`, JSON.stringify(d.data(), null, 2));
  });
}

checkSchoolState();
