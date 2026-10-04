from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class RawCodePayload(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    source_code: str = Field(..., min_length=1)
    file_type: Optional[str] = Field(None, description="java, py, cpp, or c")
    commits: Optional[int] = Field(15, ge=0, description="Estimated revisions / churn")

class CodeRecommendation(BaseModel):
    category: str  # "Complexity", "Methods", "Documentation", "Testing", "Classes"
    priority: str  # "Critical", "High", "Medium", "Low"
    action: str
    details: str

class CodeMetrics(BaseModel):
    loc: int
    code_lines: int
    blank_lines: int
    comment_lines: int
    functions_count: int
    classes_count: int
    comments_count: int
    cyclomatic_complexity: float
    if_statements: int
    loops_count: int
    switch_statements: int
    comment_ratio: float

class CodeAnalysisResponse(BaseModel):
    id: int
    file_name: str
    file_type: str
    file_size: int
    source_code: str
    metrics: CodeMetrics
    risk_score: float
    risk_level: str
    confidence: float
    model_name: Optional[str] = None
    predicted_class: Optional[str] = None
    prediction_probability: Optional[float] = None
    recommendations: List[CodeRecommendation]
    created_at: datetime

    class Config:
        from_attributes = True

class CodeAnalysisListItem(BaseModel):
    id: int
    file_name: str
    file_type: str
    file_size: int
    loc: int
    functions_count: int
    classes_count: int
    cyclomatic_complexity: float
    risk_score: float
    risk_level: str
    created_at: datetime

    class Config:
        from_attributes = True

class CodeAnalysisStats(BaseModel):
    total_analyzed: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    average_complexity: float
    average_risk_score: float
    complexity_distribution: List[Dict[str, Any]]
    risk_score_trend: List[Dict[str, Any]]
    loc_comparison: List[Dict[str, Any]]
