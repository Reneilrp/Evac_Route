import React from 'react';

/**
 * Universal KPI / Statistic Metric Card
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  trend,
  className = '',
  onClick,
}) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition duration-150 flex items-start justify-between text-left ${onClick ? 'hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    >
      <div className="flex-1 pr-3">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          {title}
        </p>
        <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </h4>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="mt-2 text-xs font-semibold">
            {trend}
          </div>
        )}
      </div>

      {Icon && (
        <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </Component>
  );
}
