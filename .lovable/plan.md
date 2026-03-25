

## Holiday & Occasion Calendar with Mobile-Friendly Design

### Overview
Add a Holiday/Occasion Calendar where admins create holidays with dates and descriptions. Teachers and parents view them in a responsive calendar+list UI. All users get reminder notifications.

### Database Changes (1 migration)

**New table: `holidays`**
- `id` uuid PK, `title` text NOT NULL, `description` text, `holiday_date` date NOT NULL, `holiday_type` text DEFAULT 'holiday' (holiday/occasion/event), `created_by` uuid, `created_at` timestamptz DEFAULT now()

**RLS Policies:**
- Admin: full CRUD (using `has_role` function)
- All authenticated: SELECT

**Notification trigger:** On INSERT, create a notification for all teachers and parents: "New Holiday: {title} on {date}"

### New Files

**1. `src/pages/admin/HolidaysManagement.tsx`**
- Mobile-first responsive layout
- Calendar view with highlighted holiday dates (colored dots by type)
- Below calendar: scrollable card list of holidays with add/edit/delete
- Add/Edit dialog: date picker, title, description, type selector
- On mobile: stacked layout, full-width cards, compact calendar

**2. `src/pages/teacher/TeacherHolidays.tsx`**
- Read-only calendar + list view, same responsive pattern
- Auth guard for teacher role

**3. `src/pages/parent/ParentHolidays.tsx`**
- Read-only calendar + list view
- Auth guard for parent role

**4. `supabase/functions/notify-holiday-reminders/index.ts`**
- Edge function that queries holidays within next 2 days
- Inserts reminder notifications for all teacher/parent users
- Can be invoked via cron or manually

### Modified Files

**5. `src/App.tsx`** - Add 3 routes: `/admin/holidays`, `/teacher/holidays`, `/parent/holidays`

**6. `src/config/adminSidebar.tsx`** - Add "Holidays" with `CalendarDays` icon, moduleKey `holidays`

**7. `src/config/teacherSidebar.tsx`** - Add "Holidays" item

**8. `src/config/parentSidebar.tsx`** - Add "Holidays" item

### Mobile-First Design Details
- Calendar component uses full width on mobile with compact day cells
- Holiday cards: single column stack on mobile, 2-col grid on tablet, 3-col on desktop
- Type badges color-coded: holiday (red), occasion (blue), event (green)
- Add button: FAB-style floating button on mobile
- Edit/delete via swipe-friendly dropdown menus
- Bottom nav "More" sheet already handles extra sidebar items automatically
- Compact typography and spacing using existing mobile CSS rules

### Technical Notes
- Uses existing `Calendar` UI component with `modifiers` for highlighting dates
- Holidays table is simple CRUD via Supabase client -- no edge function needed for CRUD
- Notification trigger uses a PL/pgSQL function to batch-insert into `notifications` table
- Reminder edge function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS

