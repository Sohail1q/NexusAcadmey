import React, { useState } from 'react';
import {
  Coins,
  Search,
  PlusCircle,
  FileSpreadsheet,
  X,
  Users,
  Copy,
  ExternalLink,
  Download,
  Eye,
  Printer,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { NexusStudent, NexusClass, NexusSettings } from '../types';
import { exportToExcelXls, exportToCsv, exportToHtmlReport } from '../services/cloudSync';
import { getActiveStudentClassDisplay, isClassActive } from '../utils/classUtils';
import { getFullPhotoUrl } from '../utils/photoUtils';
import { BatchReceiptModal } from './BatchReceiptModal';

interface DuesViewProps {
  students: NexusStudent[];
  classes?: NexusClass[];
  currency?: string;
  settings?: NexusSettings;
  onOpenAddFeeModal: (student: NexusStudent) => void;
  onOpenReceipt?: (student: NexusStudent) => void;
}

export const DuesView: React.FC<DuesViewProps> = ({
  students,
  classes = [],
  currency = 'PKR',
  settings,
  onOpenAddFeeModal,
  onOpenReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; id: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBatchReceiptModalOpen, setIsBatchReceiptModalOpen] = useState(false);

  const now = new Date();
  const currentMonthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string>(currentMonthStr);

  // Generate 12 months for the session summary dropdown
  const sessionMonths: string[] = [];
  const startYear = now.getFullYear();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthNames.forEach((m) => {
    sessionMonths.push(`${m} ${startYear}`);
  });

  // Calculate Expected vs Collected amounts for the selected month
  const targetMonthOnly = selectedSummaryMonth.split(' ')[0].toLowerCase();

  const enrolledStudents = students.filter(
    (s) => (s.className && isClassActive(s.className, classes)) || (s.monthlyFee || 0) > 0
  );

  let totalExpectedForMonth = 0;
  enrolledStudents.forEach((s) => {
    const hist = s.monthlyHistory?.[selectedSummaryMonth] || s.monthlyHistory?.[selectedSummaryMonth.split(' ')[0]];
    if (hist && hist.fee !== undefined) {
      totalExpectedForMonth += Number(hist.fee) || 0;
    } else {
      const netFee = Math.max(0, (s.monthlyFee || 0) - (s.monthlyDiscount || 0));
      totalExpectedForMonth += netFee;
    }
  });

  let totalCollectedForMonth = 0;
  let studentsPaidThisMonthCount = 0;
  let studentsPartialThisMonthCount = 0;
  let studentsPendingThisMonthCount = 0;

  enrolledStudents.forEach((s) => {
    let studentPaidForThisMonth = 0;

    // Check feePayments array
    if (Array.isArray(s.feePayments) && s.feePayments.length > 0) {
      s.feePayments.forEach((p) => {
        const pMonth = (p.month || '').toLowerCase();
        const pDate = p.date || '';
        if (pMonth.includes(targetMonthOnly) || (selectedSummaryMonth === currentMonthStr && pDate.startsWith(currentYearMonth))) {
          studentPaidForThisMonth += Number(p.amount) || 0;
        }
      });
    }

    // Check monthlyHistory
    const hist = s.monthlyHistory?.[selectedSummaryMonth] || s.monthlyHistory?.[selectedSummaryMonth.split(' ')[0]];
    if (hist && hist.paid) {
      if (studentPaidForThisMonth === 0) {
        studentPaidForThisMonth += Number(hist.paid) || 0;
      }
    }

    // Check if admitted this month or paid overall
    if (studentPaidForThisMonth === 0 && selectedSummaryMonth === currentMonthStr) {
      const admDate = s.lastAdmissionDate || s.admissionDate || '';
      if (admDate.startsWith(currentYearMonth) && (s.totalPaid || 0) > 0) {
        studentPaidForThisMonth = s.totalPaid;
      }
    }

    totalCollectedForMonth += studentPaidForThisMonth;

    const studentExpected = Math.max(0, (s.monthlyFee || 0) - (s.monthlyDiscount || 0));
    if (studentPaidForThisMonth >= studentExpected && studentExpected > 0) {
      studentsPaidThisMonthCount++;
    } else if (studentPaidForThisMonth > 0) {
      studentsPartialThisMonthCount++;
    } else {
      studentsPendingThisMonthCount++;
    }
  });

  const totalCumulativeDues = students.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);
  const remainingExpectedForMonth = Math.max(0, totalExpectedForMonth - totalCollectedForMonth);
  const collectionRate = totalExpectedForMonth > 0
    ? Math.min(100, Math.round((totalCollectedForMonth / totalExpectedForMonth) * 100))
    : 0;

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    const activeClass = getActiveStudentClassDisplay(s.className, classes).toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.guardianName && s.guardianName.toLowerCase().includes(q)) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
      activeClass.includes(q)
    );
  });

  const handleExportDues = () => {
    if (filtered.length === 0) return;

    const columns = [
      { header: 'Student ID', width: 90 },
      { header: 'Photo Link', width: 110 },
      { header: 'Student Name', width: 130 },
      { header: 'Guardian Name', width: 130 },
      { header: 'Class', width: 160 },
      { header: `Monthly Fee (${currency})`, width: 120 },
      { header: `Total Dues (${currency})`, width: 120 },
      { header: 'Status', width: 110 },
    ];

    const rows = filtered.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const duesAmt = s.dues || 0;
      return [
        { text: s.id },
        {
          text: fullPhoto ? 'View Online Photo' : 'No Photo',
          isLink: !!fullPhoto,
          linkUrl: fullPhoto,
        },
        { text: s.name },
        { text: s.guardianName || s.fatherName || '' },
        { text: getActiveStudentClassDisplay(s.className, classes) },
        { text: `${s.monthlyFee || 0}` },
        { text: `${duesAmt}` },
        {
          text: duesAmt > 0 ? 'Pending' : 'Cleared',
          isStatus: true,
        },
      ];
    });

    exportToExcelXls({
      sheetName: 'Student_Dues',
      title: 'Nexus Academy — Student Fee & Dues Summary',
      subtitle: `Total Students: ${filtered.length} | Export Date: ${new Date().toLocaleDateString()}`,
      columns,
      rows,
      filename: `Student_Dues_${Date.now()}.xls`,
    });
  };

  const handleExportDuesCsv = () => {
    if (filtered.length === 0) return;

    const columns = [
      { header: 'Student ID' },
      { header: 'Photo Link' },
      { header: 'Student Name' },
      { header: 'Guardian Name' },
      { header: 'Class' },
      { header: `Monthly Fee (${currency})` },
      { header: `Total Dues (${currency})` },
      { header: 'Status' },
    ];

    const rows = filtered.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const duesAmt = s.dues || 0;
      return [
        { text: s.id },
        { text: fullPhoto || 'No Photo' },
        { text: s.name },
        { text: s.guardianName || s.fatherName || '' },
        { text: getActiveStudentClassDisplay(s.className, classes) },
        { text: `${s.monthlyFee || 0}` },
        { text: `${duesAmt}` },
        { text: duesAmt > 0 ? 'Pending' : 'Cleared' },
      ];
    });

    exportToCsv({
      title: 'Nexus Academy — Student Fee & Dues Summary',
      columns,
      rows,
      filename: `Student_Dues_${Date.now()}.csv`,
    });
  };

  const handleExportDuesHtmlReport = () => {
    if (filtered.length === 0) return;

    const columns = [
      { header: 'Student ID' },
      { header: 'Student Name' },
      { header: 'Guardian / Father Name' },
      { header: 'Class' },
      { header: `Monthly Fee (${currency})` },
      { header: `Total Dues (${currency})` },
      { header: 'Fee Status' },
      { header: 'Photo' },
    ];

    const rows = filtered.map((s) => {
      const fullPhoto = getFullPhotoUrl(s.photo);
      const duesAmt = s.dues || 0;
      return [
        { text: s.id },
        { text: s.name },
        { text: s.guardianName || s.fatherName || '' },
        { text: getActiveStudentClassDisplay(s.className, classes) },
        { text: `${currency} ${(s.monthlyFee || 0).toLocaleString()}` },
        { text: `${currency} ${duesAmt.toLocaleString()}` },
        {
          text: duesAmt > 0 ? 'Pending Dues' : 'Cleared',
          isStatus: true,
        },
        {
          text: fullPhoto ? 'View Photo' : 'No Photo',
          isLink: !!fullPhoto,
          linkUrl: fullPhoto,
        },
      ];
    });

    exportToHtmlReport({
      title: 'Nexus Academy — Student Dues & Fee Statement',
      subtitle: `Total Students: ${filtered.length} | Generated: ${new Date().toLocaleString()}`,
      columns,
      rows,
      filename: `Student_Dues_Report_${Date.now()}.html`,
    });
  };

  const copyPhotoLink = (url: string) => {
    const full = getFullPhotoUrl(url);
    navigator.clipboard.writeText(full);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-wrap gap-3">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Coins className="w-5 h-5 text-blue-600" /> Student Dues &amp; Monthly Fee Submission
        </h3>

        {filtered.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setIsBatchReceiptModalOpen(true)}
              className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Batch generate, print, or download fee receipts for all students at once"
            >
              <Printer className="w-4 h-4 text-indigo-200" /> Print / Download All Receipts
            </button>
            <button
              type="button"
              onClick={handleExportDuesCsv}
              className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Download Dues Report in universal CSV (works on Excel, Google Sheets, Mobile)"
            >
              <Download className="w-4 h-4 text-blue-200" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportDues}
              className="h-9 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Download Dues Report in Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" /> Export Excel
            </button>
            <button
              type="button"
              onClick={handleExportDuesHtmlReport}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Open printable HTML report in any web browser"
            >
              <Eye className="w-4 h-4 text-slate-300" /> View Report (.html)
            </button>
          </div>
        )}
      </div>

      {/* Monthly Fees Expected vs Collected Summary Section */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Summary Header & Month Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                Monthly Fee &amp; Collection Summary
                {selectedSummaryMonth === currentMonthStr && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Current Month Active
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-500">
                Monthly fees expected versus total collected amounts for {selectedSummaryMonth}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Month:
            </label>
            <select
              value={selectedSummaryMonth}
              onChange={(e) => setSelectedSummaryMonth(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
            >
              {sessionMonths.map((m) => (
                <option key={m} value={m}>
                  {m} {m === currentMonthStr ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Expected Monthly Fees */}
          <div className="bg-white border border-blue-100 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Expected Monthly Fees</span>
              <span className="p-1 rounded-md bg-blue-50 text-blue-600">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-black text-slate-900">
                {currency} {totalExpectedForMonth.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Expected from {enrolledStudents.length} enrolled student accounts
              </span>
            </div>
          </div>

          {/* Card 2: Total Collected Amounts */}
          <div className="bg-white border border-emerald-100 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Collected This Month</span>
              <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-black text-emerald-600">
                {currency} {totalCollectedForMonth.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {studentsPaidThisMonthCount} fully paid • {collectionRate}% of target collected
              </span>
            </div>
          </div>

          {/* Card 3: Remaining Balance for Month */}
          <div className="bg-white border border-amber-100 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Remaining for This Month</span>
              <span className="p-1 rounded-md bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className={`text-lg sm:text-xl font-black ${remainingExpectedForMonth > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {currency} {remainingExpectedForMonth.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                {studentsPendingThisMonthCount} pending • {studentsPartialThisMonthCount} partial payments
              </span>
            </div>
          </div>

          {/* Card 4: Total Academy Outstanding Dues */}
          <div className="bg-white border border-rose-100 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Cumulative Academy Dues</span>
              <span className="p-1 rounded-md bg-rose-50 text-rose-600">
                <Coins className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className={`text-lg sm:text-xl font-black ${totalCumulativeDues > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {currency} {totalCumulativeDues.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                All-time outstanding backlog across all students
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-slate-600 font-medium">
            <span>
              Monthly Collection Progress ({currency} {totalCollectedForMonth.toLocaleString()} / {currency} {totalExpectedForMonth.toLocaleString()})
            </span>
            <span className="font-bold text-slate-900">{collectionRate}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, collectionRate)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, ID or guardian..."
            className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Dues Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
              <th className="py-2.5 px-3">ID #</th>
              <th className="py-2.5 px-3">Photo</th>
              <th className="py-2.5 px-3">Student Name</th>
              <th className="py-2.5 px-3">Father / Guardian</th>
              <th className="py-2.5 px-3">Class</th>
              <th className="py-2.5 px-3">Monthly Fee</th>
              <th className="py-2.5 px-3">Total Dues</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No student dues records found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-3 font-semibold text-blue-600">{s.id}</td>
                  <td className="py-3 px-3">
                    <div
                      onClick={() => setPreviewPhoto({ url: s.photo || '', name: s.name, id: s.id })}
                      className="cursor-pointer group relative inline-block"
                      title="Click to view full photo & online link"
                    >
                      {s.photo && !s.photo.includes('svg') ? (
                        <img
                          src={s.photo}
                          alt={s.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 group-hover:ring-2 group-hover:ring-blue-500 transition shadow-xs"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 group-hover:ring-2 group-hover:ring-blue-500">
                          {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-900">{s.name}</td>
                  <td className="py-3 px-3 text-slate-600">{s.guardianName || s.fatherName}</td>
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
                    {currency} {(s.monthlyFee || 0).toLocaleString()}
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
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenReceipt && (
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(s)}
                          className="h-8 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md inline-flex items-center gap-1 border border-blue-200 transition cursor-pointer"
                          title="View Official Fee Record Receipt"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" /> Receipt
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenAddFeeModal(s)}
                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Add Fee
                      </button>
                    </div>
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
                  className="w-52 h-52 object-cover rounded-xl border border-slate-200 shadow-md"
                />
              ) : (
                <div className="w-52 h-52 bg-slate-100 rounded-xl flex items-center justify-center text-4xl font-bold text-slate-400 border border-slate-200">
                  {previewPhoto.name.charAt(0)}
                </div>
              )}

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

      {/* Batch Receipts Modal */}
      <BatchReceiptModal
        isOpen={isBatchReceiptModalOpen}
        onClose={() => setIsBatchReceiptModalOpen(false)}
        students={students}
        classes={classes}
        settings={settings}
        currency={currency}
        defaultMonth={selectedSummaryMonth}
      />
    </div>
  );
};
