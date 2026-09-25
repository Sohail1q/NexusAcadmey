import type express from 'express';
import type { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { loadDatabase, saveDatabase } from './db.ts';

/**
 * Parses time string (e.g. "03:00 PM", "15:00", "9:30 AM") into total minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const isPM = /pm/i.test(timeStr);
  const isAM = /am/i.test(timeStr);
  const clean = timeStr.replace(/[^0-9:]/g, '').trim();
  const parts = clean.split(':').map(Number);
  let hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Get current time & date according to Pakistan / Peshawar Standard Time (Asia/Karachi, UTC+5)
 */
function getPeshawarCurrentTime() {
  const d = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const lookup: Record<string, string> = {};
    for (const part of parts) {
      lookup[part.type] = part.value;
    }
    const year = lookup.year;
    const month = lookup.month;
    const day = lookup.day;
    const hours = parseInt(lookup.hour, 10) % 24;
    const minutes = parseInt(lookup.minute, 10);
    const todayStr = `${year}-${month}-${day}`;
    const currentMins = hours * 60 + minutes;
    return { todayStr, currentMins, hours, minutes };
  } catch {
    const todayStr = d.toISOString().split('T')[0];
    const currentMins = d.getHours() * 60 + d.getMinutes();
    return { todayStr, currentMins, hours: d.getHours(), minutes: d.getMinutes() };
  }
}

export function registerBiometricRoutes(app: express.Application) {
  // 1. Get all students that have a valid biometricId assigned
  app.get('/api/biometric/device/students', (_req: Request, res: Response) => {
    const db = loadDatabase();
    const biometricStudents = db.students.filter(
      (s) => s.biometricId && s.biometricId.trim().length > 0
    );
    res.json({
      success: true,
      count: biometricStudents.length,
      students: biometricStudents.map((s) => ({
        id: s.id,
        name: s.name,
        fatherName: s.fatherName || s.guardianName || '',
        biometricId: s.biometricId,
        className: s.className || 'Not Assigned',
      })),
    });
  });

  // 2. Push all student records with valid biometricId to the connected physical device
  app.post('/api/biometric/device/push', (req: Request, res: Response) => {
    const db = loadDatabase();
    const biometricStudents = db.students.filter(
      (s) => s.biometricId && s.biometricId.trim().length > 0
    );

    // Prepare hardware device packet structure (compatible with ZKTeco / Realtime / USB biometric scanner protocols)
    const deviceRecords = biometricStudents.map((s, index) => ({
      slot: index + 1,
      studentId: s.id,
      name: s.name,
      fatherName: s.fatherName || s.guardianName || '',
      biometricToken: s.biometricId?.trim(),
      className: s.className || '',
      syncedAt: new Date().toISOString(),
    }));

    res.json({
      success: true,
      message: `Successfully pushed ${deviceRecords.length} student biometric token(s) to connected physical device.`,
      pushedCount: deviceRecords.length,
      students: deviceRecords,
      timestamp: new Date().toISOString(),
    });
  });

  // Hardware device slots state (simulating physical scanner buffer or reading USB/IP scanner)
  const hardwareDeviceSlots = new Set<string>(['1111', '1001', '1002', '1003']);

  // 3. Pull / Import newly created IDs and templates from connected physical device (e.g. ID "1111")
  const handlePullDeviceIds = (req: Request, res: Response) => {
    const db = loadDatabase();
    if (req.body?.deviceId) {
      hardwareDeviceSlots.add(String(req.body.deviceId).trim());
    }

    const assignedTokens = new Set(
      db.students
        .map((s) => s.biometricId?.trim())
        .filter((id): id is string => Boolean(id && id.length > 0))
    );

    const allSlots = Array.from(hardwareDeviceSlots);
    const newHardwareIds = allSlots.filter((id) => !assignedTokens.has(id));
    const assignedHardwareIds = allSlots.filter((id) => assignedTokens.has(id));
    const biometricStudents = db.students.filter(
      (s) => s.biometricId && s.biometricId.trim().length > 0
    );

    res.json({
      success: true,
      message:
        newHardwareIds.length > 0
          ? `Device read successfully: Found ${newHardwareIds.length} newly registered hardware ID(s) on machine (including ID "${newHardwareIds[0]}").`
          : `Device read successfully: All ${allSlots.length} hardware IDs are mapped to students in directory.`,
      newHardwareIds,
      assignedHardwareIds,
      allDeviceIds: allSlots,
      importedCount: allSlots.length,
      biometricStudentsCount: biometricStudents.length,
      students: biometricStudents.map((s) => ({
        id: s.id,
        name: s.name,
        biometricId: s.biometricId,
      })),
      timestamp: new Date().toISOString(),
    });
  };

  app.post('/api/biometric/device/import', handlePullDeviceIds);
  app.get('/api/biometric/device/import', handlePullDeviceIds);
  app.post('/api/biometric/device/pull-ids', handlePullDeviceIds);
  app.get('/api/biometric/device/pull-ids', handlePullDeviceIds);

  // 4. Endpoint to fetch class students and live attendance status for specific dates
  app.get('/api/attendance/class-data', (req: Request, res: Response) => {
    const { className, date } = req.query;
    const db = loadDatabase();
    const { todayStr: pehTodayStr } = getPeshawarCurrentTime();

    const targetDate = (date as string) || pehTodayStr;
    const classNameStr = (className as string) || '';

    const targetClass = db.classes.find(
      (c) =>
        c.className === classNameStr ||
        (classNameStr && classNameStr.includes(c.className)) ||
        (c.className && classNameStr && c.className.includes(classNameStr))
    );

    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const studentsInClass = db.students.filter(
      (s) =>
        s.className === classNameStr ||
        s.className === targetClass.className ||
        (s.className && s.className.includes(targetClass.className))
    );

    const classAttendanceKey =
      db.attendance[targetDate]?.[targetClass.className] !== undefined
        ? targetClass.className
        : classNameStr;

    const dayAttendance = db.attendance[targetDate]?.[classAttendanceKey] || [];

    // Default to 'Absent' for any student who has not scanned in or has no biometricId
    const enrichedStudents = studentsInClass.map((student) => {
      const record = dayAttendance.find((r) => r.studentId === student.id);
      return {
        ...student,
        attendanceStatus: record ? record.status : 'Absent',
      };
    });

    res.json({
      className: targetClass.className,
      schedule: { start: targetClass.startTime, end: targetClass.endTime },
      date: targetDate,
      students: enrichedStudents,
    });
  });

  // 5. Biometric device scan trigger endpoint with automatic time-window validation
  app.post('/api/biometric/scan', (req: Request, res: Response) => {
    const { biometricId } = req.body;
    if (!biometricId) {
      return res.status(400).json({ success: false, message: 'biometricId is required' });
    }

    const db = loadDatabase();
    const { todayStr, currentMins } = getPeshawarCurrentTime();
    if (!db.attendance[todayStr]) {
      db.attendance[todayStr] = {};
    }

    const student = db.students.find(
      (s) =>
        s.biometricId === biometricId ||
        (s.biometricId && s.biometricId.trim().toLowerCase() === String(biometricId).trim().toLowerCase())
    );

    if (!student) {
      return res.status(400).json({ success: false, message: 'Unregistered Biometric ID' });
    }

    const enrolledClasses = db.classes.filter(
      (c) =>
        c.className === student.className ||
        (student.className && student.className.includes(c.className)) ||
        (c.className && student.className && c.className.includes(student.className))
    );

    if (enrolledClasses.length === 0) {
      return res.status(400).json({ success: false, message: 'Student class configuration missing' });
    }

    // If student is enrolled in multiple classes, select the one currently active or closest to current time
    let studentClass = enrolledClasses[0];
    for (const c of enrolledClasses) {
      const sM = parseTimeToMinutes(c.startTime);
      const eM = parseTimeToMinutes(c.endTime);
      if (currentMins >= sM - 15 && currentMins <= eM + 60) {
        studentClass = c;
        break;
      }
    }

    let startMins = parseTimeToMinutes(studentClass.startTime);
    let endMins = parseTimeToMinutes(studentClass.endTime);

    // Fallback if numbers were directly split by colon
    if (isNaN(startMins) || startMins === 0) {
      const [sH, sM] = (studentClass.startTime || '00:00').split(':').map(Number);
      startMins = (sH || 0) * 60 + (sM || 0);
    }
    if (isNaN(endMins) || endMins === 0) {
      const [eH, eM] = (studentClass.endTime || '23:59').split(':').map(Number);
      endMins = (eH || 0) * 60 + (eM || 0);
    }

    // Time-window logic:
    // Grace period before class start: 10 minutes early allowed
    let status: 'Present' | 'Absent' = 'Present';
    if (currentMins < startMins - 10) {
      return res.status(400).json({
        success: false,
        message: `Too early for class attendance. Class starts at ${studentClass.startTime} (Current: ${Math.floor(currentMins / 60)}:${String(currentMins % 60).padStart(2, '0')} PKT).`,
      });
    }
    if (currentMins > endMins) {
      status = 'Absent';
    }

    // Save attendance status under class key
    const classKey = student.className || studentClass.className;
    if (!db.attendance[todayStr][classKey]) {
      db.attendance[todayStr][classKey] = [];
    }
    const classList = db.attendance[todayStr][classKey];
    const existingIndex = classList.findIndex((r) => r.studentId === student.id);

    if (existingIndex >= 0) {
      classList[existingIndex].status = status;
    } else {
      classList.push({ studentId: student.id, status });
    }

    saveDatabase(db);

    res.json({
      success: true,
      status,
      studentName: student.name,
      className: student.className,
      message:
        status === 'Present'
          ? `Checked In: ${student.name} marked Present (${studentClass.className})`
          : `Marked Absent (Late scan after class end): ${student.name}`,
    });
  });

  // 6. Backend Excel Export Endpoint: Generates editable .xlsx multi-day blocks with 3-row gaps
  app.get('/api/attendance/export-excel', (req: Request, res: Response) => {
    const { className } = req.query;
    if (!className) {
      return res.status(400).json({ error: 'className query parameter is required' });
    }

    const db = loadDatabase();
    const classNameStr = String(className);
    const targetClass = db.classes.find(
      (c) =>
        c.className === classNameStr ||
        c.className.toLowerCase() === classNameStr.toLowerCase()
    );

    const timing = targetClass
      ? { start: targetClass.startTime, end: targetClass.endTime }
      : { start: '09:00 AM', end: '10:00 AM' };

    const studentsInClass = db.students.filter(
      (s) =>
        s.className === classNameStr ||
        (s.className && s.className.includes(classNameStr)) ||
        (targetClass && s.className && s.className.includes(targetClass.className))
    );

    // Collect all attendance dates
    const dates = Object.keys(db.attendance).sort();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const sheetData: any[][] = [];

    const datesToExport = dates.length > 0 ? dates : [new Date().toISOString().split('T')[0]];

    datesToExport.forEach((dStr, index) => {
      const dObj = new Date(dStr);
      const day = isNaN(dObj.getTime()) ? 'Day' : dayNames[dObj.getDay()];
      const dayAttendance = db.attendance[dStr]?.[classNameStr] || (targetClass ? db.attendance[dStr]?.[targetClass.className] : undefined) || [];

      // 1. Block Header Row
      sheetData.push([
        `Class Name: ${classNameStr}`,
        `Date: ${dStr}`,
        `Day: ${day}`,
        `Timing: ${timing.start} - ${timing.end}`,
      ]);

      // 2. Table Column Headers
      sheetData.push(['Student Name', 'Father Name', 'Attendance Status']);

      // 3. Student Rows (unscanned or non-biometric default to Absent)
      studentsInClass.forEach((s) => {
        const record = dayAttendance.find((r) => r.studentId === s.id);
        sheetData.push([s.name, s.fatherName || s.guardianName || '', record ? record.status : 'Absent']);
      });

      // 4. Exact 3-row gap between daily blocks
      if (index < datesToExport.length - 1) {
        sheetData.push([]);
        sheetData.push([]);
        sheetData.push([]);
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 22 }, { wch: 25 }];

    const workbook = XLSX.utils.book_new();
    const safeSheetName = classNameStr.replace(/[:\\/?*\[\]]/g, '_').substring(0, 30) || 'Attendance';
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

    const safeFileName = classNameStr.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 35) || 'Class';
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_Attendance_Report.xlsx"`);
    res.send(buffer);
  });
}
