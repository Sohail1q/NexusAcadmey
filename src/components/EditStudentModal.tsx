import React, { useState, useEffect } from 'react';
import {
  Pencil,
  X,
  Check,
  Camera,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Calculator,
  Coins,
  AlertCircle,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { NexusStudent, NexusClass } from '../types';
import { compressImage } from '../utils/imageOptimizer';
import {
  isClassActive,
  formatClassString,
  formatSingleClassDemanded,
  formatDualClassesString,
  matchClassFromSegment,
  parseStudentClasses,
} from '../utils/classUtils';
import { uploadImageToServer, getFullPhotoUrl } from '../utils/photoUtils';

interface EditStudentModalProps {
  student: NexusStudent | null;
  classes: NexusClass[];
  currency?: string;
  onClose: () => void;
  onSave: (updated: NexusStudent) => void;
}

const MONTHS_LIST = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  classes,
  currency = 'PKR',
  onClose,
  onSave,
}) => {
  if (!student) return null;

  const [name, setName] = useState(student.name);
  const [father, setFather] = useState(student.fatherName);
  const [guardianNum, setGuardianNum] = useState(student.guardianNumber || '');
  const [studentNum, setStudentNum] = useState(student.studentNumber || '');
  const [gmail, setGmail] = useState(student.gmail || '');
  const [biometricId, setBiometricId] = useState(student.biometricId || '');
  const [className, setClassName] = useState(() =>
    student.className && isClassActive(student.className, classes) ? student.className : ''
  );
  const [isDualClass, setIsDualClass] = useState<boolean>(() => {
    return Boolean(student.className && student.className.includes(' + '));
  });
  const [class1, setClass1] = useState<string>('');
  const [class2, setClass2] = useState<string>('');
  const [monthlyFee, setMonthlyFee] = useState<number>(student.monthlyFee || 0);
  const [admissionFee, setAdmissionFee] = useState<number>(student.admissionFee || 0);
  const [totalPaid, setTotalPaid] = useState<number>(student.totalPaid || 0);
  const [dues, setDues] = useState<number>(student.dues || 0);
  const [photo, setPhoto] = useState<string>(student.photo || '');
  const [monthlyDiscount, setMonthlyDiscount] = useState<number>(student.monthlyDiscount || 0);
  const [admissionDiscount, setAdmissionDiscount] = useState<number>(student.admissionDiscount || 0);

  // Month-wise fee adjustments & breakdown state
  const [activeSection, setActiveSection] = useState<
    'none' | 'fine' | 'previousDues' | 'currentDues' | 'pastClassDues'
  >('none');
  const [fineMonths, setFineMonths] = useState<Record<string, number>>(
    student.feeAdjustments?.fine?.months || {}
  );
  const [prevDuesMonths, setPrevDuesMonths] = useState<Record<string, number>>(
    student.feeAdjustments?.previousDues?.months || {}
  );
  const [currentDuesMonths, setCurrentDuesMonths] = useState<Record<string, number>>(
    student.feeAdjustments?.currentDues?.months || {}
  );
  const [pastDuesMonths, setPastDuesMonths] = useState<Record<string, number>>(
    student.feeAdjustments?.pastClassDues?.months || {}
  );
  const [pastClassName, setPastClassName] = useState<string>(
    student.feeAdjustments?.pastClassDues?.pastClassName || ''
  );

  useEffect(() => {
    if (student) {
      setName(student.name);
      setFather(student.fatherName);
      setGuardianNum(student.guardianNumber || '');
      setStudentNum(student.studentNumber || '');
      setGmail(student.gmail || '');
      setBiometricId(student.biometricId || '');

      // Parse existing assigned classes (supporting single or dual classes)
      if (student.className && isClassActive(student.className, classes)) {
        const parsed = parseStudentClasses(student.className, classes);
        if (parsed.length >= 2) {
          setIsDualClass(true);
          setClass1(formatSingleClassDemanded(parsed[0]));
          setClass2(formatSingleClassDemanded(parsed[1]));
          setClassName(formatDualClassesString(parsed[0], parsed[1]));
        } else if (parsed.length === 1) {
          setIsDualClass(false);
          setClass1(formatSingleClassDemanded(parsed[0]));
          setClass2('');
          setClassName(formatSingleClassDemanded(parsed[0]));
        } else {
          setIsDualClass(student.className.includes(' + '));
          setClass1(student.className);
          setClass2('');
          setClassName(student.className);
        }
      } else {
        setIsDualClass(false);
        setClass1('');
        setClass2('');
        setClassName('');
      }

      setMonthlyFee(student.monthlyFee || 0);
      setAdmissionFee(student.admissionFee || 0);
      setTotalPaid(student.totalPaid || 0);
      setDues(student.dues || 0);
      setPhoto(student.photo || '');
      setMonthlyDiscount(student.monthlyDiscount || 0);
      setAdmissionDiscount(student.admissionDiscount || 0);

      setFineMonths(student.feeAdjustments?.fine?.months || {});
      setPrevDuesMonths(student.feeAdjustments?.previousDues?.months || {});
      setCurrentDuesMonths(student.feeAdjustments?.currentDues?.months || {});
      setPastDuesMonths(student.feeAdjustments?.pastClassDues?.months || {});
      setPastClassName(student.feeAdjustments?.pastClassDues?.pastClassName || '');
    }
  }, [student, classes]);

  // Compute category totals
  const fineTotal: number = Object.values(fineMonths).reduce<number>(
    (sum, v) => sum + (typeof v === 'number' ? v : Number(v) || 0),
    0
  );
  const prevDuesTotal: number = Object.values(prevDuesMonths).reduce<number>(
    (sum, v) => sum + (typeof v === 'number' ? v : Number(v) || 0),
    0
  );
  const currentDuesTotal: number = Object.values(currentDuesMonths).reduce<number>(
    (sum, v) => sum + (typeof v === 'number' ? v : Number(v) || 0),
    0
  );
  const pastDuesTotal: number = Object.values(pastDuesMonths).reduce<number>(
    (sum, v) => sum + (typeof v === 'number' ? v : Number(v) || 0),
    0
  );
  const sumOfAdjustments: number = fineTotal + prevDuesTotal + currentDuesTotal + pastDuesTotal;

  // Handle Class Option Change & Auto-Summing of Fees
  const handleUpdateClassesAndFees = (c1Val: string, c2Val: string, dual: boolean) => {
    setClass1(c1Val);
    setClass2(c2Val);
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
    setClassName(combined);

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

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 240, 240, 0.8);
        setPhoto(compressed);
        // Upload immediately to server to get permanent online URL link
        const uploadedUrl = await uploadImageToServer(compressed, student.id, student.name);
        if (uploadedUrl) {
          setPhoto(uploadedUrl);
        }
      } catch (err) {
        console.error('Failed to process photo:', err);
      }
    }
  };

  const handleMonthValueChange = (
    type: 'fine' | 'previousDues' | 'currentDues' | 'pastClassDues',
    month: string,
    valStr: string
  ) => {
    const val = parseFloat(valStr) || 0;
    if (type === 'fine') {
      setFineMonths((prev) => ({ ...prev, [month]: val }));
    } else if (type === 'previousDues') {
      setPrevDuesMonths((prev) => ({ ...prev, [month]: val }));
    } else if (type === 'currentDues') {
      setCurrentDuesMonths((prev) => ({ ...prev, [month]: val }));
    } else if (type === 'pastClassDues') {
      setPastDuesMonths((prev) => ({ ...prev, [month]: val }));
    }
  };

  const handleApplyAdjustmentsToDues = () => {
    setDues(sumOfAdjustments);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMonths = (rec: Record<string, number>) =>
      Object.fromEntries(Object.entries(rec).filter(([_, v]) => Number(v) > 0));

    const finalFine = cleanMonths(fineMonths);
    const finalPrev = cleanMonths(prevDuesMonths);
    const finalCurr = cleanMonths(currentDuesMonths);
    const finalPast = cleanMonths(pastDuesMonths);

    const hasAnyAdjustment =
      fineTotal > 0 || prevDuesTotal > 0 || currentDuesTotal > 0 || pastDuesTotal > 0;

    const finalDues =
      sumOfAdjustments > 0 && (dues === 0 || dues === student.dues)
        ? sumOfAdjustments
        : Number(dues) || 0;

    const finalMonthlyFee = Number(monthlyFee) || 0;
    const finalAdmissionFee = Number(admissionFee) || 0;
    const finalTotalPaid = Number(totalPaid) || 0;

    // Update monthlyHistory so edited fees propagate to all months & receipts
    const updatedMonthlyHistory = student.monthlyHistory ? { ...student.monthlyHistory } : {};
    Object.keys(updatedMonthlyHistory).forEach((m) => {
      updatedMonthlyHistory[m] = {
        ...updatedMonthlyHistory[m],
        fee: finalMonthlyFee,
      };
    });

    onSave({
      ...student,
      name: name.trim(),
      fatherName: father.trim(),
      guardianName: father.trim(),
      guardianNumber: guardianNum.trim(),
      studentNumber: studentNum.trim(),
      gmail: gmail.trim(),
      biometricId: biometricId.trim() || undefined,
      className,
      monthlyFee: finalMonthlyFee,
      admissionFee: finalAdmissionFee,
      dues: finalDues,
      totalPaid: finalTotalPaid,
      monthlyDiscount: Number(monthlyDiscount) || 0,
      admissionDiscount: Number(admissionDiscount) || 0,
      photo: photo.trim() ? photo : '',
      monthlyHistory: updatedMonthlyHistory,
      feeAdjustments: hasAnyAdjustment
        ? {
            fine: { total: fineTotal, months: finalFine },
            previousDues: { total: prevDuesTotal, months: finalPrev },
            currentDues: { total: currentDuesTotal, months: finalCurr },
            pastClassDues: {
              total: pastDuesTotal,
              pastClassName: pastClassName.trim(),
              months: finalPast,
            },
          }
        : student.feeAdjustments,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-500" /> Edit Student Data ({student.id})
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Photo Edit (Square Photo or Square Blank) */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="relative shrink-0">
              {photo && !photo.includes('svg') ? (
                <div className="relative group">
                  <img
                    src={photo}
                    alt={name}
                    className="w-16 h-16 rounded-md object-cover border-2 border-blue-600 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    title="Remove photo (make square blank)"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs shadow transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md bg-white flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 shadow-2xs">
                  <Camera className="w-5 h-5 text-slate-300 mb-0.5" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Blank</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Student Photo (Square Blank if none)
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 inline-flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Image
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Upload new picture or click remove to keep a square blank.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Father / Guardian Name
            </label>
            <input
              type="text"
              value={father}
              onChange={(e) => setFather(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Guardian Number
              </label>
              <input
                type="text"
                value={guardianNum}
                onChange={(e) => setGuardianNum(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Student Number
              </label>
              <input
                type="text"
                value={studentNum}
                onChange={(e) => setStudentNum(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Gmail / Email
            </label>
            <input
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Biometric ID / Token (Optional)
            </label>
            <input
              type="text"
              value={biometricId}
              onChange={(e) => setBiometricId(e.target.value)}
              placeholder="e.g. 1111 (or token created on physical device)"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Optionally enter, update, or paste the student's Biometric ID / Token (e.g., ID "1111" created directly on the physical biometric scanner).
            </p>
          </div>

          {/* Class Options: Single or Dual Class Assignment */}
          <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Class Enrollment {isDualClass ? '(2 Classes Active)' : '(Single Class)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  const nextDual = !isDualClass;
                  handleUpdateClassesAndFees(class1, nextDual ? class2 : '', nextDual);
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
                value={class1}
                onChange={(e) => handleUpdateClassesAndFees(e.target.value, class2, isDualClass)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              >
                <option value="">-- No Class Assigned (Unassigned) --</option>
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
                  value={class2}
                  onChange={(e) => handleUpdateClassesAndFees(class1, e.target.value, true)}
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
            {className && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-950">
                <div className="font-semibold text-blue-900 mb-0.5">Demanded Receipt Order:</div>
                <div className="font-mono text-[10.5px] font-bold break-words">{className}</div>
                {isDualClass && class1 && class2 && (
                  <div className="text-[10.5px] text-emerald-700 font-bold mt-1">
                    ✓ All dues auto-summed: Monthly Fee ({currency} {monthlyFee}) + Admission ({currency} {admissionFee})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tuition & Admission Fee Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
            <div>
              <label className="text-xs font-semibold text-blue-900 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Monthly Tuition Fee ({currency})
                </span>
                {isDualClass && <span className="text-[10px] text-blue-700 font-bold">(Sum of 2 Classes)</span>}
              </label>
              <input
                type="number"
                min={0}
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full h-9 px-3 bg-white border border-blue-300 rounded-md text-xs font-bold text-blue-950 outline-none focus:border-blue-600"
                required
              />
              <p className="text-[10px] text-blue-700 mt-1">
                Editing fee here immediately propagates to all student receipts.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-blue-900 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-blue-600" /> Admission Fee ({currency})
                </span>
                {isDualClass && <span className="text-[10px] text-blue-700 font-bold">(Summed)</span>}
              </label>
              <input
                type="number"
                min={0}
                value={admissionFee}
                onChange={(e) => setAdmissionFee(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full h-9 px-3 bg-white border border-blue-300 rounded-md text-xs font-bold text-blue-950 outline-none focus:border-blue-600"
              />
              <p className="text-[10px] text-blue-700 mt-1">
                One-time registration / admission fee.
              </p>
            </div>
          </div>

          {/* Total Amount Paid to Date */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Total Amount Paid to Date ({currency})
            </label>
            <input
              type="number"
              min={0}
              value={totalPaid}
              onChange={(e) => setTotalPaid(parseFloat(e.target.value) || 0)}
              className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-sm font-bold text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          {/* Fee Discount Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl">
            <div>
              <label className="text-xs font-semibold text-emerald-800 block mb-1">
                Monthly Fee Discount ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={monthlyDiscount || ''}
                onChange={(e) => setMonthlyDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full h-9 px-3 bg-white border border-emerald-300 rounded-md text-xs font-semibold text-emerald-900 outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-emerald-800 block mb-1">
                Admission Fee Discount ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={admissionDiscount || ''}
                onChange={(e) => setAdmissionDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full h-9 px-3 bg-white border border-emerald-300 rounded-md text-xs font-semibold text-emerald-900 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Dues & Fee Adjustments Section */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Coins className="w-4 h-4 text-emerald-600" /> Total Outstanding Dues ({currency})
                </label>
                <p className="text-[11px] text-slate-500">
                  Type total dues directly or click options below to break down across 12 months.
                </p>
              </div>

              {sumOfAdjustments > 0 && (
                <button
                  type="button"
                  onClick={handleApplyAdjustmentsToDues}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md inline-flex items-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" /> Apply Breakdown Total: {currency}{' '}
                  {sumOfAdjustments.toLocaleString()}
                </button>
              )}
            </div>

            <input
              type="number"
              min={0}
              value={dues}
              onChange={(e) => setDues(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-base font-bold text-slate-900 outline-none focus:border-blue-600"
              required
            />

            {/* 4 Interactive Fee Breakdown Option Buttons */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">
                Click option to type month-wise amounts (12 months):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Fine Option */}
                <button
                  type="button"
                  onClick={() => setActiveSection(activeSection === 'fine' ? 'none' : 'fine')}
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeSection === 'fine'
                      ? 'bg-red-50 border-red-400 text-red-950 shadow-xs ring-1 ring-red-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Fine
                    </span>
                    {activeSection === 'fine' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    {currency} {fineTotal.toLocaleString()}
                  </div>
                </button>

                {/* 2. Previous Dues Option */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveSection(activeSection === 'previousDues' ? 'none' : 'previousDues')
                  }
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeSection === 'previousDues'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Prev Dues
                    </span>
                    {activeSection === 'previousDues' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    {currency} {prevDuesTotal.toLocaleString()}
                  </div>
                </button>

                {/* 3. Current Dues Option */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveSection(activeSection === 'currentDues' ? 'none' : 'currentDues')
                  }
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeSection === 'currentDues'
                      ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Current Dues
                    </span>
                    {activeSection === 'currentDues' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    {currency} {currentDuesTotal.toLocaleString()}
                  </div>
                </button>

                {/* 4. Past Class Dues Option */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveSection(activeSection === 'pastClassDues' ? 'none' : 'pastClassDues')
                  }
                  className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                    activeSection === 'pastClassDues'
                      ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-xs ring-1 ring-purple-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Past Class Dues
                    </span>
                    {activeSection === 'pastClassDues' ? (
                      <ChevronUp className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1">
                    {currency} {pastDuesTotal.toLocaleString()}
                  </div>
                </button>
              </div>
            </div>

            {/* 12 Months Breakdown Details Zone */}
            {activeSection === 'fine' && (
              <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600" /> Fine Breakdown (12 Months)
                  </h4>
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                    Subtotal: {currency} {fineTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-red-700">
                  Type any fine amount against the respective month:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MONTHS_LIST.map((m) => (
                    <div key={m} className="bg-white p-2 rounded-lg border border-red-100 shadow-2xs">
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 truncate">
                        {m}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={fineMonths[m] || ''}
                        onChange={(e) => handleMonthValueChange('fine', m, e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'previousDues' && (
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" /> Previous Dues in Current Class (12 Months)
                  </h4>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Subtotal: {currency} {prevDuesTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700">
                  Type previous dues for each month in the student's current class:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MONTHS_LIST.map((m) => (
                    <div key={m} className="bg-white p-2 rounded-lg border border-amber-100 shadow-2xs">
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 truncate">
                        {m}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={prevDuesMonths[m] || ''}
                        onChange={(e) => handleMonthValueChange('previousDues', m, e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 outline-none focus:border-amber-500 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'currentDues' && (
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-blue-600" /> Current Dues in Current Class (12 Months)
                  </h4>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Subtotal: {currency} {currentDuesTotal.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-blue-700">
                  Type current dues for each month in the student's current class:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MONTHS_LIST.map((m) => (
                    <div key={m} className="bg-white p-2 rounded-lg border border-blue-100 shadow-2xs">
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 truncate">
                        {m}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={currentDuesMonths[m] || ''}
                        onChange={(e) => handleMonthValueChange('currentDues', m, e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'pastClassDues' && (
              <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-600" /> Past Class Dues (Type Class &amp; 12 Months)
                  </h4>
                  <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    Subtotal: {currency} {pastDuesTotal.toLocaleString()}
                  </span>
                </div>

                {/* Specific Past Class Name Blank */}
                <div className="bg-white p-3 rounded-lg border border-purple-200">
                  <label className="text-xs font-bold text-purple-900 block mb-1">
                    Past Class Name (Type previous/past class name):
                  </label>
                  <input
                    type="text"
                    value={pastClassName}
                    onChange={(e) => setPastClassName(e.target.value)}
                    placeholder="e.g. 9th Grade Physics / Previous Batch 2025"
                    className="w-full h-9 px-3 bg-purple-50/40 border border-purple-300 rounded-md text-xs font-semibold text-purple-950 outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>

                <p className="text-[11px] text-purple-700">
                  Type dues from this past class for any of the 12 months:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {MONTHS_LIST.map((m) => (
                    <div key={m} className="bg-white p-2 rounded-lg border border-purple-100 shadow-2xs">
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5 truncate">
                        {m}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={pastDuesMonths[m] || ''}
                        onChange={(e) => handleMonthValueChange('pastClassDues', m, e.target.value)}
                        placeholder="0"
                        className="w-full h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 outline-none focus:border-purple-500 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Check className="w-4 h-4" /> Save Changes &amp; Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
