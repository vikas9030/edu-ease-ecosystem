import { useState, useMemo } from 'react';
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
import { Plus, MoreVertical, Pencil, Trash2, CalendarDays, Search, Filter, Calendar as CalendarIcon, PartyPopper, TreePalm, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO, isSameMonth, isAfter, startOfDay } from 'date-fns';

interface Holiday {
  id: string;
  title: string;
  description: string | null;
  holiday_date: string;
  holiday_type: string;
  reminder_days: number;
  created_by: string | null;
  created_at: string | null;
}

const typeConfig: Record<string, { bg: string; dot: string; icon: React.ReactNode; label: string }> = {
  holiday: {
    bg: 'bg-destructive/10 text-destructive border-destructive/20',
    dot: 'bg-destructive',
    icon: <TreePalm className="h-4 w-4" />,
    label: 'Holiday',
  },
  occasion: {
    bg: 'bg-primary/10 text-primary border-primary/20',
    dot: 'bg-primary',
    icon: <Star className="h-4 w-4" />,
    label: 'Occasion',
  },
  event: {
    bg: 'bg-success/10 text-success border-success/20',
    dot: 'bg-success',
    icon: <PartyPopper className="h-4 w-4" />,
    label: 'Event',
  },
};

export default function HolidaysManagement() {
  const adminSidebarItems = useAdminSidebar();
  const { user, schoolId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState({ title: '', description: '', holiday_date: new Date(), holiday_type: 'holiday', reminder_days: 2 });

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
      if (error) throw error;
      return data as Holiday[];
    },
  });

  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      const matchesSearch = h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || h.holiday_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [holidays, searchTerm, filterType]);

  const upcomingHolidays = useMemo(() => {
    const today = startOfDay(new Date());
    return holidays.filter(h => isAfter(parseISO(h.holiday_date), today) || isSameDay(parseISO(h.holiday_date), today)).slice(0, 3);
  }, [holidays]);

  const monthHolidays = useMemo(() => {
    return holidays.filter(h => isSameMonth(parseISO(h.holiday_date), selectedMonth));
  }, [holidays, selectedMonth]);

  const stats = useMemo(() => ({
    total: holidays.length,
    holidays: holidays.filter(h => h.holiday_type === 'holiday').length,
    occasions: holidays.filter(h => h.holiday_type === 'occasion').length,
    events: holidays.filter(h => h.holiday_type === 'event').length,
  }), [holidays]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        holiday_date: format(form.holiday_date, 'yyyy-MM-dd'),
        holiday_type: form.holiday_type,
        reminder_days: form.reminder_days,
        created_by: user?.id,
        school_id: schoolId,
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
    setForm({ title: '', description: '', holiday_date: new Date(), holiday_type: 'holiday', reminder_days: 2 });
  };

  const openEdit = (h: Holiday) => {
    setEditingHoliday(h);
    setForm({ title: h.title, description: h.description || '', holiday_date: parseISO(h.holiday_date), holiday_type: h.holiday_type, reminder_days: h.reminder_days ?? 2 });
    setDialogOpen(true);
  };

  const holidayDates = holidays.map(h => parseISO(h.holiday_date));
  const holidayModifiers = {
    holidayDay: (date: Date) => holidayDates.some(d => isSameDay(d, date)),
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
           <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Academic Calendar
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Manage holidays, occasions, and events</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="hidden sm:flex gradient-admin text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Holiday
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total', value: stats.total, className: 'bg-primary/10 text-primary' },
            { label: 'Holidays', value: stats.holidays, className: 'bg-destructive/10 text-destructive' },
            { label: 'Occasions', value: stats.occasions, className: 'bg-primary/10 text-primary' },
            { label: 'Events', value: stats.events, className: 'bg-success/10 text-success' },
          ].map(s => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-3 sm:p-4 text-center">
                <p className={`text-xl sm:text-2xl font-bold ${s.className}`}>{s.value}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Upcoming Holidays Banner */}
        {upcomingHolidays.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" /> Upcoming
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                {upcomingHolidays.map(h => {
                  const cfg = typeConfig[h.holiday_type] || typeConfig.holiday;
                  return (
                    <div key={h.id} className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <span className="text-sm font-medium truncate">{h.title}</span>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {format(parseISO(h.holiday_date), 'dd MMM')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-1 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" /> Calendar
              </CardTitle>
            </CardHeader>
             <CardContent className="p-1 sm:p-4 pt-0">
              <Calendar
                mode="single"
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                modifiers={holidayModifiers}
                modifiersClassNames={{ holidayDay: 'bg-primary/20 text-primary font-bold rounded-full' }}
                className="w-full pointer-events-auto [&_.rdp-table]:w-full [&_.rdp-head_row]:flex [&_.rdp-head_row]:justify-between [&_.rdp-row]:flex [&_.rdp-row]:justify-between [&_.rdp-cell]:flex-1 [&_.rdp-cell]:text-center [&_.rdp-head_cell]:flex-1 [&_.rdp-head_cell]:text-center [&_.rdp-day]:w-full [&_.rdp-day]:mx-auto"
              />
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 px-2 text-xs">
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                ))}
              </div>
              {/* Month's holidays */}
              {monthHolidays.length > 0 && (
                <div className="mt-3 border-t pt-3 space-y-2 px-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </p>
                  {monthHolidays.map(h => {
                    const cfg = typeConfig[h.holiday_type] || typeConfig.holiday;
                    return (
                      <div key={h.id} className="flex items-center gap-2 text-xs py-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="truncate flex-1 font-medium">{h.title}</span>
                        <span className="text-muted-foreground flex-shrink-0">{format(parseISO(h.holiday_date), 'dd')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Holiday List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base">All Holidays & Occasions</CardTitle>
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search holidays..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="holiday">Holidays</SelectItem>
                    <SelectItem value="occasion">Occasions</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : filteredHolidays.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No holidays found</p>
                  <p className="text-xs mt-1">
                    {searchTerm || filterType !== 'all' ? 'Try adjusting your search or filter' : 'Add your first holiday to get started'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-[60vh] overflow-y-auto">
                  {filteredHolidays.map(h => {
                    const cfg = typeConfig[h.holiday_type] || typeConfig.holiday;
                    const isUpcoming = isAfter(parseISO(h.holiday_date), startOfDay(new Date())) || isSameDay(parseISO(h.holiday_date), new Date());
                    return (
                      <div
                        key={h.id}
                        className={`group border rounded-xl p-3 sm:p-4 flex items-start gap-3 transition-all hover:shadow-md ${isUpcoming ? 'border-primary/15 bg-primary/[0.02]' : 'opacity-75'}`}
                      >
                        {/* Date badge */}
                        <div className="hidden sm:flex flex-col items-center justify-center min-w-[48px] h-[48px] rounded-lg bg-muted/60 text-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-muted-foreground leading-none">
                            {format(parseISO(h.holiday_date), 'MMM')}
                          </span>
                          <span className="text-lg font-bold text-foreground leading-tight">
                            {format(parseISO(h.holiday_date), 'dd')}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm sm:text-base truncate">{h.title}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.bg}`}>
                              {cfg.label}
                            </Badge>
                            {isUpcoming && isSameDay(parseISO(h.holiday_date), new Date()) && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Today</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                            {format(parseISO(h.holiday_date), 'dd MMM yyyy')}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                            {format(parseISO(h.holiday_date), 'dd MMM yyyy, EEEE')}
                          </p>
                          {h.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1 sm:line-clamp-2">{h.description}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAB for mobile */}
        <Button
          onClick={() => setDialogOpen(true)}
          className="sm:hidden fixed bottom-20 right-6 z-50 h-12 w-12 rounded-full shadow-lg p-0 gradient-admin"
        >
          <Plus className="h-5 w-5 text-white" />
        </Button>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
          <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </DialogTitle>
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
              <div>
                <label className="text-sm font-medium">Reminder (days before)</label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.reminder_days}
                  onChange={e => setForm(f => ({ ...f, reminder_days: parseInt(e.target.value) || 0 }))}
                  placeholder="e.g. 2"
                />
                <p className="text-xs text-muted-foreground mt-1">Send notification this many days before the event</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
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
            <DialogFooter className="gap-2 sm:gap-0">
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
