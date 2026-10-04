import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RefreshCw,
  History,
} from 'lucide-react';
import {
  fetchPredictionHistory,
  deletePrediction,
  clearPredictionHistory,
} from '../api/client';
import type { PredictionResponse } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

interface PredictionHistoryProps {
  onSelectPrediction: (prediction: PredictionResponse) => void;
}

export const PredictionHistory: React.FC<PredictionHistoryProps> = ({ onSelectPrediction }) => {
  const [records, setRecords] = useState<PredictionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const toast = useToast();

  // Clear confirmation modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchPredictionHistory({
        search: searchTerm || undefined,
        risk_level: selectedRisk !== 'All' ? selectedRisk : undefined,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedRisk]);

  const handleDeleteRecord = async (id: number) => {
    try {
      setDeletingId(id);
      await deletePrediction(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success('Record Deleted', 'Prediction audit record removed');
    } catch (err) {
      console.error('Failed to delete prediction record:', err);
      toast.error('Delete Failed', 'Could not remove prediction');
    } finally {
      setDeletingId(null);
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      await clearPredictionHistory();
      setIsClearModalOpen(false);
      setRecords([]);
      toast.success('Audit Log Cleared', 'All prediction records have been cleared');
    } catch (err) {
      console.error('Failed to clear history:', err);
      toast.error('Clear Failed', 'Could not clear history');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Prediction Audit Trail
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete historical log of model evaluations, risk calculations, and recommendations.
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={() => setIsClearModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-3.5 py-2 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-rose-200/50 dark:border-rose-900/50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search prediction history by module name..."
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

      {/* History Records Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4">Evaluated At</th>
                <th className="px-4 py-4">Module Name</th>
                <th className="px-4 py-4 text-center">Metrics (LOC / Comp / Commits)</th>
                <th className="px-4 py-4 text-center">Defect Risk Score</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    Loading prediction history...
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((rec) => (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {formatDate(rec.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {rec.module_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-slate-600 dark:text-slate-300">
                      <span>{rec.loc} lines</span>
                      <span className="text-slate-400 mx-1.5">/</span>
                      <span>v(G) {rec.complexity}</span>
                      <span className="text-slate-400 mx-1.5">/</span>
                      <span>{rec.commits} churn</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <RiskBadge level={rec.risk_level} size="sm" />
                        <span className="font-black text-slate-900 dark:text-white text-xs">
                          {rec.risk_score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectPrediction(rec)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => rec.id && handleDeleteRecord(rec.id)}
                          disabled={deletingId === rec.id}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No prediction history recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear All Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Prediction History"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Are you sure you want to delete all historical prediction records? Software modules in the
            registry will remain intact.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setIsClearModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmClearAll}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
