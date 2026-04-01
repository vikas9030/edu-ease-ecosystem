

# Fix: Hide Empty Section Display in Class Names

## Problem
When a class is created without a section, it defaults to `'-'`, causing displays like **"LKG - -"** throughout the app. The user wants it to show just **"LKG"** when no section is set.

## Solution

### 1. Create a shared utility function
Add a `formatClassName(name, section)` helper in `src/lib/utils.ts` that returns:
- `"Class 5 - A"` when section is meaningful (not `'-'` or empty)
- `"Class 5"` when section is `'-'` or empty

### 2. Update all ~14 files that display class names
Replace all instances of `{cls.name} - {cls.section}` and `${cls.name}-${cls.section}` with the utility function. Files affected:

- `src/pages/admin/ClassesManagement.tsx` (2 places)
- `src/pages/teacher/TeacherClasses.tsx`
- `src/pages/teacher/TeacherAttendance.tsx`
- `src/pages/teacher/TeacherAnnouncements.tsx`
- `src/pages/teacher/TeacherExams.tsx`
- `src/pages/teacher/TeacherHomework.tsx`
- `src/pages/teacher/TeacherReports.tsx`
- `src/components/exams/ExamScheduleBuilder.tsx`
- `src/components/exams/ExamWizardStep5.tsx`
- `src/components/fees/ClassSummaryView.tsx`
- `src/components/students/StudentExcelImport.tsx`
- Plus any other files found with this pattern

### Technical Detail
```typescript
// src/lib/utils.ts
export function formatClassName(name: string, section?: string | null): string {
  if (!section || section === '-') return name;
  return `${name} - ${section}`;
}
```

No database changes needed — the `'-'` default is fine for storage; we just fix the display layer.

