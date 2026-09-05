# SUPER ADMIN USERS COMMAND CENTER — PRODUCTION AUDIT & ARCHITECTURE

## 1. Executive Summary

The **Super Admin Users Command Center** transforms the platform's user management into an ultra-professional, production-grade, multi-tenant administrative engine located at `/super-admin/users` and `/super-admin/users/[id]`.

The system provides:
- Single authoritative user directory spanning all tenant schools and platform global accounts.
- 7 live top KPI summary metric cards (Total Users, Active, Online Now, Suspended, Teachers, Students, School Admins).
- Multi-dimensional search across Name, Email, Phone, UID, and School ID.
- Advanced filtering across School, Role, Status, Last Active (ranges: <15m, <24h, <7d, >30d), and Account Type (School Bound vs Platform Global).
- 9 canonical tabs on the User Detail page (`/super-admin/users/[id]`):
  1. **Overview**
  2. **Personal Information**
  3. **School & Role**
  4. **Activity**
  5. **Sessions**
  6. **Permissions**
  7. **Subscription/Entitlement**
  8. **Security**
  9. **Audit History**
- Complete Administrative Action Suite with confirmation safeguards and mandatory compliance justification.
- Real-time token revocation and session kill architecture via Firebase Admin Auth and Firestore security listener.
- Strict RBAC and cross-tenant isolation ensuring School Admins are strictly prohibited from accessing global command controls.

---

## 2. Classic Super Admin UI Preservation

The design system strictly adheres to the established Super Admin Classic UI guidelines:
- **Layout & Structure**: Standard 7xl max-width centered container with consistent 6-unit spacing (`space-y-6`), rounded-2xl headers, and standard card borders (`border-gray-200 dark:border-gray-800`).
- **Typography & Weights**: Inter font hierarchy with standard semibold headings and monospace formatting for identifiers (`font-mono`).
- **Color Palette & Role Badging**:
  - **Super Admin**: Purple badge (`bg-purple-50 text-purple-700 border-purple-200/50`) with `Shield` icon.
  - **School Admin**: Blue badge (`bg-blue-50 text-blue-700 border-blue-200/50`) with `Shield` icon.
  - **Teacher**: Emerald badge (`bg-emerald-50 text-emerald-700 border-emerald-200/50`) with `BookOpen` icon.
  - **Student**: Amber badge (`bg-amber-50 text-amber-700 border-amber-200/50`) with `GraduationCap` icon.
- **Status Indicators**:
  - **Active**: Emerald badge with pulsing green live dot if online now.
  - **Suspended**: Amber badge with alert shield.
  - **Blocked**: Red badge with danger icon.
  - **Disabled**: Neutral gray badge.

---

## 3. Users List: Architecture & Features (`/super-admin/users`)

### 3.1 Top 7 KPI Summary Cards
Calculated authoritatively with real-time reactivity:
1. **Total Users**: Full count of registered users across all tenant partitions.
2. **Active**: Accounts with permitted status (`status === 'active'`).
3. **Online Now**: Accounts active within the last 15 minutes (`Date.now() - lastActiveMs <= 15 * 60 * 1000`) featuring a live pinging animation.
4. **Suspended**: Accounts under administrative hold, suspension, block, or disablement.
5. **Teachers**: Enrolled faculty staff members across all campuses.
6. **Students**: Registered learners across all schools.
7. **School Admins**: Campus principals and tenant managers.

### 3.2 Search & Filtering Engine
- **Search Query**: Case-insensitive substring matching against:
  - User Full Name
  - Primary Email Address
  - Contact Phone Number
  - Monospace User ID (UID)
  - Associated School ID
- **School Filter**: All Schools, Platform Global (No School), or specific campus tenant dropdown.
- **Role Filter**: All, Super Admin, School Admin, Teacher, Student pills with dynamic live counts.
- **Status Filter**: All, Active, Suspended, Blocked, Disabled.
- **Last Active Filter**: All, Online Now (<15m), Active Today (<24h), Active Past 7 Days, Inactive (>30d).
- **Account Type Filter**: All, School Bound, Platform Global.

### 3.3 Users Table Features
- **User Identity**: Initials avatar badge + Full Name + Email + Phone number tag.
- **User ID**: Monospace font with 8-character preview, hover tooltip, and one-click copy button with instant checkmark feedback.
- **Role**: Standardized color-coded badge.
- **School Scope**: School Name + School Code badge (or Platform Global tag).
- **Status**: Live badge with status dot.
- **Last Active**: Human-readable relative time ("Just now", "5m ago", "2h ago", "Yesterday", "d/m/y").
- **Created Date**: Standard localized date format.
- **Actions Menu**:
  - **View**: Direct route to user detail command center.
  - **Impersonate**: Live impression mode (non-super-admin accounts only).
  - **Edit Profile**: Open authorized profile modal.
  - **Change Role**: Open role transition modal with reason justification.
  - **Move / Change School**: Multi-tenant transfer modal.
  - **Reset Password**: Credentials administration modal.
  - **Require Re-Login**: Instant token invalidation.
  - **Force Logout**: Immediate session kill and token revocation.
  - **Suspend / Activate**: Account status toggling with compliance reason.
  - **Delete Account**: Permanent purge with safety confirmation.

---

## 4. User Detail: 9 Canonical Tabs (`/super-admin/users/[id]`)

| Tab ID | Tab Name | Scope & Contents |
| :--- | :--- | :--- |
| **1. Overview** | Overview | 4 key metric cards (Role, School, Security Control, Sessions), profile metadata summary, quick actions panel, recent session preview. |
| **2. Personal** | Personal Information | Full Name, Email, Phone, Address, Gender, Date of Birth, Emergency Contact, UID, and direct profile edit trigger. |
| **3. School & Role** | School & Role | Tenant campus information (Name, Code, Contact, Address), Role Assignment, Class/Section, Student Admission / Staff ID, transfer action. |
| **4. Activity** | Activity | Granular operational activity stream logged by the user across administrative and academic modules. |
| **5. Sessions** | Sessions | Authentication history table (IP Address, Browser, Operating System, Timestamp, Status), with one-click "Revoke All Sessions" button. |
| **6. Permissions** | Permissions | Comprehensive RBAC breakdown from `ROLE_PERMISSIONS`, visual checkmark grid of authorized capabilities. |
| **7. Subscription** | Subscription/Entitlement | School license plan details (Starter/Pro/Enterprise), quota usage (Students/Teachers enrolled), or Global Super Admin privilege declaration. |
| **8. Security** | Security | Live `userSecurityControl` state (Token Security Version, Re-login flag, restriction reason), with direct administrative security action triggers. |
| **9. Audit** | Audit History | Immutable compliance audit trail targeting this user with before/after state diffs, performer attribution, reason, and timestamps. |

---

## 5. Administrative Actions & Backend Architecture

Every action executes through `/api/super-admin/users/[id]/actions` with the following guarantees:

1. **Super Admin Authorization Verification**:
   - Authenticated performer must have `role === 'super_admin'` and `status === 'active'`.
   - School Admins or unauthenticated requests are strictly rejected with HTTP 403 Forbidden.
2. **Immutable Audit Trail Record**:
   - Every action logs: `action`, `targetId`, `targetType`, `targetName`, `targetEmail`, `performedBy`, `previousState`, `newState`, `reason`, `ipAddress`, `userAgent`, and `timestamp`.
3. **Session Revocation & Force Logout**:
   - Calls Firebase Admin SDK: `adminAuth.revokeRefreshTokens(targetUserId)`.
   - Increments `securityVersion` in `userSecurityControl/{userId}`.
   - Sets `requireReLogin: true`.
   - Client portal listener (`useRealtimeSecurityListener.ts`) detects version change via Firestore snapshot and instantly signs out the user across all open tabs/devices.
4. **Role & Tenant Changes**:
   - Bumps security version so old claims and permissions are discarded upon next authentication refresh.
5. **Account Deletion Safeguards**:
   - Prohibits deletion of Super Admin accounts with HTTP 403 Forbidden.
   - Deletes Firebase Auth record, purges Firestore user doc, and writes `USER_DELETED` audit record.

---

## 6. Verification & Test Suite Results

The automated integration test suite at `scripts/test-users-command-center.mjs` executed all 12 validation scenarios:

| # | Test Scenario | Verified Behavior | Status |
| :---: | :--- | :--- | :---: |
| 1 | 7 Top KPI Statistics Computation | Total Users, Active, Online Now (<15m), Suspended, Teachers, Students, School Admins computed with 100% mathematical accuracy. | **PASSED** |
| 2 | Multi-Dimensional Search & Filtering | Name, Email, Phone, UID, School ID, Role, Status, Last Active, Account Type filtering verified. | **PASSED** |
| 3 | Role Elevation & Demotion (`CHANGE_ROLE`) | Role updated, security version incremented, `requireReLogin: true`, and audit logged. | **PASSED** |
| 4 | Multi-Tenant Transfer (`CHANGE_SCHOOL`) | School reassignment verified, tenant isolation maintained, security version bumped. | **PASSED** |
| 5 | Account Status (`UPDATE_STATUS`) | Suspension revokes tokens & sets `requireReLogin`; reactivation restores active status. | **PASSED** |
| 6 | Force Logout (`FORCE_LOGOUT`) | Refresh tokens invalidated, security version bumped, `requireReLogin: true`. | **PASSED** |
| 7 | Re-Authentication (`REQUIRE_RE_LOGIN`) | Immediate re-login requirement flag set and verified. | **PASSED** |
| 8 | Password Reset (`RESET_PASSWORD`) | Password updated, sessions revoked, `passwordResetAt` timestamp recorded. | **PASSED** |
| 9 | Profile Update (`UPDATE_PROFILE`) | Whitelisted fields (name, phone, address, class, section) updated and audited. | **PASSED** |
| 10 | Deletion Safeguards (`DELETE_USER`) | Super Admin deletion blocked with 403; standard user purged from Auth and DB. | **PASSED** |
| 11 | RBAC & Security Isolation | School Admin access strictly rejected with 403 Forbidden. | **PASSED** |
| 12 | Audit Trail Completeness | 100% of audit records contain valid performer, reason, timestamps, and state diffs. | **PASSED** |

**Conclusion**: The Super Admin Users Command Center is fully production-ready, ultra-secure, and strictly compliant with all enterprise specifications.
