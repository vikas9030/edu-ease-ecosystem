import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Exam } from './types';

interface EditExamDialogProps {
  exam: Exam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EditExamDialog({ exam, open, onOpenChange, onSuccess }: EditExamDialogProps) {
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (exam) {
      setExamDate(exam.exam_date || '');
      setExamTime(exam.exam_time || '');
      setMaxMarks(String(exam.max_marks || 100));
    }
  }, [exam]);

  const sendScheduleNotifications = async (updatedExam: Exam) => {
    try {
      const classId = updatedExam.class_id;
      if (!classId) return;

      const examName = updatedExam.name;
      const subjectName = updatedExam.subjects?.name || 'N/A';
      const newDate = updatedExam.exam_date ? new Date(updatedExam.exam_date).toLocaleDateString() : 'TBD';
      const message = `Exam schedule updated: ${examName} (${subjectName}) — new date: ${newDate}${updatedExam.exam_time ? ', time: ' + updatedExam.exam_time : ''}`;

      // Get parent user_ids for students in this class
      const { data: parentUsers } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'active');

      if (parentUsers && parentUsers.length > 0) {
        const studentIds = parentUsers.map(s => s.id);
        const { data: parentLinks } = await supabase
          .from('student_parents')
          .select('parent_id, parents(user_id)')
          .in('student_id', studentIds);

        const parentUserIds = new Set<string>();
        parentLinks?.forEach((link: any) => {
          if (link.parents?.user_id) parentUserIds.add(link.parents.user_id);
        });

        // Get teacher user_ids
        const { data: teacherRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'teacher');

        const allUserIds = new Set<string>(parentUserIds);
        teacherRoles?.forEach(t => allUserIds.add(t.user_id));

        // Insert notifications
        const notifications = Array.from(allUserIds).map(userId => ({
          user_id: userId,
          title: 'Exam Schedule Changed',
          message,
          type: 'exam',
          link: '/parent/exams',
        }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
    } catch (err) {
      console.error('Failed to send notifications:', err);
    }
  };

  const handleSave = async () => {
    if (!exam) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          exam_date: examDate || null,
          exam_time: examTime || null,
          max_marks: parseInt(maxMarks) || 100,
        })
        .eq('id', exam.id);

      if (error) throw error;

      await sendScheduleNotifications({ ...exam, exam_date: examDate || null, exam_time: examTime || null });

      toast.success('Exam updated & notifications sent');
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Exam Schedule</DialogTitle>
          <DialogDescription>
            {exam?.name} — {exam?.classes ? `${exam.classes.name}-${exam.classes.section}` : ''} {exam?.subjects?.name ? `(${exam.subjects.name})` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Exam Date</Label>
            <Input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Exam Time</Label>
            <Input type="time" value={examTime} onChange={e => setExamTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Max Marks</Label>
            <Input type="number" value={maxMarks} onChange={e => setMaxMarks(e.target.value)} min={1} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save & Notify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
