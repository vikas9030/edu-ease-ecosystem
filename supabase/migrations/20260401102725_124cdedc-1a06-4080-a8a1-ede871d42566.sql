-- Fix teachers table: remove open SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON teachers;
DROP POLICY IF EXISTS "Allow reading teacher info for login" ON teachers;

-- Fix teacher_classes table
DROP POLICY IF EXISTS "Authenticated users can view teacher_classes" ON teacher_classes;
DROP POLICY IF EXISTS "Admins can manage teacher_classes" ON teacher_classes;

CREATE POLICY "School-scoped manage teacher_classes" ON teacher_classes
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);

CREATE POLICY "School-scoped view teacher_classes" ON teacher_classes
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- Fix syllabus table
DROP POLICY IF EXISTS "All authenticated can view syllabus" ON syllabus;
DROP POLICY IF EXISTS "Admins can manage syllabus" ON syllabus;
DROP POLICY IF EXISTS "Teachers can manage syllabus" ON syllabus;
DROP POLICY IF EXISTS "Teachers can update syllabus" ON syllabus;

CREATE POLICY "School-scoped manage syllabus" ON syllabus
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role)) AND school_id = get_user_school_id(auth.uid()))
);

CREATE POLICY "School-scoped view syllabus" ON syllabus
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- Fix timetable table
DROP POLICY IF EXISTS "Admins can manage timetable" ON timetable;
DROP POLICY IF EXISTS "Authenticated users can view published timetable" ON timetable;

CREATE POLICY "School-scoped manage timetable" ON timetable
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);

CREATE POLICY "School-scoped view timetable" ON timetable
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (school_id = get_user_school_id(auth.uid()) AND (is_published = true OR is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role)))
);

-- Fix weekly_exams table
DROP POLICY IF EXISTS "Admins can manage weekly_exams" ON weekly_exams;
DROP POLICY IF EXISTS "All authenticated can view weekly_exams" ON weekly_exams;
DROP POLICY IF EXISTS "Teachers can view weekly_exams" ON weekly_exams;

CREATE POLICY "School-scoped manage weekly_exams" ON weekly_exams
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR ((is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role)) AND school_id = get_user_school_id(auth.uid()))
);

CREATE POLICY "School-scoped view weekly_exams" ON weekly_exams
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);