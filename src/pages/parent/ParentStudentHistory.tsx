import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useParentSidebar } from '@/hooks/useParentSidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/ui/back-button';
import { Loader2, History } from 'lucide-react';
import StudentHistoryContent, { StudentRecord } from '@/components/history/StudentHistoryContent';

export default function ParentStudentHistory() {
  const parentSidebarItems = useParentSidebar();
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [allChildren, setAllChildren] = useState<StudentRecord[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedAdmNo, setSelectedAdmNo] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    async function fetchChildren() {
      if (!user) return;
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentData) {
        const { data: links } = await supabase
          .from('student_parents')
          .select('student_id')
          .eq('parent_id', parentData.id);

        if (links && links.length > 0) {
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, full_name, admission_number, status, class_id, classes(name, section)')
            .in('id', links.map(l => l.student_id))
            .order('created_at', { ascending: false });

          if (studentsData) {
            setAllChildren(studentsData as any);
            // Auto-select first child by full_name
            const firstName = studentsData[0]?.full_name;
            if (firstName) setSelectedAdmNo(firstName);
          }
        }
      }
      setLoadingChildren(false);
    }
    fetchChildren();
  }, [user]);

  // Group by full_name for the child selector (since admission_number changes per class)
  const uniqueChildren = useMemo(() => {
    const map = new Map<string, { name: string; admNo: string }>();
    allChildren.forEach(c => {
      if (!map.has(c.full_name)) {
        map.set(c.full_name, { name: c.full_name, admNo: c.full_name });
      }
    });
    return Array.from(map.values());
  }, [allChildren]);

  // Records for selected child (all classes including promoted)
  const selectedRecords = useMemo(() => {
    return allChildren.filter(c => c.full_name === selectedAdmNo);
  }, [allChildren, selectedAdmNo]);

  const selectedChild = uniqueChildren.find(c => c.admNo === selectedAdmNo);

  if (authLoading || loadingChildren) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Student History
          </h1>
          <p className="text-muted-foreground mt-1">View your child's attendance, marks, and fees from all classes including previous years.</p>
        </div>

        {/* Child selector (if multiple unique children) */}
        {uniqueChildren.length > 1 && (
          <Card>
            <CardContent className="pt-6">
              <Select value={selectedAdmNo} onValueChange={setSelectedAdmNo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your child" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueChildren.map(c => (
                    <SelectItem key={c.admNo} value={c.admNo}>
                      {c.name} ({c.admNo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {selectedRecords.length > 0 && selectedChild && (
          <StudentHistoryContent
            studentRecords={selectedRecords}
            studentName={selectedChild.name}
            admissionNumber={selectedChild.admNo}
          />
        )}

        {allChildren.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No student records found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
