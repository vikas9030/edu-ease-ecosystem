
-- ============================================================
-- PHASE 1: Update RLS policies to enforce school_id isolation
-- Pattern: super_admin bypasses; others must match school_id
-- ============================================================

-- STUDENTS
DROP POLICY IF EXISTS "Admins and teachers can manage students" ON students;
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON students;
CREATE POLICY "School-scoped staff manage students" ON students FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "School-scoped view students" ON students FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = students.id AND p.user_id = auth.uid()
  )
);

-- TEACHERS (check if table exists via types)
DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers can view own record" ON teachers;
DROP POLICY IF EXISTS "Authenticated can view teachers" ON teachers;
CREATE POLICY "School-scoped manage teachers" ON teachers FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view teachers" ON teachers FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
  OR user_id = auth.uid()
);

-- CLASSES
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Authenticated users can view classes" ON classes;
CREATE POLICY "School-scoped manage classes" ON classes FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view classes" ON classes FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- SUBJECTS
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers can create subjects" ON subjects;
CREATE POLICY "School-scoped manage subjects" ON subjects FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "School-scoped view subjects" ON subjects FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- ATTENDANCE
DROP POLICY IF EXISTS "Parents can view their children's attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
CREATE POLICY "School-scoped manage attendance" ON attendance FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "Parents view children attendance" ON attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = attendance.student_id AND p.user_id = auth.uid()
  )
);

-- EXAMS
DROP POLICY IF EXISTS "All can view exams" ON exams;
DROP POLICY IF EXISTS "Staff can manage exams" ON exams;
CREATE POLICY "School-scoped manage exams" ON exams FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "School-scoped view exams" ON exams FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- EXAM_MARKS
DROP POLICY IF EXISTS "Parents can view their children's marks" ON exam_marks;
DROP POLICY IF EXISTS "Teachers can manage marks" ON exam_marks;
CREATE POLICY "School-scoped manage exam_marks" ON exam_marks FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "Parents view children marks" ON exam_marks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = exam_marks.student_id AND p.user_id = auth.uid()
  )
);

-- FEES
DROP POLICY IF EXISTS "Admins can manage fees" ON fees;
DROP POLICY IF EXISTS "Parents can view their children's fees" ON fees;
CREATE POLICY "School-scoped manage fees" ON fees FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Parents view children fees" ON fees FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = fees.student_id AND p.user_id = auth.uid()
  )
);

-- FEE_PAYMENTS
DROP POLICY IF EXISTS "Admins can manage fee_payments" ON fee_payments;
DROP POLICY IF EXISTS "Parents can view their children fee_payments" ON fee_payments;
CREATE POLICY "School-scoped manage fee_payments" ON fee_payments FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Parents view children fee_payments" ON fee_payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = fee_payments.student_id AND p.user_id = auth.uid()
  )
);

-- HOMEWORK
DROP POLICY IF EXISTS "Students/Parents can view homework" ON homework;
DROP POLICY IF EXISTS "Teachers can manage homework" ON homework;
CREATE POLICY "School-scoped manage homework" ON homework FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "School-scoped view homework" ON homework FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- LEAVE_REQUESTS
DROP POLICY IF EXISTS "Admins can manage leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Parents can create student leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Teachers can create their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
CREATE POLICY "School-scoped manage leave_requests" ON leave_requests FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Teachers create own leave" ON leave_requests FOR INSERT
  WITH CHECK (
    request_type = 'teacher' AND EXISTS (
      SELECT 1 FROM teachers WHERE teachers.user_id = auth.uid() AND teachers.id = leave_requests.teacher_id
    )
  );
CREATE POLICY "Parents create student leave" ON leave_requests FOR INSERT
  WITH CHECK (
    request_type = 'student' AND EXISTS (
      SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = leave_requests.student_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Users view own leave" ON leave_requests FOR SELECT USING (
  is_admin_or_super(auth.uid())
  OR (request_type = 'teacher' AND EXISTS (
    SELECT 1 FROM teachers WHERE teachers.id = leave_requests.teacher_id AND teachers.user_id = auth.uid()
  ))
  OR (request_type = 'student' AND EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = leave_requests.student_id AND p.user_id = auth.uid()
  ))
);

-- COMPLAINTS
DROP POLICY IF EXISTS "Admins can manage complaints" ON complaints;
DROP POLICY IF EXISTS "Teachers can update complaints visible to them" ON complaints;
DROP POLICY IF EXISTS "Teachers can view complaints visible to them" ON complaints;
DROP POLICY IF EXISTS "Users can submit complaints" ON complaints;
DROP POLICY IF EXISTS "Users can view own complaints" ON complaints;
CREATE POLICY "School-scoped manage complaints" ON complaints FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Teachers view/update visible complaints" ON complaints FOR SELECT USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to)
  AND school_id = get_user_school_id(auth.uid())
);
CREATE POLICY "Teachers update visible complaints" ON complaints FOR UPDATE USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to)
  AND school_id = get_user_school_id(auth.uid())
) WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND 'teacher' = ANY(visible_to)
);
CREATE POLICY "Users submit complaints" ON complaints FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Users view own complaints" ON complaints FOR SELECT USING (
  submitted_by = auth.uid()
);

-- CERTIFICATE_REQUESTS
DROP POLICY IF EXISTS "Admins can manage certificates" ON certificate_requests;
DROP POLICY IF EXISTS "Parents can create certificate requests for their children" ON certificate_requests;
DROP POLICY IF EXISTS "Parents can view own requests" ON certificate_requests;
CREATE POLICY "School-scoped manage certificates" ON certificate_requests FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Parents create cert requests" ON certificate_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid() AND EXISTS (
      SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = certificate_requests.student_id AND p.user_id = auth.uid()
    )
  );
CREATE POLICY "Parents view own cert requests" ON certificate_requests FOR SELECT USING (
  requested_by = auth.uid() OR is_admin_or_super(auth.uid())
);

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "Admins and teachers can create announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "All can view announcements" ON announcements;
CREATE POLICY "School-scoped manage announcements" ON announcements FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Staff create announcements" ON announcements FOR INSERT
  WITH CHECK (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  );
CREATE POLICY "School-scoped view announcements" ON announcements FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- HOLIDAYS
DROP POLICY IF EXISTS "Admins can manage holidays" ON holidays;
DROP POLICY IF EXISTS "All authenticated can view holidays" ON holidays;
CREATE POLICY "School-scoped manage holidays" ON holidays FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view holidays" ON holidays FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
  OR school_id IS NULL
);

-- APP_SETTINGS
DROP POLICY IF EXISTS "Admins can manage app_settings" ON app_settings;
DROP POLICY IF EXISTS "Anyone can read app_settings" ON app_settings;
CREATE POLICY "School-scoped manage app_settings" ON app_settings FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view app_settings" ON app_settings FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
  OR school_id IS NULL
);

-- STUDENT_REPORTS
DROP POLICY IF EXISTS "Parents can view their children's visible reports" ON student_reports;
DROP POLICY IF EXISTS "Teachers can manage reports" ON student_reports;
CREATE POLICY "School-scoped manage reports" ON student_reports FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "Parents view children reports" ON student_reports FOR SELECT USING (
  parent_visible = true AND EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = student_reports.student_id AND p.user_id = auth.uid()
  )
);

-- QUESTION_PAPERS
DROP POLICY IF EXISTS "Admins can manage question_papers" ON question_papers;
DROP POLICY IF EXISTS "All authenticated can view question_papers" ON question_papers;
DROP POLICY IF EXISTS "Teachers can manage question_papers" ON question_papers;
CREATE POLICY "School-scoped manage question_papers" ON question_papers FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "School-scoped view question_papers" ON question_papers FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- QUESTIONS
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Authenticated can view questions" ON questions;
DROP POLICY IF EXISTS "Teachers can manage questions" ON questions;
CREATE POLICY "School-scoped manage questions" ON questions FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "School-scoped view questions" ON questions FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- EXAM_CYCLES
DROP POLICY IF EXISTS "Admins can manage exam_cycles" ON exam_cycles;
DROP POLICY IF EXISTS "All authenticated can view exam_cycles" ON exam_cycles;
CREATE POLICY "School-scoped manage exam_cycles" ON exam_cycles FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view exam_cycles" ON exam_cycles FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- STUDENT_DISCONTINUATION_ARCHIVES
DROP POLICY IF EXISTS "Admins can manage archives" ON student_discontinuation_archives;
DROP POLICY IF EXISTS "Parents can view own children archives" ON student_discontinuation_archives;
DROP POLICY IF EXISTS "Teachers can view archives" ON student_discontinuation_archives;
CREATE POLICY "School-scoped manage archives" ON student_discontinuation_archives FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view archives" ON student_discontinuation_archives FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'teacher'::app_role) AND school_id = get_user_school_id(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = student_discontinuation_archives.student_id AND p.user_id = auth.uid()
  )
);

-- STUDENT_EXAM_ANSWERS
DROP POLICY IF EXISTS "Admins can manage student_exam_answers" ON student_exam_answers;
DROP POLICY IF EXISTS "Parents can submit answers for their children" ON student_exam_answers;
DROP POLICY IF EXISTS "Students can view own answers via parent" ON student_exam_answers;
DROP POLICY IF EXISTS "Teachers can manage student_exam_answers" ON student_exam_answers;
CREATE POLICY "School-scoped manage exam_answers" ON student_exam_answers FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "Parents submit answers" ON student_exam_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = student_exam_answers.student_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Parents view children answers" ON student_exam_answers FOR SELECT USING (
  is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = student_exam_answers.student_id AND p.user_id = auth.uid()
  )
);

-- STUDENT_EXAM_RESULTS
DROP POLICY IF EXISTS "Admins can manage student_exam_results" ON student_exam_results;
DROP POLICY IF EXISTS "Parents can view their children results" ON student_exam_results;
DROP POLICY IF EXISTS "Teachers can manage student_exam_results" ON student_exam_results;
CREATE POLICY "School-scoped manage exam_results" ON student_exam_results FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "Parents view children results" ON student_exam_results FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM student_parents sp JOIN parents p ON sp.parent_id = p.id
    WHERE sp.student_id = student_exam_results.student_id AND p.user_id = auth.uid()
  )
);

-- STUDENT_PARENTS
DROP POLICY IF EXISTS "Admins and teachers can manage student_parents" ON student_parents;
DROP POLICY IF EXISTS "Parents can view own links" ON student_parents;
CREATE POLICY "School-scoped manage student_parents" ON student_parents FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    (is_admin_or_super(auth.uid()) OR has_role(auth.uid(), 'teacher'::app_role))
    AND school_id = get_user_school_id(auth.uid())
  )
);
CREATE POLICY "Parents view own links" ON student_parents FOR SELECT USING (
  EXISTS (SELECT 1 FROM parents WHERE parents.id = student_parents.parent_id AND parents.user_id = auth.uid())
);

-- PARENTS
DROP POLICY IF EXISTS "Admins can manage parents" ON parents;
DROP POLICY IF EXISTS "Parents can view own record" ON parents;
DROP POLICY IF EXISTS "Teachers can view parents" ON parents;
CREATE POLICY "School-scoped manage parents" ON parents FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Parents view own" ON parents FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Teachers view parents" ON parents FOR SELECT USING (
  has_role(auth.uid(), 'teacher'::app_role) AND school_id = get_user_school_id(auth.uid())
);

-- PROFILES
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "School-scoped manage profiles" ON profiles FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "School-scoped view profiles" ON profiles FOR SELECT USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- GALLERY_FOLDERS
DROP POLICY IF EXISTS "Admins can delete folders" ON gallery_folders;
DROP POLICY IF EXISTS "Admins can insert folders" ON gallery_folders;
DROP POLICY IF EXISTS "Admins can update folders" ON gallery_folders;
DROP POLICY IF EXISTS "All authenticated can view folders" ON gallery_folders;
CREATE POLICY "School-scoped manage folders" ON gallery_folders FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view folders" ON gallery_folders FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- GALLERY_IMAGES
DROP POLICY IF EXISTS "Admins can delete images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can insert images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can update images" ON gallery_images;
DROP POLICY IF EXISTS "All authenticated can view images" ON gallery_images;
CREATE POLICY "School-scoped manage images" ON gallery_images FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "School-scoped view images" ON gallery_images FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR school_id = get_user_school_id(auth.uid())
);

-- LEADS
DROP POLICY IF EXISTS "Admins can manage all leads" ON leads;
DROP POLICY IF EXISTS "Teachers can create leads" ON leads;
DROP POLICY IF EXISTS "Teachers can update own leads" ON leads;
DROP POLICY IF EXISTS "Teachers can view own leads" ON leads;
CREATE POLICY "School-scoped manage leads" ON leads FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Teachers create leads" ON leads FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'teacher'::app_role)
    AND created_by = auth.uid()
    AND school_id = get_user_school_id(auth.uid())
  );
CREATE POLICY "Teachers view/update own leads" ON leads FOR SELECT USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND school_id = get_user_school_id(auth.uid())
  AND (created_by = auth.uid() OR assigned_teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
);
CREATE POLICY "Teachers update own leads" ON leads FOR UPDATE USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND school_id = get_user_school_id(auth.uid())
  AND (created_by = auth.uid() OR assigned_teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid()))
);

-- LEAD_CALL_LOGS
DROP POLICY IF EXISTS "Admins can manage all call logs" ON lead_call_logs;
DROP POLICY IF EXISTS "Teachers can insert call logs" ON lead_call_logs;
DROP POLICY IF EXISTS "Teachers can view call logs of own leads" ON lead_call_logs;
CREATE POLICY "School-scoped manage call_logs" ON lead_call_logs FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Teachers insert call logs" ON lead_call_logs FOR INSERT WITH CHECK (called_by = auth.uid());
CREATE POLICY "Teachers view own call logs" ON lead_call_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_call_logs.lead_id
    AND (leads.created_by = auth.uid() OR leads.assigned_teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
);

-- LEAD_STATUS_HISTORY
DROP POLICY IF EXISTS "Admins can manage all status history" ON lead_status_history;
DROP POLICY IF EXISTS "Teachers can insert status history" ON lead_status_history;
DROP POLICY IF EXISTS "Teachers can view status history of own leads" ON lead_status_history;
CREATE POLICY "School-scoped manage status_history" ON lead_status_history FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);
CREATE POLICY "Teachers insert status history" ON lead_status_history FOR INSERT WITH CHECK (changed_by = auth.uid());
CREATE POLICY "Teachers view own status history" ON lead_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_status_history.lead_id
    AND (leads.created_by = auth.uid() OR leads.assigned_teacher_id IN (SELECT id FROM teachers WHERE user_id = auth.uid())))
);

-- MESSAGES
DROP POLICY IF EXISTS "Recipients can update read status" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users view own messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id OR is_admin_or_super(auth.uid())
);
CREATE POLICY "Recipients update read" ON messages FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- NOTIFICATIONS (keep user-scoped, no school filter needed since targeted by user_id)
-- No changes needed - already scoped by user_id

-- SETTINGS_AUDIT_LOG
DROP POLICY IF EXISTS "Admins can manage audit log" ON settings_audit_log;
CREATE POLICY "School-scoped manage audit_log" ON settings_audit_log FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (is_admin_or_super(auth.uid()) AND school_id = get_user_school_id(auth.uid()))
);

-- PUSH_SUBSCRIPTIONS (keep user-scoped)
-- No changes needed

-- MODULE_VISIBILITY (keep super_admin managed)
-- No changes needed

-- ============================================================
-- PHASE 4: Update notification trigger functions to scope by school_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_complaint()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_id uuid;
  submitter_name text;
  complaint_school_id uuid;
BEGIN
  complaint_school_id := NEW.school_id;

  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO submitter_name FROM profiles WHERE user_id = NEW.submitted_by;

    IF 'admin' = ANY(NEW.visible_to) THEN
      FOR target_id IN SELECT user_id FROM user_roles WHERE role = 'admin' AND (school_id = complaint_school_id OR complaint_school_id IS NULL)
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link, school_id)
        VALUES (target_id, 'New Complaint', COALESCE(submitter_name,'A parent') || ': ' || NEW.subject, 'complaint', '/admin/complaints', complaint_school_id);
      END LOOP;
    END IF;

    IF 'teacher' = ANY(NEW.visible_to) THEN
      FOR target_id IN SELECT user_id FROM user_roles WHERE role = 'teacher' AND (school_id = complaint_school_id OR complaint_school_id IS NULL)
      LOOP
        INSERT INTO notifications (user_id, title, message, type, link, school_id)
        VALUES (target_id, 'New Complaint', COALESCE(submitter_name,'A parent') || ': ' || NEW.subject, 'complaint', '/teacher/reports', complaint_school_id);
      END LOOP;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.response IS DISTINCT FROM NEW.response) OR (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO notifications (user_id, title, message, type, link, school_id)
      VALUES (NEW.submitted_by, 'Complaint Updated',
        CASE WHEN NEW.status = 'resolved' THEN 'Your complaint "' || NEW.subject || '" has been resolved'
             ELSE 'Your complaint "' || NEW.subject || '" status updated to ' || NEW.status END,
        'complaint', '/parent/complaints', complaint_school_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_holiday_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
  holiday_school_id uuid;
BEGIN
  holiday_school_id := NEW.school_id;

  FOR target_user_id IN SELECT user_id FROM user_roles WHERE role IN ('teacher', 'parent') AND (school_id = holiday_school_id OR holiday_school_id IS NULL)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, school_id)
    VALUES (
      target_user_id,
      'New Holiday: ' || NEW.title,
      NEW.title || ' on ' || to_char(NEW.holiday_date, 'DD Mon YYYY') || COALESCE(' - ' || NEW.description, ''),
      'holiday',
      CASE
        WHEN (SELECT role FROM user_roles WHERE user_id = target_user_id LIMIT 1) = 'teacher' THEN '/teacher/holidays'
        ELSE '/parent/holidays'
      END,
      holiday_school_id
    );
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_announcement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
  audiences text[];
  ann_school_id uuid;
BEGIN
  audiences := COALESCE(NEW.target_audience, ARRAY['all']);
  ann_school_id := NEW.school_id;

  IF 'all' = ANY(audiences) OR 'admin' = ANY(audiences) THEN
    FOR target_user_id IN SELECT user_id FROM user_roles WHERE role = 'admin' AND (school_id = ann_school_id OR ann_school_id IS NULL)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link, school_id)
      VALUES (target_user_id, 'New Announcement', NEW.title, 'announcement', '/admin/announcements', ann_school_id);
    END LOOP;
  END IF;

  IF 'all' = ANY(audiences) OR 'teacher' = ANY(audiences) THEN
    FOR target_user_id IN SELECT user_id FROM user_roles WHERE role = 'teacher' AND (school_id = ann_school_id OR ann_school_id IS NULL)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link, school_id)
      VALUES (target_user_id, 'New Announcement', NEW.title, 'announcement', '/teacher/announcements', ann_school_id);
    END LOOP;
  END IF;

  IF 'all' = ANY(audiences) OR 'parent' = ANY(audiences) THEN
    FOR target_user_id IN SELECT user_id FROM user_roles WHERE role = 'parent' AND (school_id = ann_school_id OR ann_school_id IS NULL)
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link, school_id)
      VALUES (target_user_id, 'New Announcement', NEW.title, 'announcement', '/parent/announcements', ann_school_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_id uuid;
  requester_name text;
  leave_school_id uuid;
BEGIN
  leave_school_id := NEW.school_id;

  IF NEW.request_type = 'student' AND NEW.student_id IS NOT NULL THEN
    SELECT full_name INTO requester_name FROM students WHERE id = NEW.student_id;
  ELSIF NEW.request_type = 'teacher' AND NEW.teacher_id IS NOT NULL THEN
    SELECT p.full_name INTO requester_name FROM teachers t JOIN profiles p ON p.user_id = t.user_id WHERE t.id = NEW.teacher_id;
  END IF;

  FOR admin_id IN SELECT user_id FROM user_roles WHERE role = 'admin' AND (school_id = leave_school_id OR leave_school_id IS NULL)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, school_id)
    VALUES (admin_id, 'New Leave Request', COALESCE(requester_name, 'Someone') || ' submitted a leave request', 'leave', '/admin/leave', leave_school_id);
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_certificate_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_id uuid;
  student_name text;
  cert_school_id uuid;
BEGIN
  cert_school_id := NEW.school_id;
  SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;

  FOR admin_id IN SELECT user_id FROM user_roles WHERE role = 'admin' AND (school_id = cert_school_id OR cert_school_id IS NULL)
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, school_id)
    VALUES (admin_id, 'Certificate Request', COALESCE(student_name, 'A student') || ' requested a ' || NEW.certificate_type || ' certificate', 'certificate', '/admin/certificates', cert_school_id);
  END LOOP;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_parent_attendance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_user_id uuid;
  student_name text;
BEGIN
  SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;

  FOR parent_user_id IN
    SELECT p.user_id FROM student_parents sp JOIN parents p ON p.id = sp.parent_id WHERE sp.student_id = NEW.student_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, school_id)
    VALUES (parent_user_id, 'Attendance Update', COALESCE(student_name, 'Your child') || ' marked ' || NEW.status || ' today', 'attendance', '/parent/attendance', NEW.school_id);
  END LOOP;
  RETURN NEW;
END;
$function$;

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
BEGIN
  SELECT name || '-' || section INTO hw_class_name FROM classes WHERE id = NEW.class_id;
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

CREATE OR REPLACE FUNCTION public.notify_parent_exam_result()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  parent_user_id uuid;
  student_name text;
  exam_name text;
BEGIN
  SELECT full_name INTO student_name FROM students WHERE id = NEW.student_id;
  SELECT name INTO exam_name FROM exams WHERE id = NEW.exam_id;

  FOR parent_user_id IN
    SELECT p.user_id FROM student_parents sp JOIN parents p ON p.id = sp.parent_id WHERE sp.student_id = NEW.student_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, school_id)
    VALUES (parent_user_id, 'Exam Result Published', COALESCE(student_name, 'Your child') || '''s ' || COALESCE(exam_name, 'exam') || ' result is available', 'result', '/parent/exams', NEW.school_id);
  END LOOP;
  RETURN NEW;
END;
$function$;
