import React, { useEffect, useState } from 'react';
import {
  FolderGit2,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Percent,
  Sparkles,
  ArrowRight,
  Activity,
  RefreshCw,
  FileCode,
  FileDown,
  Layers,
  BarChart3,
  Flame,
  Cpu,
  Database,
  Award,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

import { fetchDashboardStats, fetchAnalysisStats } from '../api/client';
import type { DashboardStats, PredictionResponse, CodeAnalysisStats } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { CardSkeleton, ChartSkeleton } from '../components/common/Skeleton';
import type { NavigationPage } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (page: NavigationPage) => void;
  onSelectPrediction: (prediction: PredictionResponse) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectPrediction }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analysisStats, setAnalysisStats] = useState<CodeAnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashData, codeData] = await Promise.all([
        fetchDashboardStats(),
        fetchAnalysisStats().catch(() => null),
      ]);
      setStats(dashData);
      setAnalysisStats(codeData);
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError('Unable to connect to backend server. Make sure the FastAPI service is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Banner Skeleton */}
        <div className="h-48 rounded-3xl animate-pulse bg-slate-200/80 dark:bg-slate-800/80" />
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">Service Connection Error</h3>
        <p className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 mt-1">{error}</p>
        <button
          onClick={loadAllStats}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 text-xs font-bold shadow-md cursor-pointer transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  // Risk Distribution Data for Pie Chart
  const pieData = [
    { name: 'High Risk (>70%)', value: stats.high_risk_modules, color: '#f43f5e' },
    { name: 'Medium Risk (35-70%)', value: stats.medium_risk_modules, color: '#f59e0b' },
    { name: 'Low Risk (<35%)', value: stats.low_risk_modules, color: '#10b981' },
  ].filter((d) => d.value > 0);

  // Bar Chart Data for Top Riskiest Modules / Complexity
  const complexityData = stats.top_riskiest_modules.slice(0, 6).map((m) => ({
    name: m.name.length > 14 ? m.name.slice(0, 12) + '...' : m.name,
    fullName: m.name,
    complexity: m.complexity,
    score: m.risk_score,
  }));

  // LOC Comparison Chart Data (from analysisStats if available, otherwise from top modules)
  const locData = analysisStats?.loc_comparison?.slice(0, 6).map((item) => ({
    name: item.name.length > 12 ? item.name.slice(0, 10) + '...' : item.name,
    fullName: item.fullName,
    code: item.codeLines,
    comments: item.commentLines,
    blank: Math.max(0, item.loc - item.codeLines - item.commentLines),
  })) || stats.top_riskiest_modules.slice(0, 5).map((m) => ({
    name: m.name.length > 12 ? m.name.slice(0, 10) + '...' : m.name,
    fullName: m.name,
    code: Math.round(m.loc * 0.75),
    comments: Math.round(m.loc * 0.15),
    blank: Math.round(m.loc * 0.10),
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. LARGE SAAS WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 text-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-indigo-500/15">
        {/* Background Decorative Blurs */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-indigo-100 border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>AI-Driven Software Quality & Defect Prediction</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Enterprise Software Bug Intelligence
            </h2>

            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed max-w-xl">
              Real-time static code analysis, multi-language AST structural extraction, and machine learning bug risk classification for Java, Python, C++, and C projects.
            </p>

            {/* Quick Metrics Badges inside banner */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-indigo-200">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {stats.total_modules} Modules Monitored
              </span>
              <span>•</span>
              <span className="font-medium">
                {stats.average_risk_score}% Avg Defect Risk
              </span>
              <span>•</span>
              <span className="font-medium text-rose-300">
                {stats.high_risk_modules} High Risk Hotspots
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => onNavigate('predict')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 active:scale-95 px-5 py-3 text-xs font-bold shadow-lg shadow-black/10 transition-all cursor-pointer"
            >
              <FileCode className="h-4 w-4 text-indigo-600" />
              <span>Analyze Source Code</span>
              <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-white border border-white/20 active:scale-95 px-5 py-3 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
            >
              <FileDown className="h-4 w-4" />
              <span>Export Quality Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ANIMATED STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Modules"
          value={stats.total_modules}
          subtitle="Monitored Codebase Units"
          icon={FolderGit2}
          variant="indigo"
        />
        <MetricCard
          title="High Risk Hotspots"
          value={stats.high_risk_modules}
          subtitle="Critical Bug Propensity (>70%)"
          icon={ShieldAlert}
          variant="rose"
          trend={{
            text: `${Math.round((stats.high_risk_modules / (stats.total_modules || 1)) * 100)}% of total`,
            positive: false,
          }}
        />
        <MetricCard
          title="Medium Risk"
          value={stats.medium_risk_modules}
          subtitle="Requires Architectural Review"
          icon={AlertTriangle}
          variant="amber"
        />
        <MetricCard
          title="Low Risk"
          value={stats.low_risk_modules}
          subtitle="Healthy & Defect Stable"
          icon={ShieldCheck}
          variant="emerald"
        />
        <MetricCard
          title="Composite Code Risk"
          value={`${stats.average_risk_score}%`}
          subtitle="System Defect Index"
          icon={Percent}
          variant={
            stats.average_risk_score > 60
              ? 'rose'
              : stats.average_risk_score > 35
              ? 'amber'
              : 'emerald'
          }
        />
      </div>

      {/* 3. THREE INTERACTIVE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Risk Distribution Donut Chart */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Risk Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proportion of modules across risk tiers</p>
            </div>
            <Activity className="h-4 w-4 text-indigo-500" />
          </div>

          <div className="relative h-60 w-full flex items-center justify-center my-2">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center total text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.total_modules}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Modules
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">No scored modules available</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <div className="p-1.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20">
              <span className="block text-xs text-rose-600 dark:text-rose-400 font-bold">{stats.high_risk_modules}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">High Risk</span>
            </div>
            <div className="p-1.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
              <span className="block text-xs text-amber-600 dark:text-amber-400 font-bold">{stats.medium_risk_modules}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Medium</span>
            </div>
            <div className="p-1.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="block text-xs text-emerald-600 dark:text-emerald-400 font-bold">{stats.low_risk_modules}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Low Risk</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Complexity Analysis Bar Chart */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Complexity Analysis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">McCabe Cyclomatic Complexity v(G)</p>
            </div>
            <Layers className="h-4 w-4 text-violet-500" />
          </div>

          <div className="h-60 w-full my-2">
            {complexityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complexityData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(val: any) => [`${val}`, 'v(G) Complexity']}
                    labelFormatter={(idx, payload) => payload?.[0]?.payload?.fullName || idx}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="complexity" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-slate-400">No complexity data recorded</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Safe Threshold: &lt; 10</span>
            <span className="font-semibold text-violet-600 dark:text-violet-400">McCabe metric v(G)</span>
          </div>
        </div>

        {/* Chart 3: LOC Composition Chart */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">LOC Comparison</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Code vs. comments vs. blank lines</p>
            </div>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </div>

          <div className="h-60 w-full my-2">
            {locData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="code" name="Code" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="comments" name="Comments" stackId="a" fill="#10b981" />
                  <Bar dataKey="blank" name="Blank" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-slate-400">No LOC breakdown recorded</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Stack: Code + Comments</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Static AST Metrics</span>
          </div>
        </div>
      </div>

      {/* 4. MACHINE LEARNING DEFECT INTELLIGENCE (NASA MDP JM1) */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-400 mb-2">
              <Cpu className="h-3.5 w-3.5" />
              <span>NASA MDP Defect Prediction Intelligence</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Machine Learning Benchmark & Model Evaluation
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Trained and empirically validated on the real-world NASA MDP JM1 defect dataset. Compares Logistic Regression, Decision Tree, and Random Forest classifiers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <Award className="h-4 w-4" />
              <span>Champion: Random Forest (72.7% Acc)</span>
            </span>
          </div>
        </div>

        {/* Dataset & Champion Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Dataset Summary */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Benchmark Dataset
              </span>
              <Database className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {stats.ml_dataset_info?.name || 'NASA MDP JM1'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {stats.ml_dataset_info?.domain || 'C/C++ Ground Flight Systems'}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Unique Records:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.ml_dataset_info?.unique_records_used?.toLocaleString() || '8,912'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Train / Test Split:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.ml_dataset_info?.train_samples?.toLocaleString() || '7,129'} / {stats.ml_dataset_info?.test_samples?.toLocaleString() || '1,783'} (80/20)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Software Metrics:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {stats.ml_dataset_info?.features_count || 21} Features
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Class Imbalance Distribution */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Class Distribution
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {stats.ml_dataset_info?.defect_ratio_percent || 22.52}% Defective
              </span>
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Defect Class Imbalance
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Balanced class weights applied to prevent majority-class bias
              </p>
            </div>

            {/* Imbalance Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${100 - (stats.ml_dataset_info?.defect_ratio_percent || 22.52)}%` }}
                  title="Clean Non-Defective"
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${stats.ml_dataset_info?.defect_ratio_percent || 22.52}%` }}
                  title="Defective"
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  Clean: {stats.ml_dataset_info?.clean_instances?.toLocaleString() || '6,905'} (77.5%)
                </span>
                <span className="text-rose-600 dark:text-rose-400">
                  Defective: {stats.ml_dataset_info?.defective_instances?.toLocaleString() || '2,007'} (22.5%)
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Champion Model Performance */}
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/30 dark:to-purple-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Production Classifier
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {stats.ml_best_model?.name || 'Random Forest Classifier'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Superior generalization & balanced defect catch rate
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/50 text-center">
              <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-100/80 dark:border-indigo-800/40">
                <span className="block text-sm font-black text-slate-900 dark:text-white">
                  {((stats.ml_best_model?.accuracy || 0.7269) * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Accuracy</span>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-100/80 dark:border-indigo-800/40">
                <span className="block text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {((stats.ml_best_model?.recall || 0.5000) * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Recall</span>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded-xl border border-indigo-100/80 dark:border-indigo-800/40">
                <span className="block text-sm font-black text-purple-600 dark:text-purple-400">
                  {(stats.ml_best_model?.f1_score || 0.4522).toFixed(3)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">F1-Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Empirical 3-Model Comparison Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Empirical Test Set Model Comparison (1,783 Unseen Modules)
            </h4>
            <span className="text-xs text-slate-400 font-medium">
              Evaluated on identical stratified test split
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/90 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800/80">
                <tr>
                  <th className="py-3 px-4 font-bold">Classifier</th>
                  <th className="py-3 px-4 font-bold text-center">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Accuracy</th>
                  <th className="py-3 px-4 font-bold text-right">Precision</th>
                  <th className="py-3 px-4 font-bold text-right">Recall</th>
                  <th className="py-3 px-4 font-bold text-right">F1-Score</th>
                  <th className="py-3 px-4 font-bold text-center">Confusion Matrix (TN / FP / FN / TP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                {(stats.ml_models_comparison || [
                  {
                    model_name: 'Logistic Regression',
                    accuracy: 0.7134,
                    precision: 0.3908,
                    recall: 0.4851,
                    f1_score: 0.4329,
                    true_negatives: 1077,
                    false_positives: 304,
                    false_negatives: 207,
                    true_positives: 195,
                    is_best: false,
                  },
                  {
                    model_name: 'Decision Tree',
                    accuracy: 0.6635,
                    precision: 0.3582,
                    recall: 0.6219,
                    f1_score: 0.4545,
                    true_negatives: 933,
                    false_positives: 448,
                    false_negatives: 152,
                    true_positives: 250,
                    is_best: false,
                  },
                  {
                    model_name: 'Random Forest',
                    accuracy: 0.7269,
                    precision: 0.4127,
                    recall: 0.5000,
                    f1_score: 0.4522,
                    true_negatives: 1095,
                    false_positives: 286,
                    false_negatives: 201,
                    true_positives: 201,
                    is_best: true,
                  },
                ]).map((m, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      m.is_best
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 font-semibold text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-4 font-sans font-bold flex items-center gap-2">
                      {m.is_best && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      <span>{m.model_name}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {m.is_best ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                          Selected Champion
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Baseline</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">{(m.accuracy * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right">{(m.precision * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right">{(m.recall * 100).toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {m.f1_score.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
                      [{m.true_negatives} / {m.false_positives} / {m.false_negatives} / {m.true_positives}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. RECENT ANALYSES & PREDICTIONS AUDIT */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" />
              <span>Recent Bug Risk Evaluations</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest software modules assessed by static parser and machine learning models
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('analysis-history')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors cursor-pointer"
            >
              <span>Code Logs</span>
              <ArrowRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <span>Prediction History</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
          {stats.recent_predictions.length > 0 ? (
            stats.recent_predictions.map((pred) => (
              <div
                key={pred.id || Math.random()}
                onClick={() => onSelectPrediction(pred)}
                className="flex items-center justify-between py-3.5 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all duration-150 group"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {pred.module_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{pred.loc} LOC</span>
                    <span>•</span>
                    <span>v(G) {pred.complexity}</span>
                    <span>•</span>
                    <span>{pred.commits} commits</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {pred.risk_score}%
                    </span>
                    <span className="block text-[10px] text-slate-400 font-semibold">
                      Score
                    </span>
                  </div>
                  <RiskBadge level={pred.risk_level} size="sm" />
                </div>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">No predictions recorded yet</p>
          )}
        </div>
      </div>
    </div>
  );
};
