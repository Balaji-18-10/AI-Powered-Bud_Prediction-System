import React from 'react';

interface CircularProgressProps {
  score: number; // 0 - 100
  riskLevel: 'Low' | 'Medium' | 'High' | string;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  score,
  riskLevel,
  size = 140,
  strokeWidth = 12,
  showLabel = true,
}) => {
  const normalizedScore = Math.min(100, Math.max(0, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const gradientId = `progress-grad-${riskLevel.toLowerCase()}-${Math.round(score)}`;

  const config = {
    high: {
      from: '#f43f5e',
      to: '#e11d48',
      text: 'text-rose-600 dark:text-rose-400',
      bgRing: 'stroke-rose-100 dark:stroke-rose-950/40',
      glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]',
    },
    medium: {
      from: '#f59e0b',
      to: '#d97706',
      text: 'text-amber-600 dark:text-amber-400',
      bgRing: 'stroke-amber-100 dark:stroke-amber-950/40',
      glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
    },
    low: {
      from: '#10b981',
      to: '#059669',
      text: 'text-emerald-600 dark:text-emerald-400',
      bgRing: 'stroke-emerald-100 dark:stroke-emerald-950/40',
      glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]',
    },
  }[riskLevel.toLowerCase()] || {
    from: '#6366f1',
    to: '#4f46e5',
    text: 'text-indigo-600 dark:text-indigo-400',
    bgRing: 'stroke-indigo-100 dark:stroke-indigo-950/40',
    glow: '',
  };

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 transition-transform duration-700 ${config.glow}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.from} />
            <stop offset="100%" stopColor={config.to} />
          </linearGradient>
        </defs>

        {/* Background Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={`${config.bgRing} transition-colors`}
        />

        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <div className="flex items-baseline">
          <span className={`text-3xl font-black tracking-tight ${config.text}`}>
            {Math.round(normalizedScore)}
          </span>
          <span className={`text-sm font-bold ${config.text}`}>%</span>
        </div>
        {showLabel && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mt-0.5">
            Risk Score
          </span>
        )}
      </div>
    </div>
  );
};
