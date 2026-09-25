import React, { useState } from 'react';
import { FileCheck2, CheckCheck } from 'lucide-react';
import { NexusStudent, NexusClass, NexusTestRecord } from '../types';
import { isStudentEnrolledInClass } from '../utils/classUtils';

interface TestMarksViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  onSaveTestMarks: (testRecord: NexusTestRecord) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TestMarksView: React.FC<TestMarksViewProps> = ({
  students,
  classes,
  onSaveTestMarks,
  onNotification,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [testName, setTestName] = useState<string>('');
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(50);
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});

  const enrolledStudents = students.filter((s) => isStudentEnrolledInClass(s.className, selectedClass));

  const handleScoreChange = (studentId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: Math.max(0, num),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClass) {
      onNotification('Please select an active class option.', 'error');
      return;
    }

    if (!testName.trim()) {
      onNotification('Please enter a test name or title.', 'error');
      return;
    }

    if (totalMarks <= 0 || passingMarks <= 0) {
      onNotification('Total marks and passing marks must be greater than zero.', 'error');
      return;
    }

    if (enrolledStudents.length === 0) {
      onNotification('No students are enrolled in this class to record test scores.', 'error');
      return;
    }

    const scores = enrolledStudents.map((s) => ({
      studentId: s.id,
      marks: marksMap[s.id] || 0,
    }));

    const newTestRecord: NexusTestRecord = {
      id: 'TEST-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      className: selectedClass,
      testName: testName.trim(),
      totalMarks,
      passingMarks,
      scores,
    };

    onSaveTestMarks(newTestRecord);
    setTestName('');
    setMarksMap({});
    onNotification(`Test scores for "${newTestRecord.testName}" submitted successfully!`, 'success');
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-blue-600" /> Class Test Marks Entry
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Select Active Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            >
              <option value="">
                {classes.length === 0 ? '-- No Classes Created Yet (Add in Classes tab) --' : '-- Select Active Class --'}
              </option>
              {classes.map((cls, idx) => {
                const displayStr = `${cls.teacher} | ${cls.category} - ${cls.className} (${cls.startTime} to ${cls.endTime})`;
                return (
                  <option key={idx} value={displayStr}>
                    {displayStr}
                  </option>
                );
              })}
            </select>
            {classes.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                Please create your classes in the <strong>Classes</strong> tab first.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Test Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. Midterm Grammar Test"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Total Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Passing Marks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={passingMarks}
              onChange={(e) => setPassingMarks(parseFloat(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
              required
            />
          </div>
        </div>

        {/* Students Table for Test Scores */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">ID #</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Father Name</th>
                <th className="py-2.5 px-3">Achieved Marks</th>
                <th className="py-2.5 px-3">Result Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!selectedClass ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Select a class above to load enrolled students.
                  </td>
                </tr>
              ) : enrolledStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students enrolled in this class.
                  </td>
                </tr>
              ) : (
                enrolledStudents.map((s) => {
                  const score = marksMap[s.id] ?? 0;
                  const isPass = score >= passingMarks;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{s.id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.fatherName}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min={0}
                          max={totalMarks}
                          value={marksMap[s.id] ?? ''}
                          onChange={(e) => handleScoreChange(s.id, e.target.value)}
                          placeholder="0"
                          className="w-24 h-8 px-2 bg-white border border-slate-300 rounded text-xs font-semibold outline-none focus:border-blue-600"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isPass
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isPass ? 'Pass' : 'Fail'} ({Math.round((score / totalMarks) * 100)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selectedClass && enrolledStudents.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" /> Submit Test Scores
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
