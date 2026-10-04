import React, { useEffect, useState } from 'react';
import {
  Download,
  ShieldAlert,
  Printer,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { fetchReportSummary, downloadServerPdfReport } from '../api/client';
import type { ReportSummary } from '../types';
import { RiskBadge } from '../components/common/RiskBadge';
import { useToast } from '../context/ToastContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await fetchReportSummary();
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Client-Side PDF Generation
  const handleClientPdfExport = () => {
    if (!reportData) return;

    try {
      const doc = new jsPDF();

      // Brand Header
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("AI-Based Software Bug Prediction Report", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Generated on: ${reportData.generated_at} | Codebase Quality Assessment`, 14, 26);

      // Executive Summary Metrics Table
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Executive Summary", 14, 44);

      const summaryTableData = [
        ["Total Modules", "Average Defect Risk", "High Risk Hotspots", "Medium Risk", "Low Risk"],
        [
          String(reportData.total_modules),
          `${reportData.average_risk_score}%`,
          String(reportData.high_risk_count),
          String(reportData.medium_risk_count),
          String(reportData.low_risk_count),
        ],
      ];

      autoTable(doc, {
        startY: 48,
        head: [summaryTableData[0]],
        body: [summaryTableData[1]],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo
        styles: { halign: 'center', fontSize: 9 },
      });

      // High Risk Modules Table
      const nextY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("High-Risk Hotspot Modules (Immediate Review Required)", 14, nextY);

      const highRiskData = [
        ["Module Name", "LOC", "Complexity", "Commits", "Risk Score", "Risk Tier"],
        ...reportData.top_high_risk_modules.map((m) => [
          m.name,
          String(m.loc),
          String(m.complexity),
          String(m.commits),
          `${m.risk_score}%`,
          m.risk_level,
        ]),
      ];

      autoTable(doc, {
        startY: nextY + 4,
        head: [highRiskData[0]],
        body: highRiskData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72] }, // Rose-600
        styles: { fontSize: 8 },
      });

      // Strategic Action Items
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Strategic Defect Mitigation Actions", 14, finalY);

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const actions = [
        "1. Refactor Monolithic Classes: Decompose modules with LOC > 600 or McCabe Complexity > 20 into modular sub-packages.",
        "2. Gate Pull Requests: Block merges on components that increase cyclomatic branching depth without matching unit tests.",
        "3. Automated Mutation Testing: Target > 85% branch coverage on all designated High-Risk software hotspots.",
        "4. Churn Containment: Mandate two-person senior engineer approvals on high-churn files (>30 commits).",
      ];

      let currentLineY = finalY + 6;
      actions.forEach((action) => {
        doc.text(action, 14, currentLineY);
        currentLineY += 6;
      });

      doc.save(`software_bug_risk_assessment_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Executive PDF Exported', 'Downloaded software bug risk assessment report');
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error('Export Failed', 'Could not compile client PDF report');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Compiling executive bug prediction report...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="py-12 text-center text-slate-400">
        Unable to load report data. Please check connection.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Executive Quality & Defect Risk Report
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Holistic defect analysis, risk distributions, and management export actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Server-generated PDF */}
          <a
            href={downloadServerPdfReport()}
            download
            onClick={() => toast.info('Starting Server PDF Download', 'FastAPI ReportLab rendering...')}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Server PDF</span>
          </a>

          {/* Client-generated PDF */}
          <button
            onClick={handleClientPdfExport}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Export Executive PDF</span>
          </button>
        </div>
      </div>

      {/* Report Canvas Preview Box */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xs overflow-hidden">
        {/* Document Header */}
        <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <FileCheck className="h-3.5 w-3.5" />
                <span>Official Assessment Document</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                Software Bug Vulnerability Audit
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generated: {reportData.generated_at}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 text-center sm:text-right shrink-0 shadow-xs">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Overall Risk Index
              </span>
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {reportData.average_risk_score}%
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
              <span className="text-xs font-semibold text-slate-400">Total Modules</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {reportData.total_modules}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/30 dark:bg-rose-950/20 p-4">
              <span className="text-xs font-semibold text-rose-500">High Risk Hotspots</span>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {reportData.high_risk_count}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 dark:border-amber-950/40 bg-amber-50/30 dark:bg-amber-950/20 p-4">
              <span className="text-xs font-semibold text-amber-500">Medium Risk</span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {reportData.medium_risk_count}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
              <span className="text-xs font-semibold text-emerald-500">Low Risk</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {reportData.low_risk_count}
              </p>
            </div>
          </div>

          {/* High Risk Hotspots Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                <span>Critical Hotspots Requiring Remediation</span>
              </h4>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                {reportData.high_risk_count} critical components
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-3 py-3 text-center">LOC</th>
                    <th className="px-3 py-3 text-center">Complexity</th>
                    <th className="px-3 py-3 text-center">Commits</th>
                    <th className="px-3 py-3 text-center">Defect Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData.top_high_risk_modules.length > 0 ? (
                    reportData.top_high_risk_modules.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {m.name}
                        </td>
                        <td className="px-3 py-3 text-center font-mono">{m.loc}</td>
                        <td className="px-3 py-3 text-center font-mono">{m.complexity}</td>
                        <td className="px-3 py-3 text-center font-mono">{m.commits}</td>
                        <td className="px-3 py-3 text-center">
                          <RiskBadge level={m.risk_level} size="sm" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No critical hotspots identified. All modules meet maintainability criteria!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategic Action Blueprint */}
          <div className="rounded-3xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Recommended Defect Prevention Roadmap
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-[10px] font-bold">
                  1
                </span>
                <span>
                  <strong>Refactor High-Complexity Hotspots:</strong> Modularize payment and order processing routines exceeding McCabe cyclomatic complexity of 20 to limit nested conditionals.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-[10px] font-bold">
                  2
                </span>
                <span>
                  <strong>Implement Quality Gate Thresholds:</strong> Automate CI/CD pipeline checks using SonarQube or ESLint to block commits introducing &gt; 500 lines per module.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-[10px] font-bold">
                  3
                </span>
                <span>
                  <strong>Expand High-Churn Test Coverage:</strong> Require &gt; 85% branch coverage and integration testing for components revised more than 30 times.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
