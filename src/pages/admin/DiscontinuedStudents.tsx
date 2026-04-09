import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAdminSidebar } from '@/hooks/useAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';
import { UserMinus, Loader2, Users, RotateCcw, Search, Eye } from 'lucide-react';
import { formatClassName } from "@/lib/utils";
import DiscontinuedArchiveDialog from '@/components/students/DiscontinuedArchiveDialog';

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  photo_url: string | null;
  status: string | null;
  class_id: string | null;
  discontinuation_reason: string | null;
  updated_at: string | null;
  classes: { name: string; section: string } | null;
}

interface ClassItem {
  id: string;
  name: string;
  section: string;
}

export default function DiscontinuedStudents() {
  const adminSidebarItems = useAdminSidebar();
  const { user, userRole, loading, schoolId } = useAuth();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reAdmitConfirmOpen, setReAdmitConfirmOpen] = useState(false);
  const [reAdmitStudentId, setReAdmitStudentId] = useState<string | null>(null);
  const [reAdmitClassId, setReAdmitClassId] = useState('');
  const [archiveStudentId, setArchiveStudentId] = useState<string | null>(null);
  const [archiveStudentName, setArchiveStudentName] = useState('');

  const [discontinuedStudents, setDiscontinuedStudents] = useState<Student[]>([]);
  const [loadingDiscontinued, setLoadingDiscontinued] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && (!user || (userRole !== 'admin' && userRole !== 'super_admin'))) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    supabase.from('classes').select('id, name, section').order('name').then(({ data }) => {
      if (data) setClasses(data);
    });
    fetchDiscontinued();
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setSelectedIds(new Set()); return; }
    setLoadingStudents(true);
    supabase
      .from('students')
      .select('id, full_name, admission_number, photo_url, status, class_id, discontinuation_reason, updated_at, classes(name, section)')
      .eq('class_id', selectedClass)
      .eq('status', 'active')
      .order('full_name')
      .then(({ data }) => {
        setStudents((data as Student[]) || []);
        setSelectedIds(new Set());
        setLoadingStudents(false);
      });
  }, [selectedClass]);

  async function fetchDiscontinued() {
    setLoadingDiscontinued(true);
    const { data } = await supabase
      .from('students')
      .select('id, full_name, admission_number, photo_url, status, class_id, discontinuation_reason, updated_at, classes(name, section)')
      .eq('status', 'discontinued')
      .order('updated_at', { ascending: false });
    setDiscontinuedStudents((data as Student[]) || []);
    setLoadingDiscontinued(false);
  }

  const toggleStudent = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.size === students.length ? new Set() : new Set(students.map(s => s.id)));
  };

  async function handleDiscontinue() {
    setProcessing(true);
    const ids = Array.from(selectedIds);
    const selectedStudents = students.filter(s => ids.includes(s.id));

    try {
      // 1. Create archive snapshots for each student
      for (const student of selectedStudents) {
        const className = student.classes ? `${formatClassName(student.classes.name, student.classes.section)}` : 'N/A';

        // Fetch attendance, marks, fees, timetable in parallel
        const [attendanceRes, marksRes, feesRes, timetableRes] = await Promise.all([
          supabase.from('attendance').select('*').eq('student_id', student.id),
          supabase.from('exam_marks').select('*, exams(name, exam_date, max_marks, subjects(name))').eq('student_id', student.id),
          supabase.from('fees').select('*').eq('student_id', student.id),
          student.class_id
            ? supabase.from('timetable').select('*, subjects(name)').eq('class_id', student.class_id)
            : Promise.resolve({ data: [] }),
        ]);

        await supabase.from('student_discontinuation_archives' as any).insert({
          student_id: student.id,
          student_name: student.full_name,
          admission_number: student.admission_number,
          class_name: className,
          discontinuation_reason: reason || null,
          attendance_snapshot: attendanceRes.data || [],
          marks_snapshot: marksRes.data || [],
          fees_snapshot: feesRes.data || [],
          timetable_snapshot: timetableRes.data || [],
          school_id: schoolId,
        });
      }

      // 2. Update student status
      const { error } = await supabase
        .from('students')
        .update({ status: 'discontinued', discontinuation_reason: reason || null, updated_at: new Date().toISOString() } as any)
        .in('id', ids);

      if (error) throw error;

      toast.success(`${ids.length} student(s) marked as discontinued with data archived`);
      setSelectedIds(new Set());
      setReason('');
      setStudents(prev => prev.filter(s => !ids.includes(s.id)));
      fetchDiscontinued();
    } catch (err) {
      console.error('Discontinue error:', err);
      toast.error('Failed to discontinue students');
    }
    setProcessing(false);
    setConfirmOpen(false);
  }

  async function handleReAdmit(studentId: string) {
    if (!reAdmitClassId) {
      toast.error('Please select a class to re-admit the student into');
      return;
    }
    setProcessing(true);

    // Get the student's current admission number and the target class details
    const student = discontinuedStudents.find(s => s.id === studentId);
    const targetClass = classes.find(c => c.id === reAdmitClassId);

    let newAdmissionNumber = student?.admission_number || '';
    if (student && targetClass) {
      // Extract the student's base name from their full name
      const baseName = student.full_name.toUpperCase().replace(/\s+/g, '');
      // Build compact class suffix without spaces (e.g., "1-A" or just "LKG")
      const classSuffix = (!targetClass.section || targetClass.section === '-')
        ? targetClass.name
        : `${targetClass.name}-${targetClass.section}`;
      newAdmissionNumber = `${baseName}-${classSuffix}`;
    }

    const { error } = await supabase
      .from('students')
      .update({
        status: 'active',
        discontinuation_reason: null,
        class_id: reAdmitClassId,
        admission_number: newAdmissionNumber,
        login_id: newAdmissionNumber,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', studentId);

    if (error) {
      toast.error('Failed to re-admit student');
    } else {
      toast.success('Student re-admitted successfully');
      fetchDiscontinued();
      if (selectedClass) {
        const { data } = await supabase
          .from('students')
          .select('id, full_name, admission_number, photo_url, status, discontinuation_reason, updated_at, classes(name, section)')
          .eq('class_id', selectedClass)
          .eq('status', 'active')
          .order('full_name');
        setStudents((data as Student[]) || []);
      }
    }
    setProcessing(false);
    setReAdmitConfirmOpen(false);
    setReAdmitStudentId(null);
    setReAdmitClassId('');
  }

  const filteredDiscontinued = discontinuedStudents.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <BackButton />
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <UserMinus className="h-6 w-6 text-destructive" /> Discontinued Students
            </h1>
            <p className="text-muted-foreground text-sm">Mark students as discontinued or re-admit them</p>
          </div>
        </div>

        <Tabs defaultValue="discontinue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="discontinue">Discontinue</TabsTrigger>
            <TabsTrigger value="list">
              Discontinued List ({discontinuedStudents.length})
            </TabsTrigger>
          </TabsList>

          {/* === Tab 1: Discontinue students === */}
          <TabsContent value="discontinue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Class</CardTitle>
                <CardDescription>Choose a class to view its active students</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{formatClassName(c.name, c.section)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {loadingStudents ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : selectedClass && students.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No active students in this class.
              </CardContent></Card>
            ) : students.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-lg">Active Students ({students.length})</CardTitle>
                    <Badge variant="outline">{selectedIds.size} selected</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={selectedIds.size === students.length && students.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {students.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                        <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={s.photo_url || ''} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">Adm# {s.admission_number}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <div>
                      <Label htmlFor="reason">Reason for discontinuation (optional)</Label>
                      <Input
                        id="reason"
                        placeholder="e.g., Family relocated, Financial reasons..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      disabled={selectedIds.size === 0 || processing}
                      onClick={() => setConfirmOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <UserMinus className="h-4 w-4 mr-2" />
                      Mark as Discontinued ({selectedIds.size})
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === Tab 2: Discontinued list === */}
          <TabsContent value="list" className="space-y-4">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or admission#"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loadingDiscontinued ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filteredDiscontinued.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                No discontinued students found.
              </CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="hidden sm:table-cell">Class</TableHead>
                          <TableHead className="hidden sm:table-cell">Reason</TableHead>
                          <TableHead className="hidden md:table-cell">Date</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDiscontinued.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={s.photo_url || ''} />
                                  <AvatarFallback className="text-xs bg-destructive/10 text-destructive">
                                    {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{s.full_name}</p>
                                  <p className="text-xs text-muted-foreground">Adm# {s.admission_number}</p>
                                  <p className="text-xs text-muted-foreground sm:hidden">
                                    {s.classes ? `${formatClassName(s.classes.name, s.classes.section)}` : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {s.classes ? `${formatClassName(s.classes.name, s.classes.section)}` : 'N/A'}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                              {s.discontinuation_reason || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setArchiveStudentId(s.id); setArchiveStudentName(s.full_name); }}
                                title="View archived data"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setReAdmitStudentId(s.id); setReAdmitConfirmOpen(true); }}
                                disabled={processing}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Re-admit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirm Discontinue */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Discontinuation</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to mark <strong>{selectedIds.size}</strong> student(s) as discontinued.
              They will be removed from active lists but their historical data will be preserved.
              {reason && <><br /><br />Reason: <em>{reason}</em></>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscontinue} disabled={processing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Discontinue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Re-admit */}
      <AlertDialog open={reAdmitConfirmOpen} onOpenChange={(open) => { setReAdmitConfirmOpen(open); if (!open) { setReAdmitClassId(''); setReAdmitStudentId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-admit Student</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Select the class to re-admit this student into.</p>
                <div>
                  <Label htmlFor="readmit-class" className="text-sm font-medium">Class</Label>
                  <Select value={reAdmitClassId} onValueChange={setReAdmitClassId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{formatClassName(c.name, c.section)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => reAdmitStudentId && handleReAdmit(reAdmitStudentId)} disabled={processing || !reAdmitClassId}>
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Re-admit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DiscontinuedArchiveDialog
        open={!!archiveStudentId}
        onOpenChange={(open) => { if (!open) { setArchiveStudentId(null); setArchiveStudentName(''); } }}
        studentId={archiveStudentId}
        studentName={archiveStudentName}
      />
    </DashboardLayout>
  );
}
