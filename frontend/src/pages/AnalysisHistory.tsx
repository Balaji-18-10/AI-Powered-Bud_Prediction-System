import React, { useEffect, useState } from 'react';
import {
  FileCode,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RefreshCw,
  Layers,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import {
  fetchAnalysisHistory,
  fetchAnalysisDetail,
  deleteAnalysisRecord,
  fetchAnalysisStats,
} from '../api/client';
import type {
  CodeAnalysisListItem,
  CodeAnalysisResponse,
  CodeAnalysisStats,
} from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { Modal } from '../components/common/Modal';
import { CodePreview } from '../components/code/CodePreview';
import { ExtractedMetricsCards } from '../components/code/ExtractedMetricsCards';
import { useToast } from '../context/ToastContext';

export const AnalysisHistory: React.FC = () => {
  const [history, setHistory] = useState<CodeAnalysisListItem[]>([]);
  const [stats, setStats] = useState<CodeAnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const toast = useToast();

  // Detail Inspection Modal State
  const [selectedDetail, setSelectedDetail] = useState<CodeAnalysisResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyData, statsData] = await Promise.all([
        fetchAnalysisHistory({
          search: searchTerm || undefined,
          risk_level: selectedRisk !== 'All' ? selectedRisk : undefined,
        }),
        fetchAnalysisStats(),
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load code analysis history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedRisk]);

  const handleInspect = async (id: number) => {
    try {
      setDetailLoading(true);
      setIsDetailOpen(true);
      const detail = await fetchAnalysisDetail(id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error('Failed to load analysis detail:', err);
      toast.error('Load Failed', 'Could not retrieve file details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await deleteAnalysisRecord(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
      const newStats = await fetchAnalysisStats();
      setStats(newStats);
      toast.success('Record Deleted', 'Analysis log record removed');
    } catch (err) {
      console.error('Failed to delete record:', err);
      toast.error('Delete Failed', 'Could not delete analysis record');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Source Code Analysis History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audit logs of uploaded code modules, complexity metrics, and longitudinal defect risk trends.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-2 shadow-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Evaluated</span>
              <span className="font-black text-slate-900 dark:text-white text-base">{stats.total_analyzed} files</span>
            </div>
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 px-4 py-2 shadow-xs">
              <span className="text-rose-500 block text-[10px] uppercase font-bold">High Risk Hotspots</span>
              <span className="font-black text-rose-600 dark:text-rose-400 text-base">{stats.high_risk_count}</span>
            </div>
          </div>
        )}
      </div>

      {/* VISUALIZATIONS SECTION: 3 CHARTS */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Complexity Distribution */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Complexity Distribution</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">McCabe Cyclomatic bands count</p>
              </div>
              <Layers className="h-4 w-4 text-indigo-500" />
            </div>

            <div className="h-56 w-full my-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.complexity_distribution} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <span className="mt-auto text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Avg. Complexity: <strong>{stats.average_complexity}</strong> v(G)
            </span>
          </div>

          {/* Chart 2: Risk Score Trend */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Risk Score Trend</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Defect risk over upload timeline</p>
              </div>
              <TrendingUp className="h-4 w-4 text-rose-500" />
            </div>

            <div className="h-56 w-full my-2">
              {stats.risk_score_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.risk_score_trend} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="riskGradTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="fileName" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Risk Score']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="riskScore"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#riskGradTrend)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No trend data available
                </div>
              )}
            </div>
            <span className="mt-auto text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Codebase Avg: <strong>{stats.average_risk_score}%</strong> defect risk
            </span>
          </div>

          {/* Chart 3: LOC Comparison */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">LOC Comparison</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Code lines vs comment density</p>
              </div>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </div>

            <div className="h-56 w-full my-2">
              {stats.loc_comparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.loc_comparison} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="codeLines" fill="#3b82f6" name="Code Lines" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="commentLines" fill="#10b981" name="Comments" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                  No files analyzed yet
                </div>
              )}
            </div>
            <div className="mt-auto flex items-center justify-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Code</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Comments</span>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & AUDIT TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by file name or extension..."
              className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              <option value="All">All Risk Tiers</option>
              <option value="High">High Risk Only</option>
              <option value="Medium">Medium Risk Only</option>
              <option value="Low">Low Risk Only</option>
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">File Name</th>
                  <th className="px-4 py-4">Upload Date</th>
                  <th className="px-4 py-4 text-center">LOC</th>
                  <th className="px-4 py-4 text-center">Complexity</th>
                  <th className="px-4 py-4 text-center">Functions / Classes</th>
                  <th className="px-4 py-4 text-center">Defect Risk</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                      Loading analysis audit trail...
                    </td>
                  </tr>
                ) : history.length > 0 ? (
                  history.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                          <FileCode className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-xs">{record.file_name}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {record.file_type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {formatDate(record.created_at)}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-slate-700 dark:text-slate-300">
                        {record.loc}
                      </td>
                      <td className="px-4 py-4 text-center font-mono text-slate-700 dark:text-slate-300">
                        {record.cyclomatic_complexity.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 text-[11px]">
                        <span>{record.functions_count} fn</span> • <span>{record.classes_count} cl</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <RiskBadge level={record.risk_level} size="sm" />
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {record.risk_score}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleInspect(record.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            disabled={deletingId === record.id}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No code analysis records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* INSPECT DETAIL MODAL */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedDetail ? `Code Analysis: ${selectedDetail.file_name}` : 'Loading Analysis...'}
        subtitle={selectedDetail ? `Evaluated on ${formatDate(selectedDetail.created_at)}` : ''}
        maxWidth="2xl"
      >
        {detailLoading || !selectedDetail ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
            Loading complete static analysis details...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Risk Badge & Score Header */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <RiskBadge level={selectedDetail.risk_level} size="lg" />
                <div>
                  <span className="text-xs text-slate-400 block">Calculated Defect Risk</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedDetail.risk_score}%
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-400">
                Confidence: {selectedDetail.confidence}%
              </span>
            </div>

            {/* Extracted Metrics Cards */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Extracted Metrics
              </h4>
              <ExtractedMetricsCards metrics={selectedDetail.metrics} />
            </div>

            {/* Code Preview */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Source Code Preview
              </h4>
              <CodePreview
                code={selectedDetail.source_code}
                fileName={selectedDetail.file_name}
                fileType={selectedDetail.file_type}
                maxHeight="max-h-72"
              />
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Refactoring Recommendations
              </h4>
              <div className="space-y-2">
                {selectedDetail.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{rec.action}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{rec.priority} Priority</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{rec.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
