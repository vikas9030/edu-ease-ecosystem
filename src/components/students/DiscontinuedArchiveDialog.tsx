import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, BookOpen, IndianRupee } from 'lucide-react';

interface ArchiveData {
  id: string;
  student_name: string;
  admission_number: string;
  class_name: string | null;
  discontinuation_reason: string | null;
  discontinued_at: string;
  attendance_snapshot: any[];
  marks_snapshot: any[];
  fees_snapshot: any[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName?: string;
}

export default function DiscontinuedArchiveDialog({ open, onOpenChange, studentId, studentName }: Props) {
  const [archives, setArchives] = useState<ArchiveData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !studentId) return;
    setLoading(true);
    supabase
      .from('student_discontinuation_archives')
      .select('*')
      .eq('student_id', studentId)
      .order('discontinued_at', { ascending: false })
      .then(({ data }) => {
        setArchives((data as any) || []);
        setLoading(false);
      });
  }, [open, studentId]);

  const latestArchive = archives[0];
  const attendance = latestArchive?.attendance_snapshot || [];
  const marks = latestArchive?.marks_snapshot || [];
  const fees = latestArchive?.fees_snapshot || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Archived Data — {studentName || latestArchive?.student_name || 'Student'}
          </DialogTitle>
          {latestArchive && (
            <p className="text-sm text-muted-foreground">
              Class: {latestArchive.class_name || 'N/A'} · Discontinued: {new Date(latestArchive.discontinued_at).toLocaleDateString()}
              {latestArchive.discontinuation_reason && ` · Reason: ${latestArchive.discontinuation_reason}`}
            </p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !latestArchive ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No archived data found for this student.</CardContent></Card>
        ) : (
          <Tabs defaultValue="attendance" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendance" className="text-xs sm:text-sm">
                <Calendar className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Attendance ({attendance.length})
              </TabsTrigger>
              <TabsTrigger value="marks" className="text-xs sm:text-sm">
                <BookOpen className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Marks ({marks.length})
              </TabsTrigger>
              <TabsTrigger value="fees" className="text-xs sm:text-sm">
                <IndianRupee className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Fees ({fees.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance">
              {attendance.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No attendance records.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.slice(0, 100).map((a: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{a.date || '-'}</TableCell>
                          <TableCell className="text-sm">{a.session || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={a.status === 'present' ? 'default' : 'destructive'} className="text-xs">
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.reason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {attendance.length > 100 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Showing first 100 of {attendance.length} records</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="marks">
              {marks.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No exam marks records.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marks.map((m: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{m.exams?.name || '-'}</TableCell>
                          <TableCell className="text-sm">{m.exams?.subjects?.name || '-'}</TableCell>
                          <TableCell className="text-sm">
                            {m.marks_obtained !== null ? `${m.marks_obtained}/${m.exams?.max_marks || '-'}` : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{m.grade || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fees">
              {fees.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No fee records.</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fees.map((f: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{f.fee_type || '-'}</TableCell>
                          <TableCell className="text-sm">₹{f.amount || 0}</TableCell>
                          <TableCell className="text-sm">₹{f.paid_amount || 0}</TableCell>
                          <TableCell>
                            <Badge variant={f.payment_status === 'paid' ? 'default' : 'destructive'} className="text-xs">
                              {f.payment_status || 'unpaid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{f.due_date || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
