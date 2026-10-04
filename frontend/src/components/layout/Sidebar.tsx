import React from 'react';
import {
  LayoutDashboard,
  Bug,
  FolderGit2,
  History,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Gauge,
  FileCode,
  Sparkles,
} from 'lucide-react';

export type NavigationPage =
  | 'dashboard'
  | 'predict'
  | 'result'
  | 'modules'
  | 'history'
  | 'analysis-history'
  | 'reports';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hasActiveResult: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  hasActiveResult,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'predict' as NavigationPage,
      label: 'Bug Prediction',
      icon: Bug,
      badge: 'Upload',
    },
    {
      id: 'analysis-history' as NavigationPage,
      label: 'Code Analysis Logs',
      icon: FileCode,
      badge: 'Stats',
    },
    {
      id: 'result' as NavigationPage,
      label: 'Prediction Result',
      icon: Gauge,
      badge: hasActiveResult ? 'Active' : null,
      disabled: !hasActiveResult,
    },
    {
      id: 'modules' as NavigationPage,
      label: 'Module Management',
      icon: FolderGit2,
      badge: null,
    },
    {
      id: 'history' as NavigationPage,
      label: 'Prediction History',
      icon: History,
      badge: null,
    },
    {
      id: 'reports' as NavigationPage,
      label: 'Reports & Export',
      icon: FileText,
      badge: 'PDF',
    },
  ];

  const handleItemClick = (page: NavigationPage) => {
    onNavigate(page);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/80">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    DefectPredict
                  </span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                  Enterprise AI 2.0
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer ${
              isCollapsed ? 'hidden' : 'flex'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const isDisabled = item.disabled;

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && handleItemClick(item.id)}
                disabled={isDisabled}
                title={isCollapsed ? item.label : undefined}
                className={`group relative flex w-full items-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold'
                    : isDisabled
                    ? 'opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              >
                {/* Active Left Indicator Bar */}
                {isActive && !isCollapsed && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-white" />
                )}

                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / System Status */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
          {isCollapsed ? (
            <button
              onClick={onToggleCollapse}
              className="flex h-10 w-full items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/50 dark:to-indigo-950/20 p-3.5 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    AI Engines Live
                  </span>
                </div>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Multi-Language AST + Calibrated Defect Probability model active.
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
