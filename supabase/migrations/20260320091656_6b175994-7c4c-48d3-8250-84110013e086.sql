
-- Add class_id column to fees table to preserve the class at fee creation time
ALTER TABLE public.fees ADD COLUMN class_id uuid REFERENCES public.classes(id);

-- Backfill existing rows with the student's current class_id
UPDATE public.fees SET class_id = s.class_id FROM public.students s WHERE fees.student_id = s.id AND fees.class_id IS NULL;
