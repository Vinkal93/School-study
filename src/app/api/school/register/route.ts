import { NextResponse } from "next/server";
import { getSafeAdminDb, getSafeAdminAuth } from "@/lib/firebase/admin";
export async function POST(request: Request) {
  const db = getSafeAdminDb(), auth = getSafeAdminAuth();
  if (!db || !auth) return NextResponse.json({ error: "School registration requires private Firebase Admin configuration." }, { status: 503 });
  let createdUid: string | undefined;
  try {
    const input = await request.json();
    if (![input.name,input.code,input.adminName,input.adminEmail,input.adminPassword].every(v => typeof v === "string" && v.trim())) return NextResponse.json({ error: "School and administrator details are required." }, { status: 400 });
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,30}$/.test(code) || input.adminPassword.length < 6) return NextResponse.json({ error: "Use a valid school code and a password of at least six characters." }, { status: 400 });
    const plan = await db.collection("plans").doc("plan_free").get();
    const versions = await db.collection("planVersions").where("planId","==","plan_free").where("status","==","ACTIVE").get();
    const version = versions.docs.sort((a,b) => b.data().version-a.data().version)[0];
    if (!plan.exists || plan.data()?.status !== "ACTIVE" || !version || version.data().monthlyPrice !== 0 || version.data().annualPrice !== 0) return NextResponse.json({ error: "Publish an active free registration plan before accepting new schools." }, { status: 503 });
    if (!(await db.collection("schools").where("code","==",code).get()).empty) return NextResponse.json({ error: "School code is already registered." }, { status: 409 });
    const email = input.adminEmail.trim().toLowerCase();
    const user = await auth.createUser({ email, password: input.adminPassword, displayName: input.adminName.trim() });
    createdUid = user.uid;
    const schoolRef = db.collection("schools").doc();
    const now = new Date().toISOString(), end = new Date(Date.now()+30*86400000).toISOString();
    await auth.setCustomUserClaims(user.uid,{ role:"school_admin", schoolId:schoolRef.id });
    await db.runTransaction(async tx => {
      const codeRef = db.collection("schoolCodes").doc(code);
      if ((await tx.get(codeRef)).exists) throw new Error("School code is already registered.");
      tx.set(codeRef,{ schoolId:schoolRef.id,createdAt:now });
      tx.set(schoolRef,{ id:schoolRef.id,name:input.name.trim(),code,city:String(input.city||"India").trim(),state:String(input.state||"").trim(),phone:String(input.phone||"").trim(),email:String(input.email||"").trim(),status:"active",setupCompleted:false,setupStep:1,adminUid:user.uid,adminName:input.adminName.trim(),adminEmail:email,planId:"plan_free",subscriptionStatus:"TRIAL",subscriptionExpiresAt:end,createdAt:now,updatedAt:now });
      tx.set(db.collection("users").doc(user.uid),{ uid:user.uid,name:input.adminName.trim(),email,role:"school_admin",schoolId:schoolRef.id,status:"active",createdAt:now,updatedAt:now });
      tx.set(db.collection("schoolSubscriptions").doc(schoolRef.id),{ id:schoolRef.id,schoolId:schoolRef.id,planId:"plan_free",planVersionId:version.id,status:"TRIAL",billingCycle:"monthly",startsAt:now,expiresAt:end,graceEndsAt:new Date(Date.parse(end)+7*86400000).toISOString(),source:"registration_trial",createdAt:now,updatedAt:now });
    });
    createdUid = undefined;
    return NextResponse.json({ success:true,schoolId:schoolRef.id,adminUid:user.uid });
  } catch (error) {
    if (createdUid) await auth.deleteUser(createdUid).catch(() => console.error("Registration compensation failed; administrator review required."));
    return NextResponse.json({ error:error instanceof Error ? error.message : "Registration failed." },{status:503});
  }
}
