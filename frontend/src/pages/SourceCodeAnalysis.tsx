import React, { useState, useRef } from 'react';
import {
  FileCode,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles,
  Download,
  RotateCcw,
  History,
  ShieldAlert,
  Layers,
  Code2,
  Box,
  Binary,
  MessageSquareCode,
  GitFork,
  Repeat,
  Split,
  HelpCircle,
  CheckCheck,
  Package,
} from 'lucide-react';
import { uploadSourceCode, analyzeRawCode, downloadCodeAnalysisPdfReport } from '../api/client';
import type { CodeAnalysisResponse } from '../types';
import { CodePreview } from '../components/code/CodePreview';
import { RiskBadge } from '../components/common/RiskBadge';
import { CircularProgress } from '../components/common/CircularProgress';
import { useToast } from '../context/ToastContext';

interface SourceCodeAnalysisProps {
  onNavigate?: (page: any) => void;
}

const SAMPLE_FILES = {
  java: {
    name: 'OrderProcessor.java',
    code: `package com.enterprise.billing;

import java.util.*;

public class OrderProcessor {
    private Map<String, Double> ledger = new HashMap<>();
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
                System.out.println("Executing 3-step retry pass");
                break;
            default:
                break;
        }

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (executeSettlement(orderId, amount + fee)) {
                    processedCount++;
                    return true;
                }
            } catch (Exception e) {
                // empty catch block risk
            }
        }
        return false;
    }

    private boolean executeSettlement(String id, double total) {
        return total > 0.0 && id.length() > 3;
    }
}`,
  },
  py: {
    name: 'token_manager.py',
    code: `import hashlib
import time
import os

class TokenManager:
    """Security token manager with cryptographic hashing."""
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.active_sessions = {}
        # Hardcoded secret pattern for static analyzer detection
        self.secret_token = "sk_live_998877665544332211"

    def issue_token(self, user_id: str, role: str) -> str:
        if not user_id:
            return ""
            
        timestamp = str(time.time())
        token_seed = f"{user_id}:{role}:{timestamp}:{self.api_key}"
        token = hashlib.sha256(token_seed.encode("utf-8")).hexdigest()
        self.active_sessions[token] = {
            "user_id": user_id,
            "role": role,
            "created": timestamp
        }
        return token

    def verify_token(self, token: str) -> bool:
        if token in self.active_sessions:
            return True
        return False
`,
  },
  cpp: {
    name: 'matrix_solver.cpp',
    code: `#include <iostream>
#include <vector>
#include <cmath>

class MatrixSolver {
private:
    int dimensions;
    std::vector<std::vector<double>> matrix;

public:
    MatrixSolver(int n) : dimensions(n) {
        matrix.resize(n, std::vector<double>(n, 0.0));
    }

    void setElement(int r, int c, double val) {
        if (r >= 0 && r < dimensions && c >= 0 && c < dimensions) {
            matrix[r][c] = val;
        }
    }

    double computeTrace() {
        double trace = 0.0;
        for (int i = 0; i < dimensions; ++i) {
            trace += matrix[i][i];
        }
        return trace;
    }
};

int main() {
    MatrixSolver solver(4);
    solver.setElement(0, 0, 5.5);
    std::cout << "Trace: " << solver.computeTrace() << std::endl;
    return 0;
}
`,
  },
  c: {
    name: 'buffer_utils.c',
    code: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_BUFFER 256

typedef struct {
    char data[MAX_BUFFER];
    int length;
} PacketBuffer;

PacketBuffer* create_packet(const char* input) {
    if (input == NULL) {
        return NULL;
    }
    
    PacketBuffer* pkt = (PacketBuffer*)malloc(sizeof(PacketBuffer));
    if (pkt == NULL) {
        return NULL;
    }
    
    strncpy(pkt->data, input, MAX_BUFFER - 1);
    pkt->data[MAX_BUFFER - 1] = '\\0';
    pkt->length = strlen(pkt->data);
    return pkt;
}

int main() {
    PacketBuffer* p = create_packet("HELLO_NETWORK");
    if (p != NULL) {
        printf("Packet payload: %s, len: %d\\n", p->data, p->length);
        free(p);
    }
    return 0;
}
`,
  },
};

const ALLOWED_EXTS = ['.java', '.py', '.c', '.cpp'];

export const SourceCodeAnalysis: React.FC<SourceCodeAnalysisProps> = ({ onNavigate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [selectedLanguage, setSelectedLanguage] = useState<'java' | 'py' | 'cpp' | 'c'>('java');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<CodeAnalysisResponse | null>(null);
  const [warningFilter, setWarningFilter] = useState<string>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const detectLanguage = (name: string): string => {
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
    switch (ext) {
      case '.java':
        return 'Java';
      case '.py':
        return 'Python';
      case '.cpp':
        return 'C++';
      case '.c':
        return 'C';
      default:
        return 'Unknown';
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.error(
        'Unsupported File Type',
        `File ${selectedFile.name} has extension '${ext}'. Only .java, .py, .c, and .cpp are supported.`
      );
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File Exceeds Limit', 'Maximum allowed file size is 5MB.');
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);

    // Read preview text safely
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent((e.target?.result as string) || '');
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClearFile = () => {
    setFile(null);
    setFileContent('');
    setFileName('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = (lang: 'java' | 'py' | 'cpp' | 'c') => {
    setSelectedLanguage(lang);
    setFileName(SAMPLE_FILES[lang].name);
    setFileContent(SAMPLE_FILES[lang].code);
    setFile(null);
    toast.info('Sample Loaded', `Loaded sample ${SAMPLE_FILES[lang].name}`);
  };

  const handleAnalyze = async () => {
    if (!fileContent.trim() && !file) {
      toast.error('No Code Provided', 'Please upload a file or paste source code before analyzing.');
      return;
    }

    try {
      setAnalyzing(true);
      setUploadProgress(25);

      let result: CodeAnalysisResponse;
      if (file) {
        setUploadProgress(50);
        result = await uploadSourceCode(file);
      } else {
        setUploadProgress(50);
        result = await analyzeRawCode({
          file_name: fileName || `sample.${selectedLanguage}`,
          source_code: fileContent,
        });
      }

      setUploadProgress(100);
      setAnalysisResult(result);
      toast.success(
        'Analysis Complete',
        `Analyzed ${result.file_name}: ${result.metrics.loc} LOC, Risk: ${result.risk_level} (${result.risk_score}%)`
      );
    } catch (err: any) {
      console.error('Code analysis failed:', err);
      const detail = err.response?.data?.detail || 'Failed to analyze source code file.';
      toast.error('Analysis Failed', detail);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleResetToNew = () => {
    setAnalysisResult(null);
    handleClearFile();
  };

  const filteredWarnings = analysisResult
    ? warningFilter === 'All'
      ? analysisResult.code_warnings || []
      : (analysisResult.code_warnings || []).filter((w) => w.severity.toLowerCase() === warningFilter.toLowerCase())
    : [];

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 border-rose-300 dark:border-rose-800';
      case 'high':
        return 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-950/60 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800';
      case 'low':
        return 'text-blue-700 bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 border-blue-300 dark:border-blue-800';
      case 'info':
      default:
        return 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl shadow-indigo-600/15">
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 top-2 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Static AST & Heuristic Engine • Zero Code Execution</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Source Code Analysis & Bug Risk
            </h1>
            <p className="text-sm text-indigo-100/90 leading-relaxed">
              Upload Java, Python, C, or C++ source files for deep static parsing, syntax compliance validation,
              14+ code quality warning checks, and NASA MDP JM1 defect risk scoring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {analysisResult && (
              <>
                <a
                  href={downloadCodeAnalysisPdfReport(analysisResult.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-indigo-900 shadow-md hover:bg-indigo-50 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 text-indigo-600" />
                  <span>Export PDF Report</span>
                </a>
                <button
                  onClick={handleResetToNew}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/25 backdrop-blur-md transition-all cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Analyze Another File</span>
                </button>
              </>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate('analysis-history')}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-950/60 border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-900/80 transition-all cursor-pointer"
              >
                <History className="h-4 w-4" />
                <span>View Analysis Logs</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upload & Input Section (if no result yet) */}
      {!analysisResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload / Input Card */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4" />
                    File Upload
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    Paste Code / Editor
                  </span>
                </button>
              </div>

              {/* Supported Languages Pill */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <span>Supported:</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">.java</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">.py</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">.cpp</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">.c</span>
              </div>
            </div>

            {/* TAB 1: File Upload */}
            {activeTab === 'upload' && (
              <div className="space-y-5">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
                      : file
                      ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/20'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".java,.py,.c,.cpp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {file ? (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shadow-inner">
                        <FileCheck className="h-7 w-7" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB • Detected: {detectLanguage(file.name)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                        Click or drag another file to replace
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shadow-sm">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          Drop your source code file here, or{' '}
                          <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse files</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Accepts .java, .py, .c, .cpp up to 5MB max
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected File Details Bar */}
                {file && (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200/60 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold font-mono">
                        {file.name.split('.').pop()?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{file.name}</p>
                        <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={handleClearFile}
                      className="px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Remove File
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Paste / Code Editor */}
            {activeTab === 'paste' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">File Name:</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder={`SourceModule.${selectedLanguage}`}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Language:</label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value as any)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="java">Java (.java)</option>
                      <option value="py">Python (.py)</option>
                      <option value="cpp">C++ (.cpp)</option>
                      <option value="c">C (.c)</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={12}
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    placeholder={`// Paste your source code here...\n// Supports Java, Python, C++, and C`}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950 p-4 text-xs font-mono text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 selection:bg-indigo-600 leading-relaxed"
                  />
                  <div className="absolute right-3 bottom-3 text-[10px] text-slate-500 font-mono bg-slate-900/80 px-2 py-1 rounded">
                    {fileContent.split('\n').length} lines
                  </div>
                </div>
              </div>
            )}

            {/* Upload Progress Bar if active */}
            {analyzing && (
              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Parsing AST, checking syntax, scanning 14 rules...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {fileContent.trim() ? `${fileContent.split('\n').length} lines ready for AST scan` : 'Awaiting input'}
              </span>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || (!file && !fileContent.trim())}
                className={`inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  analyzing || (!file && !fileContent.trim())
                    ? 'opacity-50 cursor-not-allowed bg-slate-400'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-indigo-500/25'
                }`}
              >
                {analyzing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Analyzing Codebase...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Analyze Code Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Side Panel: Quick Load Presets & Verification Rules */}
          <div className="space-y-6">
            {/* Quick Test Samples */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Quick Sample Presets
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                Load representative real-world code files with typical constructs, branch complexity, and warnings:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLoadSample('java')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    Java Sample
                  </p>
                  <p className="text-[10px] text-slate-500">OrderProcessor.java</p>
                </button>

                <button
                  onClick={() => handleLoadSample('py')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    Python Sample
                  </p>
                  <p className="text-[10px] text-slate-500">token_manager.py</p>
                </button>

                <button
                  onClick={() => handleLoadSample('cpp')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    C++ Sample
                  </p>
                  <p className="text-[10px] text-slate-500">matrix_solver.cpp</p>
                </button>

                <button
                  onClick={() => handleLoadSample('c')}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                    C Sample
                  </p>
                  <p className="text-[10px] text-slate-500">buffer_utils.c</p>
                </button>
              </div>
            </div>

            {/* Static Analysis Scope Explanation */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Static Analysis Architecture
              </h3>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Non-Executing AST Engine:</strong> Files are parsed without execution in a sandboxed reader.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Hallucinated Errors:</strong> Syntax errors are reported solely upon concrete AST or delimiter syntax parsing failure.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>14 Code Quality Rules:</strong> Flags empty catch blocks, infinite loops, unused imports, hardcoded secrets, and dangerous functions.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>NASA MDP JM1 ML Model:</strong> Evaluates overall risk score using extracted McCabe & Halstead structural metrics.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESULT DASHBOARD FOR SOURCE CODE ANALYSIS (Sections A to G)             */}
      {/* ========================================================================= */}
      {analysisResult && (
        <div className="space-y-8">
          {/* SECTION A: File Information Bar */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-black font-mono text-lg border border-indigo-200/50 dark:border-indigo-800/50">
                  {analysisResult.file_type.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {analysisResult.file_name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {detectLanguage(analysisResult.file_name)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Analyzed at {new Date(analysisResult.created_at).toLocaleString()} • Size:{' '}
                    {(analysisResult.file_size / 1024).toFixed(1)} KB • Total Lines: {analysisResult.metrics.loc}
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-3">
                <div className="text-right mr-2 hidden sm:block">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Defect Risk</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {analysisResult.risk_score}% ({analysisResult.risk_level})
                  </p>
                </div>
                <RiskBadge level={analysisResult.risk_level} />
              </div>
            </div>
          </div>

          {/* SECTION B: Code Metrics Cards (LOC, Complexity, Functions, Classes, Imports, Conditions, Loops, Switches) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-500" />
              <span>Section B — Extracted Code Structural Metrics</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* LOC */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Lines of Code</span>
                  <Code2 className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.loc}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {analysisResult.metrics.code_lines} code • {analysisResult.metrics.blank_lines} blank
                </p>
              </div>

              {/* Cyclomatic Complexity */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Cyclomatic Complexity</span>
                  <Layers className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.cyclomatic_complexity.toFixed(1)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  McCabe decision paths v(G)
                </p>
              </div>

              {/* Functions */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Functions / Methods</span>
                  <Binary className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.functions_count}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  Callable subroutines
                </p>
              </div>

              {/* Classes */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Classes / Structs</span>
                  <Box className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.classes_count}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  Object encapsulation
                </p>
              </div>

              {/* Imports / Includes */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Imports / Includes</span>
                  <Package className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.imports_count ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  External dependencies
                </p>
              </div>

              {/* Conditionals */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Branch Conditions</span>
                  <GitFork className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.conditions_count ?? analysisResult.metrics.if_statements}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {analysisResult.metrics.if_statements} if / else branches
                </p>
              </div>

              {/* Loops */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Loop Constructs</span>
                  <Repeat className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.loops_count}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  for, while, do-while
                </p>
              </div>

              {/* Switches */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Switch Cases</span>
                  <Split className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.switch_statements}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  Selector dispatches
                </p>
              </div>

              {/* Comments & Documentation */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Documentation Ratio</span>
                  <MessageSquareCode className="h-4 w-4 text-teal-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {analysisResult.metrics.comment_ratio}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {analysisResult.metrics.comment_lines} comment lines
                </p>
              </div>

              {/* Quality Issues Summary */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <span>Total Findings</span>
                  <ShieldAlert className="h-4 w-4 text-rose-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {(analysisResult.syntax_errors?.length || 0) + (analysisResult.code_warnings?.length || 0)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {analysisResult.syntax_errors?.length || 0} syntax • {analysisResult.code_warnings?.length || 0} warnings
                </p>
              </div>
            </div>
          </div>

          {/* SECTION C: Syntax Error Report */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  (analysisResult.syntax_errors?.length || 0) > 0
                    ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}>
                  {(analysisResult.syntax_errors?.length || 0) > 0 ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Section C — Syntax Analysis & Language Compliance
                </h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                (analysisResult.syntax_errors?.length || 0) > 0
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                {analysisResult.syntax_errors?.length || 0} Syntax Issues Detected
              </span>
            </div>

            {(!analysisResult.syntax_errors || analysisResult.syntax_errors.length === 0) ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 p-4 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Zero Syntax Errors Detected</p>
                  <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                    The source code passed language AST and lexical parsing successfully without broken tokens or delimiter mismatches.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Error Type</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Diagnostic Message</th>
                      <th className="py-2.5 px-3">Suggested Remediation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {analysisResult.syntax_errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/10">
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          Line {err.line_number}
                          {err.column_number ? ` : Col ${err.column_number}` : ''}
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-600 dark:text-rose-400">
                          {err.error_type}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadgeClass(err.severity)}`}>
                            {err.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-800 dark:text-slate-200 max-w-xs">
                          {err.message}
                        </td>
                        <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 font-medium">
                          {err.suggested_fix}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION D: Static Analysis Warnings (Common Programming Errors) */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Section D — Common Programming Error & Security Warnings ({analysisResult.code_warnings?.length || 0})
                </h3>
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['All', 'Critical', 'High', 'Medium', 'Low', 'Info'].map((level) => {
                  const count =
                    level === 'All'
                      ? analysisResult.code_warnings?.length || 0
                      : (analysisResult.code_warnings || []).filter((w) => w.severity.toLowerCase() === level.toLowerCase()).length;
                  return (
                    <button
                      key={level}
                      onClick={() => setWarningFilter(level)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        warningFilter === level
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {level} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {(!analysisResult.code_warnings || analysisResult.code_warnings.length === 0) ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 p-4 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Zero Code Quality Violations Detected</p>
                  <p className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                    No empty catch blocks, infinite loop risks, unused imports, hardcoded credentials, or dangerous APIs were found.
                  </p>
                </div>
              </div>
            ) : filteredWarnings.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No warnings match filter '{warningFilter}'.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Rule & Category</th>
                      <th className="py-2.5 px-3">Line</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Detected Issue</th>
                      <th className="py-2.5 px-3">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredWarnings.map((warn, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{warn.title}</p>
                          <p className="font-mono text-[10px] text-slate-400">{warn.rule_id}</p>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          Line {warn.line_number}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadgeClass(warn.severity)}`}>
                            {warn.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-sm">
                          {warn.message}
                        </td>
                        <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-medium max-w-xs">
                          {warn.suggestion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION E: Bug Risk Assessment (NASA MDP JM1 ML Model) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Circular Gauge & Core ML Result */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Section E — Bug Defect Probability
              </span>

              <div className="my-2">
                <CircularProgress
                  score={analysisResult.risk_score}
                  riskLevel={analysisResult.risk_level}
                  size={160}
                  strokeWidth={14}
                />
              </div>

              <div>
                <RiskBadge level={analysisResult.risk_level} />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
                  {analysisResult.explanation ||
                    `Defect risk estimated at ${analysisResult.risk_score}% based on structural cyclomatic paths and syntax compliance.`}
                </p>
              </div>

              <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span className="font-semibold">ML Engine:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {analysisResult.model_name || 'Random Forest (NASA MDP JM1)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Classification:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {analysisResult.predicted_class || 'Evaluated'}
                  </span>
                </div>
              </div>
            </div>

            {/* Transparent Contributing Risk Factors */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Contributing Defect Risk Factors
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Transparent provenance: explicitly delineating automatically extracted code metrics vs static file limitations.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Metric Factor</th>
                      <th className="py-2.5 px-3">Observed Value</th>
                      <th className="py-2.5 px-3">Contribution</th>
                      <th className="py-2.5 px-3">Extraction Source</th>
                      <th className="py-2.5 px-3">Influence Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {(analysisResult.risk_factors || []).map((rf, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {rf.metric}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {rf.value}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {rf.contribution_percent}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rf.source.includes('Automatically')
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {rf.source}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {rf.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notice regarding git churn */}
              <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 p-3 text-[11px] text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <p>
                  <strong>No Fabricated Git Churn:</strong> Single-file static analysis does not fake repository commit activity. Churn variables are marked as not available, and evaluation relies on verified McCabe Cyclomatic paths, line counts, syntax blocks, and static defect heuristics.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION F: Actionable Recommendations */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              <span>Section F — Actionable Refactoring & Quality Recommendations</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {(analysisResult.recommendations || []).map((rec, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 p-4 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {rec.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadgeClass(rec.priority)}`}>
                      {rec.priority}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rec.action}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rec.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION G: Code Preview with Syntax Highlighting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-indigo-500" />
                <span>Section G — Source Code Inspection & Syntax Highlighting</span>
              </h3>
            </div>

            <CodePreview
              code={analysisResult.source_code}
              fileName={analysisResult.file_name}
              fileType={analysisResult.file_type}
              maxHeight="max-h-[500px]"
            />
          </div>

          {/* Bottom Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Report Saved to System Registry
                </p>
                <p className="text-[11px] text-slate-500">
                  Record ID #{analysisResult.id} stored in SQLite database.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={downloadCodeAnalysisPdfReport(analysisResult.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Download Report PDF</span>
              </a>

              <button
                onClick={handleResetToNew}
                className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Analyze New File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
