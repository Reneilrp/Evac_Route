import React from 'react';

/**
 * Universal Status & Category Badge
 */
export default function Badge({
  children,
  variant = 'gray', // 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'gray'
  size = 'sm',      // 'xs' | 'sm' | 'md'
  dot = false,
  icon: Icon,
  className = '',
}) {
  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 rounded-full font-bold',
    sm: 'text-xs px-2.5 py-1 rounded-full font-extrabold',
    md: 'text-xs px-3 py-1.5 rounded-lg font-black',
  };

  const variantStyles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    gray: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
    gray: 'bg-slate-400',
  };

  const selectedSize = sizeStyles[size] || sizeStyles.sm;
  const selectedVariant = variantStyles[variant] || variantStyles.gray;
  const selectedDot = dotColors[variant] || dotColors.gray;

  return (
    <span className={`inline-flex items-center gap-1.5 border uppercase tracking-wider ${selectedSize} ${selectedVariant} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${selectedDot}`} />}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}
