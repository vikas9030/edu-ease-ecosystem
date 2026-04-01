

# Discontinued Students Feature

## Overview
Add a "Discontinued Students" management page similar to the existing Student Promotion flow. Admins can mark students as "discontinued" (e.g., students who left mid-year), which updates their status and removes them from active lists while preserving their historical data.

## How It Works

### Database
- No new tables needed. The existing `students` table already has a `status` column (`active`, `promoted`, `retained`). We add `discontinued` as a new status value.
- Discontinued students will be filtered out of active student lists (same pattern as `promoted` students).

### New Page: `src/pages/admin/DiscontinuedStudents.tsx`
- **Select a class** → loads active students from that class
- **Select students** (checkbox, select all) to mark as discontinued
- **Add optional reason** via a text input (stored in a new `discontinuation_reason` column or notes field)
- **Confirm dialog** before marking
- On confirm: update student status to `discontinued`
- **View discontinued list**: A tab/section showing all discontinued students with class, date, and option to **re-admit** (set back to `active`)

### UI Flow
```text
┌─────────────────────────────────────────┐
│  Discontinued Students                  │
│  ─────────────────────────────────────  │
│  [Select Class ▼]                       │
│                                         │
│  ☐ Select All                           │
│  ☑ Student A  - Adm#123                 │
│  ☑ Student B  - Adm#456                 │
│  ☐ Student C  - Adm#789                 │
│                                         │
│  Reason: [________________]             │
│  [Mark as Discontinued]                 │
│                                         │
│  ── Discontinued Students ──            │
│  Student X | Class 5-A | 2025-03-15     │
│        [Re-admit]                       │
└─────────────────────────────────────────┘
```

### Changes Summary

| File | Change |
|------|--------|
| **Migration** | Add `discontinuation_reason` text column to `students` table (nullable) |
| `src/pages/admin/DiscontinuedStudents.tsx` | New page: class selector, student checkboxes, discontinue action, discontinued list with re-admit |
| `src/App.tsx` | Add route `/admin/discontinued` |
| `src/config/adminSidebar.tsx` | Add sidebar entry with `UserMinus` icon, moduleKey `promotion` |
| `src/pages/admin/StudentsManagement.tsx` | Filter out `discontinued` students from active list (alongside `promoted`) |
| `src/components/parent/ChildSelector.tsx` | Handle `discontinued` status in display |
| `src/pages/parent/ParentChild.tsx` | Show discontinued badge |
| `README.md` | Document the new feature |

### Key Behaviors
- Discontinued students are hidden from active student lists, attendance, and exam entry
- Their historical data (attendance, marks, fees) remains intact and viewable in Student History
- Re-admit option sets status back to `active` for the same class record
- Parent login for discontinued students is blocked (same pattern as promoted students — only `active` status allowed)

