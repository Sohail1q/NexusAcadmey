import React from 'react';
import { Wallet2, AlertTriangle, UserCheck, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { NexusStudent, NexusClass, NexusTab, NexusSettings } from '../types';
import { getActiveStudentClassDisplay } from '../utils/classUtils';
import { PeshawarClock } from './PeshawarClock';

interface DashboardViewProps {
  students: NexusStudent[];
  classes: NexusClass[];
  currency?: string;
  settings?: NexusSettings;
  onNavigate?: (tab: NexusTab) => void;
  onTabChange?: (tab: NexusTab) => void;
  onOpenReceipt?: (student: NexusStudent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students,
  classes,
  currency,
  settings,
  onNavigate,
  onTabChange,
}) => {
  const activeCurrency = currency || settings?.currency || 'PKR';
  const handleNavigate = (tab: NexusTab) => {
    if (onNavigate) onNavigate(tab);
    else if (onTabChange) onTabChange(tab);
  };
  // Aggregate stats
  const totalCollected = students.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalDues = students.reduce((acc, s) => acc + (s.dues || 0), 0);
  const activeCount = students.length;

  const recentStudents = [...students].reverse().slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Official Peshawar Standard Time & Date System Clock */}
      <PeshawarClock variant="banner" />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Collections */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center gap-4.5 hover:shadow-md transition">
          <div className="w-13 h-13 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl flex-shrink-0">
            <Wallet2 className="w-6 h-6 text-purple-600" />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Collections
            </label>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
              {activeCurrency} {totalCollected.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center gap-4.5 hover:shadow-md transition">
          <div className="w-13 h-13 rounded-xl bg-red-100 text-red-700 flex items-center justify-center text-2xl flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Outstanding Dues
            </label>
            <h2 className="text-2xl font-bold text-red-600 mt-0.5 truncate">
              {activeCurrency} {totalDues.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center gap-4.5 hover:shadow-md transition">
          <div className="w-13 h-13 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl flex-shrink-0">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Active Enrolled Students
            </label>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5 truncate">
              {activeCount}
            </h2>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Registrations + Available Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Enrollments Table */}
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Recent Student Enrollments
            </h3>
            <button
              onClick={() => handleNavigate('directory')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              View All Directory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3">ID #</th>
                  <th className="py-2.5 px-3">Photo</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Class Option</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No registrations recorded yet. Register your first student in the Registration tab!
                    </td>
                  </tr>
                ) : (
                  recentStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{s.id}</td>
                      <td className="py-2.5 px-3">
                        {s.photo && !s.photo.includes('svg') ? (
                          <img
                            src={s.photo}
                            alt={s.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 max-w-[200px] truncate">
                          {getActiveStudentClassDisplay(s.className, classes)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                        {activeCurrency} {(s.totalPaid || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Classes Panel */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" /> Available Classes
            </h3>
            <button
              onClick={() => handleNavigate('classes')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="space-y-3">
            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active classes configured.</p>
            ) : (
              classes.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{c.category} - {c.className}</span>
                    <span className="text-blue-600 font-bold">{activeCurrency} {c.monthlyFee}</span>
                  </div>
                  <div className="text-slate-500 mt-1 flex items-center justify-between">
                    <span>Teacher: {c.teacher}</span>
                    <span>{c.startTime} - {c.endTime}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
