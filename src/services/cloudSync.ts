import { AppState, CloudConfig } from '../types';
import {
  saveStateToFirestore,
  loadStateFromFirestore,
  testFirestoreConnection,
  provisionedFirebaseConfig,
} from '../lib/firebase';

export const LOCAL_STORAGE_KEY = 'nexus_app_state_v5';

const DEFAULT_STATE: AppState = {
  settings: {
    name: 'Nexus Academy',
    subtitle: 'English, Computer & Home Tuition Academy',
    address: 'Peshawar, Pakistan',
    logo: '/nexus-logo.svg',
    backgroundColor: '#f8fafc',
    backgroundImage: '',
    adminPin: '2026',
    accessPasswords: ['009665', '00966504236461', '2026'],
    appLockEnabled: true,
    currency: 'PKR',
  },
  classes: [],
  students: [],
  attendance: {},
  tests: [],
  cloudConfig: {
    provider: 'built-in',
  },
  savedAt: new Date().toISOString(),
  version: 1,
};

export type CloudStatus = 'connected' | 'connecting' | 'offline' | 'syncing';

class CloudSyncService {
  private eventSource: EventSource | null = null;
  private statusListeners: Array<(status: CloudStatus) => void> = [];
  private stateListeners: Array<(state: AppState) => void> = [];
  private currentStatus: CloudStatus = 'connecting';
  private syncTimer: any = null;

  constructor() {
    this.initEventSource();
  }

  public getInitialState(): AppState {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
          classes: Array.isArray(parsed.classes) ? parsed.classes : DEFAULT_STATE.classes,
          students: Array.isArray(parsed.students) ? parsed.students : [],
          attendance: parsed.attendance || parsed.attendanceRecords || {},
          attendanceRecords: parsed.attendanceRecords || parsed.attendance || {},
          tests: Array.isArray(parsed.tests) ? parsed.tests : (Array.isArray(parsed.testRecords) ? parsed.testRecords : []),
          testRecords: Array.isArray(parsed.testRecords) ? parsed.testRecords : (Array.isArray(parsed.tests) ? parsed.tests : []),
          cloudConfig: parsed.cloudConfig || DEFAULT_STATE.cloudConfig,
        };
      }
    } catch (err) {
      console.warn('Could not read from localStorage cache:', err);
    }
    return DEFAULT_STATE;
  }

  public onStatusChange(listener: (status: CloudStatus) => void) {
    this.statusListeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  public onStateSync(listener: (state: AppState) => void) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  public subscribe(listener: (state: AppState) => void) {
    return this.onStateSync(listener);
  }

  public async loadState(): Promise<AppState> {
    // 1. First attempt to load persistent online state from Cloud Firestore
    try {
      const firestoreState = await loadStateFromFirestore();
      if (firestoreState && firestoreState.settings && firestoreState.students) {
        this.cacheLocally(firestoreState);
        this.setStatus('connected');
        return firestoreState;
      }
    } catch {
      // Fallback to server daemon or local
    }

    // 2. Fetch from server daemon
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const remote = await res.json();
        const stateData = remote?.data || remote;
        if (stateData && stateData.settings) {
          this.cacheLocally(stateData);
          return stateData;
        }
      }
    } catch {
      // ignore, fall back to local cache
    }
    return this.getInitialState();
  }

  private setStatus(status: CloudStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach(l => l(status));
  }

  public initEventSource() {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setStatus('connecting');

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.addEventListener('connected', () => {
        this.setStatus('connected');
      });

      this.eventSource.addEventListener('sync', (event) => {
        try {
          const data: AppState = JSON.parse(event.data);
          this.cacheLocally(data);
          this.setStatus('connected');
          this.stateListeners.forEach(l => l(data));
        } catch (err) {
          console.error('Error parsing sync event data:', err);
        }
      });

      this.eventSource.onerror = () => {
        this.setStatus('offline');
        // Reconnect after 5 seconds if disconnected
        setTimeout(() => {
          if (this.currentStatus === 'offline') {
            this.initEventSource();
          }
        }, 5000);
      };
    } catch {
      this.setStatus('offline');
    }
  }

  public cacheLocally(state: AppState) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Failed to cache state to localStorage:', err);
    }
  }

  // Primary method to save changes to the live cloud database
  public async saveState(newState: AppState): Promise<boolean> {
    this.cacheLocally(newState);
    this.setStatus('syncing');

    let success = false;

    // 1. Sync to built-in live server API
    try {
      const response = await fetch('/api/state', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(newState),
      });

      if (response.ok) {
        success = true;
        this.setStatus('connected');
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (err) {
      console.warn('Direct live server save failed, retaining local copy:', err);
      this.setStatus('offline');
    }

    // 2. Direct Sync to persistent Google Cloud Firestore online
    if (newState.cloudConfig?.provider === 'firebase' || provisionedFirebaseConfig?.projectId) {
      try {
        await saveStateToFirestore(newState);
        success = true;
        this.setStatus('connected');
      } catch (err) {
        console.warn('Firestore cloud save failed:', err);
      }
    }

    // 3. If Cloudflare is configured, sync to Cloudflare D1
    if (newState.cloudConfig?.provider === 'cloudflare') {
      this.syncToCloudflare(newState).catch(e => console.warn('Cloudflare sync error:', e));
    }

    // 4. Fallback if Supabase was previously configured
    if (newState.cloudConfig?.provider === 'supabase' && newState.cloudConfig.supabase?.url) {
      this.syncToSupabase(newState).catch(e => console.warn('Supabase sync error:', e));
    }

    return success;
  }

  // Cloudflare D1 / Worker DB Sync
  public async syncToCloudflare(state: AppState): Promise<boolean> {
    const cf = state.cloudConfig?.cloudflare;
    if (!cf) return false;

    // Custom Cloudflare Worker or Pages Function endpoint
    if (cf.customEndpoint) {
      try {
        const res = await fetch(cf.customEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cf.apiToken ? { Authorization: `Bearer ${cf.apiToken}` } : {}),
          },
          body: JSON.stringify(state),
        });
        return res.ok;
      } catch (err) {
        console.error('Cloudflare custom endpoint sync error:', err);
        return false;
      }
    }

    // Direct Cloudflare D1 REST API
    if (cf.accountId && cf.databaseId && cf.apiToken) {
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/d1/database/${cf.databaseId}/query`;
        const sql = `CREATE TABLE IF NOT EXISTS academy_state (id TEXT PRIMARY KEY, payload TEXT, updated_at TEXT);
INSERT INTO academy_state (id, payload, updated_at) VALUES ('primary', ?, ?)
ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at;`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cf.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql,
            params: [JSON.stringify(state), new Date().toISOString()],
          }),
        });
        return res.ok;
      } catch (err) {
        console.error('Cloudflare D1 sync error:', err);
        return false;
      }
    }

    return false;
  }

  // Firebase Firestore REST Sync fallback
  public async syncToFirebase(state: AppState): Promise<boolean> {
    try {
      return await saveStateToFirestore(state);
    } catch (err) {
      console.error('Firebase sync error:', err);
      return false;
    }
  }

  // Supabase REST Sync
  public async syncToSupabase(state: AppState): Promise<boolean> {
    const sb = state.cloudConfig?.supabase;
    if (!sb || !sb.url || !sb.anonKey) return false;

    try {
      const url = `${sb.url.replace(/\/$/, '')}/rest/v1/nexus_state?on_conflict=id`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: sb.anonKey,
          Authorization: `Bearer ${sb.anonKey}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: 'primary',
          payload: JSON.stringify(state),
          updated_at: new Date().toISOString(),
        }),
      });

      return res.ok;
    } catch (err) {
      console.error('Supabase sync error:', err);
      return false;
    }
  }

  // Test Cloud Connection
  public async testCloudConnection(config: CloudConfig): Promise<{ success: boolean; message: string }> {
    if (config.provider === 'built-in') {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          return { success: true, message: 'Connected to Live Nexus Academy Cloud Backend API!' };
        }
        return { success: false, message: `Server error: ${res.status}` };
      } catch (err: any) {
        return { success: false, message: `Could not reach live API: ${err.message}` };
      }
    }

    if (config.provider === 'firebase') {
      try {
        const result = await testFirestoreConnection();
        return result;
      } catch (err: any) {
        return { success: false, message: `Firebase Firestore test failed: ${err.message}` };
      }
    }

    if (config.provider === 'cloudflare') {
      const cf = config.cloudflare;
      if (!cf) {
        return { success: false, message: 'Cloudflare configuration is required.' };
      }
      if (cf.customEndpoint) {
        try {
          const res = await fetch(cf.customEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cf.apiToken ? { Authorization: `Bearer ${cf.apiToken}` } : {}),
            },
            body: JSON.stringify({ ping: true }),
          });
          if (res.ok || res.status === 200 || res.status === 204) {
            return { success: true, message: 'Connected to Cloudflare Worker/Pages Endpoint!' };
          }
          return { success: false, message: `Cloudflare Endpoint response: ${res.statusText} (${res.status})` };
        } catch (err: any) {
          return { success: false, message: `Cloudflare Endpoint error: ${err.message}` };
        }
      }
      if (!cf.accountId || !cf.databaseId || !cf.apiToken) {
        return { success: false, message: 'Cloudflare Account ID, D1 Database ID, and API Token are required.' };
      }
      try {
        const url = `https://api.cloudflare.com/client/v4/accounts/${cf.accountId}/d1/database/${cf.databaseId}/query`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cf.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: 'SELECT 1;' }),
        });
        if (res.ok) {
          return { success: true, message: 'Connected to Cloudflare D1 Database successfully!' };
        }
        return { success: false, message: `Cloudflare API returned status ${res.status}` };
      } catch (err: any) {
        return { success: false, message: `Cloudflare network error: ${err.message}` };
      }
    }

    if (config.provider === 'supabase') {
      if (!config.supabase?.url || !config.supabase?.anonKey) {
        return { success: false, message: 'Supabase URL and Anon Key are required.' };
      }
      try {
        const url = `${config.supabase.url.replace(/\/$/, '')}/rest/v1/`;
        const res = await fetch(url, {
          headers: { apikey: config.supabase.anonKey },
        });
        if (res.status === 200 || res.status === 404) {
          return { success: true, message: 'Connected to Supabase REST API successfully!' };
        }
        return { success: false, message: `Supabase status: ${res.status} ${res.statusText}` };
      } catch (err: any) {
        return { success: false, message: `Supabase network error: ${err.message}` };
      }
    }

    return { success: false, message: 'Unknown cloud provider selected.' };
  }
  public async clearUploads(): Promise<{ success: boolean; clearedFiles: number; message: string }> {
    try {
      const res = await fetch('/api/uploads/clear', { method: 'DELETE' });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, clearedFiles: 0, message: err.message || 'Failed' };
    }
  }

  public async resetSystemData(mode: 'all' | 'students' | 'uploads' = 'students'): Promise<{ success: boolean; state?: AppState; message: string }> {
    try {
      const res = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed' };
    }
  }
}

export const cloudSync = new CloudSyncService();

// Helper to upload student photo to online storage and get back the online URL link
export async function uploadStudentPhoto(
  dataUrl: string,
  studentId?: string,
  name?: string
): Promise<{ url: string; fullUrl: string }> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    const full = dataUrl.startsWith('http')
      ? dataUrl
      : `${window.location.origin}${dataUrl.startsWith('/') ? '' : '/'}${dataUrl}`;
    return { url: dataUrl, fullUrl: full };
  }

  try {
    const res = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, studentId, name }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return {
          url: data.url,
          fullUrl: data.fullUrl || `${window.location.origin}${data.url}`,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to upload photo to /api/upload-photo, falling back to dataUrl:', err);
  }
  return { url: dataUrl, fullUrl: dataUrl };
}

// Helper to convert file to data URL
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Download blob helper
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

// Universal RFC-4180 CSV Export with UTF-8 BOM so Excel, Google Sheets, LibreOffice, and Mobile Office apps open cleanly without column shift or warnings
export function exportToCsv(options: {
  title?: string;
  columns: Array<{ header: string }>;
  rows: Array<Array<{ text: string }>>;
  filename: string;
}) {
  const { columns, rows, filename } = options;
  const csvLines: string[] = [];

  // Header row - strictly on Line 1 so every spreadsheet software parses all columns immediately
  csvLines.push(
    columns
      .map((c) => `"${(c.header || '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`)
      .join(',')
  );

  // Data rows
  rows.forEach((row) => {
    const line = row
      .map((cell) => `"${(cell.text || '').replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`)
      .join(',');
    csvLines.push(line);
  });

  const csvContent = '\ufeff' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

// Standalone Printable HTML Report that can be opened in any web browser without needing Excel
export function exportToHtmlReport(options: {
  title: string;
  subtitle?: string;
  columns: Array<{ header: string }>;
  rows: Array<Array<{ text: string; isStatus?: boolean; isDate?: boolean; isLink?: boolean; linkUrl?: string }>>;
  filename: string;
}) {
  const { title, subtitle, columns, rows, filename } = options;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
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
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 6px 0;
      color: #1e3a8a;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin: 0;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 12px;
      font-weight: 600;
      border: 1px solid #1e293b;
      white-space: nowrap;
    }
    td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .status-present {
      background: #dcfce7 !important;
      color: #15803d;
      font-weight: bold;
      text-align: center;
      border-radius: 4px;
    }
    .status-absent {
      background: #fee2e2 !important;
      color: #b91c1c;
      font-weight: bold;
      text-align: center;
      border-radius: 4px;
    }
    .status-leave {
      background: #fef3c7 !important;
      color: #b45309;
      font-weight: bold;
      text-align: center;
      border-radius: 4px;
    }
    .photo-link {
      color: #2563eb;
      text-decoration: underline;
      font-weight: 500;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-card { border: none; box-shadow: none; padding: 0; }
      .btn-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header-bar">
      <div>
        <h1>${title}</h1>
        ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
      </div>
      <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="table-container">
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
                  if (cell.isStatus) {
                    const val = (cell.text || '').toLowerCase();
                    if (val.includes('present')) cellClass = 'class="status-present"';
                    else if (val.includes('absent')) cellClass = 'class="status-absent"';
                    else if (val.includes('leave')) cellClass = 'class="status-leave"';
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

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.html') ? filename : `${filename}.html`);
}

// Export formatted Excel spreadsheet (.xls) with custom column widths, styling, and text formatting to prevent Excel ######## errors
export function exportToExcelXls(options: {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: Array<{ header: string; width: number }>;
  rows: Array<Array<{ text: string; isStatus?: boolean; isDate?: boolean; isLink?: boolean; linkUrl?: string }>>;
  filename: string;
}) {
  const { sheetName, title, subtitle, columns, rows, filename } = options;

  let tableHtml = `\ufeff<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${sheetName.replace(/[:\\/?*\[\]]/g, '')}</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      .app-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; padding: 10px 5px; }
      .app-subtitle { font-size: 10pt; color: #64748b; padding-bottom: 12px; }
      th {
        background-color: #0f172a;
        color: #ffffff;
        font-weight: bold;
        font-size: 11pt;
        padding: 8px 12px;
        border: 1px solid #334155;
        text-align: left;
      }
      td {
        font-size: 10pt;
        padding: 6px 12px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
        mso-number-format: "\\@";
      }
      .date-cell {
        mso-number-format: "\\@";
        text-align: center;
        font-weight: 500;
      }
      .status-present {
        background-color: #dcfce7;
        color: #15803d;
        font-weight: bold;
        text-align: center;
      }
      .status-absent {
        background-color: #fee2e2;
        color: #b91c1c;
        font-weight: bold;
        text-align: center;
      }
      .status-leave {
        background-color: #fef3c7;
        color: #b45309;
        font-weight: bold;
        text-align: center;
      }
      .photo-link {
        color: #2563eb;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="${columns.length}" class="app-title">${title}</td>
      </tr>
      ${subtitle ? `<tr><td colspan="${columns.length}" class="app-subtitle">${subtitle}</td></tr>` : ''}
      <tr><td colspan="${columns.length}" style="height: 10px;"></td></tr>
      <thead>
        <tr>
          ${columns.map((col) => `<th style="width: ${col.width}pt;">${col.header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach((row) => {
    tableHtml += '<tr>';
    row.forEach((cell) => {
      let cellClass = '';
      if (cell.isDate) {
        cellClass = 'class="date-cell"';
      } else if (cell.isStatus) {
        const val = cell.text.toLowerCase();
        if (val.includes('present')) cellClass = 'class="status-present"';
        else if (val.includes('absent')) cellClass = 'class="status-absent"';
        else if (val.includes('leave')) cellClass = 'class="status-leave"';
      }

      if (cell.isLink && cell.linkUrl) {
        tableHtml += `<td ${cellClass}><a class="photo-link" href="${cell.linkUrl}">${cell.text}</a></td>`;
      } else {
        tableHtml += `<td ${cellClass} style="mso-number-format:'\\@';">${cell.text}</td>`;
      }
    });
    tableHtml += '</tr>';
  });

  tableHtml += `
      </tbody>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`);
}
