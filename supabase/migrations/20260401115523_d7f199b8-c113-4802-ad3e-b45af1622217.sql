
-- Add unique constraint on module_key for system-level rows (school_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_module_visibility_key ON public.module_visibility (module_key) WHERE school_id IS NULL;

-- Seed default modules using ON CONFLICT on the new unique index
INSERT INTO public.module_visibility (module_key, module_label, is_enabled) VALUES
  ('teachers', 'Teachers', true),
  ('students', 'Students', true),
  ('classes', 'Classes', true),
  ('subjects', 'Subjects', true),
  ('timetable', 'Timetable', true),
  ('attendance', 'Attendance', true),
  ('exams', 'Exams', true),
  ('syllabus', 'Syllabus', true),
  ('leads', 'Leads', true),
  ('announcements', 'Announcements', true),
  ('leave', 'Leave Requests', true),
  ('certificates', 'Certificates', true),
  ('complaints', 'Complaints', true),
  ('fees', 'Fees', true),
  ('promotion', 'Promotion', true),
  ('gallery', 'Gallery', true),
  ('holidays', 'Holidays', true),
  ('notifications', 'Notifications', true),
  ('messages', 'Messages', true),
  ('homework', 'Homework', true),
  ('weekly_exams', 'Weekly Exams', true),
  ('exam_cycles', 'Exam Cycles', true),
  ('question_papers', 'Question Papers', true)
ON CONFLICT (module_key) WHERE school_id IS NULL DO NOTHING;
