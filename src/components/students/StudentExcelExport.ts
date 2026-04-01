import * as XLSX from 'xlsx';
import { formatClassName } from "@/lib/utils";

interface StudentExportData {
  admission_number: string;
  full_name: string;
  classes: { name: string; section: string } | null;
  date_of_birth: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  address: string | null;
  blood_group: string | null;
  status: string;
}

export function exportStudentsToExcel(students: StudentExportData[]) {
  const rows = students.map(s => ({
    'Admission Number': s.admission_number,
    'Student Name': s.full_name,
    'Class': s.classes ? `${formatClassName(s.classes.name, s.classes.section)}` : 'N/A',
    'Date of Birth': s.date_of_birth || '',
    'Parent Name': s.parent_name || '',
    'Parent Phone': s.parent_phone || '',
    'Address': s.address || '',
    'Blood Group': s.blood_group || '',
    'Status': s.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, `students_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
