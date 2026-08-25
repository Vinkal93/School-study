# 🎓 School Study — Multi-Tenant Smart School Management SaaS

An all-in-one multi-tenant school management SaaS platform built with **Next.js 16 (App Router + Turbopack)**, **Tailwind CSS v4**, **TypeScript**, and **Google Firebase (Auth, Firestore, Storage)**.

---

## 🌟 Key Features

- 🏢 **Multi-Tenant Architecture**: Strict tenant data isolation per school.
- 🔐 **Dedicated Role Portals**:
  - **School Admin Portal**: `/admin/login` — Manage academic structure, teachers, student admissions, and school-wide notices.
  - **Teacher Portal**: `/teacher/login` — 1-tap mobile attendance roll call, assigned classes, student rosters, and circulars.
  - **Student & Parent Portal**: `/student/login` — Real-time attendance percentage meter, calendar, and class announcements.
  - **Super Admin Gateway**: `/su` (or `/super-admin/login`) — Hidden gateway for platform administrators to provision schools and manage global tenants.
- 🎨 **Light / Dark Mode**: Defaults to Light Mode across all portals with persistent user theme switching.
- 📱 **Mobile-First UX**: Responsive layouts, bottom navigation bar, and touch-optimized roll call.
- 🛡️ **IDOR Protection & Security**: Deterministic attendance IDs (`${schoolId}_${studentId}_${date}`) preventing duplicate records.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- A Google Firebase project with:
  - **Authentication** (Email/Password enabled)
  - **Cloud Firestore Database** (Test or Production mode)
  - **Firebase Storage**

### 2. Installation
```bash
git clone https://github.com/Vinkal93/School-study.git
cd School-study
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying on Vercel

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "feat: complete multi-tenant school study platform"
   git push -u origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/new) and click **"Import Project"**.
3. Select your `School-study` GitHub repository.
4. In **Project Settings ➔ Environment Variables**, add the following:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. Click **"Deploy"**. Vercel will automatically build and deploy the app!

---

## 📜 License
MIT License. Built for modern education institutions.
