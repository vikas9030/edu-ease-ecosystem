import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface TeacherExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResult {
  row: number;
  name: string;
  status: 'success' | 'error';
  message: string;
}

const TEMPLATE_COLUMNS = [
  'Full Name', 'Email', 'Phone', 'Qualification', 'Password', 'Subjects',
];

export default function TeacherExcelImport({ open, onOpenChange, onSuccess }: TeacherExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, [
      'Jane Smith', 'jane@school.com', '9876543210', 'M.Ed', 'Pass1234', 'Math, Science',
    ]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teacher Template');
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));
    XLSX.writeFile(wb, 'teacher_import_template.xlsx');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResults([]);
    setShowResults(false);
    setProgress(0);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast({ title: 'Empty file', description: 'No data rows found', variant: 'destructive' });
        setImporting(false);
        return;
      }

      setTotalRows(rows.length);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
        setImporting(false);
        return;
      }

      const importResults: ImportResult[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const name = String(row['Full Name'] || '').trim();
        const phone = String(row['Phone'] || '').trim();
        const qualification = String(row['Qualification'] || '').trim();
        const password = String(row['Password'] || '').trim();
        const email = String(row['Email'] || '').trim();
        const subjects = String(row['Subjects'] || '').trim();

        if (!name) {
          importResults.push({ row: rowNum, name: '(empty)', status: 'error', message: 'Full Name is required' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }
        if (!phone || phone.length < 10) {
          importResults.push({ row: rowNum, name, status: 'error', message: 'Phone required (min 10 digits)' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }
        if (!qualification) {
          importResults.push({ row: rowNum, name, status: 'error', message: 'Qualification is required' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }
        if (!password || password.length < 6) {
          importResults.push({ row: rowNum, name, status: 'error', message: 'Password required (min 6 chars)' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }

        try {
          const teacherEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@school.internal`;

          // Create user via edge function
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ email: teacherEmail, password, fullName: name, role: 'teacher', phone }),
            }
          );
          const result = await response.json();
          if (!response.ok) {
            importResults.push({ row: rowNum, name, status: 'error', message: result.error || 'Failed to create user' });
            setProgress(((i + 1) / rows.length) * 100);
            setResults([...importResults]);
            continue;
          }

          // Create teacher record
          const namePart = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
          const subjectPart = subjects ? subjects.split(',')[0].trim().toUpperCase().replace(/[^A-Z]/g, '') : 'GEN';
          const teacherId = `${namePart}-${subjectPart}`;
          const subjectsArray = subjects ? subjects.split(',').map(s => s.trim()) : [];

          const { error: teacherError } = await supabase.from('teachers').insert({
            user_id: result.user.id,
            teacher_id: teacherId,
            qualification,
            subjects: subjectsArray,
            status: 'active',
          } as any);

          if (teacherError) {
            importResults.push({ row: rowNum, name, status: 'error', message: 'User created but teacher record failed: ' + teacherError.message });
          } else {
            importResults.push({ row: rowNum, name, status: 'success', message: 'Created' });
          }
        } catch (err: any) {
          importResults.push({ row: rowNum, name, status: 'error', message: err.message });
        }

        setProgress(((i + 1) / rows.length) * 100);
        setResults([...importResults]);
      }

      setResults(importResults);
      setShowResults(true);

      const successCount = importResults.filter(r => r.status === 'success').length;
      const errorCount = importResults.filter(r => r.status === 'error').length;

      if (successCount > 0) {
        toast({ title: `${successCount} teachers imported${errorCount > 0 ? `, ${errorCount} failed` : ''}` });
        onSuccess?.();
      } else if (errorCount > 0) {
        toast({ title: `All ${errorCount} rows failed`, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const successResults = results.filter(r => r.status === 'success');
  const errorResults = results.filter(r => r.status === 'error');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Teachers from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2 w-full sm:w-auto text-sm">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 w-full sm:w-auto text-sm"
            >
              <Upload className="h-4 w-4" />
              {importing ? 'Importing...' : 'Upload Excel File'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Full Name</strong>, <strong>Phone</strong>, <strong>Qualification</strong>, and <strong>Password</strong> are mandatory</p>
            <p>• Email is optional (auto-generated if empty)</p>
            <p>• Subjects: comma-separated (e.g. "Math, Science")</p>
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Processing {Math.round((progress / 100) * totalRows)} of {totalRows} rows...
              </p>
            </div>
          )}

          {showResults && (
            <div className="space-y-3">
              {successResults.length > 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{successResults.length} teachers imported successfully</span>
                </div>
              )}

              {errorResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    <span>{errorResults.length} rows failed</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorResults.slice(0, 20).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.row}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>{r.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {errorResults.length > 20 && (
                    <p className="text-sm text-muted-foreground">...and {errorResults.length - 20} more errors</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
