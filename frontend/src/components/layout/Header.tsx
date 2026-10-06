import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Menu,
  Search,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { NavigationPage } from './Sidebar';

interface HeaderProps {
  currentPage: NavigationPage;
  onNewPrediction: () => void;
  onToggleMobileMenu?: () => void;
  onNavigate?: (page: NavigationPage) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNewPrediction,
  onToggleMobileMenu,
  onNavigate,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const titles: Record<NavigationPage, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Real-time codebase bug risk analytics and health indicators',
    },
    'code-analysis': {
      title: 'Source Code Analysis',
      subtitle: 'Static AST syntax verification, programming error detection & bug risk prediction',
    },
    predict: {
      title: 'Bug Prediction & Simulation',
      subtitle: 'NASA MDP JM1 machine learning model defect probability assessment',
    },
    'analysis-history': {
      title: 'Source Code Analysis Logs',
      subtitle: 'Complexity distribution, risk score trends, and line of code comparisons',
    },
    result: {
      title: 'Prediction Assessment Result',
      subtitle: 'Detailed risk score, metric contributions, and prioritized mitigation actions',
    },
    modules: {
      title: 'Module Management',
      subtitle: 'Manage codebase modules, monitor metrics, and perform batch assessments',
    },
    history: {
      title: 'Manual Prediction History',
      subtitle: 'Audit log of past model evaluations and metric calculations',
    },
    reports: {
      title: 'Reports & Quality Export',
      subtitle: 'Generate and export executive defect assessment PDF reports',
    },
  };

  const currentInfo = titles[currentPage] || {
    title: 'AI Bug Prediction Platform',
    subtitle: 'Software Analysis Platform',
  };

  // Quick navigation items for search bar
  const searchablePages: { id: NavigationPage; label: string; desc: string }[] = [
    { id: 'dashboard', label: 'Dashboard', desc: 'Codebase overview & KPI cards' },
    { id: 'predict', label: 'Source Code Upload & Analysis', desc: 'Upload .java, .py, .cpp, .c files' },
    { id: 'analysis-history', label: 'Code Analysis Logs & Charts', desc: 'View complexity & risk trends' },
    { id: 'modules', label: 'Module Management', desc: 'Search and inspect code modules' },
    { id: 'reports', label: 'Reports & PDF Export', desc: 'Download executive summary PDF' },
  ];

  const filteredPages = searchablePages.filter((p) =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 transition-colors">
      {/* Left: Hamburger button (mobile) + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="flex md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {currentInfo.title}
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="relative hidden md:block max-w-xs lg:max-w-sm w-full mx-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            placeholder="Quick search modules, tools..."
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-100/60 dark:bg-slate-800/60 pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded">
            ⌘K
          </kbd>
        </div>

        {/* Search Autocomplete Dropdown */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {filteredPages.length > 0 ? (
              filteredPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    if (onNavigate) onNavigate(page.id);
                    setShowSearchDropdown(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex flex-col gap-0.5 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {page.label}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {page.desc}
                  </span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                No matching navigation items found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* FastAPI Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>FastAPI Online</span>
        </div>

        {/* Quick Predict Action Button */}
        {currentPage !== 'predict' && (
          <button
            onClick={onNewPrediction}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-95 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Analyze Code</span>
            <span className="sm:hidden">Analyze</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 hover:rotate-45 duration-200" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 transition-transform rotate-0 hover:-rotate-12 duration-200" />
          )}
        </button>
      </div>
    </header>
  );
};
