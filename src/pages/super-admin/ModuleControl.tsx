import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { superAdminSidebarItems } from '@/config/superAdminSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, ToggleLeft, School } from 'lucide-react';
import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SchoolItem {
  id: string;
  name: string;
  code: string;
}

interface SchoolOverride {
  module_key: string;
  is_enabled: boolean;
}

export default function ModuleControl() {
  const { user, userRole, schoolId, loading } = useAuth();
  const navigate = useNavigate();
  const { modules, loading: modulesLoading, refetch } = useModuleVisibility(schoolId, userRole);

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [schoolOverrides, setSchoolOverrides] = useState<SchoolOverride[]>([]);
  const [schoolLoading, setSchoolLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'super_admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  // Fetch schools list
  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (data) setSchools(data);
    };
    if (user && userRole === 'super_admin') fetchSchools();
  }, [user, userRole]);

  // Fetch overrides when school is selected
  useEffect(() => {
    if (!selectedSchoolId) {
      setSchoolOverrides([]);
      return;
    }
    const fetchOverrides = async () => {
      setSchoolLoading(true);
      const { data } = await supabase
        .from('school_module_overrides')
        .select('module_key, is_enabled')
        .eq('school_id', selectedSchoolId);
      setSchoolOverrides((data as any[]) || []);
      setSchoolLoading(false);
    };
    fetchOverrides();
  }, [selectedSchoolId]);

  const handleToggle = async (moduleKey: string, newValue: boolean) => {
    const { error } = await supabase
      .from('module_visibility')
      .update({ is_enabled: newValue, updated_by: user?.id, updated_at: new Date().toISOString() } as any)
      .eq('module_key', moduleKey);

    if (error) {
      toast.error('Failed to update module');
    } else {
      toast.success(`Module ${newValue ? 'enabled' : 'disabled'}`);
      refetch();
    }
  };

  const handleSchoolToggle = async (moduleKey: string, newValue: boolean) => {
    if (!selectedSchoolId) return;

    const existing = schoolOverrides.find((o) => o.module_key === moduleKey);

    if (existing) {
      const { error } = await supabase
        .from('school_module_overrides')
        .update({ is_enabled: newValue, updated_by: user?.id, updated_at: new Date().toISOString() } as any)
        .eq('school_id', selectedSchoolId)
        .eq('module_key', moduleKey);
      if (error) {
        toast.error('Failed to update school override');
        return;
      }
    } else {
      const { error } = await supabase
        .from('school_module_overrides')
        .insert({ school_id: selectedSchoolId, module_key: moduleKey, is_enabled: newValue, updated_by: user?.id } as any);
      if (error) {
        toast.error('Failed to create school override');
        return;
      }
    }

    toast.success(`Module ${newValue ? 'enabled' : 'disabled'} for this school`);
    // Refresh overrides
    const { data } = await supabase
      .from('school_module_overrides')
      .select('module_key, is_enabled')
      .eq('school_id', selectedSchoolId);
    setSchoolOverrides((data as any[]) || []);
  };

  const getSchoolModuleEnabled = (moduleKey: string): boolean => {
    const override = schoolOverrides.find((o) => o.module_key === moduleKey);
    return override ? override.is_enabled : true;
  };

  const isSystemEnabled = (moduleKey: string): boolean => {
    const mod = modules.find((m) => m.module_key === moduleKey);
    return mod ? mod.is_enabled : true;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={superAdminSidebarItems} roleColor="super_admin">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Module Control</h1>
          <p className="text-muted-foreground">Enable or disable system modules globally or per school</p>
        </div>

        <Tabs defaultValue="system">
          <TabsList>
            <TabsTrigger value="system" className="flex items-center gap-1.5">
              <ToggleLeft className="h-4 w-4" />
              System Modules
            </TabsTrigger>
            <TabsTrigger value="school" className="flex items-center gap-1.5">
              <School className="h-4 w-4" />
              School Overrides
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <ToggleLeft className="h-5 w-5 text-primary" />
                  System Modules
                </CardTitle>
                <CardDescription>Toggle modules on/off globally. Disabled modules will be hidden from all schools.</CardDescription>
              </CardHeader>
              <CardContent>
                {modulesLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-2">
                    {modules.map((mod) => (
                      <div key={mod.module_key} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                        <div>
                          <p className="font-medium">{mod.module_label}</p>
                          <p className="text-xs text-muted-foreground">Key: {mod.module_key}</p>
                        </div>
                        <Switch
                          checked={mod.is_enabled}
                          onCheckedChange={(checked) => handleToggle(mod.module_key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="school">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <School className="h-5 w-5 text-primary" />
                  School Module Overrides
                </CardTitle>
                <CardDescription>Override module visibility for a specific school. Cannot enable globally disabled modules.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name} ({school.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!selectedSchoolId && (
                  <p className="text-sm text-muted-foreground py-4">Select a school to manage its module overrides.</p>
                )}

                {selectedSchoolId && schoolLoading && (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                )}

                {selectedSchoolId && !schoolLoading && (
                  <div className="space-y-2">
                    {modules.map((mod) => {
                      const globallyDisabled = !isSystemEnabled(mod.module_key);
                      const schoolEnabled = getSchoolModuleEnabled(mod.module_key);

                      return (
                        <div
                          key={mod.module_key}
                          className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                            globallyDisabled ? 'bg-muted/30 opacity-60' : 'bg-muted/50 hover:bg-muted/70'
                          }`}
                        >
                          <div>
                            <p className="font-medium">{mod.module_label}</p>
                            <p className="text-xs text-muted-foreground">
                              {globallyDisabled ? 'Disabled globally — cannot override' : `Key: ${mod.module_key}`}
                            </p>
                          </div>
                          <Switch
                            checked={globallyDisabled ? false : schoolEnabled}
                            disabled={globallyDisabled}
                            onCheckedChange={(checked) => handleSchoolToggle(mod.module_key, checked)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
