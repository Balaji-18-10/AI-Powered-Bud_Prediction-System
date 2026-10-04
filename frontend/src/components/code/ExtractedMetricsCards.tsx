import React from 'react';
import {
  Code2,
  Box,
  Binary,
  MessageSquareCode,
  Layers,
  GitFork,
  Repeat,
  Split
} from 'lucide-react';
import type { CodeMetrics } from '../../types';

interface ExtractedMetricsCardsProps {
  metrics: CodeMetrics;
}

export const ExtractedMetricsCards: React.FC<ExtractedMetricsCardsProps> = ({ metrics }) => {
  const cards = [
    {
      title: 'Lines of Code (LOC)',
      value: metrics.loc,
      subtitle: `${metrics.code_lines} code • ${metrics.comment_lines} comments • ${metrics.blank_lines} blank`,
      icon: Code2,
      variant: 'indigo',
      badge: `${metrics.code_lines} Code Lines`,
      badgeColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    },
    {
      title: 'Functions & Methods',
      value: metrics.functions_count,
      subtitle: metrics.functions_count > 0 
        ? `~${Math.round(metrics.code_lines / metrics.functions_count)} lines per function` 
        : 'No subroutines detected',
      icon: Binary,
      variant: 'blue',
      badge: metrics.functions_count > 10 ? 'High Density' : 'Optimal',
      badgeColor: metrics.functions_count > 10 
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
        : 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
      title: 'Classes & Structs',
      value: metrics.classes_count,
      subtitle: metrics.classes_count > 0 ? 'Object-oriented structures' : 'Procedural / Script structure',
      icon: Box,
      variant: 'purple',
      badge: metrics.classes_count > 1 ? `${metrics.classes_count} Classes` : 'Modular',
      badgeColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    },
    {
      title: 'Comments & Docs',
      value: metrics.comments_count,
      subtitle: `${metrics.comment_ratio}% documentation ratio`,
      icon: MessageSquareCode,
      variant: 'emerald',
      badge: metrics.comment_ratio < 10 ? 'Low Documentation' : 'Well Documented',
      badgeColor: metrics.comment_ratio < 10 
        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
        : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
      title: 'Cyclomatic Complexity',
      value: metrics.cyclomatic_complexity.toFixed(1),
      subtitle: 'McCabe decision path index v(G)',
      icon: Layers,
      variant: metrics.cyclomatic_complexity > 20 ? 'rose' : metrics.cyclomatic_complexity > 10 ? 'amber' : 'emerald',
      badge: metrics.cyclomatic_complexity > 20 
        ? 'High Complexity' 
        : metrics.cyclomatic_complexity > 10 
        ? 'Moderate' 
        : 'Clean Path',
      badgeColor: metrics.cyclomatic_complexity > 20 
        ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
        : metrics.cyclomatic_complexity > 10 
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
        : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
      title: 'If Statements',
      value: metrics.if_statements,
      subtitle: 'Conditionals & branch tests',
      icon: GitFork,
      variant: 'amber',
      badge: `${metrics.if_statements} Branch Points`,
      badgeColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
    {
      title: 'Loop Constructs',
      value: metrics.loops_count,
      subtitle: 'for, while, do-while iterations',
      icon: Repeat,
      variant: 'blue',
      badge: `${metrics.loops_count} Iterations`,
      badgeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
      title: 'Switch Statements',
      value: metrics.switch_statements,
      subtitle: 'Branch selector dispatches',
      icon: Split,
      variant: 'purple',
      badge: metrics.switch_statements > 0 ? `${metrics.switch_statements} Switches` : 'None',
      badgeColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-5 shadow-xs hover:shadow-md transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-800/80"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {card.value}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {card.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
};
