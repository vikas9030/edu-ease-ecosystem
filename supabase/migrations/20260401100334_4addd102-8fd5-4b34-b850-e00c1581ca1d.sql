
-- 1. Create schools table
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  email text,
  phone text,
  address text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage schools" ON public.schools
FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anon can view schools for login" ON public.schools
FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Authenticated can view active schools" ON public.schools
FOR SELECT TO authenticated USING (is_active = true);

-- 2. Add school_id to all data tables
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.student_parents ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.exam_marks ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.exam_cycles ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.fee_payments ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.certificate_requests ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.lead_call_logs ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.lead_status_history ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.module_visibility ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.gallery_folders ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.gallery_images ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.student_reports ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.student_discontinuation_archives ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.syllabus ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.syllabus_schedule ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.teacher_classes ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.teacher_lead_permissions ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.teacher_syllabus_map ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.question_papers ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.student_exam_answers ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.student_exam_results ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.settings_audit_log ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.weekly_exams ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.weekly_exam_syllabus ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.push_config ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- 3. Create helper function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- 4. Update get_parent_login_email to accept school_id parameter
CREATE OR REPLACE FUNCTION public.get_parent_login_email(student_identifier text, _school_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.email
  FROM public.students s
  JOIN public.student_parents sp ON sp.student_id = s.id
  JOIN public.parents p ON p.id = sp.parent_id
  JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE s.status = 'active'
    AND (
      upper(s.admission_number) = upper(student_identifier)
      OR upper(coalesce(s.login_id, '')) = upper(student_identifier)
    )
    AND (_school_id IS NULL OR s.school_id = _school_id)
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;
$$;

-- 5. Create teacher login email lookup with school filter
CREATE OR REPLACE FUNCTION public.get_teacher_login_email(teacher_identifier text, _school_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.email
  FROM public.teachers t
  JOIN public.profiles pr ON pr.user_id = t.user_id
  WHERE upper(t.teacher_id) = upper(teacher_identifier)
    AND (_school_id IS NULL OR t.school_id = _school_id)
  LIMIT 1;
$$;
