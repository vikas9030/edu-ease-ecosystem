

## Problem

The `fees` table stores only `student_id` and derives the class name via `students → classes` join. When a student is promoted, their `class_id` changes to the new class, so **all historical fees show the new class name** instead of the class the fee was originally created for. This affects:

1. **Admin Fees Management** — class column shows wrong class for pre-promotion fees
2. **Parent Fees page** — same issue
3. **Student History fees tab** — fees fetched by `student_id` which is now the promoted record
4. **Fee receipts (PDF)** — class name is pulled from the student's current class

## Solution

Add a `class_id` column to the `fees` table that captures the class at fee creation time. Then use this stored class for display instead of the student's current class.

### Step 1: Database migration
- Add `class_id` column (uuid, nullable) to `fees` table
- Backfill existing rows: `UPDATE fees SET class_id = s.class_id FROM students s WHERE fees.student_id = s.id AND fees.class_id IS NULL`

### Step 2: Update fee creation (`CreateFeeDialog.tsx`)
- When inserting fee records, include `class_id` from the student's current class at creation time
- Look up each student's `class_id` and add it to the insert payload

### Step 3: Update Admin Fees Management (`FeesManagement.tsx`)
- Change the query to also join `fees.class_id → classes` (as `fee_class`) for display
- Use `fee_class` name for the class column, falling back to `students.classes` for backward compat
- Update the export report to use the fee's stored class
- Update receipt generation to use the fee's stored class

### Step 4: Update Parent Fees page (`ParentFees.tsx`)
- Fetch fee's `class_id` and join to `classes` to show the original class name per fee

### Step 5: Update Student History Content (`StudentHistoryContent.tsx`)
- In the fees tab, show the class name from the fee's `class_id` join

### Step 6: Update Fee Receipt Generator (`FeeReceiptGenerator.tsx`)
- No structural change needed — the `className` param is passed by callers; callers just need to pass the fee's class instead of the student's current class

### Step 7: Update StudentFeeDetailDialog
- Display the fee's original class name

### Files to modify
1. **Database migration** — add `class_id` to `fees`, backfill
2. `src/components/fees/CreateFeeDialog.tsx` — include `class_id` in insert
3. `src/pages/admin/FeesManagement.tsx` — query & display fee's class
4. `src/pages/parent/ParentFees.tsx` — query & display fee's class  
5. `src/components/history/StudentHistoryContent.tsx` — show fee's class
6. `src/components/fees/StudentFeeDetailDialog.tsx` — use fee's class
7. `src/components/fees/ClassSummaryView.tsx` — may need update if it groups by class

