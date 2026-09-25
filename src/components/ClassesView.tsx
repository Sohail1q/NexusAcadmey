import React, { useState } from 'react';
import { Settings2, PlusCircle, Pencil, Trash2, CheckCircle, X } from 'lucide-react';
import { NexusClass } from '../types';

interface ClassesViewProps {
  classes: NexusClass[];
  currency?: string;
  onSaveClass: (newClass: NexusClass, editIndex: number) => void;
  onDeleteClass: (index: number) => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  currency = 'PKR',
  onSaveClass,
  onDeleteClass,
  onNotification,
}) => {
  const [editIndex, setEditIndex] = useState<number>(-1);

  const [teacher, setTeacher] = useState('');
  const [category, setCategory] = useState('');
  const [className, setClassName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number>(1500);
  const [admissionFee, setAdmissionFee] = useState<number>(1000);

  const handleEdit = (idx: number) => {
    const cls = classes[idx];
    setEditIndex(idx);
    setTeacher(cls.teacher);
    setCategory(cls.category);
    setClassName(cls.className);
    setStartTime(cls.startTime);
    setEndTime(cls.endTime);
    setDuration(cls.duration);
    setMonthlyFee(cls.monthlyFee);
    setAdmissionFee(cls.admissionFee);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditIndex(-1);
    setTeacher('');
    setCategory('');
    setClassName('');
    setStartTime('');
    setEndTime('');
    setDuration('');
    setMonthlyFee(1500);
    setAdmissionFee(1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacher.trim() || !className.trim()) {
      onNotification('Teacher name and Class name are required.', 'error');
      return;
    }

    const newCls: NexusClass = {
      teacher: teacher.trim(),
      category: category.trim(),
      className: className.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      duration: duration.trim(),
      monthlyFee: Number(monthlyFee) || 0,
      admissionFee: Number(admissionFee) || 0,
    };

    onSaveClass(newCls, editIndex);
    cancelEdit();
    onNotification(
      editIndex >= 0 ? 'Class option updated successfully!' : 'New class option created!',
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Add / Edit Form Card */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {editIndex >= 0 ? (
              <>
                <Pencil className="w-5 h-5 text-amber-500" /> Edit Class Option
              </>
            ) : (
              <>
                <PlusCircle className="w-5 h-5 text-blue-600" /> Add New Class Option
              </>
            )}
          </h3>
          {editIndex >= 0 && (
            <button
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Teacher Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="e.g. Sir Samsoor"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="English / DIT / Tuition"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Class Name / Level <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Beginner / Office Automation"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. 4:00pm"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                End Time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g. 5:00pm"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="1 Month / 3 Months"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Monthly Fee ({currency})
              </label>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                placeholder="1500"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Admission Fee ({currency})
              </label>
              <input
                type="number"
                value={admissionFee}
                onChange={(e) => setAdmissionFee(parseFloat(e.target.value) || 0)}
                placeholder="1000"
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              {editIndex >= 0 ? 'Update Class Option' : 'Save Class Option'}
            </button>
          </div>
        </form>
      </div>

      {/* Active Classes Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Active Classes &amp; Finalization
          </h3>
          <span className="text-xs text-slate-500">{classes.length} class(es) registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Formatted Class Display String</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Monthly Fee</th>
                <th className="py-2.5 px-3">Admission Fee</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No classes created yet. Use the form above to add your first class!
                  </td>
                </tr>
              ) : (
                classes.map((cls, idx) => {
                  const displayStr = `${cls.teacher} | ${cls.category} - ${cls.className} (${cls.startTime} to ${cls.endTime})`;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-semibold text-slate-900">{displayStr}</td>
                      <td className="py-3 px-3 text-slate-600">{cls.duration}</td>
                      <td className="py-3 px-3 font-semibold text-blue-600">
                        {currency} {cls.monthlyFee.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {currency} {cls.admissionFee.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(idx)}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete class "${cls.className}"?`)) {
                              onDeleteClass(idx);
                              onNotification(`Class ${cls.className} deleted.`, 'info');
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-red-50 text-red-600 hover:bg-red-100 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
