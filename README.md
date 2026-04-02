# 🎓 Smart EduConnect — School Management System

A comprehensive, multi-tenant, role-based school management platform built with modern web technologies. Smart EduConnect streamlines academic operations by connecting **super administrators**, **school administrators**, **teachers**, and **parents/students** through a unified, real-time interface.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Multi-Tenancy](#multi-tenancy)
- [User Roles](#user-roles)
- [Module Breakdown](#module-breakdown)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication & Security](#authentication--security)
- [Design System](#design-system)
- [Changelog](#changelog)

---

## Overview

Smart EduConnect is a full-stack, multi-tenant school ERP that digitizes day-to-day school operations — from attendance tracking and exam management to fee collection and parent communication. It features **four distinct dashboards** tailored to each user role (Super Admin, Admin, Teacher, Parent), with real-time data synchronization, school-level data isolation via Row Level Security (RLS), and a responsive, mobile-friendly design.

---

## ✨ Features

### 🔑 Core Capabilities
- **Multi-tenant architecture** — Each school's data is isolated via `school_id` on all 49+ tables, enforced by RLS policies
- **4-panel role-based access control** — Super Admin, Admin, Teacher, and Parent portals with distinct permissions
- **Real-time data sync** — Live updates across all connected users via Supabase Realtime
- **Responsive design** — Works seamlessly on desktop, tablet, and mobile
- **Dark mode support** — Full light/dark theme with semantic design tokens
- **IST timezone** — All notification timestamps and relative time displays use Indian Standard Time (Asia/Kolkata)
- **Export & reporting** — CSV and PDF downloads for attendance, fees (landscape report with summary stats, color-coded statuses, grand totals), timetable, and more
- **Bulk import/export** — Excel-based bulk import with downloadable templates and progress tracking for Students (with auto parent account creation) and Teachers; Excel export of current data
- **School branding** — Dynamic school name and logo displayed in sidebar header, fetched from the schools table
- **Module visibility control** — Super Admin can enable/disable modules globally; per-school overrides supported

### 🏢 Super Admin Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | System-wide overview with total schools, admins, and quick actions |
| **Schools Management** | Create, edit, activate/deactivate schools with logo upload, view admin/student/teacher counts per school, delete schools |
| **Module Control** | Global module visibility toggles + per-school overrides for granular feature control |
| **Manage Admins** | Create admin accounts, assign to schools, reset passwords via edge function |
| **Settings** | Super admin profile management |

### 📊 Admin Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Overview stats, quick actions, and system health |
| **Teachers** | Add, edit, and manage teacher profiles and assignments; **bulk import from Excel** (with downloadable template) and **export to Excel** |
| **Students** | Student registry with admission numbers, class assignments, and profiles; **bulk import from Excel** (with downloadable template, sequential edge function calls with progress bar) and **export to Excel** |
| **Classes** | Create classes with manual class name/number input (no dropdown restriction), optional section field (defaults to "-" if empty), and assign class teachers |
| **Subjects** | Manage subject catalog with codes and categories (academic/competitive) |
| **Timetable** | Build and publish weekly timetables per class with configurable period schedules stored in `app_settings` |
| **Attendance Reports** | View, filter, search, and export attendance data (separate CSV and PDF downloads) across all classes |
| **Exams** | Create exams with 5-step wizard, manage schedules, enter marks, view results (5-tab layout) |
| **Weekly Exams** | Manage weekly/competitive exam cycles with question papers and student results |
| **Exam Cycles** | Configure exam cycles with date ranges and exam types |
| **Syllabus** | Manage syllabus topics per class/subject with completion tracking (shows teacher who completed & date) |
| **Question Paper Builder** | Build question papers for weekly exams with MCQ support |
| **Leads (CRM)** | Track admission inquiries with status pipeline, follow-ups, call logs, and Excel import |
| **Announcements** | Broadcast announcements to specific audiences with automated notifications |
| **Leave Requests** | Approve or reject leave applications from teachers and students; view/download attachments |
| **Certificates** | Process certificate requests with document attachment download |
| **Complaints** | Handle and respond to parent complaints with visibility-based filtering (admin/teacher) |
| **Fees** | Batch-assign fees by class/student, percentage-based discounts (flat or per-student), custom partial payments with Record Payment dialog, auto balance tracking, payment history log, PDF receipt generation (blob download), **PDF fee collection report export** (landscape, summary box, color-coded statuses, grand totals), Razorpay online payments, automated reminders, **receipt template customization** (school name, address, phone, header/footer text, logo, field toggles) |
| **Messages** | Direct messaging system with file/image sharing |
| **Gallery** | Manage photo gallery with folders |
| **Notifications** | View and manage admin notifications with date filtering, mark all read, delete read |
| **Settings** | App configuration, module toggles, lead permissions, receipt template settings, password reset |
| **Student Promotion** | Versioned record model — old record marked as `status = 'promoted'` (preserving original class_id & admission_number), new record created for the target class with auto-regenerated admission number & login ID (`{Name}-{Class}-{Section}`), parent links (`student_parents`) automatically copied to new record, bulk or individual selection, retained students marked separately, full history snapshot (attendance, marks, fees, timetable) stored in `student_promotion_history` |
| **Discontinued Students** | Discontinue students with reason, archive snapshots (attendance, marks, fees, timetable) in `student_discontinuation_archives`, reinstate discontinued students back to active status |
| **Student History** | Search any student by name or admission number, view all class records (current & previous) as selectable cards, drill into each class with tabbed view: Attendance (calendar by month), Marks (by exam name with grades), Fees (payment status & amounts). Shared across Admin, Teacher, and Parent panels |
| **Holidays** | Create, edit, and delete holidays/occasions/events with date, type, and description; redesigned mobile-responsive calendar (full-width, no empty space) with upcoming holidays banner, summary stat cards (total/holidays/occasions/events), search & filter by type, date badge cards with "Today" indicator, month-wise breakdown in calendar sidebar, color-coded type badges using semantic tokens, loading skeletons, scrollable list, compact FAB for mobile add; automated notifications on creation and 2-day-before reminders |

### 👩‍🏫 Teacher Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Class overview, upcoming tasks, quick stats, upcoming exam timetable, and competitive exam reminders with countdown badges |
| **My Classes** | View assigned classes and sections |
| **Students** | Browse students in assigned classes |
| **Attendance** | Mark daily attendance with Present/Absent/Late buttons, quick "Mark All" actions, search, and sticky action bar |
| **Homework** | Assign and manage homework with due dates and file attachments (PDF, Word, images) |
| **Exam Marks** | Enter and manage exam scores with grading |
| **Syllabus** | View assigned syllabus topics, filter by type/status/class/subject/exam, and mark topics as completed |
| **Weekly Exams** | View and manage weekly exam schedules |
| **Reports & Complaints** | Create behavioral and academic reports for students + view/respond to parent complaints (tabbed interface with open count badge) |
| **Announcements** | View school-wide announcements |
| **Leave Request** | Submit personal leave applications with optional document attachments |
| **Leads** | Manage admission leads with inline status dropdown (when enabled by admin) |
| **Messages** | Communicate with parents and admin with file/image sharing |
| **Timetable** | View personal teaching schedule ("My Schedule" tab) and browse all class timetables ("Class Timetables" tab) with class filter, CSV/PDF export |
| **Student History** | Search students, view all class records (current & promoted), drill into attendance, marks, and fees per class |
| **Gallery** | View school photo gallery |
| **Holidays** | View upcoming holidays with banner, search & filter by type, date badge cards with "Today" indicator, month-wise calendar sidebar breakdown, responsive layout |
| **Notifications** | View personal notifications with date filter, mark all read, delete read |
| **Settings** | Profile management |

### 👨‍👩‍👧 Parent Panel
| Module | Description |
|--------|-------------|
| **Dashboard** | Child's overview with attendance, upcoming exams, and alerts |
| **My Child** | Detailed child profile and academic info with child selector for parents with multiple children |
| **Attendance** | View 30-day attendance history with stats, progress bar, and day-of-week details |
| **Timetable** | View child's weekly class schedule |
| **Homework** | Track assigned homework, due dates, and download teacher-uploaded attachments |
| **Exam Results** | View marks, grades, and performance analysis with exam name filtering |
| **Syllabus** | View syllabus topics with completion status (completed by teacher with date) |
| **Progress** | Track academic progress and trends |
| **Announcements** | Read school announcements |
| **Complaints** | Submit complaints with visibility control — choose who can see (Admin/Teacher) — receive notifications on response/resolution |
| **Leave Request** | Apply for child's leave with optional document attachments |
| **Messages** | Chat with teachers and admin, with file/image sharing |
| **Certificates** | Request certificates for child with optional document attachments |
| **Fees** | View fee details with discount & balance breakdown, pay custom partial amounts via Razorpay, view per-transaction payment history with individual receipts, download PDF receipts |
| **Student History** | View child's complete academic history across all classes (current & promoted) with attendance, marks, and fees per class |
| **Gallery** | View school photo gallery |
| **Holidays** | View upcoming holidays with banner, search & filter by type, date badge cards with "Today" indicator, month-wise calendar sidebar breakdown, responsive layout |
| **Notifications** | View personal notifications (in-app + Web Push) with date filter, mark all read, delete read |
| **Settings** | Profile management |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI primitives |
| **State Management** | TanStack React Query, React Context |
| **Routing** | React Router v6 |
| **Backend** | Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions, Storage |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **Date Handling** | date-fns |
| **Icons** | Lucide React |
| **Spreadsheets** | SheetJS (xlsx) for Excel import/export |
| **PDF Generation** | jsPDF + jspdf-autotable |
| **PWA** | vite-plugin-pwa (Workbox) for offline support & installability |
| **Native Mobile** | Capacitor (iOS & Android) |
| **Push Notifications** | Web Push API + VAPID (web-push library) |
| **Animations** | CSS animations, Tailwind transitions |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                       │
│    React + TypeScript + Tailwind + shadcn/ui             │
├─────────────────────────────────────────────────────────┤
│                React Router (Client)                     │
│  /super-admin/*  │  /admin/*  │  /teacher/*  │  /parent/*│
├─────────────────────────────────────────────────────────┤
│           Supabase JS Client + React Query               │
├─────────────────────────────────────────────────────────┤
│                Lovable Cloud Backend                     │
│  ┌───────────┬──────────┬───────────────────┐           │
│  │  Auth     │  DB      │  Edge Functions    │           │
│  │  (JWT)    │  (PgSQL) │  (Deno Runtime)    │           │
│  └───────────┴──────────┴───────────────────┘           │
│       Row Level Security (RLS) + school_id isolation     │
└─────────────────────────────────────────────────────────┘
```

---

## 🏢 Multi-Tenancy

Smart EduConnect uses a **single-database, multi-tenant** architecture with logical data isolation:

- **Every table** includes a `school_id` column referencing the `schools` table
- **RLS policies** automatically filter data so each school can only access its own records
- **Security-definer functions** (`get_user_school_id()`, `has_role()`, `is_admin_or_super()`) enforce isolation at the database level
- **Super Admins** can operate across all schools for global management
- **Module visibility** can be configured globally and overridden per school via `module_visibility` and `school_module_overrides` tables
- **School branding** — each school has its own name, logo, address, and contact info displayed dynamically

---

## 👥 User Roles

| Role | Access Level | Description |
|------|-------------|-------------|
| **Super Admin** | Global | Manage all schools, create admins, control modules, system-wide settings |
| **Admin** | School-scoped | Complete control within their school — manage users, settings, all modules |
| **Teacher** | Scoped | Access to assigned classes, mark attendance, enter marks, manage leads (if permitted) |
| **Parent** | Read-heavy | View child's data, submit leave requests, pay fees, communicate with teachers |

Role assignment is stored in the `user_roles` table (separate from profiles for security) and checked on every authenticated request via RLS policies. The `app_role` enum includes: `admin`, `teacher`, `parent`, `super_admin`.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── layouts/               # DashboardLayout with sidebar, MobileBottomNav
│   ├── exams/                 # Exam wizard, marks entry, schedule builder, results view
│   ├── exam-cycles/           # Exam cycles & weekly exams tab components
│   ├── students/              # StudentExcelImport (dialog), StudentExcelExport (utility)
│   ├── teachers/              # TeacherExcelImport (dialog), TeacherExcelExport (utility)
│   ├── leads/                 # Lead forms, call logs, Excel import, settings, permissions
│   ├── messaging/             # Messaging interface with file sharing
│   ├── fees/                  # Fee creation, payment, receipts, receipt template settings
│   ├── gallery/               # Gallery view component
│   ├── history/               # StudentHistoryContent — shared history (Admin/Teacher/Parent)
│   ├── notifications/         # NotificationsPage — full notification management
│   ├── attendance/            # Attendance calendar component
│   ├── parent/                # ChildSelector for multi-child parents
│   ├── NotificationBell.tsx   # Header notification bell with unread count (IST timestamps)
│   ├── PushNotificationToggle.tsx  # Push notification on/off toggle
│   ├── InstallAppBanner.tsx   # PWA install banner
│   ├── AttendanceSummary.tsx  # Reusable attendance widget
│   ├── NavLink.tsx            # Navigation link component
│   └── StatCard.tsx           # Dashboard stat card
├── config/
│   ├── adminSidebar.tsx       # Admin navigation config
│   ├── teacherSidebar.tsx     # Teacher navigation config (dynamic leads toggle)
│   ├── parentSidebar.tsx      # Parent navigation config
│   └── superAdminSidebar.tsx  # Super admin navigation config
├── hooks/
│   ├── useAuth.tsx            # Authentication context & provider (includes schoolId)
│   ├── useAdminSidebar.ts     # Dynamic admin sidebar builder with module visibility
│   ├── useTeacherSidebar.ts   # Dynamic teacher sidebar builder
│   ├── useParentSidebar.ts    # Dynamic parent sidebar builder
│   ├── useLeadPermissions.ts  # Teacher lead access check
│   ├── useModuleVisibility.ts # Module visibility with school overrides & caching
│   ├── useSchoolBranding.ts   # School name & logo fetcher for sidebar
│   ├── usePushNotifications.ts # Web Push subscription management
│   ├── useInstallPrompt.ts    # PWA install prompt hook
│   ├── use-mobile.tsx         # Mobile breakpoint detection
│   └── use-toast.ts           # Toast notification hook
├── pages/
│   ├── super-admin/           # 5 super admin pages (Dashboard, Schools, Modules, Admins, Settings)
│   ├── admin/                 # 23 admin pages (Dashboard, Teachers, Students, Classes, Subjects, Timetable, Attendance, Exams, Weekly Exams, Exam Cycles, Syllabus, Question Papers, Leads, Announcements, Leave, Certificates, Complaints, Fees, Messages, Gallery, Holidays, Notifications, Promotion, Discontinued, Student History, Settings)
│   ├── teacher/               # 19 teacher pages (Dashboard, Classes, Students, Attendance, Homework, Exams, Syllabus, Weekly Exams, Reports, Announcements, Leave, Leads, Gallery, Holidays, Messages, Timetable, Notifications, Student History, Settings)
│   ├── parent/                # 18 parent pages (Dashboard, Child, Attendance, Timetable, Homework, Exams, Syllabus, Progress, Announcements, Leave, Messages, Certificates, Fees, Gallery, Holidays, Notifications, Complaints, Student History, Settings)
│   ├── Auth.tsx               # Login / signup page
│   ├── Index.tsx              # Landing page
│   └── NotFound.tsx           # 404 page
├── integrations/
│   └── supabase/
│       ├── client.ts          # Auto-generated Supabase client
│       └── types.ts           # Auto-generated TypeScript types
├── utils/
│   ├── attendanceDownload.ts  # CSV & PDF export for attendance
│   └── timetableDownload.ts   # Timetable export utilities
├── lib/
│   └── utils.ts               # Tailwind merge utility + formatClassName helper
├── index.css                  # Design tokens, theme, component classes
└── App.tsx                    # Root component with all routes (65+ routes)

supabase/
├── config.toml                # Project configuration
└── functions/
    ├── create-student/            # Edge function: create student with auth & parent linking
    ├── create-user/               # Edge function: create user accounts with role assignment
    ├── create-razorpay-order/     # Edge function: create Razorpay payment order
    ├── verify-razorpay-payment/   # Edge function: verify Razorpay payment signature & update fee
    ├── reset-user-password/       # Edge function: super-admin password reset for any user
    ├── send-fee-reminders/        # Edge function: automated fee reminder notifications
    ├── full-reset/                # Edge function: reset demo data
    ├── seed-demo-users/           # Edge function: seed demo accounts
    ├── send-push-notification/    # Edge function: Web Push delivery via VAPID
    ├── notify-competitive-exams/  # Edge function: scheduled competitive exam reminders (daily 7 AM)
    └── notify-holiday-reminders/  # Edge function: automated holiday reminders (daily 8 AM, 2 days before)

public/
├── sw-push.js                 # Service worker push event handler
├── pwa-192x192.png            # PWA icon (192×192)
├── pwa-512x512.png            # PWA icon (512×512)
└── ase-logo.jpg               # School logo

capacitor.config.ts            # Capacitor native app configuration
```

---

## 🗄 Database Schema

### Enum Types

| Enum | Values |
|------|--------|
| `app_role` | `admin`, `teacher`, `parent`, `super_admin` |

---

### Core Tables

#### `schools`
Multi-tenant school registry.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `name` | text | No | — |
| `code` | text | No | — |
| `email` | text | Yes | — |
| `phone` | text | Yes | — |
| `address` | text | Yes | — |
| `logo_url` | text | Yes | — |
| `is_active` | boolean | Yes | `true` |
| `created_by` | uuid | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Super admins can manage all schools (ALL)
- Admins can view their own school (SELECT)

---

#### `profiles`
User profile data linked to auth users.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `full_name` | text | No | — |
| `email` | text | Yes | — |
| `phone` | text | Yes | — |
| `photo_url` | text | Yes | — |
| `school_id` | uuid (→ `schools.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

**RLS Policies:**
- Public profiles viewable by everyone (SELECT)
- Users can view & update own profile
- Admins can manage all profiles in their school

---

#### `user_roles`
Role assignments for access control (stored separately from profiles for security).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `role` | `app_role` | No | — |

**RLS Policies:**
- Users can view own role (SELECT)
- Admins can manage all roles (ALL)

---

#### `teachers`
Teacher-specific data and employment info.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `user_id` | uuid | No | — |
| `teacher_id` | text | No | — |
| `subjects` | text[] | Yes | — |
| `qualification` | text | Yes | — |
| `status` | text | Yes | `'active'` |
| `joining_date` | date | Yes | `CURRENT_DATE` |
| `school_id` | uuid (→ `schools.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

---

#### `students`
Student registry with class assignments and parent info.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `admission_number` | text | No | — |
| `full_name` | text | No | — |
| `class_id` | uuid (→ `classes.id`) | Yes | — |
| `user_id` | uuid | Yes | — |
| `date_of_birth` | date | Yes | — |
| `blood_group` | text | Yes | — |
| `photo_url` | text | Yes | — |
| `parent_name` | text | Yes | — |
| `parent_phone` | text | Yes | — |
| `address` | text | Yes | — |
| `emergency_contact` | text | Yes | — |
| `emergency_contact_name` | text | Yes | — |
| `login_id` | text | Yes | — |
| `password_hash` | text | Yes | — |
| `status` | text | Yes | `'active'` |
| `discontinuation_reason` | text | Yes | — |
| `school_id` | uuid (→ `schools.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |
| `updated_at` | timestamptz | Yes | `now()` |

---

#### `parents` & `student_parents`
Parent accounts and many-to-many student ↔ parent relationships.

---

#### `classes`
Class definitions with sections and academic year.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `name` | text | No | — |
| `section` | text | No | — |
| `class_teacher_id` | uuid (→ `teachers.id`) | Yes | — |
| `academic_year` | text | No | `'2024-2025'` |
| `academic_type` | text | Yes | — |
| `school_id` | uuid (→ `schools.id`) | Yes | — |
| `created_at` | timestamptz | Yes | `now()` |

---

#### `subjects` & `teacher_classes`
Subject catalog and teacher ↔ class assignments.

---

### Academic Tables

#### `attendance`
Daily attendance records per student with session support.

#### `exams` & `exam_marks`
Exam definitions and student marks per exam.

#### `exam_cycles`
Exam cycle periods with date ranges and exam types.

#### `weekly_exams`, `question_papers`, `questions`
Weekly/competitive exam system with MCQ question papers.

#### `student_exam_results` & `student_exam_answers`
Student results and individual question answers for weekly exams.

#### `homework`
Homework assignments per class/subject with file attachments.

#### `timetable`
Weekly timetable entries with day, period, subject, and teacher.

#### `syllabus`, `teacher_syllabus_map`, `syllabus_schedule`
Syllabus topics, teacher assignments, and scheduling.

#### `student_reports`
Behavioral/academic reports with parent visibility control.

---

### Financial Tables

#### `fees`
Fee records with payment tracking, percentage-based discounts, and partial payment support.

#### `fee_payments`
Individual payment transaction log for partial/full payments with per-receipt tracking and Razorpay integration.

---

### Communication Tables

#### `announcements`
School-wide announcements with audience targeting.

#### `messages`
Direct messaging between users with file and image sharing.

#### `notifications`
Per-user notification records with read status and navigation links.

#### `complaints`
Complaint tickets with response tracking and visibility control.

---

### Administrative Tables

#### `leave_requests`
Leave applications for teachers and students with optional document attachments.

#### `certificate_requests`
Certificate request processing with optional document attachments.

#### `holidays`
School holidays, occasions, and events calendar with automated notification triggers.

#### `app_settings`
Application configuration key-value store (receipt templates, timetable schedules, Razorpay keys, etc.).

#### `settings_audit_log`
Audit trail for settings changes.

---

### CRM Tables

#### `leads`
Admission inquiry tracking with comprehensive student/parent info and status pipeline.

#### `lead_call_logs`
Call history per lead.

#### `lead_status_history`
Status change audit trail.

#### `teacher_lead_permissions`
Per-teacher lead module access control.

---

### Gallery Tables

#### `gallery_folders` & `gallery_images`
Photo gallery with folder organization.

---

### Multi-Tenancy & Module Control Tables

#### `module_visibility`
Global module enable/disable toggles.

#### `school_module_overrides`
Per-school module visibility overrides.

---

### Student Lifecycle Tables

#### `student_promotion_history`
Promotion records with full snapshots of attendance, marks, fees, and timetable at time of promotion.

#### `student_discontinuation_archives`
Discontinuation records with full snapshots and reasons.

---

### Push Notification Tables

#### `push_config`
VAPID key pair storage (auto-generated).

#### `push_subscriptions`
Per-user, per-device push subscription endpoints.

---

## ⚡ Edge Functions

| Function | Purpose |
|----------|---------|
| `create-user` | Creates auth user accounts with role assignment (admin-only) |
| `create-student` | Creates student records with optional parent account linking |
| `reset-user-password` | Super-admin password reset for any user |
| `seed-demo-users` | Seeds demo admin, teacher, and parent accounts for testing |
| `full-reset` | Resets all demo data (teachers, students, parents, etc.) |
| `notify-competitive-exams` | Sends notifications for upcoming competitive exams (scheduled via pg_cron at 7 AM daily) |
| `notify-holiday-reminders` | Sends reminder notifications 2 days before upcoming holidays (scheduled via pg_cron at 8 AM daily) |
| `send-push-notification` | Delivers Web Push notifications via VAPID keys; also serves GET to return public VAPID key for frontend subscription |
| `create-razorpay-order` | Creates Razorpay payment orders for online fee payments (reads API keys from `app_settings`) |
| `verify-razorpay-payment` | Verifies Razorpay payment signatures (HMAC SHA256), accumulates `paid_amount`, auto-sets payment status, and logs transaction in `fee_payments` |
| `send-fee-reminders` | Sends automated fee reminders to parents based on configurable due-date windows |

All edge functions run on Deno runtime and use the Supabase service role key for privileged operations.

---

## 📦 Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `photos` | Yes | Student/teacher profile photos, homework attachments, leave/certificate documents, message file sharing |
| `gallery` | Yes | School gallery images organized by folders |

---

## 🔧 Database Functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `admin_exists()` | boolean | Checks if any admin role exists in the system |
| `get_user_role(uuid)` | `app_role` | Returns the role for a given user ID |
| `has_role(uuid, app_role)` | boolean | Security definer — checks if a user has a specific role (used in RLS) |
| `is_admin_or_super(uuid)` | boolean | Checks if user is admin or super_admin |
| `get_user_school_id(uuid)` | uuid | Returns the school_id for a user (used in RLS for multi-tenant isolation) |
| `handle_new_user()` | trigger | Auto-creates profile on signup; assigns admin role if first user |
| `get_parent_login_email(text)` | text | Retrieves parent login email by student admission number or login ID |
| `update_updated_at_column()` | trigger | Auto-updates `updated_at` timestamp on row modification |

---

## 🔔 Notification Triggers

Automated database triggers fire notifications on key events:

| Trigger Function | Event | Recipients |
|---|---|---|
| `notify_parent_attendance()` | Attendance marked | Parents of the student |
| `notify_parent_homework()` | New homework assigned | Parents of students in the class |
| `notify_parent_exam_result()` | Exam result published | Parents of the student |
| `notify_announcement()` | New announcement | Target audience (all/admin/teacher/parent) |
| `notify_admin_leave_request()` | Leave request submitted | All admin users |
| `notify_admin_certificate_request()` | Certificate requested | All admin users |
| `notify_complaint()` | Complaint created or updated | Admin/Teachers on INSERT (per visibility), Parent on UPDATE (response/resolve) |
| `on_holiday_created` | Holiday created | All teachers and parents in the school |
| `send_push_on_notification()` | Any notification inserted | Triggers Web Push delivery via Edge Function |

---

## 🔐 Authentication & Security

- **Email/password authentication** via Lovable Cloud Auth
- **Row Level Security (RLS)** on all tables — users can only access data they're authorized to see
- **Multi-tenant isolation** — `school_id` filtering enforced at database level via security-definer functions
- **Role-based route protection** — each page checks user role before rendering
- **Separate roles table** — `user_roles` stored independently from `profiles` to prevent privilege escalation
- **Edge Functions** for privileged operations (creating users, seeding data, password resets)
- **Audit logging** for sensitive operations (settings changes, lead status updates)

---

## 🎨 Design System

Smart EduConnect uses a semantic design token system with role-based color differentiation:

- **Primary**: ASE Blue (`hsl(210 85% 40%)`)
- **Secondary**: Warm Sand (`hsl(32 45% 68%)`)
- **Role Colors**: Admin (Blue), Teacher (Deep Forest Green `#1a3628`), Parent (Grey-blue `#6c7580`), Super Admin (Purple)
- **Hidden scrollbars** — Clean UI with invisible scrollbars across the app
- **Fixed sidebar** — Desktop sidebar stays fixed while content scrolls independently
- **IST timestamps** — All notification time displays converted to Asia/Kolkata timezone

**Typography**: Plus Jakarta Sans (headings) + Inter (body text)

**Component Library**: shadcn/ui with custom variants and design tokens defined in `index.css` and `tailwind.config.ts`.

**Utility Classes**:
- `card-elevated` — Elevated card with hover shadow
- `card-stat` — Dashboard stat card with hover animation
- `gradient-primary`, `gradient-admin`, `gradient-teacher`, `gradient-parent` — Role-specific gradient backgrounds
- `status-active`, `status-pending`, `status-approved`, `status-rejected` — Status badge styles

---

## 🚀 Getting Started

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open** `http://localhost:5173` in your browser

4. **Sign up** as an admin to get started, then create teacher and parent accounts from the admin panel

---

## 📱 Mobile Responsiveness

Smart EduConnect is fully mobile-responsive with optimized layouts:

- **Compact filter grids** — 2-per-row aligned filters on mobile using `w-[calc(50%-4px)]`
- **Scaled typography** — `text-[9px]` to `text-sm` responsive font sizing
- **Mobile cards** — Card-based layouts replace tables on small screens
- **Bottom navigation** — Mobile bottom nav bar with "More" menu for additional sidebar items
- **Sticky action bars** — Fixed position CTAs on mobile for attendance and marks entry
- **Truncated tabs** — Tab labels truncate gracefully on narrow viewports

---

## 📝 Changelog

### Latest Updates

#### 🏢 Multi-Tenant & Super Admin Panel
- Full super admin dashboard with system-wide school management
- Schools CRUD with logo upload, active/inactive toggle, admin/student/teacher counts
- Global module visibility control with per-school overrides
- Admin account creation and password reset via edge function
- School branding (name + logo) in sidebar header via `useSchoolBranding` hook

#### 👨‍🎓 Student Lifecycle Management
- **Student Promotion** — Versioned record model with history snapshots, auto admission number regeneration, parent link copying
- **Student Discontinuation** — Archive with full snapshots, reinstatement support
- **Student History** — Cross-panel search with attendance/marks/fees drill-down per class record

#### 💰 Fee Management System
- Batch fee creation with multi-section targeting
- Percentage-based discounts (class-wide and per-student)
- Custom partial payments with cumulative tracking
- Razorpay online payment integration
- Per-transaction receipt generation (PDF)
- Receipt template customization (school info, logo, field toggles)
- PDF fee collection report export (landscape, summary stats, color-coded)
- Automated fee reminders via edge function

#### 📱 Progressive Web App (PWA)
- Full offline support with Workbox service worker caching
- Installable from browser to home screen
- Custom manifest with school branding
- Runtime caching for API calls with NetworkFirst strategy

#### 🔔 Notifications & Push
- Per-user notification bell with unread count badge
- Full notifications page with date filtering, mark all read, delete read
- IST timezone for all notification timestamps
- Web Push via VAPID with auto-generated keys
- Database triggers for automated notifications (attendance, homework, exams, announcements, complaints, holidays, leave, certificates)

#### 📲 Native Mobile App (Capacitor)
- Capacitor integration for building native iOS and Android apps
- Shared codebase — same React app runs as web, PWA, and native mobile

#### 📚 Academic Features
- 5-step exam creation wizard with auto/manual scheduling
- Weekly/competitive exam system with question papers (MCQ)
- Exam cycles management
- Syllabus completion tracking with teacher attribution
- Competitive exam countdown reminders on Teacher Dashboard

#### 🎨 UI/UX Enhancements
- Hidden scrollbars for clean UI
- Fixed sidebar with independent content scrolling
- Mobile bottom navigation with "More" menu
- Consistent 2x2 filter grid alignment across all panels
- Responsive tab sizing with icons and truncated labels

---

## 📄 License

This project is proprietary. All rights reserved.

---

<p align="center">
  Built with ❤️ using <a href="https://lovable.dev">Lovable</a>
</p>
