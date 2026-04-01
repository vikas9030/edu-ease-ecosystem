
-- New table for per-school module overrides
CREATE TABLE public.school_module_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(school_id, module_key)
);

ALTER TABLE public.school_module_overrides ENABLE ROW LEVEL SECURITY;

-- View: authenticated users can see their school's overrides
CREATE POLICY "View school overrides" ON public.school_module_overrides
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- Manage: super admins manage all overrides
CREATE POLICY "Super admins manage overrides" ON public.school_module_overrides
FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
) WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Helper function to check if module is enabled for a specific school
CREATE OR REPLACE FUNCTION public.is_module_enabled_for_school(
  _module_key text, _school_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(
      (SELECT is_enabled FROM module_visibility WHERE module_key = _module_key AND school_id IS NULL LIMIT 1),
      true
    )
    AND
    COALESCE(
      (SELECT is_enabled FROM school_module_overrides WHERE module_key = _module_key AND school_id = _school_id LIMIT 1),
      true
    )
$$;
