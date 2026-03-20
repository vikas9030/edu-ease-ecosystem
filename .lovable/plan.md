

## Plan: Redesign Student History — Class-based navigation with filtered tabs

### Current behavior
All 3 history pages (admin, teacher, parent) dump all attendance/marks/fees in flat lists. No way to filter by class year, month, or exam.

### New behavior (all 3 panels)

**Flow:**
1. **Search/select student** (admin/teacher: search bar; parent: auto-loads linked children including promoted records)
2. **Show list of classes the student studied in** — query `students` table for all records matching the same `admission_number` (active + promoted). Each row = a class card (e.g. "Class 5-A (active)" or "Class 4-B (promoted)")
3. **User selects a class** → loads data for that specific student record ID
4. **3 tabs appear with filters:**
   - **Attendance tab**: Month selector dropdown → shows only that month's attendance
   - **Marks tab**: Exam name dropdown (populated from exams for that class) → shows marks for selected exam
   - **Fees tab**: Shows all fees for that student record with paid/unpaid/partial status

### Technical details

**Create shared component:** `src/components/history/StudentHistoryContent.tsx`
- Accepts `studentRecords: StudentItem[]` (all records for same student across classes)
- Shows class selector cards/chips
- On class select, fetches attendance, marks, fees for that `student.id`
- Attendance tab: month dropdown filter (derived from fetched dates)
- Marks tab: exam name dropdown filter (derived from fetched exam data)
- Fees tab: full list with status badges

**Modify 3 pages to use shared component:**

1. **`src/pages/admin/StudentHistory.tsx`** — Search student → on select, query all student records with same `admission_number` → pass to `StudentHistoryContent`
2. **`src/pages/teacher/TeacherStudentHistory.tsx`** — Same as admin
3. **`src/pages/parent/ParentStudentHistory.tsx`** — Fetch linked children (all statuses, not just active) → group by admission_number → pass to `StudentHistoryContent`

**Data queries per selected class (student record ID):**
- Attendance: `attendance` where `student_id = selected_id`, ordered by date desc
- Marks: `exam_marks` with joined `exams(name, exam_date, max_marks, subjects(name))` where `student_id = selected_id`
- Fees: `fees` where `student_id = selected_id`

**No database changes needed** — all data already exists; promoted students keep their old `student.id` with `status='promoted'`.

### Files to create
- `src/components/history/StudentHistoryContent.tsx` — shared component with class selector, filtered tabs

### Files to modify
- `src/pages/admin/StudentHistory.tsx` — use shared component
- `src/pages/teacher/TeacherStudentHistory.tsx` — use shared component
- `src/pages/parent/ParentStudentHistory.tsx` — use shared component, fetch all statuses

