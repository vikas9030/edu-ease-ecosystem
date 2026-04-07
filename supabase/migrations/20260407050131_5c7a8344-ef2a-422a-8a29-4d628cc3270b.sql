
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS main_subject text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS secondary_subjects text[] DEFAULT '{}';

ALTER TABLE public.certificate_requests ADD COLUMN IF NOT EXISTS parent_custom_name text;
