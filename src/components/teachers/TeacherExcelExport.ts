import * as XLSX from 'xlsx';

interface TeacherExportData {
  teacher_id: string;
  qualification: string;
  subjects: string[] | null;
  status: string;
  profiles: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

export function exportTeachersToExcel(teachers: TeacherExportData[]) {
  const rows = teachers.map(t => ({
    'Teacher ID': t.teacher_id,
    'Full Name': t.profiles?.full_name || '',
    'Email': t.profiles?.email || '',
    'Phone': t.profiles?.phone || '',
    'Qualification': t.qualification || '',
    'Subjects': t.subjects?.join(', ') || '',
    'Status': t.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
  XLSX.writeFile(wb, `teachers_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
