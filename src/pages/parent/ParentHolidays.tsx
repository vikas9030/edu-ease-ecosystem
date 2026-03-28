import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useParentSidebar } from '@/hooks/useParentSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay, parseISO, isSameMonth, isAfter, startOfDay } from 'date-fns';

const typeConfig: Record<string, { bg: string; dot: string; label: string }> = {
  holiday: { bg: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive', label: 'Holiday' },
  occasion: { bg: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary', label: 'Occasion' },
  event: { bg: 'bg-success/10 text-success border-success/20', dot: 'bg-success', label: 'Event' },
};

export default function ParentHolidays() {
  const parentSidebarItems = useParentSidebar();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h: any) => {
      const matchesSearch = h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || h.holiday_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [holidays, searchTerm, filterType]);

  const upcomingHolidays = useMemo(() => {
    const today = startOfDay(new Date());
    return holidays.filter((h: any) => isAfter(parseISO(h.holiday_date), today) || isSameDay(parseISO(h.holiday_date), today)).slice(0, 3);
  }, [holidays]);

  const monthHolidays = useMemo(() => {
    return holidays.filter((h: any) => isSameMonth(parseISO(h.holiday_date), selectedMonth));
  }, [holidays, selectedMonth]);

  const holidayDates = holidays.map((h: any) => parseISO(h.holiday_date));
  const holidayModifiers = {
    holidayDay: (date: Date) => holidayDates.some(d => isSameDay(d, date)),
  };

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Holidays & Occasions
          </h1>
          <p className="text-sm text-muted-foreground hidden sm:block">View upcoming holidays and events</p>
        </div>

        {/* Upcoming Banner */}
        {upcomingHolidays.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" /> Upcoming
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                {upcomingHolidays.map((h: any) => {
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
              <div className="flex flex-wrap gap-3 mt-3 px-2 text-xs">
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                ))}
              </div>
              {monthHolidays.length > 0 && (
                <div className="mt-3 border-t pt-3 space-y-2 px-1">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </p>
                  {monthHolidays.map((h: any) => {
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

          {/* List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base">All Holidays & Occasions</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search holidays..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
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
                  {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />)}
                </div>
              ) : filteredHolidays.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No holidays found</p>
                  <p className="text-xs mt-1">{searchTerm || filterType !== 'all' ? 'Try adjusting your search or filter' : 'No holidays added yet'}</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-[60vh] overflow-y-auto">
                  {filteredHolidays.map((h: any) => {
                    const cfg = typeConfig[h.holiday_type] || typeConfig.holiday;
                    const isUpcoming = isAfter(parseISO(h.holiday_date), startOfDay(new Date())) || isSameDay(parseISO(h.holiday_date), new Date());
                    return (
                      <div key={h.id} className={`border rounded-xl p-3 sm:p-4 flex items-start gap-3 transition-all ${isUpcoming ? 'border-primary/15 bg-primary/[0.02]' : 'opacity-75'}`}>
                        <div className="hidden sm:flex flex-col items-center justify-center min-w-[48px] h-[48px] rounded-lg bg-muted/60 text-center flex-shrink-0">
                          <span className="text-[11px] font-semibold text-muted-foreground leading-none">{format(parseISO(h.holiday_date), 'MMM')}</span>
                          <span className="text-lg font-bold text-foreground leading-tight">{format(parseISO(h.holiday_date), 'dd')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm sm:text-base truncate">{h.title}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${cfg.bg}`}>{cfg.label}</Badge>
                            {isUpcoming && isSameDay(parseISO(h.holiday_date), new Date()) && (
                              <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">Today</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">{format(parseISO(h.holiday_date), 'dd MMM yyyy')}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">{format(parseISO(h.holiday_date), 'dd MMM yyyy, EEEE')}</p>
                          {h.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1 sm:line-clamp-2">{h.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
