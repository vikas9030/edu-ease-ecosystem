
-- Allow teachers to update announcements they created
CREATE POLICY "Teachers update own announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND created_by = auth.uid()
  AND school_id = get_user_school_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND created_by = auth.uid()
  AND school_id = get_user_school_id(auth.uid())
);

-- Allow teachers to delete announcements they created
CREATE POLICY "Teachers delete own announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND created_by = auth.uid()
  AND school_id = get_user_school_id(auth.uid())
);
