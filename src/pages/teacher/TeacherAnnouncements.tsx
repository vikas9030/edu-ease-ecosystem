import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Loader2,
  Plus,
  Megaphone,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BackButton } from '@/components/ui/back-button';
import { useTeacherSidebar } from '@/hooks/useTeacherSidebar';
import { formatClassName } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string[];
  created_at: string;
  created_by: string | null;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

export default function TeacherAnnouncements() {
  const teacherSidebarItems = useTeacherSidebar();
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    selectedClasses: [] as string[],
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      
      try {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let classData: ClassOption[] = [];

        if (teacher) {
          const { data: teacherClasses } = await supabase
            .from('teacher_classes')
            .select('class_id')
            .eq('teacher_id', teacher.id);

          const teacherClassIds = teacherClasses?.map(tc => tc.class_id) || [];

          const { data: classTeacherClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('class_teacher_id', teacher.id);

          const classTeacherIds = classTeacherClasses?.map(c => c.id) || [];
          const allClassIds = [...new Set([...teacherClassIds, ...classTeacherIds])];

          if (allClassIds.length > 0) {
            const { data: fetchedClasses } = await supabase
              .from('classes')
              .select('id, name, section')
              .in('id', allClassIds);

            if (fetchedClasses) {
              classData = fetchedClasses;
              setClasses(fetchedClasses);
            }
          }
        }

        const { data } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          const classIdentifiers = classData.map(c => `class:${formatClassName(c.name, c.section)}`);
          
          const filtered = data.filter(announcement => {
            const audiences = announcement.target_audience || ['all'];
            return audiences.some(audience => 
              audience === 'all' || 
              audience === 'teachers' ||
              classIdentifiers.includes(audience)
            );
          });
          
          setAnnouncements(filtered);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  const resetForm = () => {
    setFormData({ title: '', content: '', selectedClasses: [] });
    setEditingAnnouncement(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    // Map target_audience back to selected class IDs
    const audiences = announcement.target_audience || [];
    const selectedClassIds = classes
      .filter(cls => audiences.includes(`class:${formatClassName(cls.name, cls.section)}`))
      .map(cls => cls.id);
    
    setFormData({
      title: announcement.title,
      content: announcement.content,
      selectedClasses: selectedClassIds,
    });
    setDialogOpen(true);
  };

  const toggleClassSelection = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter(id => id !== classId)
        : [...prev.selectedClasses, classId]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const targetAudience = formData.selectedClasses.length > 0
        ? formData.selectedClasses.map(classId => {
            const cls = classes.find(c => c.id === classId);
            return cls ? `class:${formatClassName(cls.name, cls.section)}` : '';
          }).filter(Boolean)
        : ['all'];

      if (editingAnnouncement) {
        const { error } = await supabase
          .from('announcements')
          .update({
            title: formData.title,
            content: formData.content,
            target_audience: targetAudience,
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success('Announcement updated successfully');
      } else {
        const { error } = await supabase.from('announcements').insert({
          title: formData.title,
          content: formData.content,
          target_audience: targetAudience,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success('Announcement created successfully');
      }

      setDialogOpen(false);
      resetForm();
      
      // Refresh
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        const classIdentifiers = classes.map(c => `class:${formatClassName(c.name, c.section)}`);
        const filtered = data.filter(announcement => {
          const audiences = announcement.target_audience || ['all'];
          return audiences.some(audience => 
            audience === 'all' || audience === 'teachers' || classIdentifiers.includes(audience)
          );
        });
        setAnnouncements(filtered);
      }
    } catch (error: any) {
      console.error('Error saving announcement:', error);
      toast.error(error.message || 'Failed to save announcement');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success('Announcement deleted');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/teacher" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">Announcements</h1>
          <Button size="sm" className="w-full sm:w-auto" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Announcement content..."
                  rows={5}
                />
              </div>
              <div>
                <Label>Target Classes (leave empty for all)</Label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <div key={cls.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={cls.id}
                          checked={formData.selectedClasses.includes(cls.id)}
                          onCheckedChange={() => toggleClassSelection(cls.id)}
                        />
                        <label htmlFor={cls.id} className="text-sm font-medium leading-none">
                          {formatClassName(cls.name, cls.section)}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No classes assigned</p>
                  )}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingAnnouncement ? 'Update Announcement' : 'Publish Announcement'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(announcement.created_at), 'PPP')}
                        </span>
                        {announcement.target_audience?.map((audience) => (
                          <Badge key={audience} variant="secondary" className="text-xs">
                            {audience}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {announcement.created_by === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(announcement)}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(announcement.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
