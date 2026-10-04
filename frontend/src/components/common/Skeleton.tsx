import React from 'react';

export const Skeleton: React.FC<{
  className?: string;
}> = ({ className = 'h-4 w-full' }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-64' }) => {
  return (
    <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-5 flex flex-col justify-between ${height}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-16 rounded-lg" />
      </div>
      <div className="flex items-end gap-3 h-36 px-4">
        <Skeleton className="h-16 flex-1 rounded-t-lg" />
        <Skeleton className="h-28 flex-1 rounded-t-lg" />
        <Skeleton className="h-20 flex-1 rounded-t-lg" />
        <Skeleton className="h-32 flex-1 rounded-t-lg" />
        <Skeleton className="h-24 flex-1 rounded-t-lg" />
        <Skeleton className="h-12 flex-1 rounded-t-lg" />
      </div>
    </div>
  );
};
