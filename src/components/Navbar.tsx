import React, { useState } from 'react';
import {
  Gauge,
  UserPlus,
  BadgeCheck,
  Settings2,
  CalendarCheck,
  FileCheck2,
  Contact,
  Coins,
  Users,
  Sliders,
  Download,
  BookOpen,
  Lock,
  Unlock,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { NexusTab, NexusSettings } from '../types';
import { CloudStatus } from '../services/cloudSync';
import { PeshawarClock } from './PeshawarClock';

interface NavbarProps {
  settings: NexusSettings;
  activeTab: NexusTab;
  onTabChange: (tab: NexusTab) => void;
  cloudStatus: CloudStatus;
  isAdminUnlocked?: boolean;
  onOpenAuth?: () => void;
  onLockAdmin?: () => void;
  onLockApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  activeTab,
  onTabChange,
  cloudStatus,
  isAdminUnlocked = false,
  onOpenAuth,
  onLockAdmin,
  onLockApp,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: Array<{ id: NexusTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" /> },
    { id: 'admission', label: 'Admission', icon: <BadgeCheck className="w-4 h-4" /> },
    { id: 'registration', label: 'Registration', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'classes', label: 'Classes', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'test-marks', label: 'Test Marks', icon: <FileCheck2 className="w-4 h-4" /> },
    { id: 'student-info', label: 'Student Info', icon: <Contact className="w-4 h-4" /> },
    { id: 'dues', label: 'Dues & Fees', icon: <Coins className="w-4 h-4" /> },
    { id: 'directory', label: 'Directory', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Sliders className="w-4 h-4" /> },
    { id: 'apps', label: 'Apps', icon: <Download className="w-4 h-4" /> },
    { id: 'deployment', label: 'Deploy Guide', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const getStatusBadge = () => {
    switch (cloudStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Cloud: Connected
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/90 text-amber-300 border border-amber-500/40">
            <Radio className="w-3 h-3 animate-spin text-amber-400" />
            Auto-Syncing...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 transition">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Local Cache
          </span>
        );
    }
  };

  const handleTabClick = (tabId: NexusTab) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-[#0f172a] text-white shadow-md sticky top-0 z-40 border-b border-slate-800">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        {/* Brand */}
        <div
          className="flex items-center gap-3.5 cursor-pointer"
          onClick={() => handleTabClick('dashboard')}
        >
          <img
            src={settings.logo || '/nexus-logo.png'}
            alt="Nexus Logo"
            className="w-11 h-11 rounded-xl object-contain bg-slate-800/60 p-1 border border-slate-700 filter drop-shadow"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/nexus-logo.png';
            }}
          />
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {settings.name}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              {settings.subtitle}
            </p>
          </div>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Live Peshawar Standard Time Clock */}
          <PeshawarClock variant="badge" />

          {/* Cloud Sync Status */}
          <div
            title="Real-time Cloud Database Status - Click to manage in Settings"
            onClick={() => handleTabClick('settings')}
            className="cursor-pointer transition hover:opacity-90 active:scale-95"
          >
            {getStatusBadge()}
          </div>

          {/* Admin Lock / Unlock status */}
          {isAdminUnlocked ? (
            <button
              onClick={onLockAdmin}
              title="Click to lock console to Guest mode"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Mode</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              title="Click to authenticate as Administrator"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          )}

          {/* Quick Lock Portal Button */}
          {onLockApp && settings.appLockEnabled !== false && (
            <button
              onClick={onLockApp}
              title="Lock application screen (requires teacher password to unlock)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-950/40 text-red-300 border border-red-800/50 hover:bg-red-900/60 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>Lock Terminal</span>
            </button>
          )}

          {/* Mobile menu hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs Bar */}
      <nav className="hidden lg:block border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-150">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
