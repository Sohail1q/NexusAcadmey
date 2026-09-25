import React, { useState } from 'react';
import { BadgeCheck, CloudDownload, CheckCircle, AlertCircle, Edit3, Calendar, History, ArrowRight, Coins, Clock } from 'lucide-react';
import { NexusStudent, NexusClass, ReceiptData } from '../types';
import {
  isClassActive,
  getActiveStudentClassDisplay,
  formatSingleClassDemanded,
  formatDualClassesString,
  matchClassFromSegment,
  parseStudentClasses,
} from '../utils/classUtils';
import { generateReceiptNumber } from '../utils/receiptUtils';

interface AdmissionViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  currency?: string;
  onAdmitStudent?: (updatedStudent: NexusStudent, receiptData: ReceiptData) => void;
  onSaveAdmission?: (updatedStudent: NexusStudent, receiptData: ReceiptData) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdmissionView: React.FC<AdmissionViewProps> = ({
  students,
  classes,
  currency = 'PKR',
  onAdmitStudent,
  onSaveAdmission,
  onNotification,
}) => {
  const [fetchId, setFetchId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<NexusStudent | null>(null);

  // Form fields
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [selectedClassStr, setSelectedClassStr] = useState('');
  const [selectedClass1, setSelectedClass1] = useState('');
  const [selectedClass2, setSelectedClass2] = useState('');
  const [isDualClass, setIsDualClass] = useState(false);
  const [admissionDate, setAdmissionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [monthlyFee, setMonthlyFee] = useState<number>(0);
  const [admissionFee, setAdmissionFee] = useState<number>(0);
  const [monthlyDiscount, setMonthlyDiscount] = useState<number>(0);
  const [admissionDiscount, setAdmissionDiscount] = useState<number>(0);
  const [prevDues, setPrevDues] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Helper to sync classes and auto-sum dues
  const updateClassAndFees = (c1Val: string, c2Val: string, dual: boolean) => {
    setSelectedClass1(c1Val);
    setSelectedClass2(c2Val);
    setIsDualClass(dual);

    const c1 = matchClassFromSegment(c1Val, classes);
    const c2 = dual && c2Val ? matchClassFromSegment(c2Val, classes) : undefined;

    let combined = '';
    if (dual && c1 && c2) {
      combined = formatDualClassesString(c1, c2);
    } else if (c1) {
      combined = formatSingleClassDemanded(c1);
    } else if (c2) {
      combined = formatSingleClassDemanded(c2);
    } else {
      combined = c1Val || '';
    }
    setSelectedClassStr(combined);

    if (c1 || c2) {
      const sumMonthly = (c1?.monthlyFee || 0) + (c2?.monthlyFee || 0);
      const sumAdmission = (c1?.admissionFee || 0) + (c2?.admissionFee || 0);
      setMonthlyFee(sumMonthly);
      setAdmissionFee(sumAdmission);
    } else if (!c1Val && !c2Val) {
      setMonthlyFee(0);
      setAdmissionFee(0);
    }
  };

  // Advance/Upcoming Monthly Fee Policy Option at Admission:
  // 'advance-current': Charge 1st month tuition in advance for the current month
  // 'advance-upcoming': Charge 1st month tuition in advance for upcoming/next month
  // 'none': Do NOT charge monthly fee at admission (charge only admission fee and existing dues)
  const [monthlyFeeMode, setMonthlyFeeMode] = useState<'advance-current' | 'advance-upcoming' | 'none'>('advance-current');

  // Past Month / Backlog Dues entries (allows manually inputting amounts for previous months)
  const [showPastMonths, setShowPastMonths] = useState(false);
  const [targetMonthIndicator, setTargetMonthIndicator] = useState<string>(() => {
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  const [pastMonthEntries, setPastMonthEntries] = useState<Array<{ monthName: string; amount: number }>>([
    { monthName: 'Previous Backlog / Past Month 1', amount: 0 },
    { monthName: 'Previous Backlog / Past Month 2', amount: 0 },
  ]);

  // Robust Fetch Student Data by ID
  const handleFetch = (overrideId?: string) => {
    const rawTarget = overrideId !== undefined ? overrideId : fetchId;
    const trimmed = rawTarget.trim();
    if (!trimmed) {
      onNotification('Please enter a Student ID number to fetch.', 'error');
      return;
    }

    const cleanInput = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Search students robustly: exact match, lowercase, or sanitized
    const found = students.find((s) => {
      const sId = (s.id || '').trim();
      const sIdClean = sId.toLowerCase().replace(/[^a-z0-9]/g, '');
      return (
        sId.toLowerCase() === trimmed.toLowerCase() ||
        sIdClean === cleanInput ||
        sIdClean.endsWith(cleanInput) ||
        cleanInput.endsWith(sIdClean)
      );
    });

    if (!found) {
      onNotification(
        `Student ID "${trimmed}" not found in registered records. Please register the student first in the Registration tab, or pick from the Quick Select list below.`,
        'error'
      );
      return;
    }

    setSelectedStudent(found);
    setStudentId(found.id);
    setFetchId(found.id);
    setStudentName(found.name || '');
    setFatherName(found.fatherName || found.guardianName || '');
    setPrevDues(found.dues || 0);

    // If student already has a class assigned and it is currently active, match it
    if (found.className && isClassActive(found.className, classes)) {
      const parsed = parseStudentClasses(found.className, classes);
      if (parsed.length >= 2) {
        setIsDualClass(true);
        setSelectedClass1(formatSingleClassDemanded(parsed[0]));
        setSelectedClass2(formatSingleClassDemanded(parsed[1]));
        setSelectedClassStr(formatDualClassesString(parsed[0], parsed[1]));
      } else if (parsed.length === 1) {
        setIsDualClass(false);
        setSelectedClass1(formatSingleClassDemanded(parsed[0]));
        setSelectedClass2('');
        setSelectedClassStr(formatSingleClassDemanded(parsed[0]));
      } else {
        setIsDualClass(found.className.includes(' + '));
        setSelectedClass1(found.className);
        setSelectedClass2('');
        setSelectedClassStr(found.className);
      }
      setMonthlyFee(found.monthlyFee || 0);
      setAdmissionFee(found.admissionFee || 0);
      setMonthlyDiscount(found.monthlyDiscount || 0);
      setAdmissionDiscount(found.admissionDiscount || 0);
    } else {
      setIsDualClass(false);
      setSelectedClass1('');
      setSelectedClass2('');
      setSelectedClassStr('');
      setMonthlyFee(0);
      setAdmissionFee(0);
      setMonthlyDiscount(0);
      setAdmissionDiscount(0);
    }

    onNotification(`Loaded records for student ${found.name} (${found.id}). Select a class option to proceed.`, 'success');
  };

  // When class option changes, automatically load fees
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classStr = e.target.value;
    setSelectedClassStr(classStr);

    if (!classStr) {
      setMonthlyFee(0);
      setAdmissionFee(0);
      return;
    }

    const matchedCls = classes.find(
      (c) =>
        `${c.teacher} | ${c.category} - ${c.className} (${c.startTime} to ${c.endTime})` ===
        classStr
    );

    if (matchedCls) {
      setMonthlyFee(matchedCls.monthlyFee || 0);
      setAdmissionFee(matchedCls.admissionFee || 0);
    }
  };

  // Date helpers for current and upcoming month
  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthName = nextMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Calculate net fees after discount
  const netMonthlyFee = Math.max(0, monthlyFee - (Number(monthlyDiscount) || 0));
  const netAdmissionFee = Math.max(0, admissionFee - (Number(admissionDiscount) || 0));
  const totalDiscount = (Number(monthlyDiscount) || 0) + (Number(admissionDiscount) || 0);

  // Effective monthly fee demanded at admission based on policy option:
  // - 'advance-current': Charges 1st month tuition in advance for current month
  // - 'advance-upcoming': Charges 1st month tuition in advance for upcoming/next month
  // - 'none': Does NOT charge monthly fee at admission (charges only admission fee & past dues)
  const chargedMonthlyFeeAtAdmission = monthlyFeeMode === 'none' ? 0 : netMonthlyFee;

  // Calculate total past month additions
  const totalPastMonthsAdditions = pastMonthEntries.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalRequired = chargedMonthlyFeeAtAdmission + netAdmissionFee + prevDues + totalPastMonthsAdditions;
  const remainingDues = Math.max(0, totalRequired - (paidAmount || 0));

  const handlePastMonthAmountChange = (index: number, val: number) => {
    setPastMonthEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], amount: isNaN(val) ? 0 : val };
      return copy;
    });
  };

  const handlePastMonthNameChange = (index: number, name: string) => {
    setPastMonthEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], monthName: name };
      return copy;
    });
  };

  const handleAddPastMonthRow = () => {
    setPastMonthEntries((prev) => [
      ...prev,
      { monthName: `Past Month ${prev.length + 1}`, amount: 0 },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId) {
      onNotification('Please fetch a registered student first.', 'error');
      return;
    }

    const cleanCurrentId = studentId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const studentToUpdate =
      selectedStudent ||
      students.find((s) => s.id === studentId) ||
      students.find((s) => (s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '') === cleanCurrentId);

    if (!studentToUpdate) {
      onNotification('Student record not found in system.', 'error');
      return;
    }

    if (!selectedClassStr) {
      onNotification('Please select a class option before completing admission.', 'error');
      return;
    }

    if (paidAmount < 0) {
      onNotification('Paid amount cannot be negative.', 'error');
      return;
    }

    const effectivePeriodLabel =
      monthlyFeeMode === 'none'
        ? `Admission Only (${currentMonthName} - Tuition starts ${nextMonthName})`
        : monthlyFeeMode === 'advance-upcoming'
        ? `${nextMonthName} (Advance Upcoming Month Tuition)`
        : (targetMonthIndicator || currentMonthName);

    // Build detailed breakdown of months for the A4 receipt
    const breakdownMonths = [
      {
        month: effectivePeriodLabel,
        duesDemanded: chargedMonthlyFeeAtAdmission + netAdmissionFee,
        amountSubmitted: paidAmount,
        submissionDate: admissionDate,
        submissionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: remainingDues === 0 ? 'Paid' : 'Partial',
      },
    ];

    // Add manual past months breakdown if filled
    pastMonthEntries.forEach((entry) => {
      if (entry.amount > 0) {
        breakdownMonths.push({
          month: entry.monthName,
          duesDemanded: entry.amount,
          amountSubmitted: 0,
          submissionDate: admissionDate,
          submissionTime: '',
          status: 'Added to Dues',
        });
      }
    });

    const updatedStudent: NexusStudent = {
      ...studentToUpdate,
      name: studentName,
      fatherName: fatherName,
      className: selectedClassStr,
      monthlyFee: netMonthlyFee, // Keep active monthly fee rate for ongoing billing
      admissionFee: netAdmissionFee,
      monthlyDiscount: Number(monthlyDiscount) || 0,
      admissionDiscount: Number(admissionDiscount) || 0,
      dues: remainingDues,
      totalPaid: (studentToUpdate.totalPaid || 0) + paidAmount,
      lastAdmissionDate: admissionDate,
      feePayments: paidAmount > 0 ? [
        ...(studentToUpdate.feePayments || []),
        {
          id: `FP-${Date.now()}`,
          month: effectivePeriodLabel,
          amount: paidAmount,
          date: admissionDate,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: monthlyFeeMode === 'none'
            ? 'Admission Fee Payment (Monthly tuition starts upcoming cycle)'
            : monthlyFeeMode === 'advance-upcoming'
            ? `Advance Tuition (${nextMonthName}) + Admission`
            : 'Admission & 1st Month Tuition',
        }
      ] : studentToUpdate.feePayments,
      monthlyHistory: {
        ...(studentToUpdate.monthlyHistory || {}),
        [monthlyFeeMode === 'advance-upcoming' ? nextMonthName : currentMonthName]: {
          fee: chargedMonthlyFeeAtAdmission,
          paid: paidAmount,
          paidDate: paidAmount > 0 ? admissionDate : '',
          paidTime: paidAmount > 0 ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          status: remainingDues === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid'),
        },
        [`${monthlyFeeMode === 'advance-upcoming' ? nextMonthName : currentMonthName} ${new Date(admissionDate).getFullYear() || now.getFullYear()}`]: {
          fee: chargedMonthlyFeeAtAdmission,
          paid: paidAmount,
          paidDate: paidAmount > 0 ? admissionDate : '',
          paidTime: paidAmount > 0 ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          status: remainingDues === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid'),
        },
      }
    };

    const receipt: ReceiptData = {
      receiptNo: generateReceiptNumber(studentId),
      date: admissionDate,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      studentId: studentId,
      studentName: studentName,
      fatherName: fatherName,
      className: selectedClassStr,
      admissionDate: admissionDate,
      recordPeriod: effectivePeriodLabel,
      monthlyFee: chargedMonthlyFeeAtAdmission,
      admissionFee: netAdmissionFee,
      monthlyDiscount: Number(monthlyDiscount) || 0,
      admissionDiscount: Number(admissionDiscount) || 0,
      prevDues: prevDues + totalPastMonthsAdditions,
      paidAmount: paidAmount,
      remainingDues: remainingDues,
      targetMonth: effectivePeriodLabel,
      studentNumber: studentToUpdate.studentNumber,
      guardianNumber: studentToUpdate.guardianNumber,
      gmail: studentToUpdate.gmail,
      photo: studentToUpdate.photo,
      monthsBreakdown: breakdownMonths,
    };

    const admitAction = onAdmitStudent || onSaveAdmission;
    if (typeof admitAction === 'function') {
      admitAction(updatedStudent, receipt);
    }

    onNotification(
      `Admission completed for ${studentName}! Assigned to ${selectedClassStr}. Fee receipt generated in A4 layout.`,
      'success'
    );

    // Reset admission form for next admission
    setSelectedStudent(null);
    setFetchId('');
    setStudentId('');
    setStudentName('');
    setFatherName('');
    setSelectedClassStr('');
    setMonthlyFee(0);
    setAdmissionFee(0);
    setPrevDues(0);
    setPaidAmount(0);
    setPastMonthEntries([
      { monthName: 'Previous Backlog / Past Month 1', amount: 0 },
      { monthName: 'Previous Backlog / Past Month 2', amount: 0 },
    ]);
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-blue-600" /> Student Class Admission &amp; Enrollment
        </h3>
      </div>

      {/* Fetch by ID Bar */}
      <div className="bg-slate-100 p-3.5 rounded-lg mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={fetchId}
          onChange={(e) => setFetchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          placeholder="Type Student ID Number to Fetch Data (e.g. C25, NEX-1001)..."
          className="h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 flex-1 min-w-[240px]"
        />
        <button
          type="button"
          onClick={() => handleFetch()}
          className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-md inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
        >
          <CloudDownload className="w-4 h-4" /> Fetch Student Data
        </button>
      </div>

      {/* Quick Select Student dropdown for easy 1-click admission */}
      {students.length > 0 && (
        <div className="mb-6 p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg flex items-center gap-3 flex-wrap text-xs">
          <span className="font-semibold text-blue-900 shrink-0">Quick Select Registered Student:</span>
          <select
            value={studentId}
            onChange={(e) => {
              if (e.target.value) handleFetch(e.target.value);
            }}
            className="h-8 px-2 bg-white border border-blue-300 rounded text-xs text-slate-800 outline-none flex-1 min-w-[200px]"
          >
            <option value="">-- Choose Registered Student (Total: {students.length}) --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name} ({getActiveStudentClassDisplay(s.className, classes)})
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Student ID */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student ID Number
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Auto-filled on fetch"
              className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* Student Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Full Name"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* Father / Guardian Name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Father Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="Guardian / Father Name"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* Class Options: Single or Dual Class Assignment */}
          <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Class Enrollment {classes.length > 0 && <span className="text-red-500">*</span>} {isDualClass ? '(2 Classes Active)' : '(Single Class)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  const nextDual = !isDualClass;
                  updateClassAndFees(selectedClass1, nextDual ? selectedClass2 : '', nextDual);
                }}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition cursor-pointer ${
                  isDualClass
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {isDualClass ? '✕ Remove 2nd Class' : '+ Add 2nd Class (Same Day)'}
              </button>
            </div>

            {/* Class Option 1 (Primary) */}
            <div>
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                {isDualClass ? 'Class Option 1 (Primary):' : 'Select Class Option:'}
              </span>
              <select
                value={selectedClass1}
                onChange={(e) => updateClassAndFees(e.target.value, selectedClass2, isDualClass)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required={classes.length > 0}
              >
                <option value="">
                  {classes.length === 0 ? '-- No Classes Created Yet (General Tuition) --' : '-- Choose Class Option --'}
                </option>
                {classes.length === 0 && (
                  <option value="General Tuition">General Tuition / Unassigned Class</option>
                )}
                {classes.map((cls, idx) => {
                  const demandedFmt = formatSingleClassDemanded(cls);
                  return (
                    <option key={idx} value={demandedFmt}>
                      {demandedFmt} — {currency} {cls.monthlyFee || 0}/mo
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Class Option 2 (Secondary - When Dual Enrolled) */}
            {isDualClass && (
              <div className="pt-2 border-t border-slate-200 animate-in fade-in">
                <span className="text-[11px] font-semibold text-blue-700 block mb-1">
                  Class Option 2 (Second Class on Same Day):
                </span>
                <select
                  value={selectedClass2}
                  onChange={(e) => updateClassAndFees(selectedClass1, e.target.value, true)}
                  className="w-full h-10 px-3 bg-white border border-blue-300 rounded-md text-sm outline-none focus:border-blue-600"
                >
                  <option value="">-- Select Second Class --</option>
                  {classes.map((cls, idx) => {
                    const demandedFmt = formatSingleClassDemanded(cls);
                    return (
                      <option key={idx} value={demandedFmt}>
                        {demandedFmt} — {currency} {cls.monthlyFee || 0}/mo
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Demanded Order Display Preview */}
            {selectedClassStr && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-950">
                <div className="font-semibold text-blue-900 mb-0.5">Demanded Receipt Order:</div>
                <div className="font-mono text-[10.5px] font-bold break-words">{selectedClassStr}</div>
                {isDualClass && selectedClass1 && selectedClass2 && (
                  <div className="text-[10.5px] text-emerald-700 font-bold mt-1">
                    ✓ Dues automatically summed: Monthly Fee ({currency} {monthlyFee}) + Admission ({currency} {admissionFee})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Admission Date */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Admission Date
            </label>
            <input
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* Fee Target Month Indicator */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1 flex items-center justify-between">
              <span>Submit Past / Target Month Fee Indicator</span>
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
            </label>
            <input
              type="text"
              value={targetMonthIndicator}
              onChange={(e) => setTargetMonthIndicator(e.target.value)}
              placeholder="e.g. October 2026 or Current Month"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          {/* Monthly Tuition Fee Policy at Admission */}
          <div className="sm:col-span-2 p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Monthly Fee Charging Policy at Admission
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  Advance / Deferred Option
                </span>
              </div>
              <span className="text-xs font-bold text-blue-700">
                {monthlyFeeMode === 'advance-current' && `Charges 1st Month (${currentMonthName})`}
                {monthlyFeeMode === 'advance-upcoming' && `Charges Upcoming Month (${nextMonthName})`}
                {monthlyFeeMode === 'none' && `Monthly Fee: ${currency} 0 today (Only Admission Fee)`}
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Select whether to collect the student's 1st month tuition fee now in advance, designate for the upcoming month, or exclude monthly tuition at admission:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMonthlyFeeMode('advance-current');
                  setTargetMonthIndicator(currentMonthName);
                }}
                className={`p-3 text-left rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  monthlyFeeMode === 'advance-current'
                    ? 'bg-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-white/70 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Charge Current Month</span>
                  {monthlyFeeMode === 'advance-current' && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-blue-600 mt-1">{currentMonthName}</span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Includes {currency} {netMonthlyFee.toLocaleString()} 1st month tuition today.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMonthlyFeeMode('advance-upcoming');
                  setTargetMonthIndicator(nextMonthName);
                }}
                className={`p-3 text-left rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  monthlyFeeMode === 'advance-upcoming'
                    ? 'bg-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-white/70 border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Charge Upcoming Month</span>
                  {monthlyFeeMode === 'advance-upcoming' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 mt-1">{nextMonthName} (Advance)</span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Charges {currency} {netMonthlyFee.toLocaleString()} in advance for next month.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMonthlyFeeMode('none');
                  setTargetMonthIndicator(`Admission Only (${nextMonthName} tuition later)`);
                }}
                className={`p-3 text-left rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  monthlyFeeMode === 'none'
                    ? 'bg-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-white/70 border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Do NOT Charge Monthly Fee</span>
                  {monthlyFeeMode === 'none' && (
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-amber-700 mt-1">Tuition: {currency} 0 now</span>
                <span className="text-[10px] text-slate-500 mt-1">
                  Only charges Admission Fee & backlog dues. Monthly cycle starts later.
                </span>
              </button>
            </div>
          </div>

          {/* Current Class Monthly Fee */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1 flex items-center justify-between">
              <span>Current Class Monthly Fee ({currency})</span>
              <span className="text-[10px] text-slate-400">Standard</span>
            </label>
            <input
              type="number"
              value={monthlyFee || ''}
              onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 font-semibold outline-none focus:border-blue-600"
            />
          </div>

          {/* Monthly Fee Discount */}
          <div>
            <label className="text-xs font-semibold text-emerald-700 block mb-1 flex items-center justify-between">
              <span>Discount in Monthly Fee ({currency})</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Net: {currency} {netMonthlyFee.toLocaleString()}
              </span>
            </label>
            <input
              type="number"
              min={0}
              value={monthlyDiscount || ''}
              onChange={(e) => setMonthlyDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full h-10 px-3 bg-emerald-50/50 border border-emerald-300 rounded-md text-sm text-emerald-800 font-semibold outline-none focus:border-emerald-600"
            />
          </div>

          {/* Admission Fee */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1 flex items-center justify-between">
              <span>Admission Fee ({currency})</span>
              <span className="text-[10px] text-slate-400">Standard</span>
            </label>
            <input
              type="number"
              value={admissionFee}
              onChange={(e) => setAdmissionFee(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 font-semibold outline-none focus:border-blue-600"
            />
          </div>

          {/* Admission Fee Discount */}
          <div>
            <label className="text-xs font-semibold text-emerald-700 block mb-1 flex items-center justify-between">
              <span>Discount in Admission Fee ({currency})</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Net: {currency} {netAdmissionFee.toLocaleString()}
              </span>
            </label>
            <input
              type="number"
              min={0}
              value={admissionDiscount || ''}
              onChange={(e) => setAdmissionDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full h-10 px-3 bg-emerald-50/50 border border-emerald-300 rounded-md text-sm text-emerald-800 font-semibold outline-none focus:border-emerald-600"
            />
          </div>

          {/* Previous Outstanding Dues */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Previous Outstanding Dues ({currency})
            </label>
            <input
              type="number"
              value={prevDues}
              onChange={(e) => setPrevDues(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Previous Months Blanks for Manual Fee Input */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" /> Blanks for Previous Months (Manual Input Amounts)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add previous unpaid months or custom fee backlog. Amounts entered will be added to the total demand.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPastMonths(!showPastMonths)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {showPastMonths ? 'Hide Previous Month Blanks' : 'Show Blanks for Previous Months'}
            </button>
          </div>

          {showPastMonths && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              {pastMonthEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={entry.monthName}
                    onChange={(e) => handlePastMonthNameChange(idx, e.target.value)}
                    placeholder="e.g. August 2026 Fee"
                    className="h-9 px-3 bg-white border border-slate-300 rounded-md text-xs flex-1 outline-none focus:border-blue-600"
                  />
                  <div className="flex items-center gap-1.5 w-40">
                    <span className="text-xs text-slate-500">{currency}</span>
                    <input
                      type="number"
                      min={0}
                      value={entry.amount || ''}
                      onChange={(e) => handlePastMonthAmountChange(idx, parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9 px-3 bg-white border border-slate-300 rounded-md text-xs w-full font-semibold outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleAddPastMonthRow}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  + Add another previous month blank
                </button>
                {totalPastMonthsAdditions > 0 && (
                  <span className="text-xs font-semibold text-slate-700">
                    Previous Months Total: {currency} {totalPastMonthsAdditions.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment and Dues Calculation Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl items-center">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Total Demanded at Admission</span>
            <span className="text-base font-bold text-slate-900">
              {currency} {totalRequired.toLocaleString()}
            </span>
            <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
              <div>
                Admission Fee: <strong>{currency} {netAdmissionFee.toLocaleString()}</strong>
              </div>
              <div>
                Monthly Tuition:{' '}
                {monthlyFeeMode === 'none' ? (
                  <span className="text-amber-700 font-bold">{currency} 0 (Deferred to next cycle)</span>
                ) : (
                  <strong>{currency} {chargedMonthlyFeeAtAdmission.toLocaleString()} ({monthlyFeeMode === 'advance-upcoming' ? 'Advance Upcoming' : 'Advance Current'})</strong>
                )}
              </div>
              {prevDues > 0 && <div>Previous Dues: <strong>{currency} {prevDues.toLocaleString()}</strong></div>}
            </div>
            {totalDiscount > 0 && (
              <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                Discount applied: -{currency} {totalDiscount.toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Paid Amount ({currency}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              value={paidAmount || ''}
              onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm font-bold text-emerald-700 outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-500 block">Calculated Remaining Dues</span>
            <span className={`text-lg font-black ${remainingDues > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {currency} {remainingDues.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" /> Admit Student &amp; Generate A4 Fee Receipt
          </button>
        </div>
      </form>
    </div>
  );
};
