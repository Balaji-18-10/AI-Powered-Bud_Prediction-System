import React, { useState } from 'react';
import {
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  FileDown,
  Layers,
  Code2,
  GitCommit,
  Wrench,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import type { PredictionResponse } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { CircularProgress } from '../components/common/CircularProgress';
import type { NavigationPage } from '../components/layout/Sidebar';
import { useToast } from '../context/ToastContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PredictionResultProps {
  prediction: PredictionResponse | null;
  onNavigate: (page: NavigationPage) => void;
  onNewPrediction: () => void;
}

export const PredictionResult: React.FC<PredictionResultProps> = ({
  prediction,
  onNavigate,
  onNewPrediction,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const toast = useToast();

  if (!prediction) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-3xl bg-slate-100 dark:bg-slate-800 p-5 text-slate-400 shadow-inner">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            No Active Prediction Selected
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Run a new model evaluation or select a record from Prediction History to view detailed defect insights.
          </p>
        </div>
        <button
          onClick={onNewPrediction}
          className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
        >
          Run New Prediction
        </button>
      </div>
    );
  }

  const isHigh = prediction.risk_level === 'High';
  const isMed = prediction.risk_level === 'Medium';

  const heroColors = isHigh
    ? {
        border: 'border-rose-200 dark:border-rose-900/60',
        bg: 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/20 dark:from-rose-950/30 dark:via-slate-900 dark:to-rose-950/10',
      }
    : isMed
    ? {
        border: 'border-amber-200 dark:border-amber-900/60',
        bg: 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/20 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/10',
      }
    : {
        border: 'border-emerald-200 dark:border-emerald-900/60',
        bg: 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/10',
      };

  const categories = ['All', 'Refactoring', 'Testing', 'Architecture', 'Code Review', 'CI/CD Pipeline'];
  const filteredRecs = selectedCategory === 'All'
    ? prediction.recommendations
    : prediction.recommendations.filter((r) => r.category === selectedCategory);

  // Export current prediction to instant client-side PDF
  const handleExportClientPdf = () => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("AI Bug Prediction Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Module: ${prediction.module_name}`, 14, 28);
      doc.text(`Evaluated: ${new Date().toLocaleString()}`, 14, 34);

      // Summary Box
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`Risk Assessment: ${prediction.risk_level.toUpperCase()} RISK (${prediction.risk_score}%)`, 14, 44);
      doc.text(`Model: ${prediction.model_name || 'Random Forest'} | ML Class: ${prediction.predicted_class || 'Evaluated'} | Confidence: ${prediction.confidence}%`, 14, 50);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const splitSummary = doc.splitTextToSize(prediction.summary_explanation, 180);
      doc.text(splitSummary, 14, 57);

      // Metrics Table
      const metricsData = [
        ["Metric", "Value", "Influence Level", "Analysis"],
        ...prediction.metric_factors.map((f) => [
          f.name,
          String(f.value),
          f.risk_influence,
          f.explanation,
        ]),
      ];

      autoTable(doc, {
        startY: 75,
        head: [metricsData[0]],
        body: metricsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
      });

      // Recommendations Table
      const finalY = (doc as any).lastAutoTable.finalY || 130;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Prioritized Engineering Recommendations", 14, finalY + 12);

      const recsData = [
        ["Category", "Priority", "Recommended Action", "Guidance Details"],
        ...prediction.recommendations.map((r) => [
          r.category,
          r.priority,
          r.action,
          r.details,
        ]),
      ];

      autoTable(doc, {
        startY: finalY + 16,
        head: [recsData[0]],
        body: recsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 8 },
      });

      doc.save(`${prediction.module_name}_bug_prediction_report.pdf`);
      toast.success('PDF Export Complete', `Downloaded report for ${prediction.module_name}`);
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Export Failed', 'Unable to generate PDF report');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => onNavigate('predict')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Prediction Form</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportClientPdf}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer"
          >
            <FileDown className="h-4 w-4 text-indigo-500" />
            <span>Export PDF Report</span>
          </button>
          <button
            onClick={onNewPrediction}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Test Another Module</span>
          </button>
        </div>
      </div>

      {/* Hero Prediction Score Banner with Circular Gauge */}
      <div className={`rounded-3xl border ${heroColors.border} ${heroColors.bg} p-6 sm:p-8 shadow-md backdrop-blur-xl relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={prediction.risk_level} size="lg" />
              {prediction.predicted_class && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                    prediction.predicted_class === 'Defective'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {prediction.predicted_class === 'Defective' ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                      <span>ML Defect Predicted</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Clean / Non-Defective</span>
                    </>
                  )}
                </span>
              )}
              <span className="text-xs font-bold text-slate-400">
                Confidence: {prediction.confidence}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-900/60">
                <Cpu className="h-3 w-3" />
                <span>{prediction.model_name || 'Random Forest Classifier'}</span>
              </span>
              {prediction.prediction_probability !== undefined && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                  Defect Prob: {(prediction.prediction_probability * 100).toFixed(1)}%
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {prediction.module_name}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {prediction.summary_explanation}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-indigo-500" />
                {prediction.loc} LOC
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-violet-500" />
                v(G) {prediction.complexity}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <GitCommit className="h-4 w-4 text-blue-500" />
                {prediction.commits} Commits
              </span>
            </div>
          </div>

          {/* CIRCULAR PROGRESS GAUGE */}
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 min-w-[220px] text-center shadow-lg shadow-black/5 shrink-0">
            <CircularProgress
              score={prediction.risk_score}
              riskLevel={prediction.risk_level}
              size={150}
              strokeWidth={13}
            />
            <div className="mt-3 text-center">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {prediction.risk_level} Defect Risk
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Defect Likelihood
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Factor Contributions Breakdown */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Metric Factor Attribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Explainable AI breakdown quantifying how each software metric contributes to the defect risk score.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {prediction.metric_factors.map((factor, index) => {
            const influenceStyle = {
              Low: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
              Moderate: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
              High: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
              Critical: 'text-rose-700 bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 font-bold',
            }[factor.risk_influence] || 'text-slate-600 bg-slate-50 border-slate-200';

            return (
              <div
                key={index}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {factor.name}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-lg border font-bold ${influenceStyle}`}>
                      {factor.risk_influence}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {factor.value}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {factor.contribution_percent}% impact
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full ${
                        factor.risk_influence === 'Critical' || factor.risk_influence === 'High'
                          ? 'bg-rose-500'
                          : factor.risk_influence === 'Moderate'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${factor.contribution_percent}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {factor.explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Engineering Recommendations */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Actionable Recommendations
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Targeted engineering protocols to reduce cognitive complexity and prevent defects
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-3">
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec, i) => {
              const priorityBadge = {
                Critical: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-900',
                High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900',
                Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
                Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
              }[rec.priority] || 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-5 transition-all hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-lg border ${priorityBadge}`}>
                        {rec.priority} Priority
                      </span>
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        {rec.category}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {rec.action}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {rec.details}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">
              No recommendations found for category "{selectedCategory}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
