
CREATE OR REPLACE FUNCTION public.send_push_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://uylcfkvrfgyukvsbupsz.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bGNma3ZyZmd5dWt2c2J1cHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODQzMTMsImV4cCI6MjA4OTU2MDMxM30.hLOi5BNDPtvlCktuq_ILToMA-ODefvCQyComMiHwkjs"}'::jsonb,
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'message', NEW.message,
      'url', COALESCE(NEW.link, '/')
    )
  );
  RETURN NEW;
END;
$function$;
