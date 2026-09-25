import React, { useState, useEffect, useCallback } from 'react';
import {
  NexusTab,
  NexusStudent,
  NexusClass,
  NexusTestRecord,
  NexusAttendanceRecord,
  NexusSettings,
  CloudConfig,
  ReceiptData,
  AppState,
} from './types';
import { cloudSync, CloudStatus } from './services/cloudSync';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AdmissionView } from './components/AdmissionView';
import { RegistrationView } from './components/RegistrationView';
import { ClassesView } from './components/ClassesView';
import { AttendanceView } from './components/AttendanceView';
import { TestMarksView } from './components/TestMarksView';
import { StudentInfoView } from './components/StudentInfoView';
import { DuesView } from './components/DuesView';
import { DirectoryView } from './components/DirectoryView';
import { SettingsView } from './components/SettingsView';
import { AppsView } from './components/AppsView';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { ReceiptModal } from './components/ReceiptModal';
import { EditStudentModal } from './components/EditStudentModal';
import { AddFeeModal } from './components/AddFeeModal';
import { AuthModal } from './components/AuthModal';
import { AppLockScreen } from './components/AppLockScreen';
import { InstallPrompt } from './components/InstallPrompt';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { sanitizeStudentsAfterClassDeletion, isClassActive, getActiveStudentClassDisplay } from './utils/classUtils';
import { generateReceiptNumber } from './utils/receiptUtils';

interface NotificationToast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NexusTab>('dashboard');
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local-only');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    return sessionStorage.getItem('nexus_app_unlocked') !== 'true';
  });

  // Core application data state
  const [students, setStudents] = useState<NexusStudent[]>([]);
  const [classes, setClasses] = useState<NexusClass[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    Record<string, Record<string, NexusAttendanceRecord[]>>
  >({});
  const [testRecords, setTestRecords] = useState<NexusTestRecord[]>([]);
  const [settings, setSettings] = useState<NexusSettings>({
    name: 'Nexus Academy',
    subtitle: 'English Language & Computer Education',
    address: 'Near Sadar Road, Peshawar KPK',
    logo: '/nexus-logo.png',
    currency: 'PKR',
    adminPin: '2026',
    accessPasswords: ['009665', '00966504236461', '2026'],
    appLockEnabled: true,
    backgroundColor: '#f8fafc',
  });
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({
    provider: 'built-in',
  });

  // Modal states
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [editStudent, setEditStudent] = useState<NexusStudent | null>(null);
  const [addFeeStudent, setAddFeeStudent] = useState<NexusStudent | null>(null);

  // Toast Notifications
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);

  const addNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    []
  );

  // Push updated state to the cloud database
  const syncStateToCloud = useCallback(
    (updatedPartialState: Partial<AppState>) => {
      const fullState: AppState = {
        students: updatedPartialState.students ?? students,
        classes: updatedPartialState.classes ?? classes,
        attendance: updatedPartialState.attendance ?? (updatedPartialState.attendanceRecords ?? attendanceRecords),
        attendanceRecords: updatedPartialState.attendanceRecords ?? (updatedPartialState.attendance ?? attendanceRecords),
        tests: updatedPartialState.tests ?? (updatedPartialState.testRecords ?? testRecords),
        testRecords: updatedPartialState.testRecords ?? (updatedPartialState.tests ?? testRecords),
        settings: updatedPartialState.settings ?? settings,
        cloudConfig: updatedPartialState.cloudConfig ?? cloudConfig,
      };

      cloudSync.saveState(fullState).catch((err) => {
        console.error('Failed to sync to cloud:', err);
      });
    },
    [students, classes, attendanceRecords, testRecords, settings, cloudConfig]
  );

  // Load initial state and setup real-time cloud listeners
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initializeSystem() {
      try {
        const initialState = await cloudSync.loadState();
        if (initialState) {
          const loadedClasses = initialState.classes || [];
          if (initialState.classes) setClasses(loadedClasses);
          if (initialState.students) {
            const cleaned = initialState.students.map((s) => {
              const activeClass = s.className && isClassActive(s.className, loadedClasses) ? s.className : '';
              return {
                ...s,
                className: activeClass,
                dues: s.dues ?? 0,
                totalPaid: s.totalPaid ?? 0,
              };
            });
            setStudents(cleaned);
          }
          const att = initialState.attendanceRecords || initialState.attendance;
          if (att) setAttendanceRecords(att);
          const tsts = initialState.testRecords || initialState.tests;
          if (tsts) setTestRecords(tsts);
          if (initialState.settings) {
            const mergedPasswords = Array.from(
              new Set([
                '009665',
                '00966504236461',
                '2026',
                ...(initialState.settings.accessPasswords || []),
              ])
            );
            const mergedSettings = {
              ...initialState.settings,
              accessPasswords: mergedPasswords,
              appLockEnabled: initialState.settings.appLockEnabled ?? true,
            };
            setSettings(mergedSettings);
            document.title = `${mergedSettings.name} — Management System`;
          }
          if (initialState.cloudConfig) setCloudConfig(initialState.cloudConfig);
        }

        // Subscribe to real-time updates from cloud / SSE daemon
        unsubscribe = cloudSync.subscribe((remoteState) => {
          const remoteClasses = remoteState.classes || [];
          if (remoteState.classes) setClasses(remoteState.classes);
          if (remoteState.students) {
            const cleaned = remoteState.students.map((s) => {
              const activeClass = s.className && isClassActive(s.className, remoteClasses.length > 0 ? remoteClasses : classes) ? s.className : '';
              return {
                ...s,
                className: activeClass,
                dues: s.dues ?? 0,
                totalPaid: s.totalPaid ?? 0,
              };
            });
            setStudents(cleaned);
          }
          const remoteAtt = remoteState.attendanceRecords || remoteState.attendance;
          if (remoteAtt) setAttendanceRecords(remoteAtt);
          const remoteTests = remoteState.testRecords || remoteState.tests;
          if (remoteTests) setTestRecords(remoteTests);
          if (remoteState.settings) {
            const mergedPasswords = Array.from(
              new Set([
                '009665',
                '00966504236461',
                '2026',
                ...(remoteState.settings.accessPasswords || []),
              ])
            );
            setSettings({
              ...remoteState.settings,
              accessPasswords: mergedPasswords,
              appLockEnabled: remoteState.settings.appLockEnabled ?? true,
            });
          }
          if (remoteState.cloudConfig) setCloudConfig(remoteState.cloudConfig);
        });
      } catch (err) {
        console.error('Error initializing system state:', err);
      }
    }

    initializeSystem();

    // Listen for cloud connection status changes
    const statusUnsub = cloudSync.onStatusChange((status) => {
      setCloudStatus(status);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      statusUnsub();
    };
  }, []);

  // Update document title, og:title, and browser tab favicon when settings change
  useEffect(() => {
    if (settings.name) {
      document.title = `${settings.name} — Management System`;
      const ogTitle = document.querySelector("meta[property='og:title']");
      if (ogTitle) ogTitle.setAttribute('content', `${settings.name} — Management System`);
    }
    if (settings.logo) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.logo;

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
      appleLink.href = settings.logo;
    }
  }, [settings.name, settings.logo]);

  // Lock App Terminal Handler
  const handleLockApp = () => {
    sessionStorage.removeItem('nexus_app_unlocked');
    setIsAppLocked(true);
    addNotification('Application locked. Enter teacher password to unlock.', 'info');
  };

  // Safeguard: auto-clean student records if their class was deleted or is non-existent
  useEffect(() => {
    if (students.length > 0) {
      let changed = false;
      const sanitized = students.map((s) => {
        if (s.className && !isClassActive(s.className, classes)) {
          changed = true;
          return { ...s, className: '', monthlyFee: 0, admissionFee: 0 };
        }
        if (!s.className && (s.monthlyFee > 0 || s.admissionFee > 0)) {
          changed = true;
          return { ...s, monthlyFee: 0, admissionFee: 0 };
        }
        return s;
      });
      if (changed) {
        setStudents(sanitized);
        syncStateToCloud({ students: sanitized });
      }
    }
  }, [classes, students.length]);

  // Handler: Register or Admit Student
  const handleSaveStudent = (newStudent: NexusStudent, receipt?: ReceiptData) => {
    const existingIndex = students.findIndex((s) => s.id === newStudent.id);
    let updated: NexusStudent[];
    if (existingIndex >= 0) {
      updated = [...students];
      updated[existingIndex] = newStudent;
    } else {
      updated = [newStudent, ...students];
    }

    setStudents(updated);
    syncStateToCloud({ students: updated });

    if (receipt) {
      setReceiptData(receipt);
    }
  };

  // Handler: Delete Student
  const handleDeleteStudent = (studentId: string) => {
    const updated = students.filter((s) => s.id !== studentId);
    setStudents(updated);
    syncStateToCloud({ students: updated });
  };

  // Handler: Save Class
  const handleSaveClass = (newClass: NexusClass, editIndex: number) => {
    let updated: NexusClass[];
    if (editIndex >= 0) {
      updated = [...classes];
      updated[editIndex] = newClass;
    } else {
      updated = [...classes, newClass];
    }
    setClasses(updated);
    syncStateToCloud({ classes: updated });
  };

  // Handler: Delete Class
  const handleDeleteClass = (index: number) => {
    const deletedClass = classes[index];
    const updated = classes.filter((_, idx) => idx !== index);
    
    // Thoroughly clean up student class assignments so they no longer show in active class
    const updatedStudents = sanitizeStudentsAfterClassDeletion(students, deletedClass, updated);

    setClasses(updated);
    setStudents(updatedStudents);
    syncStateToCloud({ classes: updated, students: updatedStudents });
  };

  // Handler: Save Daily Attendance
  const handleSaveAttendance = (
    date: string,
    className: string,
    records: NexusAttendanceRecord[]
  ) => {
    const updated = {
      ...attendanceRecords,
      [date]: {
        ...(attendanceRecords[date] || {}),
        [className]: records,
      },
    };
    setAttendanceRecords(updated);
    syncStateToCloud({ attendanceRecords: updated });
  };

  // Handler: Save Test Marks
  const handleSaveTestMarks = (testRecord: NexusTestRecord) => {
    const updated = [testRecord, ...testRecords];
    setTestRecords(updated);
    syncStateToCloud({ testRecords: updated });
  };

  // Handler: Save Settings
  const handleUpdateSettings = (newSettings: NexusSettings) => {
    setSettings(newSettings);
    syncStateToCloud({ settings: newSettings });
  };

  // Handler: Save Cloud Config
  const handleUpdateCloudConfig = (newConfig: CloudConfig) => {
    setCloudConfig(newConfig);
    syncStateToCloud({ cloudConfig: newConfig });
  };

  // Helper to convert hex or color to rgba with opacity so background color shows through background image
  const getRgbaOverlay = (color: string, alpha = 0.88): string => {
    if (!color) return `rgba(248, 250, 252, ${alpha})`;
    if (color.startsWith('#')) {
      let hex = color.replace('#', '').trim();
      if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('');
      }
      if (hex.length >= 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${isNaN(r) ? 248 : r}, ${isNaN(g) ? 250 : g}, ${isNaN(b) ? 252 : b}, ${alpha})`;
      }
    }
    return color;
  };

  // Handler: Restore Full Backup (Smart Merge: preserves existing data, restores demanded items & online image links)
  const handleRestoreBackup = (state: AppState) => {
    if (!state || typeof state !== 'object') {
      addNotification('Invalid backup data structure.', 'error');
      return;
    }

    // 1. Smart Merge Students: if already present, leave existing; otherwise insert; restore missing photos
    const incomingStudents: NexusStudent[] = Array.isArray(state.students) ? state.students : [];
    const existingMap = new Map<string, NexusStudent>();
    students.forEach((s) => existingMap.set(s.id.toLowerCase(), s));

    let addedStudentsCount = 0;
    let retainedStudentsCount = 0;
    const mergedStudents = [...students];

    incomingStudents.forEach((backupStudent) => {
      if (!backupStudent || !backupStudent.id) return;
      const key = backupStudent.id.toLowerCase();
      const existing = existingMap.get(key);

      // Resolve best photo reference (supports photo, photoUrl, photoLink)
      const resolvedPhoto = backupStudent.photo || backupStudent.photoUrl || backupStudent.photoLink || '';

      if (existing) {
        // "and if it is already there so then leave it"
        retainedStudentsCount++;
        // If existing record in system had no picture, restore picture from backup
        if (!existing.photo && resolvedPhoto) {
          const idx = mergedStudents.findIndex((s) => s.id.toLowerCase() === key);
          if (idx !== -1) {
            mergedStudents[idx] = {
              ...existing,
              photo: resolvedPhoto,
            };
          }
        }
      } else {
        // Not in system -> restore student to demanded place
        addedStudentsCount++;
        const restoredStudent: NexusStudent = {
          ...backupStudent,
          photo: resolvedPhoto,
          dues: Number(backupStudent.dues) || 0,
          totalPaid: Number(backupStudent.totalPaid) || 0,
        };
        mergedStudents.push(restoredStudent);
        existingMap.set(key, restoredStudent);
      }
    });

    // 2. Smart Merge Classes: add if not present
    const incomingClasses: NexusClass[] = Array.isArray(state.classes) ? state.classes : [];
    const mergedClasses = [...classes];
    const existingClassNames = new Set(classes.map((c) => c.className.trim().toLowerCase()));

    incomingClasses.forEach((bc) => {
      if (!bc || !bc.className) return;
      const cKey = bc.className.trim().toLowerCase();
      if (!existingClassNames.has(cKey)) {
        mergedClasses.push(bc);
        existingClassNames.add(cKey);
      }
    });

    // 3. Smart Merge Attendance
    const incomingAttendance = state.attendanceRecords || state.attendance || {};
    const mergedAttendance = { ...attendanceRecords };

    Object.keys(incomingAttendance).forEach((date) => {
      if (!mergedAttendance[date]) {
        mergedAttendance[date] = incomingAttendance[date];
      } else {
        const dateClasses = incomingAttendance[date];
        Object.keys(dateClasses).forEach((cName) => {
          if (!mergedAttendance[date][cName]) {
            mergedAttendance[date][cName] = dateClasses[cName];
          }
        });
      }
    });

    // 4. Smart Merge Tests
    const incomingTests = Array.isArray(state.testRecords)
      ? state.testRecords
      : Array.isArray(state.tests)
      ? state.tests
      : [];
    const mergedTests = [...testRecords];
    const existingTestIds = new Set(testRecords.map((t) => t.id || `${t.date}_${t.className}_${t.testName}`));

    incomingTests.forEach((bt) => {
      const tKey = bt.id || `${bt.date}_${bt.className}_${bt.testName}`;
      if (!existingTestIds.has(tKey)) {
        mergedTests.push(bt);
        existingTestIds.add(tKey);
      }
    });

    // 5. Settings: keep active customizations unless empty or missing
    const mergedSettings: NexusSettings = {
      ...state.settings,
      ...settings,
      logo: settings.logo && settings.logo !== '/nexus-logo.svg' ? settings.logo : (state.settings?.logo || settings.logo),
      backgroundImage: settings.backgroundImage || state.settings?.backgroundImage || '',
    };

    // Apply state
    setStudents(mergedStudents);
    setClasses(mergedClasses);
    setAttendanceRecords(mergedAttendance);
    setTestRecords(mergedTests);
    setSettings(mergedSettings);

    const fullMergedState: AppState = {
      students: mergedStudents,
      classes: mergedClasses,
      attendanceRecords: mergedAttendance,
      attendance: mergedAttendance,
      testRecords: mergedTests,
      tests: mergedTests,
      settings: mergedSettings,
      cloudConfig: state.cloudConfig || cloudConfig,
      savedAt: new Date().toISOString(),
      version: (state.version || 0) + 1,
    };

    syncStateToCloud(fullMergedState);
    addNotification(
      `Restored backup successfully: ${addedStudentsCount} student(s) added, ${retainedStudentsCount} existing student(s) kept intact.`,
      'success'
    );
  };

  // Handler: Clear Total Collected Amount
  const handleClearTotalCollected = () => {
    const resetStudents = students.map((s) => ({ ...s, totalPaid: 0 }));
    setStudents(resetStudents);
    syncStateToCloud({ students: resetStudents });
    addNotification('Total collected amount has been cleared to 0.', 'success');
  };

  // Handler: Force Cloud Sync
  const handleForceSync = async () => {
    addNotification('Triggering instant cloud synchronization...', 'info');
    try {
      const currentState: AppState = {
        students,
        classes,
        attendanceRecords,
        testRecords,
        settings,
        cloudConfig,
      };
      await cloudSync.saveState(currentState);
      addNotification('Cloud database synchronized successfully!', 'success');
    } catch {
      addNotification('Failed to sync with cloud. Check internet or credentials.', 'error');
    }
  };

  // Handler: Submit Fee from Dues modal
  const handleSubmitFee = (updatedStudent: NexusStudent, receipt: ReceiptData) => {
    const updated = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    setStudents(updated);
    syncStateToCloud({ students: updated });
    setReceiptData(receipt);
    addNotification(
      `Payment of ${settings.currency || 'PKR'} ${receipt.paidAmount.toLocaleString()} recorded for ${updatedStudent.name}!`,
      'success'
    );
  };

  // Background styling with dynamic color overlay tinting
  const activeBgColor = settings.backgroundColor || '#f8fafc';
  const overlayTint = getRgbaOverlay(activeBgColor, 0.88);

  const customBackgroundStyle: React.CSSProperties = settings.backgroundImage
    ? {
        backgroundColor: activeBgColor,
        backgroundImage: `linear-gradient(${overlayTint}, ${overlayTint}), url(${settings.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }
    : {
        backgroundColor: activeBgColor,
      };

  // If App Lock is enabled and screen is currently locked, render the secure authentication gatekeeper
  if (settings.appLockEnabled !== false && isAppLocked) {
    return (
      <AppLockScreen
        settings={settings}
        onUnlock={() => setIsAppLocked(false)}
        onNotification={addNotification}
      />
    );
  }

  return (
    <div
      style={customBackgroundStyle}
      className="min-h-screen flex flex-col text-slate-900 font-sans antialiased transition-colors duration-200"
    >
      {/* Top Application Navbar */}
      <Navbar
        settings={settings}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cloudStatus={cloudStatus}
        isAdminUnlocked={isAdminUnlocked}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLockAdmin={() => {
          setIsAdminUnlocked(false);
          addNotification('Administrative console locked.', 'info');
        }}
        onLockApp={handleLockApp}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        {activeTab === 'dashboard' && (
          <DashboardView
            students={students}
            classes={classes}
            settings={settings}
            onTabChange={setActiveTab}
            onOpenReceipt={(student) => {
              const receipt: ReceiptData = {
                receiptNo: generateReceiptNumber(student.id),
                date: new Date().toISOString().split('T')[0],
                studentId: student.id,
                studentName: student.name,
                fatherName: student.fatherName || '',
                guardianNumber: student.guardianNumber || '',
                studentNumber: student.studentNumber || '',
                gmail: student.gmail || '',
                photo: student.photo || student.photoUrl || '',
                className: getActiveStudentClassDisplay(student.className, classes) || 'N/A',
                admissionDate: student.admissionDate || student.registeredAt || student.lastAdmissionDate || new Date().toISOString().split('T')[0],
                monthlyFee: student.monthlyFee || 0,
                admissionFee: student.admissionFee || 0,
                monthlyDiscount: student.monthlyDiscount || 0,
                admissionDiscount: student.admissionDiscount || 0,
                prevDues: (student.dues || 0) + (student.totalPaid || 0),
                paidAmount: student.totalPaid || 0,
                remainingDues: student.dues || 0,
                feeAdjustments: student.feeAdjustments,
              };
              setReceiptData(receipt);
            }}
          />
        )}

        {activeTab === 'admission' && (
          <AdmissionView
            students={students}
            classes={classes}
            currency={settings.currency}
            onAdmitStudent={handleSaveStudent}
            onSaveAdmission={handleSaveStudent}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'registration' && (
          <RegistrationView
            students={students}
            onRegisterStudent={handleSaveStudent}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'classes' && (
          <ClassesView
            classes={classes}
            currency={settings.currency}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView
            students={students}
            classes={classes}
            attendanceRecords={attendanceRecords}
            onSaveAttendance={handleSaveAttendance}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'test-marks' && (
          <TestMarksView
            students={students}
            classes={classes}
            onSaveTestMarks={handleSaveTestMarks}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'student-info' && (
          <StudentInfoView
            students={students}
            classes={classes}
            tests={testRecords}
            attendance={attendanceRecords}
            currency={settings.currency}
            onUpdateStudent={handleSaveStudent}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'dues' && (
          <DuesView
            students={students}
            classes={classes}
            currency={settings.currency}
            settings={settings}
            onOpenAddFeeModal={(student) => setAddFeeStudent(student)}
            onOpenReceipt={(student) => {
              const receipt: ReceiptData = {
                receiptNo: generateReceiptNumber(student.id),
                date: new Date().toISOString().split('T')[0],
                studentId: student.id,
                studentName: student.name,
                fatherName: student.fatherName || '',
                guardianNumber: student.guardianNumber || '',
                studentNumber: student.studentNumber || '',
                gmail: student.gmail || '',
                photo: student.photo || student.photoUrl || '',
                className: getActiveStudentClassDisplay(student.className, classes) || 'N/A',
                admissionDate: student.admissionDate || student.registeredAt || student.lastAdmissionDate || new Date().toISOString().split('T')[0],
                monthlyFee: student.monthlyFee || 0,
                admissionFee: student.admissionFee || 0,
                monthlyDiscount: student.monthlyDiscount || 0,
                admissionDiscount: student.admissionDiscount || 0,
                prevDues: (student.dues || 0) + (student.totalPaid || 0),
                paidAmount: student.totalPaid || 0,
                remainingDues: student.dues || 0,
                feeAdjustments: student.feeAdjustments,
              };
              setReceiptData(receipt);
            }}
          />
        )}

        {activeTab === 'directory' && (
          <DirectoryView
            students={students}
            classes={classes}
            currency={settings.currency}
            onOpenReceipt={(student) => {
              const receipt: ReceiptData = {
                receiptNo: generateReceiptNumber(student.id),
                date: new Date().toISOString().split('T')[0],
                studentId: student.id,
                studentName: student.name,
                fatherName: student.fatherName || '',
                guardianNumber: student.guardianNumber || '',
                studentNumber: student.studentNumber || '',
                gmail: student.gmail || '',
                photo: student.photo || student.photoUrl || '',
                className: getActiveStudentClassDisplay(student.className, classes) || 'N/A',
                admissionDate: student.admissionDate || student.registeredAt || student.lastAdmissionDate || new Date().toISOString().split('T')[0],
                monthlyFee: student.monthlyFee || 0,
                admissionFee: student.admissionFee || 0,
                monthlyDiscount: student.monthlyDiscount || 0,
                admissionDiscount: student.admissionDiscount || 0,
                prevDues: (student.dues || 0) + (student.totalPaid || 0),
                paidAmount: student.totalPaid || 0,
                remainingDues: student.dues || 0,
                feeAdjustments: student.feeAdjustments,
              };
              setReceiptData(receipt);
            }}
            onOpenEditModal={(student) => setEditStudent(student)}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudent={handleSaveStudent}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            cloudConfig={cloudConfig}
            cloudStatus={cloudStatus}
            appState={{
              students,
              classes,
              attendanceRecords,
              testRecords,
              settings,
              cloudConfig,
            }}
            onUpdateSettings={handleUpdateSettings}
            onUpdateCloudConfig={handleUpdateCloudConfig}
            onRestoreBackup={handleRestoreBackup}
            onClearTotalCollected={handleClearTotalCollected}
            onForceSync={handleForceSync}
            onLockApp={handleLockApp}
            onNotification={addNotification}
          />
        )}

        {activeTab === 'apps' && (
          <AppsView settings={settings} onNotification={addNotification} />
        )}

        {activeTab === 'deployment' && <DeploymentGuideModal isView={true} />}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-slate-200/80 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            &copy; {new Date().getFullYear()} <strong>{settings.name}</strong> — {settings.subtitle}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Peshawar, KPK</span>
            <span>•</span>
            <span>Real-time Cloud Connected</span>
            <span>•</span>
            <span>PIN Protected</span>
          </div>
        </div>
      </footer>

      {/* PWA Seamless Install Prompt for Mobile and Desktop */}
      <InstallPrompt />

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          receipt={receiptData}
          student={students.find((s) => s.id === receiptData.studentId) || null}
          settings={settings}
          currency={settings.currency}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <EditStudentModal
          student={editStudent}
          classes={classes}
          currency={settings.currency}
          onClose={() => setEditStudent(null)}
          onSave={(updated) => {
            handleSaveStudent(updated);
            addNotification(`Student ${updated.name} updated successfully!`, 'success');
          }}
        />
      )}

      {/* Add Fee / Pay Dues Modal */}
      {addFeeStudent && (
        <AddFeeModal
          student={addFeeStudent}
          classes={classes}
          currency={settings.currency}
          onClose={() => setAddFeeStudent(null)}
          onSubmitFee={handleSubmitFee}
        />
      )}

      {/* Admin Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAdminUnlocked(true)}
        adminPin={settings.adminPin}
        accessPasswords={settings.accessPasswords}
        onNotification={addNotification}
      />

      {/* Toast Notification Stream */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 ${
              n.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : n.type === 'error'
                ? 'bg-red-900 text-white border-red-700'
                : 'bg-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {n.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              {n.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
              <span>{n.message}</span>
            </div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
              className="text-slate-400 hover:text-white transition p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
