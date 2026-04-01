CREATE TABLE public.student_discontinuation_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  admission_number text NOT NULL,
  class_name text,
  discontinuation_reason text,
  attendance_snapshot jsonb DEFAULT '[]'::jsonb,
  marks_snapshot jsonb DEFAULT '[]'::jsonb,
  fees_snapshot jsonb DEFAULT '[]'::jsonb,
  timetable_snapshot jsonb DEFAULT '[]'::jsonb,
  discontinued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_discontinuation_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage archives"
  ON public.student_discontinuation_archives FOR ALL
  USING (is_admin_or_super(auth.uid()));

CREATE POLICY "Teachers can view archives"
  ON public.student_discontinuation_archives FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Parents can view own children archives"
  ON public.student_discontinuation_archives FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = student_discontinuation_archives.student_id
      AND p.user_id = auth.uid()
    )
  );