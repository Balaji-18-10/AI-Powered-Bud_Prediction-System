export interface Module {
  id: number;
  name: string;
  description?: string;
  loc: number;
  complexity: number;
  commits: number;
  last_risk_score?: number | null;
  last_risk_level?: 'Low' | 'Medium' | 'High' | null;
  last_predicted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleCreate {
  name: string;
  description?: string;
  loc: number;
  complexity: number;
  commits: number;
}

export interface ModuleUpdate {
  name?: string;
  description?: string;
  loc?: number;
  complexity?: number;
  commits?: number;
}

export interface MetricFactor {
  name: string;
  value: number;
  contribution_percent: number;
  risk_influence: 'Low' | 'Moderate' | 'High' | 'Critical';
  explanation: string;
}

export interface RecommendationItem {
  category: 'Refactoring' | 'Testing' | 'Code Review' | 'Architecture' | 'CI/CD Pipeline';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  action: string;
  details: string;
}

export interface PredictionResponse {
  id?: number;
  module_id?: number | null;
  module_name: string;
  loc: number;
  complexity: number;
  commits: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  confidence: number;
  model_name?: string;
  predicted_class?: 'Defective' | 'Non-Defective' | string;
  prediction_probability?: number;
  metric_factors: MetricFactor[];
  summary_explanation: string;
  recommendations: RecommendationItem[];
  created_at?: string;
}

export interface PredictionRequest {
  module_name: string;
  module_id?: number | null;
  loc: number;
  complexity: number;
  commits: number;
  save_to_history?: boolean;
}

export interface DashboardStats {
  total_modules: number;
  high_risk_modules: number;
  medium_risk_modules: number;
  low_risk_modules: number;
  unassessed_modules: number;
  average_risk_score: number;
  risk_distribution: {
    High: number;
    Medium: number;
    Low: number;
    Unassessed: number;
  };
  top_riskiest_modules: {
    id: number;
    name: string;
    loc: number;
    complexity: number;
    commits: number;
    risk_score: number;
    risk_level: 'Low' | 'Medium' | 'High';
    updated_at: string;
  }[];
  recent_predictions: PredictionResponse[];
  total_files_analyzed?: number;
  total_syntax_issues?: number;
  total_code_warnings?: number;
  code_high_risk_files?: number;
  code_medium_risk_files?: number;
  code_low_risk_files?: number;
  recent_code_analyses?: CodeAnalysisListItem[];
  ml_dataset_info?: MLDatasetInfo;
  ml_best_model?: MLBestModel;
  ml_models_comparison?: MLModelComparisonItem[];
}

export interface MLDatasetInfo {
  name: string;
  source: string;
  domain: string;
  raw_records: number;
  duplicate_records_removed: number;
  unique_records_used: number;
  train_samples: number;
  test_samples: number;
  defective_instances: number;
  clean_instances: number;
  defect_ratio_percent: number;
  features_count: number;
  feature_names: string[];
}

export interface MLBestModel {
  name: string;
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
}

export interface MLModelComparisonItem {
  model_name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  true_positives: number;
  is_best: boolean;
}

export interface ReportSummary {
  generated_at: string;
  total_modules: number;
  total_prediction_runs: number;
  average_risk_score: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  top_high_risk_modules: {
    id: number;
    name: string;
    loc: number;
    complexity: number;
    commits: number;
    risk_score: number;
    risk_level: string;
  }[];
  all_modules: {
    id: number;
    name: string;
    loc: number;
    complexity: number;
    commits: number;
    risk_score: number;
    risk_level: string;
  }[];
}

export interface SyntaxErrorItem {
  error_type: string;
  line_number: number;
  column_number?: number | null;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  message: string;
  suggested_fix: string;
}

export interface CodeQualityWarning {
  rule_id: string;
  title: string;
  line_number: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  message: string;
  suggestion: string;
}

export interface RiskFactorItem {
  metric: string;
  value: number;
  contribution_percent: number;
  risk_level: string;
  description: string;
  source: string;
}

// Source Code Analysis Types
export interface CodeMetrics {
  loc: number;
  code_lines: number;
  blank_lines: number;
  comment_lines: number;
  functions_count: number;
  classes_count: number;
  imports_count?: number;
  comments_count: number;
  cyclomatic_complexity: number;
  if_statements: number;
  conditions_count?: number;
  loops_count: number;
  switch_statements: number;
  comment_ratio: number;
}

export interface CodeRecommendation {
  category: 'Complexity' | 'Methods' | 'Documentation' | 'Testing' | 'Classes' | string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  action: string;
  details: string;
}

export interface CodeAnalysisResponse {
  id: number;
  file_name: string;
  file_type: 'java' | 'py' | 'cpp' | 'c' | string;
  file_size: number;
  source_code: string;
  metrics: CodeMetrics;
  syntax_errors_count: number;
  warnings_count: number;
  syntax_errors: SyntaxErrorItem[];
  code_warnings: CodeQualityWarning[];
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  confidence: number;
  risk_factors?: RiskFactorItem[];
  explanation?: string;
  model_name?: string;
  predicted_class?: 'Defective' | 'Non-Defective' | string;
  prediction_probability?: number;
  recommendations: CodeRecommendation[];
  created_at: string;
}

export interface CodeAnalysisListItem {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  loc: number;
  functions_count: number;
  classes_count: number;
  cyclomatic_complexity: number;
  syntax_errors_count?: number;
  warnings_count?: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  created_at: string;
}

export interface CodeAnalysisStats {
  total_analyzed: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  average_complexity: number;
  average_risk_score: number;
  complexity_distribution: {
    range: string;
    count: number;
    color: string;
  }[];
  risk_score_trend: {
    id: number;
    fileName: string;
    date: string;
    riskScore: number;
    riskLevel: string;
    complexity: number;
  }[];
  loc_comparison: {
    id: number;
    name: string;
    fullName: string;
    loc: number;
    codeLines: number;
    commentLines: number;
    complexity: number;
    riskLevel: string;
  }[];
}
