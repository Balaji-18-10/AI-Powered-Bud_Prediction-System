import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple';
  trend?: {
    text: string;
    positive?: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  trend,
}) => {
  const variantStyles = {
    blue: {
      bgIcon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-500/20',
      borderHover: 'hover:border-blue-400/50 hover:shadow-blue-500/10',
    },
    emerald: {
      bgIcon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20',
      borderHover: 'hover:border-emerald-400/50 hover:shadow-emerald-500/10',
    },
    amber: {
      bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20',
      borderHover: 'hover:border-amber-400/50 hover:shadow-amber-500/10',
    },
    rose: {
      bgIcon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20',
      borderHover: 'hover:border-rose-400/50 hover:shadow-rose-500/10',
    },
    indigo: {
      bgIcon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20',
      borderHover: 'hover:border-indigo-400/50 hover:shadow-indigo-500/10',
    },
    purple: {
      bgIcon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 dark:bg-purple-500/20',
      borderHover: 'hover:border-purple-400/50 hover:shadow-purple-500/10',
    },
  }[variant];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-xs hover:shadow-lg transition-all duration-300 ${variantStyles.borderHover}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${variantStyles.bgIcon} transition-transform duration-200 group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-bold ${
              trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.text}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
