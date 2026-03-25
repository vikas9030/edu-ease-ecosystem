
-- Create holidays table
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  holiday_date date NOT NULL,
  holiday_type text NOT NULL DEFAULT 'holiday',
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can manage holidays"
  ON public.holidays FOR ALL
  TO public
  USING (is_admin_or_super(auth.uid()));

-- All authenticated can view
CREATE POLICY "All authenticated can view holidays"
  ON public.holidays FOR SELECT
  TO authenticated
  USING (true);

-- Notification trigger function
CREATE OR REPLACE FUNCTION public.notify_holiday_created()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Notify all teachers
  FOR target_user_id IN SELECT user_id FROM user_roles WHERE role IN ('teacher', 'parent')
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      target_user_id,
      'New Holiday: ' || NEW.title,
      NEW.title || ' on ' || to_char(NEW.holiday_date, 'DD Mon YYYY') || COALESCE(' - ' || NEW.description, ''),
      'holiday',
      CASE
        WHEN (SELECT role FROM user_roles WHERE user_id = target_user_id LIMIT 1) = 'teacher' THEN '/teacher/holidays'
        ELSE '/parent/holidays'
      END
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_holiday_created
  AFTER INSERT ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_holiday_created();
