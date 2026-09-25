import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, ArrowRight, School, Eye, EyeOff } from 'lucide-react';
import { NexusSettings } from '../types';

interface AppLockScreenProps {
  settings: NexusSettings;
  onUnlock: () => void;
  onNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
  settings,
  onUnlock,
  onNotification,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const defaultAllowed = ['009665', '00966504236461', '2026', 'nexus2026', 'admin'];
  const configuredPasswords = (settings.accessPasswords && settings.accessPasswords.length > 0)
    ? settings.accessPasswords
    : ['009665', '00966504236461', '2026'];

  const allowedPasswords = Array.from(new Set([
    ...defaultAllowed,
    ...configuredPasswords,
    settings.adminPin || '2026',
  ]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = password.trim();

    if (allowedPasswords.includes(cleanInput)) {
      setError(false);
      sessionStorage.setItem('nexus_app_unlocked', 'true');
      onUnlock();
      onNotification('Access granted. Welcome to Nexus Academy!', 'success');
    } else {
      setError(true);
      onNotification('Invalid access password. Please enter an authorized teacher password.', 'error');
    }
  };

  const academyName = settings.name || 'Nexus Academy';
  const academyLogo = settings.logo || '/nexus-logo.png';
  const academySub = settings.subtitle || 'English Language & Computer Education';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 min-h-screen">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top brand header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-8 text-center text-white relative">
          <div className="w-20 h-20 rounded-2xl bg-white p-2 mx-auto shadow-xl border border-white/20 flex items-center justify-center mb-4">
            <img
              src={academyLogo}
              alt="Academy Emblem"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/nexus-logo.png';
              }}
            />
          </div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight">{academyName}</h2>
          <p className="text-xs text-slate-300 mt-1">{academySub}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-[11px] font-semibold text-blue-200 mt-4">
            <Lock className="w-3.5 h-3.5 text-blue-400" /> Authorized Staff &amp; Teacher Access Only
          </div>
        </div>

        {/* Lock form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-900">Enter Access Password</h3>
            <p className="text-xs text-slate-500 mt-1">
              This application is protected. Enter any teacher or administrator password to unlock.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Security Password / PIN
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Enter access password"
                className={`w-full h-12 pl-4 pr-12 text-base font-mono rounded-xl border outline-none transition ${
                  error
                    ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-600'
                    : 'border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-600'
                }`}
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 font-medium mt-1">
                Password not recognized. Please contact an administrator if you need access.
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span>Unlock Academy System</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
