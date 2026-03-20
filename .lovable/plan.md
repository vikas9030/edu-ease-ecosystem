

## Problem

The **Student Promotion** code (lines 137-145 in `StudentPromotion.tsx`) does an **in-place UPDATE** — it changes the student's `class_id` and `admission_number` directly. It does NOT create a separate record for the old class. So after promoting "kalyan" from 1-A to 3-A:

- The old record is gone (overwritten)
- There's only 1 record with admission_number `KALYAN-3-A` and class 3-A
- Student History queries `WHERE admission_number = 'KALYAN-3-A'` — finds only the current record, no previous class

**Two bugs to fix:**

### Fix 1: Promotion must preserve old record

Change promotion logic to:
1. **Mark the old record** as `status = 'promoted'` (keep it intact with old class_id and admission_number)
2. **Create a NEW record** copying all student fields (name, parent info, user_id, etc.) with the new class_id, new admission_number, and `status = 'active'`
3. Copy `student_parents` links to the new record so parent access works

### Fix 2: History must find records by student name/base identifier, not exact admission_number

Since admission_number changes per class (e.g. `KALYAN-1-A` → `KALYAN-3-A`), history lookup needs to:
1. Extract the base name from admission_number (e.g. `KALYAN` from `KALYAN-3-A`)
2. Search for all records matching `admission_number ILIKE 'KALYAN%'`
3. OR better: search by `full_name` exact match combined with base admission pattern

### Files to modify

1. **`src/pages/admin/StudentPromotion.tsx`** — Change `handlePromote` to:
   - Update old record: set `status = 'promoted'` (don't change class_id or admission_number)
   - Insert new record with new class_id, new admission_number, copy all other fields
   - Copy student_parents links to new student record

2. **`src/pages/admin/StudentHistory.tsx`** — Change `selectStudent` to query by `full_name` (exact match) instead of exact `admission_number`, so it finds all class records

3. **`src/pages/teacher/TeacherStudentHistory.tsx`** — Same change as admin

4. **`src/pages/parent/ParentStudentHistory.tsx`** — Update to fetch all student records (including promoted) linked to the parent, not just active ones

### No database changes needed
The students table already has a `status` column that supports 'promoted'. The `student_parents` table can hold multiple links.

