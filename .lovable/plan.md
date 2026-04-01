

## Plan: Dynamic School Branding Across All Panels

### What This Does
When a super admin uploads a school logo and sets its name, that branding automatically appears in:
- The login page school dropdown (already works)
- Admin, Teacher, and Parent/Student sidebar and mobile header (replacing "SmartEduConnect")
- The school logo replaces the generic GraduationCap icon

Super admin panel keeps "SmartEduConnect" branding since it's platform-level.

### No Database Changes Needed
The `schools` table already has `name`, `logo_url`, and `code` columns. The `user_roles` table already has `school_id`. We just need to fetch and display this data.

### Implementation Steps

**1. Create a `useSchoolBranding` hook** (`src/hooks/useSchoolBranding.ts`)
- Reads `schoolId` from `useAuth()`
- Fetches the school's `name` and `logo_url` from the `schools` table
- Returns `{ schoolName, schoolLogo, loading }`
- Caches the result so it doesn't re-fetch on every render
- Super admin role returns null (keeps default branding)

**2. Update `DashboardLayout.tsx`**
- Import and use `useSchoolBranding` hook
- In the **desktop sidebar logo section** (line 222-234):
  - If `schoolLogo` exists, show `<img>` instead of `<GraduationCap>` icon
  - If `schoolName` exists, show it instead of "SmartEduConnect"
- In the **mobile header** (line 294-299):
  - Same logic: show school logo/name if available
- Only apply for non-super_admin roles

**3. Files Changed**
- `src/hooks/useSchoolBranding.ts` — **new file**
- `src/components/layouts/DashboardLayout.tsx` — replace hardcoded branding with dynamic values

### Technical Details

```typescript
// useSchoolBranding.ts
export function useSchoolBranding() {
  const { schoolId, userRole } = useAuth();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || userRole === 'super_admin') return;
    supabase.from('schools').select('name, logo_url')
      .eq('id', schoolId).maybeSingle()
      .then(({ data }) => {
        setSchoolName(data?.name || null);
        setSchoolLogo(data?.logo_url || null);
      });
  }, [schoolId, userRole]);

  return { schoolName, schoolLogo };
}
```

In `DashboardLayout.tsx`, the logo area becomes:
```tsx
{schoolLogo ? (
  <img src={schoolLogo} className="h-9 w-9 rounded-lg object-cover" />
) : (
  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
    <GraduationCap className="h-5 w-5 text-primary" />
  </div>
)}
{sidebarOpen && (
  <h1 className="font-display font-bold text-base truncate">
    {schoolName || 'SmartEduConnect'}
  </h1>
)}
```

Same pattern applied to the mobile header section.

