import React, { useState, useRef } from 'react';
import {
  Bug,
  Sparkles,
  Code2,
  GitCommit,
  Layers,
  ArrowRight,
  AlertCircle,
  Upload,
  FileCode,
  FileUp,
  SlidersHorizontal,
  Wrench,
  RefreshCw,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { predictBugRisk, uploadSourceCode, analyzeRawCode } from '../api/client';
import type { PredictionRequest, PredictionResponse, CodeAnalysisResponse } from '../types';
import { ExtractedMetricsCards } from '../components/code/ExtractedMetricsCards';
import { CodePreview } from '../components/code/CodePreview';
import { RiskBadge } from '../components/common/RiskBadge';
import { CircularProgress } from '../components/common/CircularProgress';
import { useToast } from '../context/ToastContext';

interface BugPredictionProps {
  onPredictionSuccess: (result: PredictionResponse) => void;
}

const SAMPLE_CODES = {
  java: {
    fileName: 'OrderProcessor.java',
    code: `package com.ecommerce.orders;

import java.util.*;

public class OrderProcessor {
    private Map<String, Double> accountLedger = new HashMap<>();
    private int processedCount = 0;

    public boolean processTransaction(String orderId, double amount, String region, int maxRetries) {
        if (orderId == null || orderId.trim().isEmpty() || amount <= 0) {
            return false;
        }

        double fee = 0.0;
        if (region.equalsIgnoreCase("US")) {
            fee = amount * 0.02;
            if (amount > 10000) {
                fee = amount * 0.015;
            }
        } else if (region.equalsIgnoreCase("EU")) {
            fee = amount * 0.028;
        } else {
            fee = amount * 0.045;
        }

        switch (maxRetries) {
            case 1:
                System.out.println("Executing single pass");
                break;
            case 3:
                System.out.println("Executing 3-step exponential backoff");
                break;
            default:
                break;
        }

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            if (executeNetworkSettlement(orderId, amount + fee)) {
                processedCount++;
                return true;
            }
        }
        return false;
    }

    private boolean executeNetworkSettlement(String id, double total) {
        return total > 0.0 && id.length() > 3;
    }
}`
  },
  py: {
    fileName: 'auth_service.py',
    code: `import hashlib
import time

class AuthService:
    """Enterprise authentication and session verification controller."""
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.active_sessions = {}

    def issue_token(self, user_id: str, role: str) -> str:
        # Generate HMAC token with timestamp
        now = str(time.time())
        token_seed = f"{user_id}:{role}:{now}:{self.secret_key}"
        token = hashlib.sha256(token_seed.encode("utf-8")).hexdigest()
        self.active_sessions[token] = {
            "user_id": user_id,
            "role": role,
            "created_at": now
        }
        return token

    def validate_session(self, token: str) -> bool:
        if not token or token not in self.active_sessions:
            return False
        return True
`
  },
  cpp: {
    fileName: 'data_buffer.cpp',
    code: `#include <iostream>
#include <vector>
#include <cstring>

class DataBuffer {
private:
    std::vector<uint8_t> storage;
    size_t write_pos = 0;
    size_t capacity;

public:
    DataBuffer(size_t cap) : capacity(cap) {
        storage.resize(cap, 0);
    }

    bool append_payload(const uint8_t* payload, size_t length) {
        if (payload == nullptr || write_pos + length > capacity) {
            return false;
        }
        for (size_t i = 0; i < length; ++i) {
            storage[write_pos++] = payload[i];
        }
        return true;
    }
};
`
  },
  c: {
    fileName: 'packet_parser.c',
    code: `#include <stdio.h>
#include <stdlib.h>

int parse_header_checksum(const unsigned char *header, int length) {
    // Computes bitwise parity XOR checksum across byte buffer
    if (header == NULL || length <= 0) {
        return -1;
    }

    int parity = 0;
    for (int i = 0; i < length; i++) {
        parity ^= header[i];
    }
    return parity;
}
`
  }
};

export const BugPrediction: React.FC<BugPredictionProps> = ({ onPredictionSuccess }) => {
  const toast = useToast();

  // Mode Selection: 'upload' vs 'manual'
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedCode, setPastedCode] = useState<string>('');
  const [customFileName, setCustomFileName] = useState<string>('sample_code.py');
  const [isPasteMode, setIsPasteMode] = useState<boolean>(false);
  const [codeAnalysisResult, setCodeAnalysisResult] = useState<CodeAnalysisResponse | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [progressStepText, setProgressStepText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [moduleName, setModuleName] = useState('');
  const [loc, setLoc] = useState<number>(350);
  const [complexity, setComplexity] = useState<number>(12.0);
  const [commits, setCommits] = useState<number>(20);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Quick Presets for Manual Mode
  const loadManualPreset = (preset: 'high' | 'medium' | 'low') => {
    if (preset === 'high') {
      setModuleName('OrderPaymentGateway.ts');
      setLoc(1850);
      setComplexity(36.0);
      setCommits(92);
      toast.info('High Risk Preset Loaded', 'Configured 1850 LOC, Complexity 36, 92 Commits');
    } else if (preset === 'medium') {
      setModuleName('CsvStreamTransformer.py');
      setLoc(540);
      setComplexity(16.5);
      setCommits(28);
      toast.info('Medium Risk Preset Loaded', 'Configured 540 LOC, Complexity 16.5, 28 Commits');
    } else {
      setModuleName('StringUtils.ts');
      setLoc(110);
      setComplexity(3.5);
      setCommits(6);
      toast.info('Low Risk Preset Loaded', 'Configured 110 LOC, Complexity 3.5, 6 Commits');
    }
  };

  // Load sample code for upload mode
  const handleLoadSampleCode = (type: 'java' | 'py' | 'cpp' | 'c') => {
    const sample = SAMPLE_CODES[type];
    setCustomFileName(sample.fileName);
    setPastedCode(sample.code);
    setIsPasteMode(true);
    setSelectedFile(null);
    setCodeAnalysisResult(null);
    setUploadError(null);
    toast.info(`Loaded ${sample.fileName}`, 'Sample code ready for AST structural analysis');
  };

  // File change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsPasteMode(false);
      setPastedCode('');
      setCodeAnalysisResult(null);
      setUploadError(null);
      toast.info(`Selected ${file.name}`, `${(file.size / 1024).toFixed(1)} KB file attached`);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setIsPasteMode(false);
      setPastedCode('');
      setCodeAnalysisResult(null);
      setUploadError(null);
      toast.info(`Dropped ${file.name}`, `${(file.size / 1024).toFixed(1)} KB ready for analysis`);
    }
  };

  // Execute Source Code Analysis with Animated Progress
  const handleAnalyzeSourceCode = async () => {
    if (!isPasteMode && !selectedFile) {
      setUploadError('Please select or drag & drop a .java, .py, .cpp, or .c file.');
      return;
    }
    if (isPasteMode && !pastedCode.trim()) {
      setUploadError('Please paste source code snippet to analyze.');
      return;
    }

    try {
      setUploadLoading(true);
      setUploadError(null);
      setUploadProgress(15);
      setProgressStepText('Reading and tokenizing source code...');

      // Step 1 progress simulation
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress(45);
      setProgressStepText('Parsing AST tree and measuring decision paths...');

      let resultPromise: Promise<CodeAnalysisResponse>;
      if (isPasteMode) {
        resultPromise = analyzeRawCode({
          file_name: customFileName.trim() || 'analyzed_code.py',
          source_code: pastedCode,
          commits: 15,
        });
      } else {
        resultPromise = uploadSourceCode(selectedFile!, 15);
      }

      await new Promise((r) => setTimeout(r, 250));
      setUploadProgress(75);
      setProgressStepText('Computing McCabe Cyclomatic Complexity & defect likelihood...');

      const result = await resultPromise;

      setUploadProgress(100);
      setProgressStepText('Analysis complete!');
      await new Promise((r) => setTimeout(r, 150));

      setCodeAnalysisResult(result);
      toast.success(
        'Analysis Complete',
        `${result.file_name} evaluated with ${result.risk_score}% Risk (${result.risk_level} Risk)`
      );
    } catch (err: any) {
      console.error('Code analysis failed:', err);
      const errMsg = err?.response?.data?.detail || 'Failed to analyze source code.';
      setUploadError(errMsg);
      toast.error('Analysis Failed', errMsg);
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  // Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleName.trim()) {
      setManualError('Please enter a module identifier or file name.');
      return;
    }

    try {
      setManualLoading(true);
      setManualError(null);

      const payload: PredictionRequest = {
        module_name: moduleName.trim(),
        loc: Number(loc),
        complexity: Number(complexity),
        commits: Number(commits),
        save_to_history: saveToHistory,
      };

      const result = await predictBugRisk(payload);
      toast.success('Prediction Generated', `${result.module_name}: ${result.risk_score}% Bug Risk`);
      onPredictionSuccess(result);
    } catch (err: any) {
      console.error('Prediction failed:', err);
      const msg = err?.response?.data?.detail || 'Prediction failed. Check backend connection.';
      setManualError(msg);
      toast.error('Prediction Failed', msg);
    } finally {
      setManualLoading(false);
    }
  };

  // Dynamic tags for manual sliders
  const getComplexityTag = (val: number) => {
    if (val <= 10) return { label: 'Low (Safe)', color: 'text-emerald-500' };
    if (val <= 20) return { label: 'Moderate (Review)', color: 'text-amber-500' };
    if (val <= 40) return { label: 'High (Defect Prone)', color: 'text-rose-500' };
    return { label: 'Critical (Severe)', color: 'text-rose-600 font-bold' };
  };

  const getLocTag = (val: number) => {
    if (val < 250) return { label: 'Compact', color: 'text-emerald-500' };
    if (val <= 600) return { label: 'Moderate', color: 'text-amber-500' };
    if (val <= 1500) return { label: 'Large File', color: 'text-rose-500' };
    return { label: 'God Object (>1500)', color: 'text-rose-600 font-bold' };
  };

  const getChurnTag = (val: number) => {
    if (val <= 12) return { label: 'Stable', color: 'text-emerald-500' };
    if (val <= 35) return { label: 'Active', color: 'text-amber-500' };
    if (val <= 75) return { label: 'High Churn', color: 'text-rose-500' };
    return { label: 'Volatile Hotspot', color: 'text-rose-600 font-bold' };
  };

  const compStatus = getComplexityTag(complexity);
  const locStatus = getLocTag(loc);
  const churnStatus = getChurnTag(commits);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Card */}
      <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                <Bug className="h-3.5 w-3.5" />
                <span>AI Software Analysis & Bug Prediction</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-400">
                <Cpu className="h-3.5 w-3.5" />
                <span>NASA MDP JM1 ML Engine</span>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Software Bug Risk Prediction
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              Upload source code files (.java, .py, .cpp, .c) for automated static metric extraction and defect likelihood prediction, or use the manual parameter sliders.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 self-start shrink-0">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-black/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileUp className="h-4 w-4" />
              <span>Upload Source Code</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md shadow-black/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Manual Metrics</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SOURCE CODE UPLOAD & AUTOMATED STATIC ANALYSIS */}
      {activeTab === 'upload' && (
        <div className="space-y-8">
          {/* Main Upload Box */}
          <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 shadow-xs space-y-6">
            {uploadError && (
              <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 text-xs font-medium text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Quick Sample Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Quick Sample Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSampleCode('java')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/80 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors cursor-pointer"
                >
                  ☕ OrderProcessor.java
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleCode('py')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/80 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors cursor-pointer"
                >
                  🐍 auth_service.py
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleCode('cpp')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/80 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors cursor-pointer"
                >
                  ⚡ data_buffer.cpp
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSampleCode('c')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-900/80 hover:bg-cyan-100 dark:hover:bg-cyan-950/70 transition-colors cursor-pointer"
                >
                  🧩 packet_parser.c
                </button>
              </div>
            </div>

            {/* DRAG & DROP UPLOAD ZONE OR PASTE ZONE */}
            {!isPasteMode ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".java,.py,.cpp,.c,.h,.hpp,.cc"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform mb-4 shadow-md shadow-indigo-500/10">
                  <Upload className="h-8 w-8" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedFile.name}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for automated static analysis
                    </p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                      ✓ File Attached
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Drag and drop your source code file here, or{' '}
                      <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400">
                        browse files
                      </span>
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Supports full automated AST parsing, McCabe complexity calculations, and structural metrics.
                    </p>

                    {/* Supported File Extensions Badges */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100/70 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        .java
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100/70 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                        .py
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-100/70 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
                        .cpp
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-100/70 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300">
                        .c
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-4 w-4 text-indigo-500" />
                    <input
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="File Name (e.g. Service.java)"
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setIsPasteMode(false);
                      setPastedCode('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer font-medium"
                  >
                    Switch to File Upload
                  </button>
                </div>

                <textarea
                  rows={10}
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="Paste your source code snippet here..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 font-mono text-xs text-slate-100 p-4 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            {/* ANIMATED UPLOAD PROGRESS BAR */}
            {uploadLoading && (
              <div className="space-y-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    <span>{progressStepText}</span>
                  </div>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPasteMode(!isPasteMode);
                  setSelectedFile(null);
                }}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {isPasteMode ? '← Back to file drag & drop' : '✏️ Or paste raw code in editor'}
              </button>

              <button
                type="button"
                onClick={handleAnalyzeSourceCode}
                disabled={uploadLoading || (!selectedFile && !pastedCode)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white px-8 py-3.5 text-xs font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
              >
                {uploadLoading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Code Structure...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze Code & Predict Risk</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4. DYNAMIC ANALYSIS RESULTS WITH CIRCULAR PROGRESS INDICATOR */}
          {codeAnalysisResult && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Hero Assessment Card */}
              <div
                className={`rounded-3xl border p-6 sm:p-8 shadow-md backdrop-blur-xl ${
                  codeAnalysisResult.risk_level === 'High'
                    ? 'border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/70 via-white to-rose-50/20 dark:from-rose-950/30 dark:via-slate-900 dark:to-rose-950/10'
                    : codeAnalysisResult.risk_level === 'Medium'
                    ? 'border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/20 dark:from-amber-950/30 dark:via-slate-900 dark:to-amber-950/10'
                    : 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/10'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-3 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskBadge level={codeAnalysisResult.risk_level} size="lg" />
                      {codeAnalysisResult.predicted_class && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                            codeAnalysisResult.predicted_class === 'Defective'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {codeAnalysisResult.predicted_class === 'Defective' ? (
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
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Confidence: {codeAnalysisResult.confidence}%
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-lg border border-purple-200 dark:border-purple-900/60">
                        <Cpu className="h-3 w-3" />
                        <span>{codeAnalysisResult.model_name || 'Random Forest Classifier'}</span>
                      </span>
                      {codeAnalysisResult.prediction_probability !== undefined && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          ML Prob: {(codeAnalysisResult.prediction_probability * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {codeAnalysisResult.file_name}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Static AST evaluation analyzed {codeAnalysisResult.metrics.loc} lines of {codeAnalysisResult.file_type.toUpperCase()} source code.
                      Cyclomatic complexity is calibrated at {codeAnalysisResult.metrics.cyclomatic_complexity.toFixed(1)}.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
                      <span>{codeAnalysisResult.metrics.code_lines} Code Lines</span>
                      <span>•</span>
                      <span>{codeAnalysisResult.metrics.functions_count} Functions</span>
                      <span>•</span>
                      <span>{codeAnalysisResult.metrics.classes_count} Classes</span>
                    </div>
                  </div>

                  {/* CIRCULAR PROGRESS INDICATOR */}
                  <div className="flex flex-col items-center justify-center rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 min-w-[220px] text-center shadow-lg shadow-black/5 shrink-0">
                    <CircularProgress
                      score={codeAnalysisResult.risk_score}
                      riskLevel={codeAnalysisResult.risk_level}
                      size={150}
                      strokeWidth={13}
                    />
                    <div className="mt-3 text-center">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {codeAnalysisResult.risk_level} Defect Risk
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Propensity Index (0-100%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extracted 8 Metrics Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Extracted Structural Metrics
                  </h4>
                  <span className="text-xs font-semibold text-slate-400">
                    8 Metrics Computed via Static Parser
                  </span>
                </div>
                <ExtractedMetricsCards metrics={codeAnalysisResult.metrics} />
              </div>

              {/* Code Preview Panel */}
              <div className="space-y-4">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Source Code Preview & Syntax Highlighting
                </h4>
                <CodePreview
                  code={codeAnalysisResult.source_code}
                  fileName={codeAnalysisResult.file_name}
                  fileType={codeAnalysisResult.file_type}
                  maxHeight="max-h-80"
                />
              </div>

              {/* Actionable Engineering Recommendations with Icons */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-indigo-500" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Actionable Engineering Recommendations
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Targeted refactoring guidelines based on extracted metrics and risk thresholds:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {codeAnalysisResult.recommendations.map((rec, i) => {
                    const badgeColor = {
                      Critical: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-900',
                      High: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900',
                      Medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900',
                      Low: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
                    }[rec.priority] || 'bg-slate-100 text-slate-700';

                    return (
                      <div
                        key={i}
                        className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 p-5 space-y-2 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-lg border ${badgeColor}`}>
                            {rec.priority} Priority
                          </span>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            {rec.category}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                          {rec.action}
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {rec.details}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL METRIC SLIDERS */}
      {activeTab === 'manual' && (
        <form
          onSubmit={handleManualSubmit}
          className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Manual Software Metric Parameters
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supply LOC, McCabe complexity, and commit count manually if source code is unavailable.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadManualPreset('high')}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                High Risk
              </button>
              <button
                type="button"
                onClick={() => loadManualPreset('medium')}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Medium Risk
              </button>
              <button
                type="button"
                onClick={() => loadManualPreset('low')}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Low Risk
              </button>
            </div>
          </div>

          {manualError && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{manualError}</span>
            </div>
          )}

          {/* Module Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Module Identifier or File Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="e.g. AuthenticationService.ts or /src/controllers/billing.py"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* LOC Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Code2 className="h-4 w-4 text-indigo-500" />
                  Lines of Code (LOC)
                </span>
                <span className={`text-xs font-bold ${locStatus.color}`}>{locStatus.label}</span>
              </div>
              <input
                type="range"
                min="10"
                max="3000"
                step="10"
                value={loc}
                onChange={(e) => setLoc(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-800 dark:text-slate-200">{loc} lines</span>
                <span className="text-[10px] text-slate-400 font-mono">10 - 3000+</span>
              </div>
            </div>

            {/* Cyclomatic Complexity Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Layers className="h-4 w-4 text-violet-500" />
                  Cyclomatic Complexity
                </span>
                <span className={`text-xs font-bold ${compStatus.color}`}>{compStatus.label}</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                step="0.5"
                value={complexity}
                onChange={(e) => setComplexity(Number(e.target.value))}
                className="w-full accent-violet-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-800 dark:text-slate-200">v(G) {complexity}</span>
                <span className="text-[10px] text-slate-400 font-mono">1 - 60+</span>
              </div>
            </div>

            {/* Commits Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <GitCommit className="h-4 w-4 text-blue-500" />
                  Number of Commits
                </span>
                <span className={`text-xs font-bold ${churnStatus.color}`}>{churnStatus.label}</span>
              </div>
              <input
                type="range"
                min="1"
                max="150"
                step="1"
                value={commits}
                onChange={(e) => setCommits(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-800 dark:text-slate-200">{commits} revisions</span>
                <span className="text-[10px] text-slate-400 font-mono">1 - 150+</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToHistory}
                onChange={(e) => setSaveToHistory(e.target.checked)}
                className="h-4 w-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Save result to prediction history & module registry
              </span>
            </label>

            <button
              type="submit"
              disabled={manualLoading}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white px-7 py-3 text-xs font-bold shadow-lg shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
            >
              {manualLoading ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Computing Prediction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Calculate Bug Risk</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
