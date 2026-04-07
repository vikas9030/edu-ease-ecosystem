import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all data from tables in order (respecting foreign keys)
    const tables = [
      "exam_marks", "student_exam_answers", "student_exam_results",
      "questions", "question_papers", "exams",
      "attendance", "homework", "fee_payments", "fees",
      "leave_requests", "certificate_requests", "complaints",
      "student_reports", "messages", "timetable", "announcements",
      "notifications", "push_subscriptions",
      "lead_call_logs", "lead_status_history", "leads",
      "student_discontinuation_archives",
      "student_parents", "students",
      "teacher_classes", "teachers",
      "parents", "classes", "subjects",
      "gallery_images", "gallery_folders",
      "holidays", "settings_audit_log", "app_settings",
      "school_module_overrides", "module_visibility", "exam_cycles",
      "push_config", "profiles", "user_roles", "schools"
    ];

    for (const table of tables) {
      await adminClient.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // Delete ALL auth users
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        await adminClient.auth.admin.deleteUser(u.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Complete reset done. All data and users deleted." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in full-reset:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
