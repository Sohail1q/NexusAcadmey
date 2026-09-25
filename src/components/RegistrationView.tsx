import React, { useState } from 'react';
import { UserPlus, Camera, CheckCircle, Trash2 } from 'lucide-react';
import { NexusStudent } from '../types';
import { compressImage } from '../utils/imageOptimizer';

interface RegistrationViewProps {
  students: NexusStudent[];
  onRegisterStudent: (newStudent: NexusStudent) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({
  students,
  onRegisterStudent,
  onNotification,
}) => {
  const [photoData, setPhotoData] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [guardianNumber, setGuardianNumber] = useState<string>('');
  const [studentNumber, setStudentNumber] = useState<string>('');
  const [gmail, setGmail] = useState<string>('');
  const [biometricId, setBiometricId] = useState<string>('');

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 240, 240, 0.8);
        setPhotoData(compressed);
        onNotification('Student photograph attached and compressed!', 'success');
      } catch {
        onNotification('Could not read selected photo file', 'error');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let id = studentId.trim();
    if (!id) {
      id = 'NEX-' + Math.floor(1000 + Math.random() * 9000);
    }

    // Check duplicate ID
    if (students.some((s) => s.id.toLowerCase() === id.toLowerCase())) {
      onNotification(`Student ID "${id}" already exists. Please choose a unique ID or leave blank to auto-generate.`, 'error');
      return;
    }

    const newStudent: NexusStudent = {
      id,
      name: studentName.trim(),
      fatherName: guardianName.trim(),
      guardianName: guardianName.trim(),
      guardianNumber: guardianNumber.trim(),
      studentNumber: studentNumber.trim(),
      gmail: gmail.trim(),
      biometricId: biometricId.trim() || undefined,
      photo: photoData.trim() ? photoData : '',
      className: '',
      admissionDate: new Date().toISOString().split('T')[0],
      registeredAt: new Date().toISOString(),
      monthlyFee: 0,
      admissionFee: 0,
      dues: 0,
      totalPaid: 0,
    };

    onRegisterStudent(newStudent);

    // Reset Form
    setPhotoData('');
    setStudentId('');
    setStudentName('');
    setGuardianName('');
    setGuardianNumber('');
    setStudentNumber('');
    setGmail('');
    setBiometricId('');

    onNotification(`Student ${newStudent.name} registered with ID ${newStudent.id}!`, 'success');
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" /> New Student Registration &amp; Contact Info
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Box (Square Photo / Square Blank) */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="relative shrink-0">
            {photoData ? (
              <div className="relative group">
                <img
                  src={photoData}
                  alt="Student preview"
                  className="w-20 h-20 rounded-lg object-cover border-2 border-blue-600 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setPhotoData('')}
                  title="Remove picture (keep blank)"
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg bg-white flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 shadow-2xs">
                <Camera className="w-6 h-6 text-slate-300 mb-1" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blank</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-xs font-semibold text-slate-800">
                Student Photo (Square Blank if not selected)
              </label>
              {photoData && (
                <button
                  type="button"
                  onClick={() => setPhotoData('')}
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
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Select student photo. If left unselected, will remain a clean square blank.
            </p>
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student ID Number (LEAVE BLANK FOR AUTO GENERATE)
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. NEX-1045 or leave empty"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Student Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Student Full Name"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              GUARDIAN Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Guardian / Father Name"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              GUARDIAN NUMBER <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={guardianNumber}
              onChange={(e) => setGuardianNumber(e.target.value)}
              placeholder="03XXXXXXXXX"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              STUDENT NUMBER
            </label>
            <input
              type="tel"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="03XXXXXXXXX"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              GMAIL / EMAIL
            </label>
            <input
              type="email"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="student@gmail.com"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              BIOMETRIC ID / FINGERPRINT KEY (OPTIONAL)
            </label>
            <input
              type="text"
              value={biometricId}
              onChange={(e) => setBiometricId(e.target.value)}
              placeholder="e.g. BIO-101 or scanner token ID"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" /> Register Student
          </button>
        </div>
      </form>
    </div>
  );
};
