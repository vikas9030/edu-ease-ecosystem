import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { formatClassName } from "@/lib/utils";

interface StudentExcelImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResult {
  row: number;
  name: string;
  status: 'success' | 'error';
  message: string;
  studentId?: string;
  password?: string;
}

const TEMPLATE_COLUMNS = [
  'Student Name', 'Date of Birth', 'Class', 'Password',
  'Parent Name', 'Parent Phone', 'Address', 'Blood Group',
  'Emergency Contact', 'Emergency Contact Name',
];

export default function StudentExcelImport({ open, onOpenChange, onSuccess }: StudentExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);

  useEffect(() => {
    if (open) {
      supabase.from('classes').select('id, name, section').order('name').then(({ data }) => {
        if (data) setClasses(data);
      });
    }
  }, [open]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, [
      'John Doe', '2015-03-15', '5-A', 'Pass1234',
      'Robert Doe', '9876543210', '123 Main St', 'O+',
      '9876543211', 'Jane Doe',
    ]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Template');
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  const parseDate = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'number' && value > 1 && value < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  };

  const findClassId = (classStr: string): string | null => {
    // Normalize: lowercase, remove all spaces
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const input = normalize(classStr.trim());
    
    for (const cls of classes) {
      // Match against "5-A", "5 - A", "5A", or just "5" (when section is "-")
      const formatted = normalize(formatClassName(cls.name, cls.section));
      const compact = normalize(`${cls.name}-${cls.section}`);
      const noSep = normalize(`${cls.name}${cls.section}`);
      const nameOnly = normalize(cls.name);
      
      if (input === formatted || input === compact || input === noSep || input === nameOnly) {
        return cls.id;
      }
    }
    return null;
  };

  const generateStudentId = (name: string, className: string, section: string): string => {
    const namePart = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
    const classPart = className.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const sectionPart = section.toUpperCase().replace(/[^A-Z]/g, '');
    return `${namePart}-${classPart}-${sectionPart}`;
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
        toast.error('No data rows found in file');
        setImporting(false);
        return;
      }

      setTotalRows(rows.length);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        toast.error('Not authenticated');
        setImporting(false);
        return;
      }

      const importResults: ImportResult[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        const name = String(row['Student Name'] || '').trim();
        const classStr = String(row['Class'] || '').trim();
        const password = String(row['Password'] || '').trim();

        if (!name) {
          importResults.push({ row: rowNum, name: name || '(empty)', status: 'error', message: 'Student Name is required' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }
        if (!classStr) {
          importResults.push({ row: rowNum, name, status: 'error', message: 'Class is required (e.g. "5-A")' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }
        if (!password || password.length < 4) {
          importResults.push({ row: rowNum, name, status: 'error', message: 'Password required (min 4 chars)' });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }

        const classId = findClassId(classStr);
        if (!classId) {
          importResults.push({ row: rowNum, name, status: 'error', message: `Class "${classStr}" not found` });
          setProgress(((i + 1) / rows.length) * 100);
          continue;
        }

        const cls = classes.find(c => c.id === classId)!;
        const studentId = generateStudentId(name, cls.name, cls.section);

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-student`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({
                studentId,
                fullName: name,
                dateOfBirth: parseDate(row['Date of Birth']),
                classId,
                address: row['Address'] ? String(row['Address']).trim() : null,
                bloodGroup: row['Blood Group'] ? String(row['Blood Group']).trim() : null,
                parentName: row['Parent Name'] ? String(row['Parent Name']).trim() : null,
                parentPhone: row['Parent Phone'] ? String(row['Parent Phone']).trim() : null,
                emergencyContact: row['Emergency Contact'] ? String(row['Emergency Contact']).trim() : null,
                emergencyContactName: row['Emergency Contact Name'] ? String(row['Emergency Contact Name']).trim() : null,
                password,
              }),
            }
          );
          const result = await response.json();
          if (!response.ok) {
            importResults.push({ row: rowNum, name, status: 'error', message: result.error || 'Failed' });
          } else {
            importResults.push({ row: rowNum, name, status: 'success', message: 'Created', studentId: result.admissionNumber, password });
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
        toast.success(`${successCount} students imported${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        onSuccess?.();
      } else if (errorCount > 0) {
        toast.error(`All ${errorCount} rows failed`);
      }
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
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
            Import Students from Excel
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
            <p>• <strong>Student Name</strong>, <strong>Class</strong> (e.g. "5-A"), and <strong>Password</strong> are mandatory</p>
            <p>• Each row creates a student + parent login account</p>
            <p>• Import may take time as each student is created sequentially</p>
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
                  <span>{successResults.length} students imported successfully</span>
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
