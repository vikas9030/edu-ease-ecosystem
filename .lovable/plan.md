

# How Multi-School Login Works Without Data Collision

## Current Login System (Single School)

Today, the app has three login paths:

```text
Staff Login:
  Admin  → enters email + password → direct auth
  Teacher → enters Teacher ID (e.g., JOHN-MATH) → lookup teacher table → get email → auth

Parent/Student Login:
  Parent → enters Student ID (e.g., RAHUL-10-A) → RPC finds parent email → auth
```

## The Collision Problem

Without `school_id`, if two schools both have a teacher with ID `JOHN-MATH` or a student with ID `RAHUL-10-A`, the system cannot tell them apart. The wrong account could be returned.

## How Multi-School Login Will Prevent Collision

### Option 1: School Selection Before Login

```text
Login Screen
  ┌─────────────────────────┐
  │  Select Your School ▼   │  ← User picks school first
  │  [ABC Public School  ]  │
  ├─────────────────────────┤
  │  Staff | Parent tabs    │
  │  Teacher ID: JOHN-MATH  │
  │  Password: ****         │
  │  [Sign In]              │
  └─────────────────────────┘
```

- The selected `school_id` is sent along with the Teacher ID or Student ID
- Database lookup filters by **both** the ID and the school: `WHERE teacher_id = 'JOHN-MATH' AND school_id = 'school-xyz'`
- Two schools can have `JOHN-MATH` — no collision because the school filter narrows it down

### Option 2: School Code Prefix in IDs

Each school gets a short code (e.g., `ABC`, `XYZ`). Teacher and Student IDs automatically include it:

```text
School ABC: Teacher ID = ABC-JOHN-MATH, Student ID = ABC-RAHUL-10-A
School XYZ: Teacher ID = XYZ-JOHN-MATH, Student ID = XYZ-RAHUL-10-A
```

No school selection needed — the ID itself is globally unique.

### Admin Login (Email)

Admins log in with email, which is already globally unique. After auth, the system looks up their `school_id` from `user_roles` and scopes all data to that school.

### Super Admin Login

Super Admin has no `school_id` — they see everything across all schools.

## Data Isolation After Login

Once logged in, every database query is automatically filtered:

```text
Teacher from School A logs in
  → Auth context sets schoolId = "school-a"
  → RLS policy: WHERE school_id = get_user_school_id(auth.uid())
  → Teacher can ONLY see School A's students, classes, exams, fees
  → School B's data is completely invisible
```

This happens at the **database level** (RLS), so even if frontend code has a bug, data cannot leak between schools.

## Summary

| Role | Login With | How Collision Is Prevented |
|------|-----------|--------------------------|
| Super Admin | Email | Global — no school scope |
| Admin | Email | Email is unique; school_id assigned |
| Teacher | Teacher ID | School selector OR school-prefixed ID |
| Parent | Student ID | School selector OR school-prefixed ID |

## Recommended Approach

**School selection dropdown on login page** is simpler and cleaner — IDs stay short and readable, and the school list is fetched from the `schools` table.

