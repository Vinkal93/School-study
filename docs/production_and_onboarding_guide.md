# SchoolStudy SaaS — Production Deployment & School Onboarding Guide

This guide details the exact procedures for deploying SchoolStudy SaaS to production and onboarding your first real school tenant.

---

## 1. Final Firebase MVP Architecture Map

```
Firebase
│
├── Authentication
│   └── users (email / password auth with UID pointers)
│
├── Firestore
│   ├── users/{uid}
│   ├── schools/{schoolId}
│   │   ├── academicYears/{yearId}
│   │   ├── classes/{classId}
│   │   │   └── sections/{sectionId}
│   │   ├── teachers/{teacherId}
│   │   └── students/{studentId}
│   ├── attendance/{schoolId_studentId_date}  <-- Deterministic Duplicate-Proof IDs
│   └── notices/{noticeId}                    <-- Multi-Audience Target Board
│
├── Storage
│   ├── schools/{schoolId}/logo/{filename}
│   ├── students/{studentId}/profile/{filename}
│   └── teachers/{teacherId}/profile/{filename}
│
├── Security Rules
│   ├── firestore.rules (Multi-tenant isolation & IDOR protection)
│   └── storage.rules (MIME validation & tenant boundary enforcement)
│
└── Frontend (Next.js 16 + Turbopack + Tailwind CSS v4)
    ├── Super Admin Dashboard (/super-admin)
    ├── School Admin Management & 5-Step Setup Wizard (/admin)
    ├── Teacher Portal with 48px Touch Target Mobile Roll Call (/teacher)
    ├── Student Portal with Live Attendance Percentage Meter (/student)
    └── Responsive Mobile Drawer + Bottom 1-Tap Navigation Bar
```

---

## 2. Production Deployment Steps

### Step 1: Deploy Firebase Security Rules & Indexes
Ensure Firebase CLI is installed and log in to your production Firebase project:
```bash
# 1. Deploy Firestore Security Rules & Compound Indexes
firebase deploy --only firestore:rules,firestore:indexes

# 2. Deploy Storage Security Rules
firebase deploy --only storage
```

### Step 2: Configure Production Environment Variables
On your production hosting provider (Vercel, Google Cloud Run, or Firebase App Hosting), configure the following environment secrets:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-production-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-app
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-production-app.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=108412631999
NEXT_PUBLIC_FIREBASE_APP_ID=1:108412631999:web:...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

### Step 3: Build & Deploy Web Application
```bash
npm run build
```

---

## 3. First Real School Onboarding Runbook (SOP)

### Step 1: Super Admin Provisions the School Tenant
1. Super Admin logs in at `/login` and accesses `/super-admin/schools/new`.
2. Fills in the School Profile:
   - **School Name**: e.g., *St. Xavier International Academy*
   - **School Code**: e.g., *SXIA-DEL* (unique identifier)
   - **Contact Details**: Phone, Email, Address, City, State
   - **Brand Logo**: Upload school crest (automatically compressed via Canvas).
3. Provisions the initial **School Admin** account:
   - Admin Name: e.g., *Dr. Rajesh Mehra*
   - Admin Email: `admin@sxia.edu.in`
   - Initial Password: `••••••••`
4. Submits form ➔ Firebase creates School document, isolated Auth account, and user profile.

---

### Step 2: School Admin Completes Onboarding Wizard
1. School Admin logs in at `/login` with credentials provided in Step 1.
2. System navigates to `/admin/setup` (5-Step Onboarding Wizard):
   - **Step 1**: Confirm School Details & Address.
   - **Step 2**: Create Academic Session (`2026-27`).
   - **Step 3**: Create Initial Classes (e.g., `Class 9`, `Class 10`, `Class 11`, `Class 12`).
   - **Step 4**: Define Section Divisions (`Section A`, `Section B`).
   - **Step 5**: Review & Launch School Portal.

---

### Step 3: School Admin Enrolls Faculty & Assigns Classes
1. In `/admin/teachers`, click "+ Add New Teacher":
   - Employee ID: `TCH-001`
   - Name: `Rahul Sharma`
   - Email: `rahul.sharma@sxia.edu.in`
   - Password: `••••••••`
   - Photo: Upload portrait photo.
   - Primary Assignment: `Class 10 - Section A`.
2. Submit ➔ Isolated Auth creates teacher account and assigns class.

---

### Step 4: School Admin Enrolls Students
1. In `/admin/students`, click "+ Enroll Student":
   - Admission Number: `ADM-2026-001` (Checked for duplicate uniqueness).
   - Full Name: `Aarav Sharma`
   - Login Email: `aarav.sharma@sxia.edu.in`
   - Password: `••••••••`
   - Assign Class: `Class 10` ➔ `Section A`.
   - Demographic details: Gender, DOB, Guardian Phone.
2. Submit ➔ Student account provisioned.

---

### Step 5: Teacher Conducts Daily Roll Call
1. Teacher Rahul Sharma logs in at `/login` ➔ Lands on `/teacher`.
2. Opens `/teacher/attendance`:
   - Pre-selects `Class 10 - Section A` and today's date.
   - On mobile, uses large 48px touch pills to mark `Present` / `Absent` / `Late`.
   - Clicks "Submit Attendance" (sticky bottom bar) ➔ Saved to Firestore `attendance/{id}` with deterministic duplicate prevention.

---

### Step 6: Student & Guardian Review Attendance
1. Student Aarav logs in at `/login` ➔ Lands on `/student`.
2. Views real-time Attendance Percentage Meter (`95%`).
3. Opens `/student/attendance` for full monthly breakdown.
4. Opens `/student/notices` to view school announcements.

---

## 4. Backup, Point-in-Time Recovery & Monitoring

### Automated Firestore Backups
Configure scheduled automated backups using Google Cloud Scheduler and Cloud Functions to back up all collections to a Cloud Storage bucket daily:
```bash
gcloud firestore export gs://[PROJECT_ID]-backups --async
```

### Point-in-Time Recovery (PITR)
Enable PITR on your production Firestore database in Google Cloud Console to allow restoring database state to any minute in the past 7 days.

### Monitoring & Alerts
1. **Firebase Authentication Usage**: Track active DAU/MAU in Firebase Console.
2. **Firestore Read/Write Metrics**: Set up Google Cloud Monitoring alerts for quota utilization (> 80%).
3. **Crash & Error Logging**: All service layer catch blocks are structured with console telemetry ready for Sentry / Firebase Crashlytics.
