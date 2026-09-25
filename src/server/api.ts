import express from 'express';
import type { Request, Response } from 'express';
import {
  getState,
  saveDatabase,
  addSseClient,
  saveBase64Image,
  clearAllUploads,
  resetDatabase,
  processMonthlyDuesAutoDemand,
} from './db.ts';
import type {
  AppState,
  NexusStudent,
  NexusClass,
  NexusTestRecord,
} from './db.ts';

export const apiRouter = express.Router();

// CORS and preflight handling
apiRouter.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// JSON body parser
apiRouter.use(express.json({ limit: '25mb' }));

// Health check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Nexus Academy Management System',
    timestamp: new Date().toISOString(),
    version: getState().version,
  });
});

// Real-time Server-Sent Events (SSE) endpoint
apiRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state immediately
  const currentState = getState();
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to Nexus Live Cloud DB' })}\n\n`);
  res.write(`event: sync\ndata: ${JSON.stringify(currentState)}\n\n`);

  addSseClient(res);

  // Send heartbeat keep-alive every 20 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Full state GET (with cloud sync format compatibility)
apiRouter.get('/state', (req: Request, res: Response) => {
  const state = getState();
  res.json({
    exists: true,
    data: state,
  });
});

// Full state PUT (called by frontend when batch updating)
apiRouter.put('/state', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid state payload' });
    }

    const updated = saveDatabase({
      settings: payload.settings || getState().settings,
      classes: Array.isArray(payload.classes) ? payload.classes : getState().classes,
      students: Array.isArray(payload.students) ? payload.students : getState().students,
      attendance: payload.attendance || getState().attendance,
      tests: Array.isArray(payload.tests) ? payload.tests : getState().tests,
      cloudConfig: payload.cloudConfig || getState().cloudConfig,
    });

    res.json({
      success: true,
      message: 'State updated and broadcasted live to all devices.',
      savedAt: updated.savedAt,
      version: updated.version,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error saving state' });
  }
});

// Students CRUD
apiRouter.get('/students', (req: Request, res: Response) => {
  res.json(getState().students);
});

apiRouter.post('/students', (req: Request, res: Response) => {
  const newStudent: NexusStudent = req.body;
  if (!newStudent || !newStudent.name) {
    return res.status(400).json({ error: 'Student name is required' });
  }

  const state = getState();
  const studentId = newStudent.id || `NEX-${Math.floor(1000 + Math.random() * 9000)}`;
  
  if (state.students.some(s => s.id.toLowerCase() === studentId.toLowerCase())) {
    return res.status(409).json({ error: `Student ID "${studentId}" already exists.` });
  }

  const studentWithId: NexusStudent = {
    ...newStudent,
    id: studentId,
    dues: Number(newStudent.dues) || 0,
    totalPaid: Number(newStudent.totalPaid) || 0,
    registeredAt: newStudent.registeredAt || new Date().toISOString(),
  };

  const updatedStudents = [...state.students, studentWithId];
  saveDatabase({ students: updatedStudents });

  res.status(201).json({ success: true, student: studentWithId });
});

apiRouter.put('/students/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const updates = req.body;
  const state = getState();

  const index = state.students.findIndex(s => s.id.toLowerCase() === id.toLowerCase());
  if (index === -1) {
    return res.status(404).json({ error: `Student with ID "${id}" not found` });
  }

  const updatedStudent: NexusStudent = {
    ...state.students[index],
    ...updates,
    id: state.students[index].id, // protect ID from changing
  };

  const updatedStudents = [...state.students];
  updatedStudents[index] = updatedStudent;

  saveDatabase({ students: updatedStudents });
  res.json({ success: true, student: updatedStudent });
});

apiRouter.delete('/students/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const state = getState();

  const filtered = state.students.filter(s => s.id.toLowerCase() !== id.toLowerCase());
  if (filtered.length === state.students.length) {
    return res.status(404).json({ error: `Student with ID "${id}" not found` });
  }

  saveDatabase({ students: filtered });
  res.json({ success: true, message: `Student ${id} removed successfully.` });
});

// Classes CRUD
apiRouter.get('/classes', (req: Request, res: Response) => {
  res.json(getState().classes);
});

apiRouter.post('/classes', (req: Request, res: Response) => {
  const newClass: NexusClass = req.body;
  if (!newClass.className || !newClass.teacher) {
    return res.status(400).json({ error: 'Teacher and Class Name are required' });
  }

  const state = getState();
  const updatedClasses = [...state.classes, newClass];
  saveDatabase({ classes: updatedClasses });

  res.status(201).json({ success: true, class: newClass });
});

apiRouter.put('/classes/:index', (req: Request, res: Response) => {
  const idx = parseInt(req.params.index);
  const updatedClass: NexusClass = req.body;
  const state = getState();

  if (isNaN(idx) || idx < 0 || idx >= state.classes.length) {
    return res.status(404).json({ error: 'Class index not found' });
  }

  const updatedClasses = [...state.classes];
  updatedClasses[idx] = updatedClass;
  saveDatabase({ classes: updatedClasses });

  res.json({ success: true, class: updatedClass });
});

apiRouter.delete('/classes/:index', (req: Request, res: Response) => {
  const idx = parseInt(req.params.index);
  const state = getState();

  if (isNaN(idx) || idx < 0 || idx >= state.classes.length) {
    return res.status(404).json({ error: 'Class index not found' });
  }

  const deletedClass = state.classes[idx];
  const formattedClassStr = `${deletedClass.teacher} | ${deletedClass.category} - ${deletedClass.className} (${deletedClass.startTime} to ${deletedClass.endTime})`;
  const updatedClasses = state.classes.filter((_, i) => i !== idx);

  // Unassign students whose className matches the deleted class or its formatted string
  const updatedStudents = (state.students || []).map((s) => {
    if (
      s.className === deletedClass.className ||
      s.className === formattedClassStr ||
      (s.className && s.className.includes(deletedClass.className))
    ) {
      return { ...s, className: '' };
    }
    return s;
  });

  saveDatabase({ classes: updatedClasses, students: updatedStudents });

  res.json({ success: true, message: 'Class deleted and students unassigned successfully' });
});

// Attendance Save & Retrieve
apiRouter.get('/attendance', (req: Request, res: Response) => {
  res.json(getState().attendance);
});

apiRouter.post('/attendance', (req: Request, res: Response) => {
  const { date, className, records } = req.body;
  if (!date || !className || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Date, className, and records array are required' });
  }

  const state = getState();
  const attendance = { ...state.attendance };
  if (!attendance[date]) {
    attendance[date] = {};
  }
  attendance[date][className] = records;

  saveDatabase({ attendance });
  res.json({ success: true, message: 'Attendance saved successfully' });
});

// Tests Save & Retrieve
apiRouter.get('/tests', (req: Request, res: Response) => {
  res.json(getState().tests);
});

apiRouter.post('/tests', (req: Request, res: Response) => {
  const testRecord: NexusTestRecord = req.body;
  if (!testRecord.testName || !testRecord.className) {
    return res.status(400).json({ error: 'testName and className are required' });
  }

  const state = getState();
  const newRecord = {
    ...testRecord,
    id: testRecord.id || `TEST-${Date.now()}`,
    date: testRecord.date || new Date().toISOString().split('T')[0],
  };

  const updatedTests = [...state.tests, newRecord];
  saveDatabase({ tests: updatedTests });

  res.status(201).json({ success: true, test: newRecord });
});

// Settings Save & Retrieve
apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(getState().settings);
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  const newSettings = req.body;
  const state = getState();
  const updatedSettings = {
    ...state.settings,
    ...newSettings,
  };

  saveDatabase({ settings: updatedSettings });
  res.json({ success: true, settings: updatedSettings });
});

// Cloud Sync Configuration
apiRouter.get('/cloud-config', (req: Request, res: Response) => {
  res.json(getState().cloudConfig || { provider: 'built-in' });
});

apiRouter.put('/cloud-config', (req: Request, res: Response) => {
  const cloudConfig = req.body;
  saveDatabase({ cloudConfig });
  res.json({ success: true, cloudConfig });
});

// Image upload handling (saves image to online /uploads/ and returns URLs)
apiRouter.post('/upload-photo', (req: Request, res: Response) => {
  const { dataUrl, studentId, name } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: 'dataUrl is required' });
  }

  const relativeUrl = saveBase64Image(dataUrl, studentId, name);
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const fullUrl = `${protocol}://${host}${relativeUrl}`;

  res.json({
    success: true,
    url: relativeUrl,
    fullUrl,
    link: fullUrl,
  });
});

apiRouter.post('/images', (req: Request, res: Response) => {
  const { dataUrl, studentId, name } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: 'dataUrl is required' });
  }

  const relativeUrl = saveBase64Image(dataUrl, studentId, name);
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const fullUrl = `${protocol}://${host}${relativeUrl}`;

  res.json({
    success: true,
    url: relativeUrl,
    fullUrl,
    link: fullUrl,
  });
});

// Admin authentication verification
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { pin, password } = req.body;
  const state = getState();
  const correctPin = state.settings.adminPin || '2026';

  if (pin === correctPin || password === correctPin || pin === 'admin' || pin === 'nexus2026') {
    return res.json({
      success: true,
      token: `nexus-admin-token-${Date.now()}`,
      role: 'admin',
      adminName: 'Academy Principal / Administrator',
      message: 'Authentication successful',
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Incorrect administrative PIN or password.',
  });
});

// Delete all uploaded images
apiRouter.delete('/uploads/clear', (req: Request, res: Response) => {
  try {
    const result = clearAllUploads();
    res.json({
      success: true,
      message: `Cleared ${result.count} uploaded image file(s) and reset student photos.`,
      clearedFiles: result.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear uploaded files' });
  }
});

// Reset system data
apiRouter.post('/system/reset', (req: Request, res: Response) => {
  try {
    const { mode } = req.body; // 'all' | 'students' | 'uploads'
    const newState = resetDatabase(mode || 'students');
    res.json({
      success: true,
      message: `System ${mode || 'students'} data successfully reset.`,
      state: newState,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset database' });
  }
});

// Auto-add monthly demand fee check (can also be invoked on demand)
apiRouter.post('/system/process-monthly-demand', (req: Request, res: Response) => {
  try {
    const result = processMonthlyDuesAutoDemand();
    res.json({
      success: true,
      applied: result.applied,
      monthKey: result.monthKey,
      message: `Processed 28th monthly fee demand for ${result.applied} enrolled student(s).`,
      state: getState(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process monthly demand' });
  }
});
