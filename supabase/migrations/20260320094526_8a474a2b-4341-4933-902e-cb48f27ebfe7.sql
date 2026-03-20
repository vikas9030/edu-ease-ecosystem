CREATE OR REPLACE FUNCTION public.get_parent_login_email(student_identifier text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT pr.email
  FROM public.students s
  JOIN public.student_parents sp ON sp.student_id = s.id
  JOIN public.parents p ON p.id = sp.parent_id
  JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE s.status = 'active'
    AND (
      upper(s.admission_number) = upper(student_identifier)
      OR upper(coalesce(s.login_id, '')) = upper(student_identifier)
    )
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;
$function$;