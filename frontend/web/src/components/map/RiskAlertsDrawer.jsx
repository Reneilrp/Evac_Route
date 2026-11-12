import React from 'react';
import { Shield, ChevronRight, ChevronLeft, AlertTriangle, Flame, Droplets, Waves } from 'lucide-react';
import { MiniTimeline } from './HazardTimeline';

export default function RiskAlertsDrawer({ hazards = [], simulationMode, drawerOpen, setDrawerOpen }) {
  const combinedAlerts = hazards || [];

  const severityBg = (h) => {
    switch (h.severity_level) {
      case 'high':
      case 'critical':
        return 'bg-red-50 dark:bg-rose-950/40 border-red-200 dark:border-rose-900/50';
      case 'medium':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50';
      default:
        return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50';
    }
  };

  const severityIcon = (h) => {
    const type = (h.hazard_type || '').toLowerCase();
    if (type.includes('fire')) return <Flame size={14} className="text-orange-500 shrink-0" />;
    if (type.includes('flood') || type.includes('water')) return <Droplets size={14} className="text-sky-500 shrink-0" />;
    if (type.includes('wave') || type.includes('tsunami')) return <Waves size={14} className="text-cyan-500 shrink-0" />;
    return <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
  };

  return (
    <div
      className={`absolute top-0 right-0 h-full z-20 flex transition-all duration-300 ${
        drawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ width: 300 }}
    >
      <button
        type="button"
        onClick={() => setDrawerOpen(o => !o)}
        aria-label="Toggle alerts drawer"
        className="absolute -left-8 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-l-xl px-1.5 py-4 flex items-center transition cursor-pointer shadow-md"
      >
        {drawerOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="w-full h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-white">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Command Feed</p>
          <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
            <Shield size={15} className="text-blue-600 dark:text-blue-400" />
            {simulationMode ? `Simulation: ${simulationMode === 'rain' ? '🌧 Heavy Rain' : '🌋 Tremors'}` : 'Active Risk Alerts'}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Showing {combinedAlerts.length} alert{combinedAlerts.length !== 1 ? 's' : ''} in current scope</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {combinedAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <Shield size={32} className="text-slate-400 dark:text-white mb-3" />
              <p className="text-xs text-slate-600 dark:text-white font-bold">No active alerts</p>
            </div>
          ) : (
            combinedAlerts.map(alert => {
              const name = alert.name;
              const typeLabel = alert.hazard_type;
              
              return (
                <div key={`hz-${alert.id}`} className={`border rounded-xl p-3 ${severityBg(alert)}`}>
                  <div className="flex items-start gap-2">
                    {severityIcon(alert)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">{name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-white/50 mt-0.5 capitalize">
                        {typeLabel} · {alert.severity_level} severity · {alert.radius_meters}m radius
                      </p>
                      {alert.estimated_duration_hours && (
                        <MiniTimeline 
                          createdAt={alert.created_at} 
                          durationHours={alert.estimated_duration_hours} 
                          hazardType={alert.hazard_type} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
