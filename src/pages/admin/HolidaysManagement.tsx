import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAdminSidebar } from '@/hooks/useAdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';

interface Holiday {
  id: string;
  title: string;
  description: string | null;
  holiday_date: string;
  holiday_type: string;
  created_by: string | null;
  created_at: string | null;
}

const typeColors: Record<string, string> = {
  holiday: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  occasion: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  event: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const typeDotColors: Record<string, string> = {
  holiday: 'bg-red-500',
  occasion: 'bg-blue-500',
  event: 'bg-green-500',
};

export default function HolidaysManagement() {
  const adminSidebarItems = useAdminSidebar();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [form, setForm] = useState({ title: '', description: '', holiday_date: new Date(), holiday_type: 'holiday' });

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
      if (error) throw error;
      return data as Holiday[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        holiday_date: format(form.holiday_date, 'yyyy-MM-dd'),
        holiday_type: form.holiday_type,
        created_by: user?.id,
      };
      if (editingHoliday) {
        const { error } = await supabase.from('holidays').update(payload).eq('id', editingHoliday.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('holidays').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast({ title: editingHoliday ? 'Holiday updated' : 'Holiday created' });
      closeDialog();
    },
    onError: () => toast({ title: 'Error saving holiday', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast({ title: 'Holiday deleted' });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: () => toast({ title: 'Error deleting holiday', variant: 'destructive' }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingHoliday(null);
    setForm({ title: '', description: '', holiday_date: new Date(), holiday_type: 'holiday' });
  };

  const openEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setForm({ title: h.title, description: h.description || '', holiday_date: parseISO(h.holiday_date), holiday_type: h.holiday_type });
    setDialogOpen(true);
  };

  const holidayDates = holidays.map(h => parseISO(h.holiday_date));
  const holidayModifiers = {
    holidayDay: (date: Date) => holidayDates.some(d => isSameDay(d, date)),
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Holidays & Occasions</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Manage holidays, occasions, and events</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="hidden sm:flex">
            <Plus className="h-4 w-4 mr-1" /> Add Holiday
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardContent className="p-2 sm:p-4">
              <Calendar
                mode="single"
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                modifiers={holidayModifiers}
                modifiersClassNames={{ holidayDay: 'bg-primary/20 text-primary font-bold rounded-full' }}
                className="w-full pointer-events-auto"
              />
              <div className="flex flex-wrap gap-3 mt-3 px-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Holiday</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Occasion</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Event</span>
              </div>
            </CardContent>
          </Card>

          {/* Holiday List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">All Holidays & Occasions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading...</p>
              ) : holidays.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No holidays added yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {holidays.map(h => (
                    <div key={h.id} className="border rounded-lg p-3 sm:p-4 flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${typeDotColors[h.holiday_type] || typeDotColors.holiday}`} />
                          <span className="font-medium text-sm sm:text-base truncate">{h.title}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[h.holiday_type] || ''}`}>
                            {h.holiday_type}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {format(parseISO(h.holiday_date), 'dd MMM yyyy, EEEE')}
                        </p>
                        {h.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(h)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { setDeletingId(h.id); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAB for mobile */}
        <Button
          onClick={() => setDialogOpen(true)}
          className="sm:hidden fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg p-0"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Diwali, Republic Day" />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={form.holiday_type} onValueChange={v => setForm(f => ({ ...f, holiday_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="occasion">Occasion</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date *</label>
                <Calendar
                  mode="single"
                  selected={form.holiday_date}
                  onSelect={d => d && setForm(f => ({ ...f, holiday_date: d }))}
                  className="rounded-md border mt-1 pointer-events-auto"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.title || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingHoliday ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Holiday?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deletingId && deleteMutation.mutate(deletingId)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
