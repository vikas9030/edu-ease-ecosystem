

# Enhanced Module Control: Per-School Module Management

## Current State
- `module_visibility` table already has a `school_id` column but it's unused
- All modules are global (school_id = NULL) - toggling affects every school
- The `useModuleVisibility` hook fetches all rows without filtering by school
- Super Admin is the only role that can manage modules

## What We'll Build

### 1. Database Changes

**New table: `school_module_overrides`**
- `id`, `school_id` (NOT NULL, FK to schools), `module_key`, `is_enabled`, `updated_by`, `updated_at`
- Unique constraint on `(school_id, module_key)`
- RLS: Super Admins and school Admins can manage their own school's overrides; all authenticated users can read their school's overrides

**Logic**: System-level modules (existing `module_visibility` table) act as the master switch. Per-school overrides in `school_module_overrides` can only disable modules that are globally enabled — they cannot enable a globally disabled module.

**New DB function: `is_module_enabled_for_school`**
- Takes `_module_key text, _school_id uuid`
- Returns `true` only if the system-level module is enabled AND no school override disables it
- Security definer function for use in RLS policies

### 2. Updated Module Control UI (`ModuleControl.tsx`)

Add two tabs/sections:
- **System Modules** (existing) — global on/off for all schools
- **School Overrides** — select a school from dropdown, then toggle individual modules on/off for that school only

The school overrides section will:
- Fetch all schools for the dropdown
- When a school is selected, show all system-enabled modules with their school-specific override state
- Greyed-out toggles for globally disabled modules (can't enable per-school what's globally off)
- Insert/update rows in `school_module_overrides`

### 3. Updated `useModuleVisibility` Hook

- Fetch user's `school_id` from auth context
- Query both `module_visibility` (system) and `school_module_overrides` (for user's school)
- `isModuleEnabled(key)` returns `true` only if system=enabled AND school override is not disabled
- Super Admins bypass school overrides (see all modules)

### 4. Sidebar Filtering (no changes needed)

The existing `useAdminSidebar`, `useTeacherSidebar`, `useParentSidebar` hooks already call `isModuleEnabled()` — once the hook is updated, sidebars will automatically respect per-school settings.

## Technical Details

```sql
-- New table for per-school overrides
CREATE TABLE public.school_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, module_key)
);

ALTER TABLE public.school_module_overrides ENABLE ROW LEVEL SECURITY;

-- View: authenticated users can see their school's overrides
CREATE POLICY "View school overrides" ON public.school_module_overrides
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- Manage: super admins only
CREATE POLICY "Super admins manage overrides" ON public.school_module_overrides
FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Helper function
CREATE OR REPLACE FUNCTION public.is_module_enabled_for_school(
  _module_key text, _school_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(
      (SELECT is_enabled FROM module_visibility WHERE module_key = _module_key AND school_id IS NULL LIMIT 1),
      true
    )
    AND
    COALESCE(
      (SELECT is_enabled FROM school_module_overrides WHERE module_key = _module_key AND school_id = _school_id LIMIT 1),
      true
    )
$$;
```

### Files to modify:
1. **Migration** — create `school_module_overrides` table + function
2. **`src/hooks/useModuleVisibility.ts`** — fetch school overrides, merge with system modules
3. **`src/pages/super-admin/ModuleControl.tsx`** — add school selector + per-school toggle UI

