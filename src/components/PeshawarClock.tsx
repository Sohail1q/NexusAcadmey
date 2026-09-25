import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin } from 'lucide-react';
import { getPeshawarComponents, PeshawarDateTimeComponents } from '../utils/peshawarTime';

interface PeshawarClockProps {
  variant?: 'card' | 'badge' | 'banner';
  className?: string;
  showLocation?: boolean;
}

export const PeshawarClock: React.FC<PeshawarClockProps> = ({
  variant = 'card',
  className = '',
  showLocation = true,
}) => {
  const [timeData, setTimeData] = useState<PeshawarDateTimeComponents>(() => getPeshawarComponents());

  useEffect(() => {
    // Update live clock every second
    const interval = setInterval(() => {
      setTimeData(getPeshawarComponents());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 text-white rounded-lg border border-slate-700/80 shadow-xs font-mono text-xs ${className}`}
        title="Live Peshawar Standard Time (PKT, UTC+5)"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        <span className="font-semibold text-slate-300 hidden sm:inline">{timeData.dayOfWeek},</span>
        <span className="text-white font-bold">{timeData.day} {timeData.monthName} {timeData.year}</span>
        <span className="text-emerald-400 font-bold bg-slate-800/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
          {timeData.time12}
        </span>
        {showLocation && (
          <span className="text-[10px] text-slate-400 uppercase tracking-wider hidden md:inline">
            Peshawar (PKT)
          </span>
        )}
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`w-full bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800/80 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Peshawar, Pakistan Standard Time (PKT • UTC+5)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeData.dayOfWeek}, {timeData.day} {timeData.monthName} {timeData.year}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400 font-medium">Live Clock:</span>
          <span className="font-mono text-base font-extrabold text-emerald-300 tracking-wider">
            {timeData.time12}
          </span>
          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 rounded">
            PKT
          </span>
        </div>
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div
      className={`bg-linear-to-br from-slate-900 via-slate-850 to-indigo-950 text-white border border-slate-700/80 rounded-xl p-4 shadow-md flex flex-col justify-between hover:border-slate-600 transition ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
              Official Academy Time
            </span>
            <span className="text-[9.5px] text-emerald-400 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Peshawar, Pakistan (PKT UTC+5)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 my-1">
        {/* Date Section */}
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
          <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-indigo-400" /> Date & Day
          </div>
          <div className="font-bold text-slate-100 text-xs truncate">
            {timeData.dayOfWeek}
          </div>
          <div className="text-xs text-indigo-300 font-bold mt-0.5">
            {timeData.day} {timeData.monthName} {timeData.year}
          </div>
        </div>

        {/* Time Section with Seconds */}
        <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
          <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" /> Time (Hours:Min:Sec)
          </div>
          <div className="font-mono text-sm font-extrabold text-emerald-300 tracking-wider">
            {timeData.time12}
          </div>
          <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">
            24h: <span className="font-mono text-slate-300">{timeData.time24}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9.5px] text-slate-400">
        <span>Current Identified Month:</span>
        <span className="font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          {timeData.monthName} ({timeData.year})
        </span>
      </div>
    </div>
  );
};
