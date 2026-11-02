# Zero Feature Loss Preservation Matrix

This matrix tracks every affected route during the Design System 3.0 refactor, verifying that all business features, APIs, permissions, and validation rules remain 100% intact.

| Route | Feature Area | Original Capabilities Preserved | API & Service Dependencies | Verification Method | Status |
|---|---|---|---|---|---|
| `/admin/classes` | Class Management | Add class, Edit class, Delete class, Toggle status (active/inactive), Add section, Delete section, Teacher assignment, Fee inputs (monthly & admission), Plan limit checks | `getAcademicYears`, `getClassesWithSections`, `createClass`, `updateClass`, `deleteClass`, `toggleClassStatus`, `createSection`, `deleteSection`, `checkPlanLimit` | Automated Release Suite + Manual UI Flow | ✅ VERIFIED |
| `/admin/classes` | Academic Sessions | Activate session, Add academic year, Launch session promotion wizard modal | `createAcademicYear`, `SessionPromotionModal` | Automated Release Suite + Modal Test | ✅ VERIFIED |
| `/admin/students/promote` | Whole School Promotion | Source/target session selection, Class cohort mapping, Auto-suggest next grade, Student eligibility validation, Promotion preview, Batch execution | `getAcademicYears`, `previewSchoolPromotion`, `promoteWholeSchool` | Release Suite + Preview Test | ✅ VERIFIED |
| `/admin/students/promote` | Class / Batch Transfer | Single-class promotion, Target section selection, Roll number allocation (keep vs sequential), Fee auto-assignment, Per-student override (promote / retain / graduate), Batch execution | `getStudents`, `getClassesWithSections`, `transferStudentsBulk` | Plan Flow Test + Bulk Transfer Script | ✅ VERIFIED |
| `/admin` & Shells | Responsive Layout | Collapsible sidebar, mobile drawer, safe area insets, notification bell, profile menu, tenant switcher | `useAuth`, `usePortalUI`, `Sidebar`, `Topbar`, `MobileNav` | Mobile Viewport Tests (320px–1440px) | ✅ VERIFIED |
| Global Dialogs | Confirmations | Destructive confirmations, clone prompt, error alerts, safe portal rendering | `ConfirmationContext`, `ConfirmDialog`, `Sonner` | UX Modal Test Suite | ✅ VERIFIED |
