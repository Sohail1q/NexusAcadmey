import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Save,
  Users,
  FileSpreadsheet,
  Download,
  Eye,
  X,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { NexusStudent, NexusClass, NexusAttendanceRecord } from '../types';
import { exportToExcelXls, exportToCsv, downloadBlob } from '../services/cloudSync';
import { isStudentEnrolledInClass } from '../utils/classUtils';
import { exportClassAttendanceToExcel } from '../utils/excelAttendanceExport';

interface AttendanceViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  attendanceRecords: Record<string, Record<string, NexusAttendanceRecord[]>>;
  onSaveAttendance: (date: string, className: string, records: NexusAttendanceRecord[]) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students,
  classes,
  attendanceRecords,
  onSaveAttendance,
  onNotification,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [statusMap, setStatusMap] = useState<Record<string, 'Present' | 'Absent' | 'Leave'>>({});
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter students who are admitted in the selected class (including dual-enrolled)
  const enrolledStudents = students.filter((s) => isStudentEnrolledInClass(s.className, selectedClass));

  // When class or date changes, load saved attendance or default to 'Present'
  useEffect(() => {
    if (!selectedClass || !date) {
      setStatusMap({});
      return;
    }

    const savedForDate = attendanceRecords[date]?.[selectedClass] || [];
    const newMap: Record<string, 'Present' | 'Absent' | 'Leave'> = {};

    enrolledStudents.forEach((s) => {
      const existing = savedForDate.find((r) => r.studentId === s.id);
      // Non-biometric or unscanned students automatically default to 'Absent'
      newMap[s.id] = existing ? existing.status : 'Absent';
    });

    setStatusMap(newMap);
  }, [selectedClass, date, students, attendanceRecords]);

  const handleStatusChange = (studentId: string, status: 'Present' | 'Absent' | 'Leave') => {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAll = (status: 'Present' | 'Absent' | 'Leave') => {
    const updated: Record<string, 'Present' | 'Absent' | 'Leave'> = {};
    enrolledStudents.forEach((s) => {
      updated[s.id] = status;
    });
    setStatusMap(updated);
  };

  const handleSave = () => {
    if (!selectedClass) {
      onNotification('Please select an active class first.', 'error');
      return;
    }

    if (enrolledStudents.length === 0) {
      onNotification('No students are enrolled in this class to record attendance.', 'error');
      return;
    }

    const records: NexusAttendanceRecord[] = enrolledStudents.map((s) => ({
      studentId: s.id,
      status: statusMap[s.id] || 'Absent',
    }));

    onSaveAttendance(date, selectedClass, records);
    onNotification(`Daily attendance saved for ${records.length} student(s) on ${date}!`, 'success');
  };

  const getFullPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http')) return photoPath;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
  };

  // Export Daily Attendance to formatted Excel Sheet (.xls) with custom column widths (avoids Excel ######## error)
  const handleExportExcel = () => {
    if (!selectedClass) {
      onNotification('Please select an active class first to export attendance.', 'error');
      return;
    }
    if (enrolledStudents.length === 0) {
      onNotification('No students found in this class to export.', 'info');
      return;
    }

    const dateObj = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Father Name', width: 130 },
      { header: 'Class Name', width: 180 },
      { header: 'Attendance Date', width: 120 },
      { header: 'Day of Week', width: 100 },
      { header: 'Status', width: 110 },
    ];

    const rows = enrolledStudents.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const st = statusMap[s.id] || 'Absent';
      return [
        { text: s.id },
        {
          text: fullPhoto ? 'View Online Photo' : 'No Photo',
          isLink: !!fullPhoto,
          linkUrl: fullPhoto,
        },
        { text: s.name },
        { text: s.fatherName || s.guardianName || '' },
        { text: selectedClass },
        { text: date, isDate: true },
        { text: day },
        { text: st, isStatus: true },
      ];
    });

    const safeClass = selectedClass.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
    exportToExcelXls({
      sheetName: `${date}_Attendance`,
      title: `Nexus Academy — Daily Attendance Sheet: ${date} (${day})`,
      subtitle: `Class: ${selectedClass} | Enrolled Students: ${enrolledStudents.length} | Generated: ${new Date().toLocaleTimeString()}`,
      columns,
      rows,
      filename: `Attendance_${safeClass}_${date}.xls`,
    });

    onNotification(`Exported Excel attendance sheet for ${date}!`, 'success');
  };

  // Export Multi-Day Attendance with 3-row gaps in editable Excel (.xlsx)
  const handleExportMultiDayExcel = () => {
    if (!selectedClass) {
      onNotification('Please select an active class first to export attendance.', 'error');
      return;
    }
    if (enrolledStudents.length === 0) {
      onNotification('No students found in this class to export.', 'info');
      return;
    }

    // Find class timing
    const matchedClass = classes.find(
      (c) =>
        c.className === selectedClass ||
        selectedClass.includes(c.className) ||
        (c.className && selectedClass.includes(c.teacher))
    );
    const classTiming = {
      start: matchedClass?.startTime || '03:00 PM',
      end: matchedClass?.endTime || '04:00 PM',
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Collect all dates for this class from attendanceRecords
    const datesSet = new Set<string>();
    Object.keys(attendanceRecords).forEach((d) => {
      if (
        attendanceRecords[d]?.[selectedClass] ||
        (matchedClass && attendanceRecords[d]?.[matchedClass.className])
      ) {
        datesSet.add(d);
      }
    });
    // Ensure current selected date is included
    if (date) {
      datesSet.add(date);
    }

    const sortedDates = Array.from(datesSet).sort();

    const attendanceHistoryData = sortedDates.map((d) => {
      const dObj = new Date(d);
      const day = isNaN(dObj.getTime()) ? 'Day' : dayNames[dObj.getDay()];

      const recordsForDate =
        attendanceRecords[d]?.[selectedClass] ||
        (matchedClass ? attendanceRecords[d]?.[matchedClass.className] : undefined) ||
        [];

      const records = enrolledStudents.map((s) => {
        let status: 'Present' | 'Absent' | 'Leave' = 'Absent';
        if (d === date) {
          status = statusMap[s.id] || 'Absent';
        } else {
          const rec = recordsForDate.find((r) => r.studentId === s.id);
          status = rec ? rec.status : 'Absent';
        }
        return {
          name: s.name,
          fatherName: s.fatherName || s.guardianName || '',
          status,
        };
      });

      return {
        date: d,
        day,
        records,
      };
    });

    exportClassAttendanceToExcel(selectedClass, classTiming, attendanceHistoryData);
    onNotification(`Exported editable Excel report with multi-day blocks & 3-row gaps!`, 'success');
  };

  const handleExportCsv = () => {
    if (!selectedClass || enrolledStudents.length === 0) {
      onNotification('Please select a class with enrolled students to export.', 'info');
      return;
    }

    const dateObj = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = isNaN(dateObj.getTime()) ? '' : dayNames[dateObj.getDay()];

    const columns = [
      { header: 'Student ID' },
      { header: 'Photo Link' },
      { header: 'Student Name' },
      { header: 'Father Name' },
      { header: 'Class Name' },
      { header: 'Attendance Date' },
      { header: 'Day of Week' },
      { header: 'Status' },
    ];

    const rows = enrolledStudents.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const st = statusMap[s.id] || 'Present';
      return [
        { text: s.id },
        { text: fullPhoto || 'No Photo' },
        { text: s.name },
        { text: s.fatherName || s.guardianName || '' },
        { text: selectedClass },
        { text: date },
        { text: day },
        { text: st },
      ];
    });

    const safeClass = selectedClass.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
    exportToCsv({
      title: `Nexus Academy — Daily Attendance Sheet: ${date} (${day}) - ${selectedClass}`,
      columns,
      rows,
      filename: `Attendance_${safeClass}_${date}.csv`,
    });

    onNotification(`Exported CSV attendance sheet for ${date}!`, 'success');
  };

  const copyPhotoLink = (url: string) => {
    const full = getFullPhotoUrl(url);
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    onNotification('Online photo link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200 flex-wrap gap-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-blue-600" /> Daily Attendance Marking
        </h3>

        {selectedClass && enrolledStudents.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportMultiDayExcel}
              className="h-9 px-3.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Download editable Excel report with daily blocks and 3-row gaps (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-200" /> Export Multi-Day Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="h-9 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Download Excel sheet with dates, photo links, and status"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export Daily (.xls)
            </button>
          </div>
        )}
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Select Active Class <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          >
            <option value="">
              {classes.length === 0 ? '-- No Classes Created Yet (Add in Classes tab) --' : '-- Select Active Class --'}
            </option>
            {classes.map((cls, idx) => {
              const displayStr = `${cls.teacher} | ${cls.category} - ${cls.className} (${cls.startTime} to ${cls.endTime})`;
              return (
                <option key={idx} value={displayStr}>
                  {displayStr}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">
            Attendance Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          />
        </div>

        {classes.length === 0 && (
          <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            No classes created yet. Please add your classes in the <strong>Classes</strong> tab before recording daily attendance.
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      {selectedClass && enrolledStudents.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-600">
            {enrolledStudents.length} student(s) enrolled in this class
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 mr-1">Mark all:</span>
            <button
              type="button"
              onClick={() => handleMarkAll('Present')}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('Absent')}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-red-100 text-red-800 hover:bg-red-200 transition cursor-pointer"
            >
              All Absent
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('Leave')}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition cursor-pointer"
            >
              All Leave
            </button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">ID #</th>
              <th className="py-2.5 px-3">Photo</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Father Name</th>
              <th className="py-2.5 px-3">Status (Present / Absent / Leave)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!selectedClass ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Please select an active class above to load enrolled students.
                </td>
              </tr>
            ) : enrolledStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No students are enrolled in this class yet. Complete student admission first in the Admission tab.
                </td>
              </tr>
            ) : (
              enrolledStudents.map((s) => {
                const currentStatus = statusMap[s.id] || 'Absent';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-semibold text-blue-600">{s.id}</td>
                    <td className="py-2.5 px-3">
                      <div
                        onClick={() => setPreviewPhoto({ url: s.photo || '', name: s.name, id: s.id })}
                        className="cursor-pointer group relative inline-block"
                        title="Click to preview photo & link"
                      >
                        {s.photo && !s.photo.includes('svg') ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-300 shadow-xs group-hover:ring-2 group-hover:ring-blue-500 transition"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:ring-2 group-hover:ring-blue-500">
                            {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.fatherName}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={currentStatus}
                        onChange={(e) =>
                          handleStatusChange(
                            s.id,
                            e.target.value as 'Present' | 'Absent' | 'Leave'
                          )
                        }
                        className={`h-8 px-2.5 rounded-md text-xs font-semibold outline-none border transition cursor-pointer ${
                          currentStatus === 'Present'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : currentStatus === 'Absent'
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      {selectedClass && enrolledStudents.length > 0 && (
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="h-10 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md inline-flex items-center gap-2 border border-blue-200 transition cursor-pointer"
              title="Download Attendance Sheet in universal CSV format (compatible with all apps & devices)"
            >
              <Download className="w-4 h-4 text-blue-600" /> Export CSV (.csv)
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md inline-flex items-center gap-2 border border-slate-300 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Export Sheet to Excel (.xls)
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Daily Attendance
          </button>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> {previewPhoto.name} ({previewPhoto.id})
              </h3>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center">
              {previewPhoto.url && !previewPhoto.url.includes('svg') ? (
                <img
                  src={previewPhoto.url}
                  alt={previewPhoto.name}
                  className="w-52 h-52 object-cover rounded-xl border border-slate-200 shadow-md"
                />
              ) : (
                <div className="w-52 h-52 bg-slate-100 rounded-xl flex items-center justify-center text-4xl font-bold text-slate-400 border border-slate-200">
                  {previewPhoto.name.charAt(0)}
                </div>
              )}

              {/* Online Image Link */}
              <div className="mt-4 w-full bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Online Image URL Link:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullPhotoUrl(previewPhoto.url)}
                    className="text-xs bg-white border border-slate-300 rounded px-2 py-1.5 flex-1 font-mono text-slate-700 outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyPhotoLink(previewPhoto.url)}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={getFullPhotoUrl(previewPhoto.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
