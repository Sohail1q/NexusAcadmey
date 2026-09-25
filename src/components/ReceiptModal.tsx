import React, { useState, useEffect } from 'react';
import { Printer, X, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { ReceiptData, NexusSettings, NexusStudent } from '../types';
import { generateReceiptNumber, generateStudentFeeCycle } from '../utils/receiptUtils';
import { splitClassSegments } from '../utils/classUtils';
import { getPeshawarComponents } from '../utils/peshawarTime';

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  student?: NexusStudent | null;
  settings: NexusSettings;
  currency?: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  student,
  settings,
  currency = 'PKR',
  onClose,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [embeddedLogo, setEmbeddedLogo] = useState<string>(settings?.logo || '/nexus-logo.png');

  if (!receipt) return null;

  // Current Peshawar time for reliable session and receipt timestamping
  const peshawarNow = getPeshawarComponents();

  // Format receipt number to ensure two letters and 5 digits (e.g. NA10492)
  const formattedReceiptNo = receipt.receiptNo && /^NA\d{5}$/.test(receipt.receiptNo)
    ? receipt.receiptNo
    : generateReceiptNumber(receipt.studentId || receipt.receiptNo);

  // Prioritize current student record so that any edited fee or balance is immediately reflected
  const currentStudent = student;
  const rawMonthly = currentStudent?.monthlyFee !== undefined ? currentStudent.monthlyFee : (receipt.monthlyFee || 0);
  const rawAdmission = currentStudent?.admissionFee !== undefined ? currentStudent.admissionFee : (receipt.admissionFee || 0);
  const monthlyDiscount = currentStudent?.monthlyDiscount !== undefined ? currentStudent.monthlyDiscount : (receipt.monthlyDiscount || 0);
  const admissionDiscount = currentStudent?.admissionDiscount !== undefined ? currentStudent.admissionDiscount : (receipt.admissionDiscount || 0);

  const netMonthlyFee = Math.max(0, rawMonthly - monthlyDiscount);
  const netAdmissionFee = Math.max(0, rawAdmission - admissionDiscount);

  // Class assignment: dual class support in demanded format:
  // (name of teacher / class category / timing) + (name of teacher / category / timing)
  const currentClassStr = currentStudent?.className || receipt.className || 'General Tuition';
  const isDualClass = currentClassStr.includes(' + ');
  const classSegments = splitClassSegments(currentClassStr);

  // Generate fee cycle with user specification:
  // - Starts after September (Sep-Dec session)
  // - In January all past month dues are added to Previous Dues, and January cycle starts at the top
  const feeCycle = generateStudentFeeCycle(student, null, peshawarNow.year, receipt);
  const academicYearStr = receipt.academicYear || feeCycle.academicYearStr;
  const ledgerRows = feeCycle.rows.map((r) => ({
    monthYear: r.displayMonthYear,
    className: r.className || currentClassStr || 'General',
    demanded: r.demanded,
    paid: r.paid,
    dues: r.dues,
    date: r.date,
    status: r.status,
  }));

  // Financial totals: prioritize latest student numbers so edits immediately apply
  const totalPaid = currentStudent?.totalPaid !== undefined ? currentStudent.totalPaid : (receipt.paidAmount || 0);
  const remainingDues = currentStudent?.dues !== undefined
    ? currentStudent.dues
    : (receipt.remainingDues !== undefined ? receipt.remainingDues : Math.max(0, netMonthlyFee + netAdmissionFee - totalPaid));

  // Previous dues roll-over from prior cycles/months
  const effectivePrevDues = Math.max(receipt.prevDues || 0, feeCycle.previousYearDues || 0);
  const totalDemanded = totalPaid + remainingDues > 0
    ? (totalPaid + remainingDues)
    : (netMonthlyFee + netAdmissionFee + effectivePrevDues);

  const academyName = settings.name || 'Nexus Academy';
  const academySub = settings.subtitle || 'English Language & Computer Education';
  const academyAddr = settings.address || 'Gulabad Chowk, Dalazak Road, Peshawar, Pakistan';

  // Embed logo as base64 Data URL so offline/downloaded/printed receipts ALWAYS display the logo perfectly
  useEffect(() => {
    const rawLogo = settings?.logo?.trim() || '/nexus-logo.png';
    if (rawLogo.startsWith('data:')) {
      setEmbeddedLogo(rawLogo);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 160;
        canvas.height = img.naturalHeight || 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setEmbeddedLogo(dataUrl);
        }
      } catch {
        setEmbeddedLogo(rawLogo);
      }
    };
    img.onerror = () => {
      setEmbeddedLogo(rawLogo);
    };
    img.src = rawLogo;
  }, [settings?.logo]);

  // Clean, self-contained, standalone printable HTML document engineered specifically to cover the FULL A4 PAGE
  const fullHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${academyName} — Fee Receipt ${formattedReceiptNo}</title>
<style>
@page {
  size: A4 portrait;
  margin: 4mm 6mm;
}
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.a4-page {
  background: #ffffff;
  width: 100%;
  max-width: 200mm;
  min-height: 284mm;
  max-height: 288mm;
  height: 285mm;
  margin: 10px auto;
  padding: 14px 18px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2.5px solid #0f172a;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}
.logo {
  width: 52px;
  height: 52px;
  object-fit: contain;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 2px;
  background: #ffffff;
}
.title-group h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: -0.3px;
  line-height: 1.15;
}
.title-group p {
  margin: 2px 0 0;
  font-size: 10px;
  color: #475569;
  font-weight: 500;
}
.receipt-meta {
  text-align: right;
  font-size: 9.5px;
  line-height: 1.45;
  background: #f8fafc;
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
}
.receipt-title {
  color: #1e3a8a;
  font-weight: 900;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.meta-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 800;
  color: #0f172a;
  padding: 0 2px;
}

.student-card {
  display: flex;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
}
.photo-box {
  width: 54px;
  height: 54px;
  border: 1.5px dashed #94a3b8;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  overflow: hidden;
  flex-shrink: 0;
}
.photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.student-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
  font-size: 9.5px;
}
.field {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed #e2e8f0;
  padding-bottom: 2px;
}
.field-full {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed #cbd5e1;
  background: #eff6ff;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 1px;
}
.label {
  color: #64748b;
  font-weight: 500;
}
.val {
  font-weight: 700;
  color: #0f172a;
}
.val-highlight {
  font-weight: 800;
  color: #1e3a8a;
}

.section-title {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  color: #1e293b;
  margin: 0 0 5px;
  letter-spacing: 0.4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

table.ledger {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
  font-size: 9px;
}
table.ledger th {
  background: #0f172a;
  color: #ffffff;
  text-align: center;
  padding: 4px 6px;
  font-size: 8.5px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border: 1px solid #334155;
}
table.ledger td {
  padding: 3.5px 6px;
  border: 1px solid #cbd5e1;
  text-align: center;
  line-height: 1.3;
}
table.ledger tr.session-row td {
  background: #f1f5f9;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 8.5px;
  padding: 3px;
  color: #334155;
  border-bottom: 1.5px solid #94a3b8;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 10px;
  margin-bottom: 8px;
}
.summary-card {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  font-size: 9.5px;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  padding: 2.5px 0;
  border-bottom: 1px solid #e2e8f0;
}
.sum-total {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 10.5px;
  font-weight: 800;
  border-top: 1.5px solid #0f172a;
  margin-top: 4px;
}
.dues-tag {
  color: #dc2626;
  font-weight: 800;
}
.paid-tag {
  color: #059669;
  font-weight: 800;
}

.counterfoil {
  border-top: 2px dashed #94a3b8;
  padding-top: 6px;
  margin-top: 6px;
}
.counterfoil-title {
  text-align: center;
  font-size: 8.5px;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.counterfoil-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 9px;
}

.signatures {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 16px;
}
.sig-line {
  width: 140px;
  border-top: 1.2px solid #0f172a;
  text-align: center;
  font-size: 8.5px;
  font-weight: 700;
  color: #475569;
  padding-top: 3px;
}
.footer-note {
  text-align: center;
  font-size: 8px;
  color: #94a3b8;
  margin-top: 5px;
}

@media print {
  html, body {
    width: 210mm !important;
    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    overflow: hidden !important;
  }
  .a4-page {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    min-height: 284mm !important;
    max-height: 288mm !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 4mm 6mm !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    overflow: hidden !important;
  }
  .no-print {
    display: none !important;
  }
}
</style>
</head>
<body>
<div class="a4-page">
  <div>
    <!-- Header -->
    <div class="header">
      <div class="brand">
        <img class="logo" src="${embeddedLogo}" alt="${academyName}">
        <div class="title-group">
          <h1>${academyName}</h1>
          <p>${academySub}</p>
          <p style="font-size: 8.5px; color: #64748b; margin-top: 1px;">${academyAddr}</p>
        </div>
      </div>
      <div class="receipt-meta">
        <div class="receipt-title">Official Fee Record Receipt</div>
        <div>Receipt No: <span class="meta-value">${formattedReceiptNo}</span></div>
        <div>Issue Date: <span class="meta-value">${receipt.date}</span></div>
        <div>Academic Session: <span class="meta-value">${academicYearStr}</span></div>
      </div>
    </div>

    <!-- Student Information Card -->
    <div class="student-card">
      <div class="photo-box">
        ${receipt.photo ? `<img src="${receipt.photo}" alt="Student">` : `<span style="font-size: 8px; color: #94a3b8; text-transform: uppercase; text-align: center;">Photo</span>`}
      </div>
      <div class="student-grid">
        <div class="field">
          <span class="label">Student ID:</span>
          <span class="val">${receipt.studentId}</span>
        </div>
        <div class="field">
          <span class="label">Student Name:</span>
          <span class="val">${receipt.studentName}</span>
        </div>
        <div class="field">
          <span class="label">Father / Guardian:</span>
          <span class="val">${receipt.fatherName}</span>
        </div>
        <div class="field">
          <span class="label">Admission Date:</span>
          <span class="val">${receipt.admissionDate || '-'}</span>
        </div>
        <div class="field">
          <span class="label">Student Contact:</span>
          <span class="val">${receipt.studentNumber || '-'}</span>
        </div>
        <div class="field">
          <span class="label">Guardian Contact:</span>
          <span class="val">${receipt.guardianNumber || '-'}</span>
        </div>
        <!-- Enrolled Classes: Multi-Class Display in Demanded Format -->
        <div class="field-full">
          <span class="label">Current Enrolled Class(es):</span>
          <span class="val-highlight">${currentClassStr}</span>
        </div>
      </div>
    </div>

    <!-- Monthly Fee Ledger: Cycle starting after September / or Jan-Aug -->
    <div class="section-title">
      <span>Academic Fee Ledger (${academicYearStr})</span>
      <span style="font-size: 8px; color: #64748b; font-weight: normal;">Peshawar Standard Time Sync</span>
    </div>
    <table class="ledger">
      <thead>
        <tr>
          <th style="text-align: left; padding-left: 8px;">Month / Year</th>
          <th>Enrolled Class Details</th>
          <th>Monthly Demanded</th>
          <th>Paid This Month</th>
          <th>Remaining Dues</th>
          <th>Status / Date</th>
        </tr>
      </thead>
      <tbody>
        <tr class="session-row">
          <td colspan="6">Official Academic Cycle (${academicYearStr})</td>
        </tr>
        ${ledgerRows
          .map(
            (r, i) => `
          <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="text-align: left; padding-left: 8px; font-weight: 700;">${r.monthYear}</td>
            <td style="font-size: 8.5px; color: #334155;">${r.className}</td>
            <td style="font-weight: 600;">${r.demanded > 0 ? `${currency} ${r.demanded.toLocaleString()}` : '-'}</td>
            <td style="font-weight: 700; color: #059669;">${r.paid > 0 ? `${currency} ${r.paid.toLocaleString()}` : '-'}</td>
            <td style="font-weight: 700; color: ${r.dues > 0 ? '#dc2626' : '#059669'};">${r.dues > 0 ? `${currency} ${r.dues.toLocaleString()}` : 'Cleared'}</td>
            <td style="font-size: 8.5px; color: #64748b;">${r.date}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <!-- Financial Breakdown: All dues summed together -->
    <div class="summary-grid">
      <div class="summary-card">
        <div style="font-weight: 800; font-size: 10px; margin-bottom: 4px; color: #1e3a8a;">
          Enrolled Class Dues Breakdown ${isDualClass ? '(2 Classes Combined)' : ''}
        </div>
        <div class="sum-row">
          <span class="label">Monthly Tuition Fee ${isDualClass ? '(Sum of 2 Classes)' : ''}:</span>
          <span class="val">${currency} ${netMonthlyFee.toLocaleString()}</span>
        </div>
        ${monthlyDiscount > 0 ? `<div class="sum-row"><span class="label">Monthly Fee Discount:</span><span class="val" style="color: #059669;">- ${currency} ${monthlyDiscount.toLocaleString()}</span></div>` : ''}
        <div class="sum-row">
          <span class="label">Admission / Registration Fee:</span>
          <span class="val">${currency} ${netAdmissionFee.toLocaleString()}</span>
        </div>
        ${effectivePrevDues > 0 ? `<div class="sum-row"><span class="label">Previous Dues / Brought Forward:</span><span class="val dues-tag">${currency} ${effectivePrevDues.toLocaleString()}</span></div>` : ''}
        <div class="sum-total">
          <span>TOTAL DEMANDED DUES:</span>
          <span style="color: #1e3a8a;">${currency} ${totalDemanded.toLocaleString()}</span>
        </div>
      </div>

      <div class="summary-card">
        <div style="font-weight: 800; font-size: 10px; margin-bottom: 4px; color: #0f172a;">
          Account Payment & Clearance
        </div>
        <div class="sum-row">
          <span class="label">Total Fee Paid to Date:</span>
          <span class="val paid-tag">${currency} ${totalPaid.toLocaleString()}</span>
        </div>
        <div class="sum-row">
          <span class="label">Current Payment Status:</span>
          <span class="val" style="font-weight: 800; color: ${remainingDues === 0 ? '#059669' : '#dc2626'};">
            ${remainingDues === 0 ? 'Fully Cleared / Paid' : 'Outstanding Balance'}
          </span>
        </div>
        <div class="sum-total">
          <span>NET REMAINING DUES:</span>
          <span class="${remainingDues > 0 ? 'dues-tag' : 'paid-tag'}">
            ${currency} ${remainingDues.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  </div>

  <div>
    <!-- Office Counterfoil Tear-Off Slip -->
    <div class="counterfoil">
      <div class="counterfoil-title">--- [ Academic Office Record Counterfoil ] ---</div>
      <div class="counterfoil-grid">
        <div><strong>Receipt:</strong> ${formattedReceiptNo}</div>
        <div><strong>Student:</strong> ${receipt.studentName} (${receipt.studentId})</div>
        <div><strong>Paid:</strong> ${currency} ${totalPaid.toLocaleString()}</div>
        <div class="dues-tag"><strong>Dues:</strong> ${currency} ${remainingDues.toLocaleString()}</div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-line">Accounts Officer Signature</div>
      <div class="sig-line">Director / Authorized Stamp</div>
    </div>

    <div class="footer-note">
      This is an official computer-generated receipt from ${academyName}. All fee records are synchronized with the central academic directory.
    </div>
  </div>
</div>
</body>
</html>`;

  // Direct clean printing with bulletproof fallback
  const handlePrint = () => {
    try {
      const existing = document.getElementById('receipt-print-iframe');
      if (existing) existing.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.className = 'print-container';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1000px';
      iframe.style.height = '1400px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01'; // Not 0 or hidden so browsers render it
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(fullHtmlContent);
        frameDoc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              try {
                iframe.remove();
              } catch {}
            }, 2000);
          }
        }, 350);
        return;
      }
    } catch {
      window.print();
    }
  };

  // Open standalone HTML in new tab or popup for 100% guarantee in any restricted browser
  const handleOpenPrintWindow = () => {
    try {
      const blob = new Blob([fullHtmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, '_blank');
      if (printWin) {
        printWin.focus();
      } else {
        // If popup blocker intervened, trigger direct print
        handlePrint();
      }
    } catch {
      handlePrint();
    }
  };

  // Clean offline document download
  const handleDownload = () => {
    const blob = new Blob([fullHtmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Official_Receipt_${formattedReceiptNo}_${receipt.studentId}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleCopyText = () => {
    const textSummary = `
========================================
${academyName.toUpperCase()} — FEE RECEIPT
========================================
Receipt No: ${formattedReceiptNo}
Date: ${receipt.date}
Student ID: ${receipt.studentId}
Student Name: ${receipt.studentName}
Father Name: ${receipt.fatherName}
Class: ${currentClassStr}
Session: ${academicYearStr}
----------------------------------------
Monthly Fee: ${currency} ${netMonthlyFee.toLocaleString()} (Discount: ${currency} ${monthlyDiscount})
Admission Fee: ${currency} ${netAdmissionFee.toLocaleString()} (Discount: ${currency} ${admissionDiscount})
Previous Dues: ${currency} ${effectivePrevDues.toLocaleString()}
----------------------------------------
TOTAL DEMANDED: ${currency} ${totalDemanded.toLocaleString()}
TOTAL PAID: ${currency} ${totalPaid.toLocaleString()}
REMAINING DUES: ${currency} ${remainingDues.toLocaleString()}
========================================
`;
    navigator.clipboard.writeText(textSummary.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Container sizing: covers full A4 visual canvas without empty gaps */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 flex flex-col my-auto max-h-[96vh] overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 gap-2 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <span className="text-sm font-bold tracking-tight">Official Fee Record Receipt</span>
              <span className="ml-2 px-2 py-0.5 bg-blue-900/60 border border-blue-700/50 rounded text-xs font-mono font-bold text-blue-200">
                {formattedReceiptNo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95"
              title="Print receipt or save as PDF (Covers 1 A4 Page Full Area)"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={handleOpenPrintWindow}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg cursor-pointer transition"
              title="Open standalone printable sheet in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition active:scale-95"
              title="Download standalone offline HTML receipt"
            >
              {downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {downloaded ? 'Saved!' : 'Save'}
            </button>
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition"
              title="Copy text summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition ml-1"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body rendering the exact A4 full-page layout */}
        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printableReceipt"
            className="w-full max-w-[200mm] min-h-[282mm] bg-white p-5 sm:p-7 rounded-lg shadow-md border border-slate-200 text-slate-900 text-[10px] flex flex-col justify-between print:min-h-[282mm] print:p-4 print:border-none print:shadow-none"
          >
            <div>
              {/* Header with Academy Logo from Settings */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2.5 mb-3">
                <div className="flex gap-3 items-center">
                  <img
                    src={embeddedLogo || settings.logo || '/nexus-logo.png'}
                    alt={academyName}
                    className="w-14 h-14 object-contain rounded-md border border-slate-200 bg-white p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/nexus-logo.png';
                    }}
                  />
                  <div>
                    <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight m-0 leading-tight">
                      {academyName}
                    </h1>
                    <p className="text-[11px] text-slate-600 m-0 font-medium">{academySub}</p>
                    <p className="text-[9px] text-slate-500 m-0">{academyAddr}</p>
                  </div>
                </div>
                <div className="text-right text-[10px] leading-tight bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="text-blue-900 font-extrabold text-[11.5px] tracking-wide uppercase">
                    Official Fee Receipt
                  </div>
                  <div>
                    Receipt No:{' '}
                    <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-400 px-1 inline-block min-w-[70px]">
                      {formattedReceiptNo}
                    </span>
                  </div>
                  <div>
                    Issue Date:{' '}
                    <span className="font-medium text-slate-900 border-b border-dotted border-slate-400 px-1 inline-block min-w-[70px]">
                      {receipt.date}
                    </span>
                  </div>
                  <div>
                    Session Period:{' '}
                    <span className="font-medium text-slate-900 border-b border-dotted border-slate-400 px-1 inline-block min-w-[70px]">
                      {academicYearStr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Card with Demanded Order Class Display */}
              <div className="flex gap-3.5 items-center p-3 bg-slate-50 border border-slate-300 rounded-md mb-3">
                <div className="w-14 h-14 shrink-0 border border-dashed border-slate-400 rounded flex items-center justify-center text-[8.5px] text-slate-400 uppercase text-center overflow-hidden bg-white">
                  {receipt.photo ? (
                    <img src={receipt.photo} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <span>Photo</span>
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                    <span className="text-slate-500">Student ID:</span>
                    <span className="font-bold text-slate-900">{receipt.studentId}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                    <span className="text-slate-500">Student Name:</span>
                    <span className="font-bold text-slate-900">{receipt.studentName}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                    <span className="text-slate-500">Father / Guardian:</span>
                    <span className="font-bold text-slate-900">{receipt.fatherName}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                    <span className="text-slate-500">Admission Date:</span>
                    <span className="font-bold text-slate-900">{receipt.admissionDate || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                    <span className="text-slate-500">Student Contact:</span>
                    <span className="font-bold text-slate-900">{receipt.studentNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                    <span className="text-slate-500">Guardian Contact:</span>
                    <span className="font-bold text-slate-900">{receipt.guardianNumber || '-'}</span>
                  </div>
                  {/* Current Class in demanded format: (teacher/cat/time) + (teacher/cat/time) */}
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-dashed border-slate-300 pb-1 pt-1 bg-blue-50/70 px-2 rounded">
                    <span className="text-blue-900 font-semibold text-[9.5px]">Current Enrolled Class(es):</span>
                    <span className="font-bold text-blue-950 text-[10px] break-words">{currentClassStr}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Fee Ledger: Starts after September, rolls dues in January */}
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Monthly Fee Ledger ({academicYearStr})</span>
                {isDualClass && (
                  <span className="text-[9px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Dual Enrolled ({classSegments.length} Classes)
                  </span>
                )}
              </div>
              <div className="overflow-x-auto mb-3">
                <table className="w-full border-collapse border border-slate-400 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="py-1.5 px-2 border border-slate-700 text-left uppercase text-[9px]">Month / Year</th>
                      <th className="py-1.5 px-2 border border-slate-700 text-center uppercase text-[9px]">Enrolled Class</th>
                      <th className="py-1.5 px-2 border border-slate-700 text-center uppercase text-[9px]">Monthly Demanded</th>
                      <th className="py-1.5 px-2 border border-slate-700 text-center uppercase text-[9px]">Paid This Month</th>
                      <th className="py-1.5 px-2 border border-slate-700 text-center uppercase text-[9px]">Remaining Dues</th>
                      <th className="py-1.5 px-2 border border-slate-700 text-center uppercase text-[9px]">Status / Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-100 font-extrabold text-slate-800 text-[9px]">
                      <td colSpan={6} className="py-1 px-2 text-center uppercase tracking-wide border border-slate-300">
                        Official Academic Cycle ({academicYearStr})
                      </td>
                    </tr>
                    {ledgerRows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                        <td className="py-1 px-2 border border-slate-300 font-bold text-slate-900">{r.monthYear}</td>
                        <td className="py-1 px-2 border border-slate-300 text-center text-slate-700 text-[9px] max-w-[200px] truncate" title={r.className}>
                          {r.className}
                        </td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-medium">
                          {r.demanded > 0 ? `${currency} ${r.demanded.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-1 px-2 border border-slate-300 text-center font-bold text-emerald-700">
                          {r.paid > 0 ? `${currency} ${r.paid.toLocaleString()}` : '-'}
                        </td>
                        <td
                          className={`py-1 px-2 border border-slate-300 text-center font-bold ${
                            r.dues > 0 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {r.dues > 0 ? `${currency} ${r.dues.toLocaleString()}` : 'Cleared'}
                        </td>
                        <td className="py-1 px-2 border border-slate-300 text-center text-slate-500 text-[9px]">
                          {r.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Dues & Fees Summary Grid: All Dues Summed Together */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="border border-slate-300 rounded-md p-2.5 bg-slate-50/60 text-[10px]">
                  <div className="font-extrabold text-blue-900 text-[10.5px] mb-1.5 pb-0.5 border-b border-slate-200 flex items-center justify-between">
                    <span>Enrolled Fee Breakdown</span>
                    {isDualClass && <span className="text-[9px] text-blue-600 font-semibold">2 Classes Summed</span>}
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                    <span className="text-slate-600">Monthly Tuition Fee:</span>
                    <span className="font-bold text-slate-900">{currency} {netMonthlyFee.toLocaleString()}</span>
                  </div>
                  {monthlyDiscount > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-200 text-emerald-700">
                      <span>Monthly Fee Discount:</span>
                      <span className="font-bold">- {currency} {monthlyDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                    <span className="text-slate-600">Admission / Registration Fee:</span>
                    <span className="font-bold text-slate-900">{currency} {netAdmissionFee.toLocaleString()}</span>
                  </div>
                  {effectivePrevDues > 0 && (
                    <div className="flex justify-between py-1 border-b border-dashed border-slate-200 text-red-600">
                      <span>Previous Dues / Brought Forward:</span>
                      <span className="font-bold">{currency} {effectivePrevDues.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1.5 mt-1 border-t-2 border-slate-900 font-extrabold text-[11px] text-blue-950">
                    <span>TOTAL DEMANDED DUES:</span>
                    <span>{currency} {totalDemanded.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-md p-2.5 bg-slate-50/60 text-[10px]">
                  <div className="font-extrabold text-slate-900 text-[10.5px] mb-1.5 pb-0.5 border-b border-slate-200">
                    Account Status &amp; Clearance
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                    <span className="text-slate-600">Total Fee Paid to Date:</span>
                    <span className="font-bold text-emerald-700">{currency} {totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                    <span className="text-slate-600">Payment Status:</span>
                    <span
                      className={`font-bold ${
                        remainingDues === 0 ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {remainingDues === 0 ? 'All Dues Fully Paid' : 'Outstanding Balance Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 mt-1 border-t-2 border-slate-900 font-extrabold text-[11px]">
                    <span>NET REMAINING DUES:</span>
                    <span className={remainingDues > 0 ? 'text-red-600' : 'text-emerald-700'}>
                      {currency} {remainingDues.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {/* Counterfoil */}
              <div className="border-t-2 border-dashed border-slate-400 pt-2 mt-1">
                <div className="text-center text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">
                  --- [ Official Academic Office Record Counterfoil ] ---
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded border border-slate-200 text-[9.5px]">
                  <div><strong>Receipt:</strong> {formattedReceiptNo}</div>
                  <div><strong>Student:</strong> {receipt.studentName} ({receipt.studentId})</div>
                  <div><strong>Paid:</strong> {currency} {totalPaid.toLocaleString()}</div>
                  <div className="font-bold text-red-600">
                    <strong>Dues:</strong> {currency} {remainingDues.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end mt-4 pt-1 px-6">
                <div className="text-center">
                  <div className="w-32 border-b border-slate-900 mb-1"></div>
                  <span className="text-[8.5px] text-slate-600 uppercase font-semibold">Accounts Officer</span>
                </div>
                <div className="text-center">
                  <div className="w-32 border-b border-slate-900 mb-1"></div>
                  <span className="text-[8.5px] text-slate-600 uppercase font-semibold">Director Stamp</span>
                </div>
              </div>

              <div className="text-[8px] text-slate-400 text-center mt-2">
                Official computer-generated receipt from {academyName}. Covers standard A4 sheet without multi-page overflow.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
