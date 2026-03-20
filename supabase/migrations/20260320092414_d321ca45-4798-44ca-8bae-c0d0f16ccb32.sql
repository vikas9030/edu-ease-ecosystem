
-- Drop the old check constraint and recreate with 'promoted' included
ALTER TABLE public.students DROP CONSTRAINT students_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'promoted'::text]));
