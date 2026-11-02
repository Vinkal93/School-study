# School Study Design System 3.0 — Global UI Inventory

## 1. Executive Summary

This inventory catalogs the UI components, layout structures, and design tokens across all five user personas in the School Study platform (Public Web, Super Admin, School Admin, Teacher, and Student).

---

## 2. Portal & Route UI Matrix

| Surface | Target Breakpoints | Navigation Shell | Primary Content Density | Form & Action Standards |
|---|---|---|---|---|
| **Public Web & Landing** | 320px – 1440px | Sticky Frosted Navbar + Mobile Sheet | Marketing / High Visuals | Hero CTA, Clean Input, Cookie Preferences |
| **School Admin Portal** | 320px – 1440px | Collapsible Sidebar + Floating Topbar + MobileNav | Operational / Data-Dense | Tabbed Forms, Material 3 Cards, Action Sheets |
| **Super Admin Portal** | 320px – 1440px | Admin Sidebar + Role Impersonation Banner | Analytical / Master Control | Data Grids, Confirmation Portals, Status Badges |
| **Teacher Portal** | 320px – 1024px (Mobile-first) | Mobile Nav Drawer + Bottom Tabs | High-touch Daily Tasks | Quick Attendance Grid, Homework Cards |
| **Student Portal** | 320px – 768px (Mobile-first) | Bottom Navigation Bar + Top Profile Avatar | Information Consumption | Timetable Cards, Fee Receipt Slips |

---

## 3. Discovered Inconsistencies & Repair Plan

### A. Classes Management (`/admin/classes`)
- **Before:**
  - Raw unpadded cards with inconsistent border radius.
  - Native browser `confirm()` invoked for deleting classes (`line 211`) and deleting sections (`line 242`).
  - Fee badges lacked visual distinction between monthly tuition and one-time admission fees.
  - Section addition was cramped on mobile viewports (<375px).
- **Repair Plan:**
  - Standardize class card layout with Material 3 elevation, explicit teacher assignment chips, and structured fee chips.
  - Replace native `confirm()` with `useConfirm()`.
  - Responsive layout: 1 column on mobile, 2 columns on tablet, 3 columns on desktop.

### B. Student Promotion (`/admin/students/promote`)
- **Before:**
  - `WholeSchoolPromotion` was stacked raw directly on top of `Annual Student Promotion & Class Transfer`, creating two competing forms on one page.
  - `WholeSchoolPromotion` used unstyled HTML controls (`<label className="...">`, `<select className="rounded border p-2">`) without design system tokens.
- **Repair Plan:**
  - Implement a clean Mode Switcher tab:
    - **Tab 1: Whole School Session Promotion** (Global session cohort advancement)
    - **Tab 2: Class & Batch Transfer** (Granular class-to-class promotion with custom roll allocation & student overrides)
  - Refactor `WholeSchoolPromotion.tsx` with Material 3 cards, responsive select grids, progress states, and clear preview summary tables.

### C. Shared Form Controls
- **Before:** Inconsistent border colors (`border-gray-200` vs `border-slate-300` vs `border-border/50`), varying focus rings, and mixed checkbox implementations.
- **Repair Plan:** Centralize design tokens in `src/styles/tokens.css` with consistent `--color-primary`, `--color-surface`, `--color-border`, and standard focus states.
