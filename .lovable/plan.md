

# Fix: School Data Isolation (Admin Sees Other Schools' Data)

## Problem
The multi-tenant migration added `school_id` columns to all tables and created the `get_user_school_id()` helper function, but:
1. **No RLS policy uses `school_id`** — admins/teachers see ALL schools' data
2. **No frontend query filters by `school_id`** — even if RLS were fixed, inserts don't set `school_id`

## Solution

### Phase 1: Database — Update RLS Policies (1 migration)

Update RLS policies on all major tables to enforce school isolation for non-super-admin roles. The pattern for each table:

```sql
-- Example for students table
DROP POLICY "Admins and teachers can manage students" ON students;
CREATE POLICY "School-scoped admin/teacher manage students" ON students
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);
```

Tables to update (~25): `students`, `teachers`, `classes`, `subjects`, `attendance`, `exams`, `exam_marks`, `fees`, `fee_payments`, `homework`, `leave_requests`, `complaints`, `certificate_requests`, `announcements`, `timetable`, `syllabus`, `messages`, `notifications`, `leads`, `lead_call_logs`, `lead_status_history`, `gallery_folders`, `gallery_images`, `holidays`, `app_settings`, `student_reports`, `question_papers`, `questions`, `exam_cycles`, `student_discontinuation_archives`, `student_exam_answers`, `student_exam_results`, `student_parents`, `parents`, `module_visibility`.

Super admins bypass the school filter. All other roles only see rows matching their `school_id`.

### Phase 2: Frontend — Set `school_id` on All Inserts

Update all admin pages that create records to include `school_id` from the auth context (`useAuth().schoolId`). Key files:

- `AdminDashboard.tsx` — no changes needed (read-only, RLS handles it)
- `StudentsManagement.tsx` — add `school_id` to student creation
- `TeachersManagement.tsx` — add `school_id` to teacher creation (already done in edge function, verify)
- `ClassesManagement.tsx` — add `school_id` when creating classes
- `SubjectsManagement.tsx` — add `school_id` when creating subjects
- `ExamsManagement.tsx` — add `school_id` when creating exams
- `FeesManagement.tsx` — add `school_id` when creating fees
- `AttendanceManagement.tsx` — add `school_id` when marking attendance
- `HolidaysManagement.tsx` — add `school_id` when creating holidays
- `AnnouncementsManagement.tsx` — add `school_id` when creating announcements
- `TimetableManagement.tsx` — add `school_id` to timetable entries
- `SyllabusManagement.tsx` — add `school_id`
- `LeadsManagement.tsx` — add `school_id`
- `ComplaintsManagement.tsx` — add `school_id`
- `LeaveManagement.tsx` — add `school_id`
- `GalleryManagement.tsx` — add `school_id`
- `CertificatesManagement.tsx` — add `school_id`
- `ExamCyclesManagement.tsx` — add `school_id`
- `WeeklyExamsManagement.tsx` — add `school_id`
- `QuestionPaperBuilder.tsx` — add `school_id`

### Phase 3: Edge Functions

Verify `create-user` and `create-student` edge functions propagate `school_id` correctly (already partially done, will verify and fix gaps).

### Phase 4: Notification Triggers

Update database trigger functions (`notify_complaint`, `notify_holiday_created`, `notify_announcement`, etc.) to scope notifications to the same `school_id` so admins/teachers from one school don't get notifications from another school.

## Implementation Order
1. Single large migration updating all RLS policies
2. Update all admin page inserts to include `schoolId`
3. Verify edge functions
4. Update notification triggers

This is a large but systematic change — every table gets the same pattern applied.

