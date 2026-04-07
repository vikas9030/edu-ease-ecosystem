import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export const MODULE_DEFAULTS = [
  { module_key: "teachers", module_label: "Teachers", is_enabled: true },
  { module_key: "students", module_label: "Students", is_enabled: true },
  { module_key: "classes", module_label: "Classes", is_enabled: true },
  { module_key: "subjects", module_label: "Subjects", is_enabled: true },
  { module_key: "timetable", module_label: "Timetable", is_enabled: true },
  { module_key: "attendance", module_label: "Attendance", is_enabled: true },
  { module_key: "exams", module_label: "Exams", is_enabled: true },
  { module_key: "syllabus", module_label: "Syllabus", is_enabled: true },
  { module_key: "leads", module_label: "Leads", is_enabled: true },
  { module_key: "announcements", module_label: "Announcements", is_enabled: true },
  { module_key: "leave", module_label: "Leave Requests", is_enabled: true },
  { module_key: "certificates", module_label: "Certificates", is_enabled: true },
  { module_key: "complaints", module_label: "Complaints", is_enabled: true },
  { module_key: "fees", module_label: "Fees", is_enabled: true },
  { module_key: "promotion", module_label: "Promotion", is_enabled: true },
  { module_key: "gallery", module_label: "Gallery", is_enabled: true },
  { module_key: "holidays", module_label: "Holidays", is_enabled: true },
  { module_key: "notifications", module_label: "Notifications", is_enabled: true },
  { module_key: "messages", module_label: "Messages", is_enabled: true },
  { module_key: "homework", module_label: "Homework", is_enabled: true },
  { module_key: "weekly_exams", module_label: "Weekly Exams", is_enabled: true },
  { module_key: "exam_cycles", module_label: "Exam Cycles", is_enabled: true },
  { module_key: "question_papers", module_label: "Question Papers", is_enabled: true },
];

export const SCHOOL_SCOPED_DELETE_ORDER = [
  "exam_marks",
  "student_exam_answers",
  "student_exam_results",
  "questions",
  "question_papers",
  "weekly_exam_syllabus",
  "weekly_exams",
  "exams",
  "attendance",
  "homework",
  "fee_payments",
  "fees",
  "leave_requests",
  "certificate_requests",
  "complaints",
  "student_reports",
  "messages",
  "timetable",
  "announcements",
  "notifications",
  "push_subscriptions",
  "lead_call_logs",
  "lead_status_history",
  "leads",
  "student_discontinuation_archives",
  "student_promotion_history",
  "student_parents",
  "parents",
  "teacher_classes",
  "teacher_lead_permissions",
  "teacher_syllabus_map",
  "teachers",
  "students",
  "classes",
  "subjects",
  "syllabus_schedule",
  "syllabus",
  "gallery_images",
  "gallery_folders",
  "holidays",
  "settings_audit_log",
  "app_settings",
  "school_module_overrides",
  "module_visibility",
  "exam_cycles",
  "push_config",
] as const;

export const FULL_RESET_TABLES = [
  ...SCHOOL_SCOPED_DELETE_ORDER,
  "profiles",
  "user_roles",
  "schools",
] as const;

async function clearTable(adminClient: SupabaseClient, table: string) {
  const { error } = await adminClient.from(table).delete().neq("id", ZERO_UUID);

  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

async function clearSchoolTable(adminClient: SupabaseClient, table: string, schoolId: string) {
  const { error } = await adminClient.from(table).delete().eq("school_id", schoolId);

  if (error) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
}

export async function clearSchoolData(adminClient: SupabaseClient, schoolId: string) {
  for (const table of SCHOOL_SCOPED_DELETE_ORDER) {
    await clearSchoolTable(adminClient, table, schoolId);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ school_id: null })
    .eq("school_id", schoolId);

  if (profileError) {
    throw new Error(`Failed to clear profiles: ${profileError.message}`);
  }

  const { error: roleError } = await adminClient
    .from("user_roles")
    .delete()
    .eq("school_id", schoolId);

  if (roleError) {
    throw new Error(`Failed to clear user roles: ${roleError.message}`);
  }
}

export async function clearAllData(adminClient: SupabaseClient) {
  for (const table of FULL_RESET_TABLES) {
    await clearTable(adminClient, table);
  }
}

export async function seedDefaultModules(adminClient: SupabaseClient) {
  const { error } = await adminClient.from("module_visibility").insert(MODULE_DEFAULTS);

  if (error) {
    throw new Error(`Failed to seed default modules: ${error.message}`);
  }
}