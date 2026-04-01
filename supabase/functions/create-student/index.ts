import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if calling user is admin or teacher
    const { data: roleData } = await userClient.from("user_roles").select("role, school_id").eq("user_id", callingUser.id).single();
    if (!roleData || !["admin", "teacher", "super_admin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Only admins and teachers can create students" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      studentId, fullName, dateOfBirth, classId, address, bloodGroup, 
      parentName, parentPhone, emergencyContact, emergencyContactName, 
      password, photoUrl, schoolId 
    } = await req.json();

    if (!fullName || !classId || !studentId || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields: fullName, classId, studentId, password" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine school_id from explicit param or caller's school
    const effectiveSchoolId = schoolId || roleData?.school_id || null;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create parent auth account
    const uniqueSuffix = Date.now().toString(36);
    const parentEmail = `parent.${studentId.toLowerCase()}.${uniqueSuffix}@school.local`;
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: parentEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: parentName || `Parent of ${fullName}`,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile with school_id
    const { error: profileError } = await adminClient.from("profiles").update({
      full_name: parentName || `Parent of ${fullName}`,
      email: parentEmail,
      phone: parentPhone || null,
      school_id: effectiveSchoolId,
    }).eq("user_id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Assign parent role with school_id
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userId,
      role: "parent",
      school_id: effectiveSchoolId,
    });

    if (roleError) {
      console.error("Error creating role:", roleError);
    }

    // Create parent record with school_id
    const { data: parentData, error: parentError } = await adminClient
      .from("parents")
      .insert({
        user_id: userId,
        phone: parentPhone || null,
        school_id: effectiveSchoolId,
      })
      .select()
      .single();

    if (parentError) {
      console.error("Error creating parent:", parentError);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "Failed to create parent record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create student record with school_id
    const { data: studentData, error: studentError } = await adminClient
      .from("students")
      .insert({
        admission_number: studentId,
        login_id: studentId,
        full_name: fullName,
        date_of_birth: dateOfBirth || null,
        class_id: classId,
        address: address || null,
        blood_group: bloodGroup || null,
        parent_name: parentName || null,
        parent_phone: parentPhone || null,
        emergency_contact: emergencyContact || null,
        emergency_contact_name: emergencyContactName || null,
        photo_url: photoUrl || null,
        status: "active",
        user_id: userId,
        school_id: effectiveSchoolId,
      })
      .select()
      .single();

    if (studentError) {
      console.error("Error creating student:", studentError);
      await adminClient.from("parents").delete().eq("id", parentData.id);
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: studentError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link student to parent
    const { error: linkError } = await adminClient.from("student_parents").insert({
      student_id: studentData.id,
      parent_id: parentData.id,
      relationship: "parent",
      school_id: effectiveSchoolId,
    });

    if (linkError) {
      console.error("Error linking student to parent:", linkError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      studentId: studentData.id,
      admissionNumber: studentId,
      password,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in create-student:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
