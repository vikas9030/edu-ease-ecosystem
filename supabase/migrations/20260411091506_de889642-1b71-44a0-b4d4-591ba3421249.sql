-- Drop the old unique constraint that doesn't include school_id
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_name_section_academic_year_key;

-- Create a new unique constraint that includes school_id
ALTER TABLE public.classes ADD CONSTRAINT classes_name_section_academic_year_school_key UNIQUE (name, section, academic_year, school_id);