CREATE TABLE public.student_promotion_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  admission_number text NOT NULL,
  from_class_name text,
  to_class_name text,
  promoted_at timestamp with time zone NOT NULL DEFAULT now(),
  promoted_by uuid,
  attendance_snapshot jsonb DEFAULT '[]'::jsonb,
  marks_snapshot jsonb DEFAULT '[]'::jsonb,
  fees_snapshot jsonb DEFAULT '[]'::jsonb,
  timetable_snapshot jsonb DEFAULT '[]'::jsonb,
  school_id uuid REFERENCES public.schools(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_promotion_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School-scoped manage promotion_history"
ON public.student_promotion_history
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);

CREATE POLICY "Teachers view promotion_history"
ON public.student_promotion_history
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND school_id = get_user_school_id(auth.uid())
);

CREATE POLICY "Parents view children promotion_history"
ON public.student_promotion_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM student_parents sp
    JOIN parents p ON p.id = sp.parent_id
    WHERE sp.student_id = student_promotion_history.student_id
    AND p.user_id = auth.uid()
  )
);

CREATE INDEX idx_promotion_history_student ON public.student_promotion_history(student_id);
CREATE INDEX idx_promotion_history_school ON public.student_promotion_history(school_id);