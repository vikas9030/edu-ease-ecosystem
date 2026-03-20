

## Plan: Update README.md with latest features

The README already has extensive documentation. Two recent features need to be updated to reflect the new implementation:

### Changes needed in README.md

**1. Update "Student Promotion" description (line 63)**
Current text says "in-place record update". Must be updated to describe the new **versioned record model**: old record marked as `promoted`, new record created for the new class, parent links copied automatically.

**2. Update "Historical Data Search" description (line 64)**
Replace with the new **Student History** module description: class-based navigation with selectable class cards (Current/Previous), filtered tabs for attendance (by month), marks (by exam name), and fees (paid/unpaid list). Shared across Admin, Teacher, and Parent panels.

**3. Add "Student History" to Teacher Panel table (~line 82)**
Add row for the new Student History module in the teacher section.

**4. Add "Student History" to Parent Panel table (~line 103)**
Add row for the new Student History module in the parent section.

**5. Update Project Structure section (~line 185)**
Add `components/history/` directory with `StudentHistoryContent.tsx` shared component.

**6. Add edge functions that are missing**
Add `reset-user-password`, `send-fee-reminders`, `verify-razorpay-payment`, `create-razorpay-order` to the edge functions list (~line 228).

### Files to modify
- `README.md` — Update 6 sections as described above

