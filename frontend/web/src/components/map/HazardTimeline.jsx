import React from 'react';

// --- Helper: Timeline & Duration Calculations ---
export function formatTimelineDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  let hr = d.getHours();
  const min = d.getMinutes().toString().padStart(2, '0');
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12;
  hr = hr ? hr : 12; // 0 should be 12
  return `${month} ${day}, ${hr}:${min} ${ampm}`;
}

export function getTimelineData(createdAt, durationHours) {
  if (!createdAt || !durationHours) return null;
  const start = new Date(createdAt).getTime();
  const durationMs = durationHours * 60 * 60 * 1000;
  const end = start + durationMs;
  const now = new Date().getTime();
  
  const elapsedMs = now - start;
  const remainingMs = end - now;
  const isOverdue = remainingMs < 0;
  
  const percent = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));
  
  const formatMs = (ms) => {
    const totalMins = Math.floor(Math.abs(ms) / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };
  
  return {
    formattedStart: formatTimelineDate(createdAt),
    formattedEnd: formatTimelineDate(new Date(end)),
    elapsedStr: formatMs(elapsedMs),
    remainingStr: isOverdue ? '0m' : formatMs(remainingMs),
    overdueStr: isOverdue ? formatMs(remainingMs) : null,
    isOverdue,
    percent
  };
}

export function formatDurationHours(hours) {
  if (!hours) return '';
  const weeks = Math.floor(hours / 168);
  const remainingAfterWeeks = hours % 168;
  const days = Math.floor(remainingAfterWeeks / 24);
  const remainingHours = remainingAfterWeeks % 24;
  
  const parts = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0 || parts.length === 0) parts.push(`${remainingHours}h`);
  return parts.join(' ');
}

export function MiniTimeline({ createdAt, durationHours, hazardType }) {
  const data = getTimelineData(createdAt, durationHours);
  if (!data) return null;
  
  const { remainingStr, overdueStr, isOverdue, percent } = data;
  
  const theme = hazardType === 'flood' ? {
    color: 'bg-blue-400',
    text: 'text-blue-300',
    label: 'Draining'
  } : hazardType === 'earthquake' ? {
    color: 'bg-red-400',
    text: 'text-red-300',
    label: 'Clearance'
  } : {
    color: 'bg-amber-400',
    text: 'text-amber-300',
    label: 'Duration'
  };
  
  return (
    <div className="mt-1.5 w-full">
      <div className="flex justify-between text-[9px] font-bold">
        <span className="text-white/60">{theme.label} ({formatDurationHours(durationHours)}) progress</span>
        <span className={isOverdue ? "text-red-400" : theme.text}>
          {isOverdue ? `Overdue +${overdueStr}` : `${remainingStr} left`}
        </span>
      </div>
      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
        <div 
          className={`h-full rounded-full ${isOverdue ? 'bg-red-500 animate-pulse' : theme.color}`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  );
}

export function VisualTimeline({ createdAt, durationHours, hazardType }) {
  const data = getTimelineData(createdAt, durationHours);
  if (!data) return null;
  
  const {
    formattedStart,
    formattedEnd,
    elapsedStr,
    remainingStr,
    overdueStr,
    isOverdue,
    percent
  } = data;
  
  const getTimelineTheme = () => {
    if (hazardType === 'flood') {
      return {
        title: 'Estimated Draining Progress',
        targetLabel: 'Est. Fully Drained',
        accentClass: 'bg-blue-500',
        textClass: 'text-blue-600 dark:text-blue-400',
        borderClass: 'border-blue-500/20 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20',
        badgeClass: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',
        pingClass: 'bg-blue-500'
      };
    }
    if (hazardType === 'earthquake') {
      return {
        title: 'Debris Clearance Timeline',
        targetLabel: 'Est. Debris Cleared',
        accentClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400',
        borderClass: 'border-red-500/20 bg-red-50/50 dark:border-red-500/30 dark:bg-red-950/20',
        badgeClass: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40',
        pingClass: 'bg-red-500'
      };
    }
    return {
      title: 'Incident Clearance Timeline',
      targetLabel: 'Est. All-Clear Time',
      accentClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-500/20 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20',
      badgeClass: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40',
      pingClass: 'bg-amber-500'
    };
  };
  
  const theme = getTimelineTheme();
  
  return (
    <div className={`border rounded-xl p-4 space-y-3 shadow-inner ${theme.borderClass}`}>
      <div className="flex justify-between items-center text-xs font-semibold">
        <span className="text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {!isOverdue && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${theme.pingClass}`} />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isOverdue ? 'bg-red-500' : theme.accentClass}`} />
          </span>
          {theme.title} ({formatDurationHours(durationHours)})
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isOverdue ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40 animate-pulse' : theme.badgeClass
        }`}>
          {isOverdue ? "OVERDUE / DELAYED" : `${percent.toFixed(0)}% Complete`}
        </span>
      </div>
      
      {/* Visual Progress Bar Track */}
      <div className="relative py-2">
        {/* Gray Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-200 dark:bg-slate-700 -translate-y-1/2 rounded-full" />
        
        {/* Progress Fill */}
        <div 
          className={`absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full transition-all duration-500 ${
            isOverdue ? 'bg-red-500' : theme.accentClass
          }`}
          style={{ width: `${percent}%` }} 
        />
        
        {/* Nodes */}
        <div className="relative flex justify-between items-center">
          {/* Start node */}
          <div className="flex flex-col items-center bg-white dark:bg-slate-800 rounded-full p-1 border-2 border-gray-300 dark:border-slate-700 z-10 w-7 h-7 justify-center text-xs font-bold shadow-sm">
            🚨
          </div>
          {/* Current progress dot indicator */}
          {!isOverdue && percent > 0 && percent < 100 && (
            <div 
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 shadow z-10 ${theme.accentClass}`}
              style={{ left: `${percent}%` }}
            />
          )}
          {/* End node */}
          <div className={`flex flex-col items-center bg-white dark:bg-slate-800 rounded-full p-1 border-2 z-10 w-7 h-7 justify-center text-xs font-bold shadow-sm ${
            isOverdue ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'
          }`}>
            ✅
          </div>
        </div>
      </div>
      
      {/* Dates/Times labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
        <div>
          <span className="block font-bold text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Reported Time</span>
          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200">{formattedStart}</span>
        </div>
        <div className="text-right">
          <span className="block font-bold text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">{theme.targetLabel}</span>
          <span className="text-[11px] font-semibold text-gray-700 dark:text-slate-200">{formattedEnd}</span>
        </div>
      </div>
      
      {/* Durations grid */}
      <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-gray-200/50 dark:border-slate-800">
        <div>
          <p className="text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Elapsed Time</p>
          <p className="font-bold text-gray-700 dark:text-slate-200 mt-0.5">{elapsedStr}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">
            {isOverdue ? 'Delayed By' : 'Remaining Est.'}
          </p>
          <p className={`font-black mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-700 dark:text-slate-200'}`}>
            {isOverdue ? overdueStr : remainingStr}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Toolbar Toggle Button ---

export default VisualTimeline;
