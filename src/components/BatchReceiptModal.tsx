import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Filter,
  Eye,
} from 'lucide-react';
import { NexusStudent, NexusClass, NexusSettings } from '../types';
import { generateReceiptNumber, generateStudentFeeCycle } from '../utils/receiptUtils';
import { isClassActive, getActiveStudentClassDisplay, isStudentEnrolledInClass } from '../utils/classUtils';
import { getPeshawarComponents } from '../utils/peshawarTime';

interface BatchReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: NexusStudent[];
  classes: NexusClass[];
  settings?: NexusSettings;
  currency?: string;
  defaultMonth?: string;
}

export const BatchReceiptModal: React.FC<BatchReceiptModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  settings,
  currency = 'PKR',
  defaultMonth,
}) => {
  const peshawarNow = getPeshawarComponents();
  const currentMonthStr = `${peshawarNow.monthName} ${peshawarNow.year}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth || currentMonthStr);
  const [targetFilter, setTargetFilter] = useState<'all' | 'enrolled' | 'dues'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Generate 12-month session list based on Peshawar year
  const sessionMonths: string[] = [];
  const startYear = peshawarNow.year;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthNames.forEach((m) => {
    sessionMonths.push(`${m} ${startYear}`);
  });

  // Filter students based on selection
  const filteredStudents = students.filter((s) => {
    const isEnrolled = Boolean(s.className && s.className.trim() !== '');
    const hasDues = (s.dues || 0) > 0;

    if (targetFilter === 'enrolled' && !isEnrolled) return false;
    if (targetFilter === 'dues' && !hasDues) return false;

    if (classFilter !== 'all') {
      if (!isStudentEnrolledInClass(s.className, classFilter)) return false;
    }

    return true;
  });

  // Unique active class names for filter
  const uniqueClassNames = Array.from(
    new Set(
      classes.map((c) => `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})`)
    )
  );

  const academyName = settings?.name || 'Nexus Academy';
  const academySub = settings?.subtitle || 'Excellence in Education';
  const academyAddr = settings?.address || 'Main Campus, Administrative Block';
  const academyLogo = settings?.logo || '/nexus-logo.png';

  /**
   * Generate Full HTML Document with all student receipts
   */
  const buildAllReceiptsHtml = (receiptStudents: NexusStudent[]): string => {
    const todayDate = new Date().toISOString().split('T')[0];
    const todayTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const studentReceiptsHtml = receiptStudents
      .map((student, index) => {
        const formattedReceiptNo = generateReceiptNumber(student.id);
        const matchedClass = classes.find(
          (c) =>
            `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})` ===
            student.className
        );

        const feeCycle = generateStudentFeeCycle(student, matchedClass);
        const academicYearStr = feeCycle.academicYearStr;
        const ledgerRows = feeCycle.rows.map((r) => ({
          monthYear: r.displayMonthYear,
          className: r.className || student.className || 'General',
          demanded: r.demanded,
          paid: r.paid,
          dues: r.dues,
          date: r.date,
        }));

        const netMonthlyFee = Math.max(0, (student.monthlyFee || 0) - (student.monthlyDiscount || 0));
        const netAdmissionFee = Math.max(0, (student.admissionFee || 0) - (student.admissionDiscount || 0));
        const monthlyDiscount = student.monthlyDiscount || 0;
        const admissionDiscount = student.admissionDiscount || 0;

        const totalPaid = student.totalPaid || 0;
        const remainingDues = student.dues || 0;
        const totalDemanded = totalPaid + remainingDues;

        const studentClassDisplay = getActiveStudentClassDisplay(student.className, classes) || 'Not Enrolled';
        const photoSrc = student.photo || student.photoUrl || student.photoLink || '';

        return `
        <div class="receipt-sheet ${index < receiptStudents.length - 1 ? 'page-break' : ''}">
          <div class="receipt-content">
            <!-- Header -->
            <div class="header">
              <div class="brand">
                <img class="logo" src="${academyLogo}" alt="Logo">
                <div>
                  <h1 class="title">${academyName}</h1>
                  <p class="sub">${academySub}</p>
                  <p class="addr">${academyAddr}</p>
                </div>
              </div>
              <div class="receipt-info">
                <div class="receipt-title">OFFICIAL FEE RECEIPT</div>
                <div>Receipt No: <span class="blank">${formattedReceiptNo}</span></div>
                <div>Issue Date: <span class="blank">${todayDate}</span></div>
                <div>Billing Period: <span class="blank">${selectedMonth}</span></div>
              </div>
            </div>

            <!-- Student Card -->
            <div class="student-card">
              <div class="student-photo">
                ${photoSrc ? `<img src="${photoSrc}" alt="${student.name}" />` : 'Student<br>Photo'}
              </div>
              <div class="student-details">
                <div class="detail-row"><span class="label">Student ID:</span><span class="value">${student.id}</span></div>
                <div class="detail-row"><span class="label">Class:</span><span class="value">${studentClassDisplay}</span></div>
                <div class="detail-row"><span class="label">Student Name:</span><span class="value">${student.name}</span></div>
                <div class="detail-row"><span class="label">Father / Guardian:</span><span class="value">${student.fatherName || student.guardianName || '-'}</span></div>
                <div class="detail-row"><span class="label">Student Contact:</span><span class="value">${student.studentNumber || '-'}</span></div>
                <div class="detail-row"><span class="label">Guardian Contact:</span><span class="value">${student.guardianNumber || '-'}</span></div>
                <div class="detail-row"><span class="label">Email:</span><span class="value">${student.gmail || '-'}</span></div>
                <div class="detail-row"><span class="label">Admission Date:</span><span class="value">${student.admissionDate || student.registeredAt || '-'}</span></div>
              </div>
            </div>

            <!-- Ledger Table -->
            <div class="section-title">Academic Fee Ledger &amp; Status</div>
            <table>
              <thead>
                <tr>
                  <th style="width:20%">Month / Year</th>
                  <th style="width:18%">Class</th>
                  <th style="width:20%">Monthly Demanded</th>
                  <th style="width:16%">Paid Amount</th>
                  <th style="width:16%">Remaining Dues</th>
                  <th style="width:10%">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr class="cycle-header"><td colspan="6">Academic Cycle: ${academicYearStr}</td></tr>
                ${ledgerRows
                  .slice(0, 8)
                  .map(
                    (r) => `
                  <tr>
                    <td style="font-weight:700; text-align:left; padding-left:8px;">${r.monthYear}</td>
                    <td style="color:#475569;">${r.className}</td>
                    <td>${r.demanded > 0 ? `${currency} ${r.demanded.toLocaleString()}` : '-'}</td>
                    <td style="font-weight:700; color:${r.paid > 0 ? '#059669' : '#64748b'};">${r.paid > 0 ? `${currency} ${r.paid.toLocaleString()}` : '-'}</td>
                    <td style="font-weight:700; color:${r.dues > 0 ? '#b91c1c' : '#059669'};">${r.dues > 0 ? `${currency} ${r.dues.toLocaleString()}` : 'Cleared'}</td>
                    <td style="font-size:8.5px; color:#64748b;">${r.date}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>

            <!-- Summary Breakdown -->
            <div class="summary-grid">
              <div class="summary-card">
                <div class="summary-head">Fee Components</div>
                <div class="summary-row">
                  <span>Current Monthly Tuition</span>
                  <span><strong>${currency} ${netMonthlyFee.toLocaleString()}</strong>${monthlyDiscount > 0 ? ` <span style="color:#059669; font-size:8.5px;">(Disc: -${currency} ${monthlyDiscount.toLocaleString()})</span>` : ''}</span>
                </div>
                <div class="summary-row">
                  <span>Admission / Registration Fee</span>
                  <span><strong>${currency} ${netAdmissionFee.toLocaleString()}</strong>${admissionDiscount > 0 ? ` <span style="color:#059669; font-size:8.5px;">(Disc: -${currency} ${admissionDiscount.toLocaleString()})</span>` : ''}</span>
                </div>
              </div>
              <div class="summary-card">
                <div class="summary-head">Account Balance Summary</div>
                <div class="summary-row"><span>Total Demanded</span><span><strong>${currency} ${totalDemanded.toLocaleString()}</strong></span></div>
                <div class="summary-row"><span>Total Paid to Date</span><span style="color:#059669;"><strong>${currency} ${totalPaid.toLocaleString()}</strong></span></div>
                <div class="summary-row"><span>Outstanding Dues Balance</span><span style="color:#b91c1c;"><strong>${currency} ${remainingDues.toLocaleString()}</strong></span></div>
              </div>
            </div>

            <!-- Signatures -->
            <div class="signatures">
              <div class="sig-box">
                <div class="sig-label">Accountant Signature</div>
              </div>
              <div class="sig-box stamp-box">
                <div class="stamp-note">Space for Administration Stamp &amp; Sign</div>
                <div class="sig-label">Administration Stamp &amp; Sign</div>
              </div>
            </div>
          </div>

          <!-- Tear-off Office Counterfoil -->
          <div class="office-slip-container">
            <div class="tear-off-line">
              <span class="tear-off-text">✂ Tear From Here — Office Record Counterfoil (Retain for Academy Files) ✂</span>
            </div>
            <div class="office-slip">
              <div class="office-slip-header">
                <span>${academyName} — Accounts Office Copy</span>
                <span>Date: <span class="blank" style="min-width:80px">${todayDate}</span></span>
              </div>
              <div class="office-slip-grid">
                <div class="office-field"><span class="label">Receipt No:</span><span class="office-blank">${formattedReceiptNo}</span></div>
                <div class="office-field"><span class="label">Student ID:</span><span class="office-blank">${student.id}</span></div>
                <div class="office-field"><span class="label">Student Name:</span><span class="office-blank">${student.name}</span></div>
                <div class="office-field"><span class="label">Class:</span><span class="office-blank">${studentClassDisplay}</span></div>
                <div class="office-field"><span class="label">Current Dues Balance:</span><span class="office-blank">${currency} ${remainingDues.toLocaleString()}</span></div>
                <div class="office-field"><span class="label">Month Covered:</span><span class="office-blank">${selectedMonth}</span></div>
                <div class="office-field"><span class="label">Received By:</span><span class="office-blank">Accounts Office</span></div>
                <div class="office-field"><span class="label">Staff Signature:</span><span class="office-blank">____________________</span></div>
              </div>
            </div>
          </div>
        </div>
        `;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Batch Student Fee Receipts — ${selectedMonth} — ${academyName}</title>
<style>
@page {
  size: A4 portrait;
  margin: 4mm 6mm;
}
* { box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  color: #0f172a;
  background: #f1f5f9;
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Floating Toolbar for Browser Preview */
.top-action-bar {
  position: sticky;
  top: 0;
  z-index: 9999;
  background: #0f172a;
  color: #fff;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.bar-title {
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar-actions {
  display: flex;
  gap: 12px;
}
.btn {
  border: none;
  background: #2563eb;
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
.btn:hover { background: #1d4ed8; }
.btn-secondary { background: #475569; }
.btn-secondary:hover { background: #334155; }

/* Individual A4 Receipt Page */
.receipt-sheet {
  width: 210mm;
  min-height: 287mm;
  margin: 20px auto;
  background: #fff;
  padding: 16px 20px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #0f172a; padding-bottom: 8px; margin-bottom: 8px; }
.brand { display: flex; gap: 12px; align-items: center; }
.logo { width: 62px; height: 62px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; }
.title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 2px; color: #0f172a; }
.sub { font-size: 10px; color: #475569; margin: 0 0 2px; }
.addr { font-size: 8px; color: #64748b; margin: 0; }
.receipt-info { text-align: right; font-size: 9px; line-height: 1.6; }
.receipt-title { color: #1e3a8a; font-size: 12px; font-weight: 800; letter-spacing: .02em; }
.blank { display: inline-block; min-width: 75px; border-bottom: 1px dotted #64748b; height: 12px; vertical-align: bottom; font-weight: 700; color: #0f172a; text-align: center; }

.student-card { display: flex; gap: 12px; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px; }
.student-photo { width: 60px; height: 60px; flex: none; border: 2px dashed #94a3b8; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 7.5px; color: #94a3b8; text-transform: uppercase; text-align: center; overflow: hidden; background: #fff; }
.student-photo img { width: 100%; height: 100%; object-fit: cover; }
.student-details { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; font-size: 9px; }
.detail-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 2px; }
.label { color: #64748b; }
.value { font-weight: 700; min-width: 70px; text-align: right; color: #0f172a; }

.section-title { font-size: 10.5px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: .03em; margin: 6px 0 4px; }

table { width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 9px; table-layout: fixed; margin-bottom: 6px; }
th { background: #0f172a; color: #fff; padding: 5px 3px; text-align: center; border: 1px solid #334155; font-size: 8px; text-transform: uppercase; letter-spacing: .02em; }
td { padding: 4px 3px; border: 1px solid #cbd5e1; height: 21px; vertical-align: middle; background: #fff; font-size: 8.5px; text-align: center; }
tr:nth-child(even) td { background: #f8fafc; }
.cycle-header td { background: #e2e8f0 !important; font-weight: 800; color: #0f172a; padding: 4px 6px; height: 18px; font-size: 8.5px; text-transform: uppercase; text-align: center; }

.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
.summary-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 9px; background: #fff; }
.summary-head { font-size: 8.5px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 3px; }
.summary-row { display: flex; justify-content: space-between; padding: 2.5px 0; border-bottom: 1px dotted #e2e8f0; }
.summary-row:last-child { border-bottom: 0; }

.signatures { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 6px; align-items: flex-end; }
.sig-box { flex: 1; min-height: 46px; border: 1px solid #94a3b8; border-radius: 6px; position: relative; background: #fff; }
.sig-box .sig-label { position: absolute; bottom: 3px; left: 6px; right: 6px; text-align: center; border-top: 1px solid #475569; padding-top: 2px; font-size: 8px; font-weight: 700; color: #475569; }
.stamp-box { min-height: 52px; }
.stamp-note { position: absolute; top: 3px; left: 0; right: 0; text-align: center; font-size: 6.5px; color: #94a3b8; text-transform: uppercase; }

.tear-off-line {
  margin: 6px 0 4px;
  border-top: 2px dashed #64748b;
  position: relative;
  text-align: center;
}
.tear-off-text {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  padding: 0 8px;
  font-size: 7.5px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 700;
}
.office-slip {
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  padding: 8px 12px;
  background: #f8fafc;
  font-size: 8.5px;
}
.office-slip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  color: #1e3a8a;
  margin-bottom: 4px;
  font-size: 9.5px;
  text-transform: uppercase;
  border-bottom: 1px solid #cbd5e1;
  padding-bottom: 3px;
}
.office-slip-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 16px;
}
.office-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 20px;
}
.office-blank {
  display: inline-block;
  width: 150px;
  border-bottom: 1px dotted #0f172a;
  height: 14px;
  font-weight: 700;
  color: #0f172a;
  text-align: right;
  padding-right: 4px;
}

/* Print Rules */
@media print {
  body { background: transparent; padding: 0; }
  .no-print { display: none !important; }
  .receipt-sheet {
    border: none;
    box-shadow: none;
    margin: 0;
    width: 100%;
    min-height: auto;
    max-height: 288mm;
    box-sizing: border-box;
    padding: 4mm 6mm;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: hidden;
  }
  .page-break {
    page-break-after: always !important;
    break-after: page !important;
  }
  .page-break:last-child {
    page-break-after: avoid !important;
    break-after: avoid !important;
  }
}
</style>
</head>
<body>

<div class="top-action-bar no-print">
  <div class="bar-title">
    <span>🖨️ ${academyName} — Batch Student Fee Receipts (${receiptStudents.length} Students)</span>
  </div>
  <div class="bar-actions">
    <button class="btn" onclick="window.print()">
      🖨️ Print All Receipts (${receiptStudents.length})
    </button>
    <button class="btn btn-secondary" onclick="window.close()">
      ✕ Close Window
    </button>
  </div>
</div>

<div class="receipts-container">
  ${studentReceiptsHtml}
</div>

</body>
</html>`;
  };

  /**
   * Action: Print All Receipts in Batch
   */
  const handlePrintAll = () => {
    if (filteredStudents.length === 0) return;
    setIsProcessing(true);

    const fullHtml = buildAllReceiptsHtml(filteredStudents);
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.focus();

      // Trigger native print after slight delay for asset and font rendering
      setTimeout(() => {
        printWindow.print();
        setIsProcessing(false);
      }, 500);
    } else {
      // Fallback: create hidden iframe if popup was blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(fullHtml);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
          setIsProcessing(false);
        }, 500);
      }
    }
  };

  /**
   * Action: Download All Receipts as Single Self-Contained HTML File
   */
  const handleDownloadAllHtml = () => {
    if (filteredStudents.length === 0) return;

    const fullHtml = buildAllReceiptsHtml(filteredStudents);
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const safeMonth = selectedMonth.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${academyName.replace(/\s+/g, '_')}_All_Student_Fee_Receipts_${safeMonth}.html`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Action: Download CSV Registry of all receipts
   */
  const handleExportCsv = () => {
    if (filteredStudents.length === 0) return;

    const headers = [
      'Receipt No',
      'Student ID',
      'Student Name',
      'Father / Guardian',
      'Class',
      'Contact',
      'Billing Month',
      'Monthly Fee',
      'Discount',
      'Admission Fee',
      'Paid to Date',
      'Remaining Dues',
      'Status',
    ];

    const rows = filteredStudents.map((s) => {
      const receiptNo = generateReceiptNumber(s.id);
      const activeCls = getActiveStudentClassDisplay(s.className, classes);
      const netMonthly = Math.max(0, (s.monthlyFee || 0) - (s.monthlyDiscount || 0));
      const dues = s.dues || 0;
      const status = dues === 0 ? 'Paid / Cleared' : dues > 0 && s.totalPaid > 0 ? 'Partial' : 'Unpaid';

      return [
        receiptNo,
        s.id,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.fatherName || s.guardianName || '').replace(/"/g, '""')}"`,
        `"${(activeCls || '').replace(/"/g, '""')}"`,
        s.guardianNumber || s.studentNumber || '',
        selectedMonth,
        netMonthly,
        s.monthlyDiscount || 0,
        s.admissionFee || 0,
        s.totalPaid || 0,
        dues,
        status,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Batch_Fee_Receipts_Registry_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Batch Print / Download Fee Receipts
              </h3>
              <p className="text-xs text-slate-500">
                Generate official A4 fee receipts for all students at once
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Options */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Group Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" /> Which Students to Include?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetFilter('all')}
                className={`p-3 text-left rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                  targetFilter === 'all'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="font-bold">All Students</span>
                <span className="text-[11px] text-slate-500 mt-1">{students.length} total records</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetFilter('enrolled')}
                className={`p-3 text-left rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                  targetFilter === 'enrolled'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="font-bold">Enrolled in Class</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {students.filter((s) => s.className && s.className.trim() !== '').length} active students
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTargetFilter('dues')}
                className={`p-3 text-left rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                  targetFilter === 'dues'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="font-bold">With Pending Dues</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {students.filter((s) => (s.dues || 0) > 0).length} students with dues
                </span>
              </button>
            </div>
          </div>

          {/* Billing Period & Class Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Receipt Billing Period
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:border-blue-600"
              >
                {sessionMonths.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === currentMonthStr ? '(Current Month)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" /> Specific Class Filter
              </label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-600"
              >
                <option value="all">-- All Classes (No Class Filter) --</option>
                {uniqueClassNames.map((clsName, idx) => (
                  <option key={idx} value={clsName}>
                    {clsName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Preview Info Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                {filteredStudents.length}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {filteredStudents.length} Student Receipts Ready
                </span>
                <span className="text-[11px] text-slate-500">
                  Each student receipt formatted on its own A4 sheet with tear-off slip
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
              {selectedMonth}
            </span>
          </div>

          {/* Quick List Preview */}
          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            {filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                No students match the current filter selection.
              </div>
            ) : (
              filteredStudents.map((st) => (
                <div key={st.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">{st.id}</span>
                    <span className="text-slate-900 font-semibold">{st.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({getActiveStudentClassDisplay(st.className, classes) || 'No Class'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">
                      Fee: {currency} {Math.max(0, (st.monthlyFee || 0) - (st.monthlyDiscount || 0)).toLocaleString()}
                    </span>
                    <span
                      className={`font-bold text-[11px] ${
                        (st.dues || 0) > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      Dues: {currency} {(st.dues || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredStudents.length === 0}
            className="h-10 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Export CSV registry of all selected receipts"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Registry (.csv)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAllHtml}
              disabled={filteredStudents.length === 0}
              className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
              title="Download standalone HTML document with all receipts embedded"
            >
              <Download className="w-4 h-4 text-slate-300" /> Download All Receipts (.html)
            </button>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={filteredStudents.length === 0 || isProcessing}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              {isProcessing ? 'Preparing Print...' : `Print All Receipts (${filteredStudents.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
