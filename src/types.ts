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
  photoUrl?: string;
  photoLink?: string;
  className?: string;
  admissionDate?: string;
  registeredAt?: string;
  monthlyFee?: number;
  admissionFee?: number;
  monthlyDiscount?: number;
  admissionDiscount?: number;
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
  attendance?: Record<string, Record<string, NexusAttendanceRecord[]>>;
  attendanceRecords?: Record<string, Record<string, NexusAttendanceRecord[]>>;
  tests?: NexusTestRecord[];
  testRecords?: NexusTestRecord[];
  cloudConfig?: CloudConfig;
  savedAt?: string;
  version?: number;
}

export interface ReceiptMonthEntry {
  month: string;
  duesDemanded: number;
  amountSubmitted: number;
  submissionDate: string;
  submissionTime?: string;
  status: 'Paid' | 'Partial' | 'Unpaid' | string;
  // Backward compatibility aliases
  monthlyFee?: number;
  amountPaid?: number;
  datePaid?: string;
}

export interface ReceiptData {
  receiptNo: string;
  date: string;
  time?: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  guardianNumber?: string;
  studentNumber?: string;
  gmail?: string;
  photo?: string;
  className: string;
  admissionDate?: string;
  recordPeriod?: string;
  academicYear?: string;
  monthlyFee: number;
  admissionFee: number;
  monthlyDiscount?: number;
  admissionDiscount?: number;
  prevDues: number;
  paidAmount: number;
  remainingDues: number;
  targetMonth?: string;
  monthsBreakdown?: ReceiptMonthEntry[];
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

export type NexusTab =
  | 'dashboard'
  | 'admission'
  | 'registration'
  | 'classes'
  | 'attendance'
  | 'test-marks'
  | 'student-info'
  | 'dues'
  | 'directory'
  | 'settings'
  | 'apps'
  | 'deployment';

export type ActiveTab = NexusTab;
