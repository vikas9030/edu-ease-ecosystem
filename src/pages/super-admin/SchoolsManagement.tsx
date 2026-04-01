import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { superAdminSidebarItems } from '@/config/superAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, School, Edit, Power, Users, GraduationCap, Trash2, Upload, X } from 'lucide-react';

interface SchoolRecord {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SchoolsManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [schoolStats, setSchoolStats] = useState<Record<string, { admins: number; teachers: number; students: number }>>({});
  const [deletingSchool, setDeletingSchool] = useState<SchoolRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'super_admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  const fetchSchools = async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSchools(data as SchoolRecord[]);
      for (const school of data) {
        const [admins, teachers, students] = await Promise.all([
          supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('school_id', school.id).eq('role', 'admin'),
          supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', school.id),
        ]);
        setSchoolStats(prev => ({
          ...prev,
          [school.id]: {
            admins: admins.count || 0,
            teachers: teachers.count || 0,
            students: students.count || 0,
          }
        }));
      }
    }
    setLoadingSchools(false);
  };

  useEffect(() => {
    if (user) fetchSchools();
  }, [user]);

  const resetForm = () => {
    setForm({ name: '', code: '', email: '', phone: '', address: '' });
    setEditingSchool(null);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (school: SchoolRecord) => {
    setEditingSchool(school);
    setForm({
      name: school.name,
      code: school.code,
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
    });
    setLogoFile(null);
    setLogoPreview(school.logo_url || null);
    setDialogOpen(true);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Logo must be under 2MB' });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async (schoolId: string): Promise<string | null> => {
    if (!logoFile) return editingSchool?.logo_url || null;

    const ext = logoFile.name.split('.').pop();
    const filePath = `logos/${schoolId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, logoFile, { upsert: true });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return editingSchool?.logo_url || null;
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);
    return urlData.publicUrl + '?t=' + Date.now();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'School name and code are required' });
      return;
    }

    setSaving(true);

    if (editingSchool) {
      // Upload logo if changed
      let logoUrl = editingSchool.logo_url;
      if (logoFile) {
        setUploadingLogo(true);
        logoUrl = await uploadLogo(editingSchool.id);
        setUploadingLogo(false);
      }
      // If logo was removed
      if (!logoPreview && !logoFile) {
        logoUrl = null;
      }

      const { error } = await supabase
        .from('schools')
        .update({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingSchool.id);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message.includes('duplicate') ? 'School code already exists' : error.message });
      } else {
        toast({ title: 'School updated successfully' });
        setDialogOpen(false);
        fetchSchools();
      }
    } else {
      const { data: newSchool, error } = await supabase
        .from('schools')
        .insert({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message.includes('duplicate') ? 'School code already exists' : error.message });
      } else if (newSchool) {
        // Upload logo for newly created school
        if (logoFile) {
          setUploadingLogo(true);
          const logoUrl = await uploadLogo(newSchool.id);
          setUploadingLogo(false);
          if (logoUrl) {
            await supabase.from('schools').update({ logo_url: logoUrl }).eq('id', newSchool.id);
          }
        }
        toast({ title: 'School created successfully' });
        setDialogOpen(false);
        resetForm();
        fetchSchools();
      }
    }

    setSaving(false);
  };

  const toggleSchoolActive = async (school: SchoolRecord) => {
    const { error } = await supabase
      .from('schools')
      .update({ is_active: !school.is_active, updated_at: new Date().toISOString() })
      .eq('id', school.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: `School ${school.is_active ? 'deactivated' : 'activated'}` });
      fetchSchools();
    }
  };

  const handleDeleteSchool = async () => {
    if (!deletingSchool) return;
    const stats = schoolStats[deletingSchool.id] || { admins: 0, teachers: 0, students: 0 };
    if (stats.admins > 0 || stats.teachers > 0 || stats.students > 0) {
      toast({ variant: 'destructive', title: 'Cannot delete', description: 'Remove all admins, teachers, and students before deleting this school.' });
      setDeletingSchool(null);
      return;
    }

    setDeleting(true);
    const { error } = await supabase.from('schools').delete().eq('id', deletingSchool.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'School deleted successfully' });
      fetchSchools();
    }
    setDeleting(false);
    setDeletingSchool(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={superAdminSidebarItems} roleColor="super_admin">
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Schools Management</h1>
            <p className="text-muted-foreground">Create and manage schools in the system</p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add School
          </Button>
        </div>

        {loadingSchools ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : schools.length === 0 ? (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <School className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Schools Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first school to start managing multiple institutions.
              </p>
              <Button onClick={openCreateDialog} className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create First School
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map((school) => {
              const stats = schoolStats[school.id] || { admins: 0, teachers: 0, students: 0 };
              return (
                <Card key={school.id} className="card-elevated">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {school.logo_url ? (
                          <img 
                            src={school.logo_url} 
                            alt={school.name} 
                            className="h-10 w-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <School className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{school.name}</CardTitle>
                          <Badge variant="outline" className="mt-1">{school.code}</Badge>
                        </div>
                      </div>
                      <Badge variant={school.is_active ? 'default' : 'secondary'}>
                        {school.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {school.email && (
                      <p className="text-sm text-muted-foreground">{school.email}</p>
                    )}
                    {school.phone && (
                      <p className="text-sm text-muted-foreground">{school.phone}</p>
                    )}

                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{stats.admins} Admins</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{stats.teachers} Teachers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{stats.students} Students</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(school)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toggleSchoolActive(school)}
                        className={school.is_active ? 'text-destructive' : 'text-emerald-600'}
                      >
                        <Power className="h-3.5 w-3.5 mr-1" />
                        {school.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDeletingSchool(school)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchool ? 'Edit School' : 'Create New School'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-16 w-16 rounded-lg object-cover border"
                      />
                      <button
                        type="button"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">Max 2MB. JPG, PNG or SVG.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-name">School Name *</Label>
                <Input
                  id="school-name"
                  placeholder="ABC Public School"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-code">School Code * (unique short code)</Label>
                <Input
                  id="school-code"
                  placeholder="ABC"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  {editingSchool 
                    ? 'Changing the code will update it across the system.'
                    : 'Used to identify the school. Must be unique.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input
                  id="school-email"
                  type="email"
                  placeholder="contact@abcschool.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-phone">Phone</Label>
                <Input
                  id="school-phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-address">Address</Label>
                <Textarea
                  id="school-address"
                  placeholder="School address..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || uploadingLogo} className="gradient-primary">
                  {(saving || uploadingLogo) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingSchool ? 'Update School' : 'Create School'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingSchool} onOpenChange={(open) => !open && setDeletingSchool(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete School</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{deletingSchool?.name}</strong> ({deletingSchool?.code})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSchool} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
