from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class PredictionRequest(BaseModel):
    module_name: str = Field(..., min_length=1, max_length=120, description="Module identifier or file path")
    module_id: Optional[int] = Field(None, description="Optional associated Module ID in system")
    loc: int = Field(..., ge=1, description="Lines of Code")
    complexity: float = Field(..., ge=1.0, description="Cyclomatic Complexity")
    commits: int = Field(..., ge=0, description="Number of historical commits")
    save_to_history: bool = Field(True, description="Whether to store in prediction records table")

class MetricFactor(BaseModel):
    name: str
    value: float
    contribution_percent: float
    risk_influence: str  # "Low", "Moderate", "High", "Critical"
    explanation: str

class RecommendationItem(BaseModel):
    category: str       # "Refactoring", "Testing", "Code Review", "Architecture"
    priority: str       # "Critical", "High", "Medium", "Low"
    action: str
    details: str

class PredictionResponse(BaseModel):
    id: Optional[int] = None
    module_id: Optional[int] = None
    module_name: str
    loc: int
    complexity: float
    commits: int
    risk_score: float   # 0.0 to 100.0%
    risk_level: str     # "Low", "Medium", "High"
    confidence: float   # 0.0 to 100.0%
    model_name: Optional[str] = None
    predicted_class: Optional[str] = None  # "Defective", "Non-Defective"
    prediction_probability: Optional[float] = None # 0.0 to 1.0
    metric_factors: List[MetricFactor]
    summary_explanation: str
    recommendations: List[RecommendationItem]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_modules: int
    high_risk_modules: int
    medium_risk_modules: int
    low_risk_modules: int
    unassessed_modules: int
    average_risk_score: float
    risk_distribution: Dict[str, int]
    top_riskiest_modules: List[Dict[str, Any]]
    recent_predictions: List[PredictionResponse]
    # Source Code Analysis metrics
    total_files_analyzed: int = 0
    total_syntax_issues: int = 0
    total_code_warnings: int = 0
    high_risk_files: int = 0
    medium_risk_files: int = 0
    low_risk_files: int = 0
    ml_dataset_info: Optional[Dict[str, Any]] = None
    ml_best_model: Optional[Dict[str, Any]] = None
    ml_models_comparison: Optional[List[Dict[str, Any]]] = None
