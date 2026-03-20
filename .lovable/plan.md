

## Bulk Import/Export for Students and Teachers

### Overview
Add Excel bulk import and export functionality to both Students and Teachers management pages, following the existing `LeadExcelImport` pattern.

### New Files to Create

**1. `src/components/students/StudentExcelImport.tsx`**
- Dialog component (same pattern as `LeadExcelImport`)
- Template columns: Student Name, Date of Birth, Class (e.g. "5-A"), Password, Parent Name, Parent Phone, Address, Blood Group, Emergency Contact, Emergency Contact Name
- Download template with sample data row
- Parse uploaded Excel, validate required fields (Student Name, Class, Password)
- For each valid row: call `create-student` edge function (which creates auth account + student + parent records)
- Show progress bar since each row calls the edge function sequentially
- Show success/error summary

**2. `src/components/teachers/TeacherExcelImport.tsx`**
- Same dialog pattern
- Template columns: Full Name, Email (optional), Phone, Qualification, Password, Subjects (comma-separated)
- For each valid row: call `create-user` edge function with role=teacher, then insert teacher record
- Show progress and results

**3. `src/components/students/StudentExcelExport.tsx`** (utility function, not a component)
- Export current filtered students list to Excel with columns: Admission Number, Student Name, Class, Section, DOB, Parent Name, Parent Phone, Address, Blood Group, Status

**4. `src/components/teachers/TeacherExcelExport.tsx`** (utility function)
- Export teachers to Excel: Teacher ID, Full Name, Email, Phone, Qualification, Subjects, Status

### Files to Modify

**5. `src/pages/admin/StudentsManagement.tsx`**
- Add "Import" and "Export" buttons next to "Add Student"
- Import button opens `StudentExcelImport` dialog
- Export button calls export utility with current filtered data

**6. `src/pages/admin/TeachersManagement.tsx`**
- Add "Import" and "Export" buttons next to "Add Teacher"
- Same pattern

### Technical Details

- Uses `xlsx` library (already installed for LeadExcelImport)
- Student bulk import calls `create-student` edge function per row (creates auth user + parent account). Shows a progress indicator since this is sequential.
- Teacher bulk import calls `create-user` edge function per row, then inserts into `teachers` table via Supabase client
- Class matching for students: parse "5-A" format → find matching class by name+section in the classes table
- Export uses `XLSX.writeFile` to generate downloadable Excel
- No database changes needed

### UI
- Button group: `[+ Add Student] [↑ Import] [↓ Export]` in a flex row
- Import dialog: download template button, upload button, progress bar during import, results table showing successes and errors

