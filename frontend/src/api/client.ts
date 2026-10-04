import axios from 'axios';
import type {
  DashboardStats,
  Module,
  ModuleCreate,
  ModuleUpdate,
  PredictionRequest,
  PredictionResponse,
  ReportSummary,
  CodeAnalysisResponse,
  CodeAnalysisListItem,
  CodeAnalysisStats
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dashboard APIs
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>('/stats/dashboard');
  return response.data;
};

// Prediction APIs
export const predictBugRisk = async (payload: PredictionRequest): Promise<PredictionResponse> => {
  const response = await api.post<PredictionResponse>('/predictions/predict', payload);
  return response.data;
};

export const fetchPredictionHistory = async (params?: { search?: string; risk_level?: string; limit?: number }): Promise<PredictionResponse[]> => {
  const response = await api.get<PredictionResponse[]>('/predictions', { params });
  return response.data;
};

export const fetchPredictionDetail = async (id: number): Promise<PredictionResponse> => {
  const response = await api.get<PredictionResponse>(`/predictions/${id}`);
  return response.data;
};

export const fetchMLInfo = async (): Promise<any> => {
  const response = await api.get('/predictions/ml-info');
  return response.data;
};

export const deletePrediction = async (id: number): Promise<void> => {
  await api.delete(`/predictions/${id}`);
};

export const clearPredictionHistory = async (): Promise<void> => {
  await api.delete('/predictions');
};

// Module Management APIs
export const fetchModules = async (params?: { search?: string; risk_level?: string }): Promise<Module[]> => {
  const response = await api.get<Module[]>('/modules', { params });
  return response.data;
};

export const createModule = async (payload: ModuleCreate): Promise<Module> => {
  const response = await api.post<Module>('/modules', payload);
  return response.data;
};

export const updateModule = async (id: number, payload: ModuleUpdate): Promise<Module> => {
  const response = await api.put<Module>(`/modules/${id}`, payload);
  return response.data;
};

export const deleteModule = async (id: number): Promise<void> => {
  await api.delete(`/modules/${id}`);
};

export const predictModuleById = async (id: number): Promise<PredictionResponse> => {
  const response = await api.post<PredictionResponse>(`/modules/${id}/predict`);
  return response.data;
};

// Reports APIs
export const fetchReportSummary = async (): Promise<ReportSummary> => {
  const response = await api.get<ReportSummary>('/reports/summary');
  return response.data;
};

export const downloadServerPdfReport = (): string => {
  return `${API_BASE_URL}/api/reports/pdf`;
};

// Source Code Analysis APIs
export const uploadSourceCode = async (file: File, commits: number = 15): Promise<CodeAnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('commits', String(commits));

  const response = await api.post<CodeAnalysisResponse>('/analysis/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const analyzeRawCode = async (data: { file_name: string; source_code: string; commits?: number }): Promise<CodeAnalysisResponse> => {
  const response = await api.post<CodeAnalysisResponse>('/analysis/raw', data);
  return response.data;
};

export const fetchAnalysisHistory = async (params?: { search?: string; risk_level?: string }): Promise<CodeAnalysisListItem[]> => {
  const response = await api.get<CodeAnalysisListItem[]>('/analysis/history', { params });
  return response.data;
};

export const fetchAnalysisDetail = async (id: number): Promise<CodeAnalysisResponse> => {
  const response = await api.get<CodeAnalysisResponse>(`/analysis/${id}`);
  return response.data;
};

export const deleteAnalysisRecord = async (id: number): Promise<void> => {
  await api.delete(`/analysis/${id}`);
};

export const fetchAnalysisStats = async (): Promise<CodeAnalysisStats> => {
  const response = await api.get<CodeAnalysisStats>('/analysis/stats/visualizations');
  return response.data;
};
