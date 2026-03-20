import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, History, Search } from 'lucide-react';
import StudentHistoryContent, { StudentRecord } from '@/components/history/StudentHistoryContent';

export default function TeacherStudentHistory() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [selectedAdmNo, setSelectedAdmNo] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setLoadingStudents(true);
      const { data } = await supabase
        .from('students')
        .select('id, full_name, admission_number, status, class_id, classes(name, section)')
        .or(`full_name.ilike.%${search}%,admission_number.ilike.%${search}%`)
        .order('full_name')
        .limit(20);
      setSearchResults((data as any) || []);
      setLoadingStudents(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectStudent = async (student: StudentRecord) => {
    setSearch('');
    setSearchResults([]);
    setSelectedName(student.full_name);
    setSelectedAdmNo(student.admission_number);

    const { data } = await supabase
      .from('students')
      .select('id, full_name, admission_number, status, class_id, classes(name, section)')
      .eq('admission_number', student.admission_number)
      .order('created_at', { ascending: false });

    setStudentRecords((data as any) || []);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/teacher" />
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Student History
          </h1>
          <p className="text-muted-foreground mt-1">Select a student, then pick a class to view attendance, marks, and fees.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search student by name or admission number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            {loadingStudents && <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3"><Loader2 className="h-4 w-4 animate-spin" /> Searching...</div>}
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-md max-h-60 overflow-y-auto">
                {searchResults.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0" onClick={() => selectStudent(s)}>
                    <div>
                      <p className="font-medium text-sm">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.admission_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.classes && <Badge variant="outline" className="text-xs">{s.classes.name}-{s.classes.section}</Badge>}
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs">{s.status || 'active'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {studentRecords.length > 0 && (
          <StudentHistoryContent studentRecords={studentRecords} studentName={selectedName} admissionNumber={selectedAdmNo} />
        )}
      </div>
    </DashboardLayout>
  );
}
