import fs from 'fs';
import path from 'path';
import type { Response } from 'express';

export interface NexusClass {
  teacher: string;
  category: string;
  className: string;
  startTime: string;
  endTime: string;
  duration: string;
  monthlyFee: number;
  admissionFee: number;
}

export interface NexusStudent {
  id: string;
  name: string;
  fatherName: string;
  biometricId?: string; // Biometric registration/fingerprint token ID
  guardianName?: string;
  guardianNumber?: string;
  studentNumber?: string;
  gmail?: string;
  photo?: string;
  className?: string;
  admissionDate?: string;
  registeredAt?: string;
  monthlyFee?: number;
  admissionFee?: number;
  dues: number;
  totalPaid: number;
  lastAdmissionDate?: string;
  monthlyHistory?: Record<string, { fee: number; paid: number; paidDate?: string; paidTime?: string; status: 'Paid' | 'Partial' | 'Unpaid' }>;
  feePayments?: Array<{ id: string; month: string; amount: number; date: string; time: string; note?: string }>;
  feeAdjustments?: {
    fine?: { total: number; months: Record<string, number> };
    previousDues?: { total: number; months: Record<string, number> };
    currentDues?: { total: number; months: Record<string, number> };
    pastClassDues?: {
      total: number;
      pastClassName: string;
      months: Record<string, number>;
    };
  };
}

export interface NexusAttendanceRecord {
  studentId: string;
  status: 'Present' | 'Absent' | 'Leave';
}

export interface NexusTestRecord {
  id: string;
  date: string;
  className: string;
  testName: string;
  totalMarks: number;
  passingMarks: number;
  scores: Array<{ studentId: string; marks: number }>;
}

export interface NexusSettings {
  name: string;
  subtitle: string;
  address: string;
  logo: string;
  backgroundColor: string;
  backgroundImage: string;
  adminPin?: string;
  currency?: string;
  accessPasswords?: string[];
  appLockEnabled?: boolean;
  isBiometricConnected?: boolean;
}

export interface CloudConfig {
  provider: 'firebase' | 'cloudflare' | 'built-in' | 'supabase';
  firebase?: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    firestoreDatabaseId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
  };
  cloudflare?: {
    accountId?: string;
    databaseId?: string;
    apiToken?: string;
    customEndpoint?: string;
  };
  supabase?: {
    url?: string;
    anonKey?: string;
  };
}

export interface AppState {
  settings: NexusSettings;
  classes: NexusClass[];
  students: NexusStudent[];
  attendance: Record<string, Record<string, NexusAttendanceRecord[]>>;
  attendanceRecords?: Record<string, Record<string, NexusAttendanceRecord[]>>;
  tests: NexusTestRecord[];
  testRecords?: NexusTestRecord[];
  cloudConfig?: CloudConfig;
  savedAt: string;
  version: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nexus-db.json');

const DEFAULT_STATE: AppState = {
  settings: {
    name: 'Nexus Academy',
    subtitle: 'English, Computer & Home Tuition Academy',
    address: 'Peshawar, Pakistan',
    logo: '/nexus-logo.png',
    backgroundColor: '#f8fafc',
    backgroundImage: '',
    adminPin: '2026',
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

export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure data directory and uploads directory exist
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

// Convert base64 data URL to an uploaded file and return relative link /uploads/...
export function saveBase64Image(dataUrl: string, studentId?: string, prefix?: string): string {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl; // Already a URL link or empty
  }

  try {
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
    if (!match) return dataUrl;

    const rawExt = match[1].toLowerCase();
    const ext = rawExt.includes('svg') ? 'svg' : rawExt === 'jpeg' ? 'jpg' : rawExt;
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const cleanId = (studentId || prefix || 'student').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Failed to save base64 image:', err);
    return dataUrl;
  }
}

let inMemoryState: AppState = { ...DEFAULT_STATE };
const sseClients = new Set<Response>();

// Load persisted state on startup
export function loadDatabase(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      
      let parsedStudents = Array.isArray(parsed.students) ? parsed.students : [];
      let hadBase64 = false;
      parsedStudents = parsedStudents.map((s: NexusStudent) => {
        if (s.photo && s.photo.startsWith('data:image/')) {
          hadBase64 = true;
          return { ...s, photo: saveBase64Image(s.photo, s.id, s.name) };
        }
        return s;
      });

      const mergedSettings = { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) };
      if (!mergedSettings.logo || mergedSettings.logo === '/nexus-logo.svg') {
        mergedSettings.logo = '/nexus-logo.png';
      }

      inMemoryState = {
        ...DEFAULT_STATE,
        ...parsed,
        settings: mergedSettings,
        classes: Array.isArray(parsed.classes) ? parsed.classes : DEFAULT_STATE.classes,
        students: parsedStudents,
        attendance: parsed.attendance || {},
        tests: Array.isArray(parsed.tests) ? parsed.tests : [],
        cloudConfig: parsed.cloudConfig || DEFAULT_STATE.cloudConfig,
      };

      if (hadBase64) {
        saveDatabase(inMemoryState, false);
      }
    } else {
      inMemoryState = { ...DEFAULT_STATE };
      saveDatabase(inMemoryState, false);
    }
  } catch (err) {
    console.error('Error reading nexus-db.json, using defaults:', err);
    inMemoryState = { ...DEFAULT_STATE };
  }
  return inMemoryState;
}

// Atomically save state to disk and notify clients
export function saveDatabase(newState: Partial<AppState>, broadcast = true): AppState {
  const attendance = newState.attendance || newState.attendanceRecords || inMemoryState.attendance || {};
  const tests = Array.isArray(newState.tests)
    ? newState.tests
    : Array.isArray(newState.testRecords)
    ? newState.testRecords
    : inMemoryState.tests || [];

  // Convert any incoming base64 student photos to online /uploads/ links
  let students = newState.students !== undefined ? newState.students : inMemoryState.students;
  if (Array.isArray(students)) {
    students = students.map((s) => {
      if (s.photo && s.photo.startsWith('data:image/')) {
        const photoUrl = saveBase64Image(s.photo, s.id, s.name);
        return { ...s, photo: photoUrl };
      }
      return s;
    });
  }

  // Convert settings logo or bg if base64
  let settings = newState.settings ? { ...inMemoryState.settings, ...newState.settings } : inMemoryState.settings;
  if (settings.logo && settings.logo.startsWith('data:image/')) {
    settings.logo = saveBase64Image(settings.logo, 'logo', 'academy');
  }

  inMemoryState = {
    ...inMemoryState,
    ...newState,
    students,
    settings,
    attendance,
    tests,
    savedAt: new Date().toISOString(),
    version: (inMemoryState.version || 0) + 1,
  };

  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inMemoryState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing nexus-db.json:', err);
  }

  const broadcastState = getState();
  if (broadcast) {
    broadcastSync(broadcastState);
  }

  return broadcastState;
}

export function getState(): AppState {
  return {
    ...inMemoryState,
    attendance: inMemoryState.attendance,
    attendanceRecords: inMemoryState.attendance,
    tests: inMemoryState.tests,
    testRecords: inMemoryState.tests,
  };
}

export function addSseClient(res: Response) {
  sseClients.add(res);
  res.on('close', () => {
    sseClients.delete(res);
  });
}

export function broadcastSync(state: AppState) {
  const payload = `event: sync\ndata: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

export function clearAllUploads(): { count: number } {
  let count = 0;
  try {
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
          count++;
        } catch (e) {
          console.error('Failed to delete upload file:', file, e);
        }
      }
    }
  } catch (err) {
    console.error('Failed to scan uploads dir:', err);
  }

  // Clear photo field from all students
  const updatedStudents = (inMemoryState.students || []).map((s) => ({
    ...s,
    photo: '',
  }));

  saveDatabase({ students: updatedStudents });
  return { count };
}

export function resetDatabase(mode: 'all' | 'students' | 'uploads' = 'all'): AppState {
  if (mode === 'uploads') {
    clearAllUploads();
    return getState();
  }

  clearAllUploads();

  if (mode === 'students') {
    saveDatabase({
      students: [],
      attendance: {},
      attendanceRecords: {},
      tests: [],
      testRecords: [],
    });
    return getState();
  }

  // Full reset to DEFAULT_STATE
  inMemoryState = {
    ...DEFAULT_STATE,
    savedAt: new Date().toISOString(),
    version: (inMemoryState.version || 0) + 1,
  };

  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inMemoryState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing nexus-db.json during reset:', err);
  }

  const broadcastState = getState();
  broadcastSync(broadcastState);
  return broadcastState;
}

// Check and automatically add monthly fee demand to students on the 28th of the month
export function processMonthlyDuesAutoDemand(): { applied: number; monthKey: string } {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = `${year}-${month}`; // e.g., "2026-03"

  // Only auto-trigger on or after the 28th
  if (day < 28) {
    return { applied: 0, monthKey };
  }

  const state = inMemoryState;
  const students = state.students || [];
  let updatedCount = 0;

  const updatedStudents = students.map((student) => {
    // Only apply if student is enrolled in a class with a monthly fee
    const monthlyFee = Number(student.monthlyFee) || 0;
    if (monthlyFee <= 0 || !student.className) {
      return student;
    }

    const history = student.monthlyHistory || {};
    // If this month hasn't had demand fee added yet
    if (!history[monthKey]) {
      updatedCount++;
      return {
        ...student,
        dues: (Number(student.dues) || 0) + monthlyFee,
        monthlyHistory: {
          ...history,
          [monthKey]: {
            fee: monthlyFee,
            paid: 0,
            status: 'Unpaid' as const,
          },
        },
      };
    }
    return student;
  });

  if (updatedCount > 0) {
    saveDatabase({ students: updatedStudents });
  }

  return { applied: updatedCount, monthKey };
}

// Initial load
loadDatabase();

// Periodically check for 28th fee auto-addition every 30 minutes
setInterval(() => {
  try {
    processMonthlyDuesAutoDemand();
  } catch (err) {
    console.error('Error in monthly fee demand auto-check:', err);
  }
}, 30 * 60 * 1000);

