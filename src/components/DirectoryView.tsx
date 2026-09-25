import React, { useState, useRef } from 'react';
import {
  Users,
  Search,
  Receipt,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Eye,
  X,
  Copy,
  Check,
  ExternalLink,
  Camera,
  Upload,
  Download,
  AlertCircle,
  Database,
} from 'lucide-react';
import { NexusStudent, NexusClass } from '../types';
import { exportToExcelXls, exportToCsv, exportToHtmlReport } from '../services/cloudSync';
import { compressImage } from '../utils/imageOptimizer';
import { getActiveStudentClassDisplay } from '../utils/classUtils';
import { getFullPhotoUrl, uploadImageToServer } from '../utils/photoUtils';
import { ReportViewerModal } from './ReportViewerModal';

interface DirectoryViewProps {
  students: NexusStudent[];
  classes?: NexusClass[];
  currency?: string;
  onOpenReceipt: (student: NexusStudent) => void;
  onOpenEditModal: (student: NexusStudent) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateStudent?: (student: NexusStudent) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  students,
  classes = [],
  currency = 'PKR',
  onOpenReceipt,
  onOpenEditModal,
  onDeleteStudent,
  onUpdateStudent,
  onNotification,
}) => {
  const [query, setQuery] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoFileChange = async (student: NexusStudent, file: File) => {
    try {
      const compressed = await compressImage(file, 240, 240, 0.8);
      // Upload immediately to server to get permanent online /uploads/ link!
      const onlineUrl = await uploadImageToServer(compressed, student.id, student.name);
      const finalPhoto = onlineUrl || compressed;
      if (onUpdateStudent) {
        onUpdateStudent({
          ...student,
          photo: finalPhoto,
        });
        if (previewPhoto && previewPhoto.id === student.id) {
          setPreviewPhoto({ ...previewPhoto, url: finalPhoto });
        }
        onNotification(`Photo updated for ${student.name}! Online link active.`, 'success');
      }
    } catch {
      onNotification('Could not process selected image', 'error');
    }
  };

  const handleRemovePhoto = (student: NexusStudent) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        photo: '',
      });
      if (previewPhoto && previewPhoto.id === student.id) {
        setPreviewPhoto({ ...previewPhoto, url: '' });
      }
      onNotification(`Photo removed for ${student.name} (now square blank)`, 'info');
    }
  };

  const [classFilter, setClassFilter] = useState<'all' | 'unassigned'>('all');
  const [showInteractiveReport, setShowInteractiveReport] = useState(false);

  const unassignedCount = students.filter(
    (s) => getActiveStudentClassDisplay(s.className, classes) === 'Not Assigned'
  ).length;

  const filtered = students.filter((s) => {
    const activeClass = getActiveStudentClassDisplay(s.className, classes);
    if (classFilter === 'unassigned' && activeClass !== 'Not Assigned') {
      return false;
    }

    const q = query.toLowerCase();
    const activeClassLower = activeClass.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
      activeClassLower.includes(q) ||
      (s.guardianNumber && s.guardianNumber.includes(q)) ||
      (s.studentNumber && s.studentNumber.includes(q))
    );
  });

  const handleExportJson = () => {
    if (filtered.length === 0) {
      onNotification('No students to export in directory.', 'info');
      return;
    }
    const jsonStr = JSON.stringify(filtered, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nexus_Students_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotification(`Exported full student database (${filtered.length} records) as structured JSON!`, 'success');
  };

  const handleExportDirectory = () => {
    if (filtered.length === 0) {
      onNotification('No students to export in directory.', 'info');
      return;
    }

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Father Name', width: 130 },
      { header: 'Class Option', width: 180 },
      { header: `Monthly Fee (${currency})`, width: 110 },
      { header: `Total Dues (${currency})`, width: 110 },
      { header: 'Guardian Phone', width: 120 },
      { header: 'Student Phone', width: 120 },
      { header: 'Email', width: 150 },
    ];

    const rows = filtered.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      return [
        { text: s.id },
        {
          text: fullPhoto ? 'View Online Photo' : 'No Photo',
          isLink: !!fullPhoto,
          linkUrl: fullPhoto,
        },
        { text: s.name },
        { text: s.fatherName || s.guardianName || '' },
        { text: getActiveStudentClassDisplay(s.className, classes) },
        { text: `${s.monthlyFee || 0}` },
        { text: `${s.dues || 0}` },
        { text: s.guardianNumber || '' },
        { text: s.studentNumber || '' },
        { text: s.gmail || '' },
      ];
    });

    exportToExcelXls({
      sheetName: 'Student_Directory',
      title: 'Nexus Academy — Complete Enrolled Students Directory',
      subtitle: `Total Records: ${filtered.length} | Export Date: ${new Date().toLocaleDateString()}`,
      columns,
      rows,
      filename: `Nexus_Students_Directory_${Date.now()}.xls`,
    });

    onNotification(`Exported ${filtered.length} student records to Excel (.xls)!`, 'success');
  };

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      onNotification('No students to export in directory.', 'info');
      return;
    }

    const columns = [
      { header: 'Student ID' },
      { header: 'Photo Link' },
      { header: 'Student Name' },
      { header: 'Father Name' },
      { header: 'Class Option' },
      { header: `Monthly Fee (${currency})` },
      { header: `Total Dues (${currency})` },
      { header: 'Guardian Phone' },
      { header: 'Student Phone' },
      { header: 'Email' },
    ];

    const rows = filtered.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      return [
        { text: s.id },
        { text: fullPhoto || 'No Photo' },
        { text: s.name },
        { text: s.fatherName || s.guardianName || '' },
        { text: getActiveStudentClassDisplay(s.className, classes) },
        { text: `${s.monthlyFee || 0}` },
        { text: `${s.dues || 0}` },
        { text: s.guardianNumber || '' },
        { text: s.studentNumber || '' },
        { text: s.gmail || '' },
      ];
    });

    exportToCsv({
      title: 'Nexus Academy — Complete Enrolled Students Directory',
      columns,
      rows,
      filename: `Nexus_Students_Directory_${Date.now()}.csv`,
    });

    onNotification(`Exported ${filtered.length} student records to universal CSV!`, 'success');
  };

  const handleExportHtmlReport = () => {
    if (filtered.length === 0) {
      onNotification('No students to export in directory.', 'info');
      return;
    }

    const columns = [
      { header: 'Student ID' },
      { header: 'Student Name' },
      { header: 'Father Name' },
      { header: 'Class Option' },
      { header: `Monthly Fee (${currency})` },
      { header: `Total Dues (${currency})` },
      { header: 'Guardian Phone' },
      { header: 'Student Phone' },
      { header: 'Email' },
      { header: 'Online Photo' },
    ];

    const rows = filtered.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const activeClass = getActiveStudentClassDisplay(s.className, classes);
      return [
        { text: s.id },
        { text: s.name },
        { text: s.fatherName || s.guardianName || '' },
        { text: activeClass },
        { text: `${currency} ${(s.monthlyFee || 0).toLocaleString()}` },
        { text: `${currency} ${(s.dues || 0).toLocaleString()}` },
        { text: s.guardianNumber || '' },
        { text: s.studentNumber || '' },
        { text: s.gmail || '' },
        {
          text: fullPhoto ? 'View Online Photo' : 'No Photo',
          isLink: !!fullPhoto,
          linkUrl: fullPhoto,
        },
      ];
    });

    exportToHtmlReport({
      title: 'Nexus Academy — Complete Enrolled Students Directory',
      subtitle: `Total Records: ${filtered.length} | Generated: ${new Date().toLocaleString()}`,
      columns,
      rows,
      filename: `Nexus_Students_Directory_Report_${Date.now()}.html`,
    });

    onNotification('Exported printable HTML directory report! Opens instantly in any web browser.', 'success');
  };

  const copyPhotoLink = (url: string) => {
    const full = getFullPhotoUrl(url);
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    onNotification('Online photo link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> All Enrolled Students Directory
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {students.length} student(s)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setShowInteractiveReport(true)}
            className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Open interactive spreadsheet report viewer with instant search & print inside app"
          >
            <Eye className="w-4 h-4 text-indigo-200" /> View Report Table
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Download directory in universal CSV format (opens in Excel, Google Sheets, Mobile)"
          >
            <Download className="w-4 h-4 text-blue-200" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportDirectory}
            className="h-9 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Download directory with online photo links to Excel (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export Excel
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="h-9 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Export complete database records as structured JSON"
          >
            <Database className="w-4 h-4 text-slate-300" /> Export JSON
          </button>
        </div>
      </div>

      {/* Class Assignment Status Warning */}
      {unassignedCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{unassignedCount} student(s)</strong> have no active class (or their assigned class was deleted). In the directory they are accurately marked as <strong>Not Assigned</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setClassFilter(classFilter === 'unassigned' ? 'all' : 'unassigned')}
            className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-md transition cursor-pointer"
          >
            {classFilter === 'unassigned' ? 'Show All Students' : 'View Unassigned Only'}
          </button>
        </div>
      )}

      {/* Search Input & Quick Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search directory by name, ID, class, phone..."
            className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setClassFilter('all')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              classFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Students ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setClassFilter('unassigned')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              classFilter === 'unassigned'
                ? 'bg-amber-500 text-white shadow-xs'
                : unassignedCount > 0
                ? 'text-amber-700 hover:text-amber-900'
                : 'text-slate-400'
            }`}
          >
            <span>Unassigned / Class Deleted</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                classFilter === 'unassigned' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {unassignedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">ID #</th>
              <th className="py-2.5 px-3">Photo</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Father Name</th>
              <th className="py-2.5 px-3">Assigned Class Option</th>
              <th className="py-2.5 px-3">Monthly Fee</th>
              <th className="py-2.5 px-3">Total Dues</th>
              <th className="py-2.5 px-3">Receipt</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No enrolled student records found matching "{query}".
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-semibold text-blue-600">{s.id}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        onClick={() => setPreviewPhoto({ url: s.photo || '', name: s.name, id: s.id })}
                        className="cursor-pointer group relative inline-block shrink-0"
                        title="Click to view full photo & options"
                      >
                        {s.photo && !s.photo.includes('svg') ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="w-10 h-10 rounded-md object-cover border border-slate-300 group-hover:ring-2 group-hover:ring-blue-500 transition shadow-2xs"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-white border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 group-hover:border-blue-500 transition shadow-2xs">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Blank</span>
                          </div>
                        )}
                      </div>

                      {/* Hidden file input to change picture directly */}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                          fileInputRefs.current[s.id] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoFileChange(s, file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[s.id]?.click()}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Change / upload student picture"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-3 px-3 text-slate-600">{s.fatherName}</td>
                  <td className="py-3 px-3">
                    {(() => {
                      const displayClass = getActiveStudentClassDisplay(s.className, classes);
                      const isAssigned = displayClass !== 'Unassigned' && displayClass !== 'Not Assigned';
                      return (
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full truncate max-w-[180px] border ${
                            isAssigned
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                          }`}
                        >
                          {displayClass}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {currency}{' '}
                    {(
                      getActiveStudentClassDisplay(s.className, classes) === 'Not Assigned'
                        ? 0
                        : (s.monthlyFee || 0)
                    ).toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        (s.dues || 0) > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {currency} {(s.dues || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onOpenReceipt(s)}
                      className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Receipt className="w-3 h-3" /> Receipt
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(s)}
                      className="h-7 px-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete student "${s.name}" (${s.id})?`)) {
                          onDeleteStudent(s.id);
                          onNotification(`Student ${s.name} deleted.`, 'info');
                        }
                      }}
                      className="h-7 px-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded inline-flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
                  className="w-48 h-48 object-cover rounded-xl border-2 border-blue-500 shadow-md"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 shadow-2xs">
                  <Camera className="w-10 h-10 text-slate-300 mb-2" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Square Blank
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">No picture uploaded</p>
                </div>
              )}

              {/* Action Buttons to Change Photo or Remove to Blank */}
              <div className="mt-4 flex items-center gap-2 w-full">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={modalFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    const target = students.find((s) => s.id === previewPhoto.id);
                    if (file && target) {
                      handlePhotoFileChange(target, file);
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{previewPhoto.url ? 'Change Photo' : 'Upload Photo'}</span>
                </button>

                {previewPhoto.url && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = students.find((s) => s.id === previewPhoto.id);
                      if (target) handleRemovePhoto(target);
                    }}
                    className="h-9 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                    title="Remove picture (make square blank)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

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

      {showInteractiveReport && (
        <ReportViewerModal
          title="Nexus Academy — Complete Enrolled Students Directory"
          subtitle={`Showing ${filtered.length} of ${students.length} student records | Filter: ${
            classFilter === 'unassigned' ? 'Unassigned / Deleted Class Only' : 'All Students'
          }`}
          filenameBase="Nexus_Student_Directory"
          onClose={() => setShowInteractiveReport(false)}
          columns={[
            { header: 'Student ID' },
            { header: 'Student Name' },
            { header: 'Father Name' },
            { header: 'Class Option' },
            { header: `Monthly Fee (${currency})` },
            { header: `Monthly Disc.` },
            { header: `Adm Disc.` },
            { header: `Total Dues (${currency})` },
            { header: `Total Paid (${currency})` },
            { header: 'Guardian Phone' },
            { header: 'Student Phone' },
            { header: 'Email' },
            { header: 'Admission Date' },
          ]}
          rows={filtered.map((s) => [
            { text: s.id },
            { text: s.name },
            { text: s.fatherName || s.guardianName || '' },
            { text: getActiveStudentClassDisplay(s.className, classes) },
            { text: `${s.monthlyFee || 0}` },
            { text: `${s.monthlyDiscount || 0}` },
            { text: `${s.admissionDiscount || 0}` },
            { text: `${s.dues || 0}` },
            { text: `${s.totalPaid || 0}` },
            { text: s.guardianNumber || '' },
            { text: s.studentNumber || '' },
            { text: s.gmail || '' },
            { text: s.admissionDate || '' },
          ])}
        />
      )}
    </div>
  );
};
