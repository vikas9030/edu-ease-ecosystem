CREATE OR REPLACE FUNCTION public.notify_parent_homework()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_user_id uuid;
  hw_class_name text;
  hw_subject text;
  class_section text;
BEGIN
  SELECT name, section INTO hw_class_name, class_section FROM classes WHERE id = NEW.class_id;
  IF class_section IS NOT NULL AND class_section != '-' AND class_section != '' THEN
    hw_class_name := hw_class_name || '-' || class_section;
  END IF;
  IF NEW.subject_id IS NOT NULL THEN
    SELECT name INTO hw_subject FROM subjects WHERE id = NEW.subject_id;
  END IF;

  FOR parent_user_id IN
    SELECT p.user_id FROM student_parents sp JOIN parents p ON p.id = sp.parent_id JOIN students s ON s.id = sp.student_id WHERE s.class_id = NEW.class_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, school_id)
    VALUES (parent_user_id, 'New Homework Assigned', NEW.title || COALESCE(' (' || hw_subject || ')', '') || ' - Due: ' || NEW.due_date, 'homework', '/parent/homework', NEW.school_id);
  END LOOP;
  RETURN NEW;
END;
$function$;