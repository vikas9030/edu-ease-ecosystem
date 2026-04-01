import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, FileText, CreditCard, GraduationCap, History } from 'lucide-react';
import { format } from 'date-fns';
import { formatClassName } from "@/lib/utils";

export interface StudentRecord {
  id: string;
  full_name: string;
  admission_number: string;
  status: string | null;
  class_id: string | null;
  classes?: { name: string; section: string } | null;
}

interface Props {
  studentRecords: StudentRecord[];
  studentName: string;
  admissionNumber: string;
}

export default function StudentHistoryContent({ studentRecords, studentName, admissionNumber }: Props) {
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [examMarks, setExamMarks] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');

  // Auto-select if only one record
  useEffect(() => {
    if (studentRecords.length === 1) {
      setSelectedRecordId(studentRecords[0].id);
    } else {
      setSelectedRecordId('');
    }
  }, [studentRecords]);

  // Fetch data when a class record is selected
  useEffect(() => {
    if (!selectedRecordId) return;
    setLoading(true);
    setSelectedMonth('all');
    setSelectedExam('all');

    Promise.all([
      supabase
        .from('attendance')
        .select('*')
        .eq('student_id', selectedRecordId)
        .order('date', { ascending: false })
        .limit(500),
      supabase
        .from('exam_marks')
        .select('*, exams(name, exam_date, max_marks, subjects(name))')
        .eq('student_id', selectedRecordId)
        .order('created_at', { ascending: false }),
      supabase
        .from('fees')
        .select('*, fee_class:classes(name, section)' as any)
        .eq('student_id', selectedRecordId)
        .order('due_date', { ascending: false }),
    ]).then(([attRes, marksRes, feesRes]) => {
      setAttendance(attRes.data || []);
      setExamMarks((marksRes.data as any) || []);
      setFees(feesRes.data || []);
      setLoading(false);
    });
  }, [selectedRecordId]);

  // Derive available months from attendance
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    attendance.forEach(a => {
      months.add(format(new Date(a.date), 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [attendance]);

  // Derive available exam names
  const availableExams = useMemo(() => {
    const exams = new Map<string, string>();
    examMarks.forEach(m => {
      if (m.exams?.name) exams.set(m.exams.name, m.exams.name);
    });
    return Array.from(exams.values());
  }, [examMarks]);

  // Filtered attendance
  const filteredAttendance = useMemo(() => {
    if (selectedMonth === 'all') return attendance;
    return attendance.filter(a => format(new Date(a.date), 'yyyy-MM') === selectedMonth);
  }, [attendance, selectedMonth]);

  // Filtered marks
  const filteredMarks = useMemo(() => {
    if (selectedExam === 'all') return examMarks;
    return examMarks.filter(m => m.exams?.name === selectedExam);
  }, [examMarks, selectedExam]);

  const selectedRecord = studentRecords.find(r => r.id === selectedRecordId);

  return (
    <div className="space-y-4">
      {/* Student Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-lg">{studentName}</p>
              <p className="text-sm text-muted-foreground font-mono">{admissionNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Selector */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Select Class / Academic Year</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {studentRecords.map(r => (
            <Card
              key={r.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedRecordId === r.id ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedRecordId(r.id)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {r.status === 'active' ? (
                    <GraduationCap className="h-4 w-4 text-primary" />
                  ) : (
                    <History className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">
                    {r.classes ? `${formatClassName(r.classes.name, r.classes.section)}` : 'N/A'}
                  </span>
                </div>
                <Badge variant={r.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {r.status === 'active' ? 'Current' : 'Previous'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Data Tabs */}
      {selectedRecordId && (
        <>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Tabs defaultValue="attendance">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="attendance" className="flex items-center gap-1 text-xs sm:text-sm">
                  <Calendar className="h-4 w-4" /> Attendance
                </TabsTrigger>
                <TabsTrigger value="marks" className="flex items-center gap-1 text-xs sm:text-sm">
                  <FileText className="h-4 w-4" /> Marks
                </TabsTrigger>
                <TabsTrigger value="fees" className="flex items-center gap-1 text-xs sm:text-sm">
                  <CreditCard className="h-4 w-4" /> Fees
                </TabsTrigger>
              </TabsList>

              {/* ATTENDANCE TAB */}
              <TabsContent value="attendance">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* Month filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Month:</span>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Months ({attendance.length})</SelectItem>
                          {availableMonths.map(m => (
                            <SelectItem key={m} value={m}>
                              {format(new Date(m + '-01'), 'MMMM yyyy')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {filteredAttendance.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No attendance records found</p>
                    ) : (
                      <div className="overflow-auto max-h-[500px]">
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
                            {filteredAttendance.map(a => (
                              <TableRow key={a.id}>
                                <TableCell className="font-mono text-sm">{format(new Date(a.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>{a.session || 'Full Day'}</TableCell>
                                <TableCell>
                                  <Badge variant={a.status === 'present' ? 'default' : a.status === 'absent' ? 'destructive' : 'secondary'}>
                                    {a.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{a.reason || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MARKS TAB */}
              <TabsContent value="marks">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {/* Exam filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Exam:</span>
                      <Select value={selectedExam} onValueChange={setSelectedExam}>
                        <SelectTrigger className="w-[220px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Exams ({examMarks.length})</SelectItem>
                          {availableExams.map(e => (
                            <SelectItem key={e} value={e}>{e}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {filteredMarks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No exam marks found</p>
                    ) : (
                      <div className="overflow-auto max-h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Exam</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Marks</TableHead>
                              <TableHead>Grade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMarks.map(m => (
                              <TableRow key={m.id}>
                                <TableCell className="font-medium text-sm">{m.exams?.name || '-'}</TableCell>
                                <TableCell>{m.exams?.subjects?.name || '-'}</TableCell>
                                <TableCell className="font-mono text-sm">{m.exams?.exam_date ? format(new Date(m.exams.exam_date), 'dd MMM yyyy') : '-'}</TableCell>
                                <TableCell>
                                  <span className="font-semibold">{m.marks_obtained ?? '-'}</span>
                                  <span className="text-muted-foreground">/{m.exams?.max_marks || '-'}</span>
                                </TableCell>
                                <TableCell>{m.grade || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* FEES TAB */}
              <TabsContent value="fees">
                <Card>
                  <CardContent className="pt-6">
                    {fees.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No fee records found</p>
                    ) : (
                      <div className="overflow-auto max-h-[500px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fee Type</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Discount</TableHead>
                              <TableHead>Paid</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fees.map(f => {
                              const feeClass = (f as any).fee_class;
                              const className = feeClass ? `${formatClassName(feeClass.name, feeClass.section)}` : (selectedRecord?.classes ? `${formatClassName(selectedRecord.classes.name, selectedRecord.classes.section)}` : '-');
                              return (
                                <TableRow key={f.id}>
                                  <TableCell className="font-medium text-sm">{f.fee_type}</TableCell>
                                  <TableCell className="text-sm">{className}</TableCell>
                                  <TableCell>₹{Number(f.amount).toLocaleString()}</TableCell>
                                  <TableCell>{f.discount ? `₹${Number(f.discount).toLocaleString()}` : '-'}</TableCell>
                                  <TableCell>₹{Number(f.paid_amount || 0).toLocaleString()}</TableCell>
                                  <TableCell className="font-mono text-sm">{format(new Date(f.due_date), 'dd MMM yyyy')}</TableCell>
                                  <TableCell>
                                    <Badge variant={f.payment_status === 'paid' ? 'default' : f.payment_status === 'partial' ? 'secondary' : 'destructive'}>
                                      {f.payment_status || 'unpaid'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {!selectedRecordId && studentRecords.length > 1 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select a class above to view historical data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
