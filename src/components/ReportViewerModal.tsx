import React, { useState } from 'react';
import {
  X,
  Printer,
  ExternalLink,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle,
} from 'lucide-react';
import { exportToExcelXls, exportToCsv, exportToHtmlReport } from '../services/cloudSync';

export interface ReportColumn {
  header: string;
  width?: number;
}

export interface ReportCell {
  text: string;
  isStatus?: boolean;
  isDate?: boolean;
  isLink?: boolean;
  linkUrl?: string;
}

interface ReportViewerModalProps {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
  onClose: () => void;
  filenameBase?: string;
}

export const ReportViewerModal: React.FC<ReportViewerModalProps> = ({
  title,
  subtitle,
  columns,
  rows,
  onClose,
  filenameBase = 'Nexus_Report',
}) => {
  const [filterText, setFilterText] = useState('');
  const [printed, setPrinted] = useState(false);

  // Filter rows locally if user types in search bar
  const displayedRows = filterText.trim()
    ? rows.filter((row) =>
        row.some((cell) =>
          (cell.text || '').toLowerCase().includes(filterText.trim().toLowerCase())
        )
      )
    : rows;

  // Build the complete standalone HTML string for printing or new tab
  const getFullHtml = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .report-card { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #f8fafc;
    }
    .report-card {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    h1 { font-size: 20px; margin: 0 0 6px 0; color: #1e3a8a; }
    .subtitle { font-size: 13px; color: #64748b; margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 12px;
      font-weight: 600;
      border: 1px solid #1e293b;
      white-space: nowrap;
    }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    .status-present, .status-cleared { background: #dcfce7 !important; color: #15803d; font-weight: bold; text-align: center; }
    .status-absent, .status-pending { background: #fee2e2 !important; color: #b91c1c; font-weight: bold; text-align: center; }
    .status-leave, .status-not-assigned { background: #fef3c7 !important; color: #b45309; font-weight: bold; text-align: center; }
    .photo-link { color: #2563eb; text-decoration: underline; font-weight: 500; }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header-bar">
      <div>
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
      </div>
      <div style="font-size: 11px; color: #64748b; text-align: right;">
        Generated: ${new Date().toLocaleString()}
      </div>
    </div>
    <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            ${columns.map((c) => `<th>${c.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              ${row
                .map((cell) => {
                  let cellClass = '';
                  const val = (cell.text || '').toLowerCase();
                  if (cell.isStatus) {
                    if (val.includes('present') || val.includes('cleared')) cellClass = 'class="status-present"';
                    else if (val.includes('absent') || val.includes('pending')) cellClass = 'class="status-absent"';
                    else if (val.includes('leave') || val.includes('not assigned')) cellClass = 'class="status-leave"';
                  }
                  if (cell.isLink && cell.linkUrl) {
                    return `<td ${cellClass}><a class="photo-link" href="${cell.linkUrl}" target="_blank">${cell.text}</a></td>`;
                  }
                  return `<td ${cellClass}>${cell.text || ''}</td>`;
                })
                .join('')}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
  };

  // Direct Invisible Iframe Print: triggers system print dialog for A4 landscape report without popup blocking
  const handlePrint = () => {
    const htmlContent = getFullHtml();
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
          setPrinted(true);
          setTimeout(() => setPrinted(false), 3000);
        } catch (err) {
          console.warn('Iframe print error, falling back to window.print():', err);
          window.print();
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(printFrame);
            } catch {}
          }, 2000);
        }
      }, 400);
    }
  };

  // Open the rendered HTML report directly in a new browser tab
  const handleOpenNewTab = () => {
    const htmlContent = getFullHtml();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // Download HTML file
  const handleDownloadHtml = () => {
    exportToHtmlReport({
      title,
      subtitle,
      columns,
      rows,
      filename: `${filenameBase}_${Date.now()}.html`,
    });
  };

  // Download Excel (.xls)
  const handleDownloadExcel = () => {
    exportToExcelXls({
      sheetName: 'Report',
      title,
      subtitle,
      columns: columns.map((c) => ({ header: c.header, width: c.width || 120 })),
      rows,
      filename: `${filenameBase}_${Date.now()}.xls`,
    });
  };

  // Download CSV
  const handleDownloadCsv = () => {
    exportToCsv({
      title,
      columns,
      rows,
      filename: `${filenameBase}_${Date.now()}.csv`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header with Title & Action Controls */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-base sm:text-lg text-white">{title}</h3>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Print / Save as PDF button */}
            <button
              type="button"
              onClick={handlePrint}
              className="h-9 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow transition cursor-pointer"
              title="Print document or select 'Save as PDF' in the destination dropdown"
            >
              <Printer className="w-4 h-4" />
              <span>{printed ? 'Printed!' : 'Print / Save as PDF'}</span>
            </button>

            {/* Open in New Tab */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Open the complete report in a clean full-page browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Tab</span>
            </button>

            {/* Download HTML */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Save a standalone HTML file to your PC"
            >
              <Download className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>

            {/* Download Excel */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="h-9 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Download formatted Excel spreadsheet (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 rounded-lg flex items-center justify-center transition cursor-pointer border border-slate-700 ml-1"
              title="Close report viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-bar: Search & Record Counter */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search in this report..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-md outline-none focus:border-blue-600"
            />
          </div>

          <div className="text-xs text-slate-600 font-medium">
            Showing <strong className="text-slate-900">{displayedRows.length}</strong> of{' '}
            <strong>{rows.length}</strong> records
          </div>
        </div>

        {/* Report Table Area */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-900 text-white uppercase text-[11px] tracking-wider font-semibold sticky top-0 z-10">
                <tr>
                  {columns.map((c, i) => (
                    <th key={i} className="py-2.5 px-3 border-r border-slate-800 last:border-r-0 whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-8 text-center text-slate-400 font-medium">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 transition">
                      {row.map((cell, cIdx) => {
                        const val = (cell.text || '').toLowerCase();
                        let badgeClass = '';
                        if (cell.isStatus) {
                          if (val.includes('present') || val.includes('cleared')) {
                            badgeClass = 'bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]';
                          } else if (val.includes('absent') || val.includes('pending')) {
                            badgeClass = 'bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[11px]';
                          } else if (val.includes('leave') || val.includes('not assigned')) {
                            badgeClass = 'bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px]';
                          }
                        }

                        return (
                          <td
                            key={cIdx}
                            className="py-2.5 px-3 border-r border-slate-100 last:border-r-0 text-slate-700"
                          >
                            {cell.isLink && cell.linkUrl ? (
                              <a
                                href={cell.linkUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                {cell.text}
                              </a>
                            ) : cell.isStatus && badgeClass ? (
                              <span className={badgeClass}>{cell.text}</span>
                            ) : (
                              <span>{cell.text}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Bottom Guidance Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              💡 <strong>Print Tip:</strong> Click <strong>Print / Save as PDF</strong> and choose <em>"Save as PDF"</em> to store a digital document directly on your computer or phone.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md font-semibold text-xs transition cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
