

## Plan: Edit Exam Schedule + Notifications + Entire Class Promotion

### What will be built

**1. Edit Exam Schedule (Admin side)**
- Add an "Edit" button next to each exam entry in `ExamsManagement.tsx` (both mobile cards and desktop table rows)
- Create an `EditExamDialog` component with fields: exam date, exam time, max marks, subject, class
- On save, update the exam record in the database
- After a successful edit, insert notifications for all parents (of students in that exam's class) and all teachers, informing them the schedule changed

**2. Schedule Change Notifications**
- When an exam is edited, query `student_parents` + `parents` for parent user_ids of students in the exam's class, and query `user_roles` for teacher user_ids
- Insert rows into the `notifications` table for each parent and teacher with a message like: "Exam schedule updated: [Exam Name] - [Subject] date changed to [new date]"
- Existing notification triggers (`send_push_on_notification`) will automatically send push notifications

**3. "Promote Entire Class" Button**
- The current `StudentPromotion.tsx` already loads all students and selects them all by default — so "entire class" promotion already works
- Add a prominent "Promote Entire Class" button that auto-selects all students and directly opens the confirmation dialog (shortcut for the existing flow)
- This skips the manual student selection step when you want to promote everyone at once

### Technical details

**Files to create:**
- `src/components/exams/EditExamDialog.tsx` — Dialog with form fields for editing an exam entry (date, time, max marks). On save: updates `exams` table, then inserts notifications for parents + teachers.

**Files to modify:**
- `src/pages/admin/ExamsManagement.tsx` — Add "Edit" option in the dropdown menu and in mobile cards. Import and render `EditExamDialog`.
- `src/pages/admin/StudentPromotion.tsx` — Add a "Promote Entire Class" button that selects all students + opens confirm dialog in one click.

**No database changes needed** — the `exams` table already supports updates via RLS for admins, and `notifications` table allows inserts from anyone.

