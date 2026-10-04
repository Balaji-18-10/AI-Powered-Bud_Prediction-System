import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Sparkles,
  RefreshCw,
  FolderGit2,
} from 'lucide-react';
import {
  fetchModules,
  createModule,
  updateModule,
  deleteModule,
  predictModuleById,
} from '../api/client';
import type { Module, ModuleCreate, PredictionResponse } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

interface ModuleManagementProps {
  onSelectPrediction: (prediction: PredictionResponse) => void;
}

export const ModuleManagement: React.FC<ModuleManagementProps> = ({ onSelectPrediction }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const toast = useToast();

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<Module | null>(null);

  // Add / Edit Form State
  const [formData, setFormData] = useState<ModuleCreate>({
    name: '',
    description: '',
    loc: 250,
    complexity: 8.0,
    commits: 12,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Row predicting state tracker
  const [predictingId, setPredictingId] = useState<number | null>(null);

  const loadModules = async () => {
    try {
      setLoading(true);
      const data = await fetchModules({
        search: searchTerm || undefined,
        risk_level: selectedRisk !== 'All' ? selectedRisk : undefined,
      });
      setModules(data);
    } catch (err) {
      console.error('Failed to load modules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadModules();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedRisk]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      loc: 250,
      complexity: 8.0,
      commits: 12,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (mod: Module) => {
    setActiveModule(mod);
    setFormData({
      name: mod.name,
      description: mod.description || '',
      loc: mod.loc,
      complexity: mod.complexity,
      commits: mod.commits,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (mod: Module) => {
    setActiveModule(mod);
    setIsDeleteModalOpen(true);
  };

  // Submit Add Module
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Module name is required');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      await createModule(formData);
      setIsAddModalOpen(false);
      toast.success('Module Created', `${formData.name} added and registered`);
      await loadModules();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to create module';
      setFormError(msg);
      toast.error('Creation Failed', msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Module
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModule) return;

    try {
      setFormSubmitting(true);
      setFormError(null);
      await updateModule(activeModule.id, formData);
      setIsEditModalOpen(false);
      toast.success('Module Updated', `${formData.name} metrics refreshed`);
      await loadModules();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to update module';
      setFormError(msg);
      toast.error('Update Failed', msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!activeModule) return;
    try {
      setFormSubmitting(true);
      await deleteModule(activeModule.id);
      setIsDeleteModalOpen(false);
      toast.success('Module Removed', `${activeModule.name} deleted from registry`);
      await loadModules();
    } catch (err) {
      console.error('Failed to delete module:', err);
      toast.error('Delete Failed', 'Could not delete module');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Inline Predict
  const handleRunPredict = async (mod: Module) => {
    try {
      setPredictingId(mod.id);
      const prediction = await predictModuleById(mod.id);
      setModules((prev) =>
        prev.map((m) =>
          m.id === mod.id
            ? {
                ...m,
                last_risk_score: prediction.risk_score,
                last_risk_level: prediction.risk_level,
                last_predicted_at: prediction.created_at,
              }
            : m
        )
      );
      toast.success(
        'Assessment Complete',
        `${mod.name}: ${prediction.risk_score}% Risk (${prediction.risk_level})`
      );
      onSelectPrediction(prediction);
    } catch (err) {
      console.error('Failed to predict module:', err);
      toast.error('Prediction Failed', 'Could not compute risk assessment');
    } finally {
      setPredictingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Codebase Modules Registry
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor maintainability metrics, trigger on-demand predictions, and register new components.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Module</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by module name or description..."
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
            <option value="All">All Risk Levels</option>
            <option value="High">High Risk Only</option>
            <option value="Medium">Medium Risk Only</option>
            <option value="Low">Low Risk Only</option>
          </select>
        </div>
      </div>

      {/* Modules Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4">Module Name</th>
                <th className="px-4 py-4 text-center">LOC</th>
                <th className="px-4 py-4 text-center">Complexity</th>
                <th className="px-4 py-4 text-center">Commits</th>
                <th className="px-4 py-4 text-center">Defect Risk</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    Loading modules...
                  </td>
                </tr>
              ) : modules.length > 0 ? (
                modules.map((mod) => (
                  <tr
                    key={mod.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                          <FolderGit2 className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {mod.name}
                          </span>
                          {mod.description && (
                            <span className="text-[11px] text-slate-400 truncate block max-w-sm">
                              {mod.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-slate-700 dark:text-slate-300">
                      {mod.loc}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-slate-700 dark:text-slate-300">
                      {mod.complexity.toFixed(1)}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-slate-700 dark:text-slate-300">
                      {mod.commits}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <RiskBadge level={mod.last_risk_level} size="sm" />
                        {mod.last_risk_score !== null && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {mod.last_risk_score}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Predict Trigger */}
                        <button
                          onClick={() => handleRunPredict(mod)}
                          disabled={predictingId === mod.id}
                          title="Run ML Defect Assessment"
                          className="rounded-xl p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                        >
                          {predictingId === mod.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </button>

                        {/* Edit Trigger */}
                        <button
                          onClick={() => handleOpenEdit(mod)}
                          title="Edit Module Metrics"
                          className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete Trigger */}
                        <button
                          onClick={() => handleOpenDelete(mod)}
                          title="Delete Module"
                          className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No modules match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Module Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Software Module"
        subtitle="Add a new codebase component to automatically compute defect probability"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-rose-700 dark:text-rose-300 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Module Identifier / File Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. SessionManager.ts"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Module responsibilities and domain scope..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                LOC
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.loc}
                onChange={(e) => setFormData({ ...formData, loc: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Complexity
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={formData.complexity}
                onChange={(e) => setFormData({ ...formData, complexity: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Commits
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.commits}
                onChange={(e) => setFormData({ ...formData, commits: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold cursor-pointer"
            >
              {formSubmitting ? 'Saving...' : 'Create & Assess'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Module Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Module Metrics"
        subtitle={activeModule ? `Update metric inputs for ${activeModule.name}` : ''}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-rose-700 dark:text-rose-300 font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Module Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                LOC
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.loc}
                onChange={(e) => setFormData({ ...formData, loc: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Complexity
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                value={formData.complexity}
                onChange={(e) => setFormData({ ...formData, complexity: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Commits
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.commits}
                onChange={(e) => setFormData({ ...formData, commits: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold cursor-pointer"
            >
              {formSubmitting ? 'Saving Changes...' : 'Save & Re-calculate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Module Deletion"
        subtitle={activeModule ? `Are you sure you want to remove ${activeModule.name}?` : ''}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            This action will permanently delete the module and all associated prediction records from the local database.
          </p>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={handleDeleteConfirm}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
            >
              {formSubmitting ? 'Deleting...' : 'Delete Module'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
