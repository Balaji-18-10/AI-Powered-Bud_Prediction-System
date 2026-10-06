import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/layout/Layout';
import type { NavigationPage } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { BugPrediction } from './pages/BugPrediction';
import { PredictionResult } from './pages/PredictionResult';
import { ModuleManagement } from './pages/ModuleManagement';
import { PredictionHistory } from './pages/PredictionHistory';
import { AnalysisHistory } from './pages/AnalysisHistory';
import { SourceCodeAnalysis } from './pages/SourceCodeAnalysis';
import { Reports } from './pages/Reports';
import type { PredictionResponse } from './types';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [activePrediction, setActivePrediction] = useState<PredictionResponse | null>(null);

  const handlePredictionSuccess = (result: PredictionResponse) => {
    setActivePrediction(result);
    setCurrentPage('result');
  };

  const handleSelectPrediction = (prediction: PredictionResponse) => {
    setActivePrediction(prediction);
    setCurrentPage('result');
  };

  const handleNewPrediction = () => {
    setCurrentPage('predict');
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onNewPrediction={handleNewPrediction}
      hasActiveResult={activePrediction !== null}
    >
      {currentPage === 'dashboard' && (
        <Dashboard
          onNavigate={setCurrentPage}
          onSelectPrediction={handleSelectPrediction}
        />
      )}

      {currentPage === 'code-analysis' && (
        <SourceCodeAnalysis onNavigate={setCurrentPage} />
      )}

      {currentPage === 'predict' && (
        <BugPrediction onPredictionSuccess={handlePredictionSuccess} />
      )}

      {currentPage === 'analysis-history' && <AnalysisHistory />}

      {currentPage === 'result' && (
        <PredictionResult
          prediction={activePrediction}
          onNavigate={setCurrentPage}
          onNewPrediction={handleNewPrediction}
        />
      )}

      {currentPage === 'modules' && (
        <ModuleManagement onSelectPrediction={handleSelectPrediction} />
      )}

      {currentPage === 'history' && (
        <PredictionHistory onSelectPrediction={handleSelectPrediction} />
      )}

      {currentPage === 'reports' && <Reports />}
    </Layout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
