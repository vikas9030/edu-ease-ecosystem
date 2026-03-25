import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useParentSidebar } from '@/hooks/useParentSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay, parseISO } from 'date-fns';

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

export default function ParentHolidays() {
  const parentSidebarItems = useParentSidebar();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const holidayDates = holidays.map((h: any) => parseISO(h.holiday_date));
  const holidayModifiers = {
    holidayDay: (date: Date) => holidayDates.some(d => isSameDay(d, date)),
  };

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Holidays & Occasions</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">View upcoming holidays and events</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  {holidays.map((h: any) => (
                    <div key={h.id} className="border rounded-lg p-3 sm:p-4">
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
