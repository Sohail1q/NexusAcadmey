import * as XLSX from 'xlsx';

export interface AttendanceDayRecord {
  name: string;
  fatherName: string;
  status: string;
}

export interface AttendanceDayBlock {
  date: string;
  day: string;
  records: AttendanceDayRecord[];
}

/**
 * Builds an editable Excel sheet featuring individual daily blocks,
 * timing metrics, student names, father names, and attendance status separated nicely by 3-row gaps.
 */
export function exportClassAttendanceToExcel(
  className: string,
  classTiming: { start: string; end: string },
  attendanceHistoryData: Array<{
    date: string;
    day: string;
    records: Array<{ name: string; fatherName: string; status: string }>;
  }>
) {
  const sheetData: any[][] = [];

  attendanceHistoryData.forEach((dayData, index) => {
    // 1. Block Header Row showing: Class Name, Date, Day, and Timing (Start - End)
    sheetData.push([
      `Class Name: ${className}`,
      `Date: ${dayData.date}`,
      `Day: ${dayData.day}`,
      `Timing: ${classTiming.start} - ${classTiming.end}`,
    ]);

    // 2. Table Headers
    sheetData.push(['Student Name', 'Father Name', 'Attendance Status']);

    // 3. Student Rows (all enrolled students with respective statuses, defaulting to Absent)
    dayData.records.forEach((record) => {
      sheetData.push([record.name, record.fatherName, record.status]);
    });

    // 4. Exact gap of 3 empty rows between daily blocks
    if (index < attendanceHistoryData.length - 1) {
      sheetData.push([]);
      sheetData.push([]);
      sheetData.push([]);
    }
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set standard column widths so data is readable without '######'
  worksheet['!cols'] = [
    { wch: 28 }, // Student Name / Info
    { wch: 28 }, // Father Name / Date
    { wch: 20 }, // Status / Day
    { wch: 25 }, // Timing
  ];

  const workbook = XLSX.utils.book_new();

  // Excel sheet names must not contain: \ / ? * [ ] : and max 31 chars
  const safeSheetName =
    className.replace(/[:\\/?*\[\]]/g, '_').substring(0, 30) || 'Attendance';

  XLSX.utils.book_append_sheet(workbook, worksheet, `${safeSheetName}`);

  // Safe file name without illegal filesystem chars
  const safeFileName =
    className.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35) || 'Class';

  // Trigger browser download of editable excel file (.xlsx)
  XLSX.writeFile(workbook, `${safeFileName}_Attendance_Report.xlsx`);
}
