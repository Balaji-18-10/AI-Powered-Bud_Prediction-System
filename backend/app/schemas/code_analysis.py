from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class RawCodePayload(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    source_code: str = Field(..., min_length=1)
    file_type: Optional[str] = Field(None, description="java, py, cpp, or c")
    commits: Optional[int] = Field(None, ge=0, description="Optional historical revisions / churn if provided")

class AnalyzeCodePayload(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    source_code: str = Field(..., min_length=1)
    file_type: Optional[str] = Field(None, description="java, py, cpp, or c")
    commits: Optional[int] = Field(None, ge=0, description="Optional historical revisions / churn if provided")

class CodeRecommendation(BaseModel):
    category: str  # "Complexity", "Methods", "Documentation", "Testing", "Classes", "Syntax", "Code Quality"
    priority: str  # "Critical", "High", "Medium", "Low"
    action: str
    details: str

class SyntaxErrorItem(BaseModel):
    error_type: str = Field(..., description="Error category, e.g., Syntax Error, Missing Semicolon, Unmatched Delimiter")
    line_number: int = Field(..., description="1-indexed line number of the error")
    column_number: Optional[int] = Field(None, description="Column offset if available")
    severity: str = Field("Critical", description="Critical or High")
    message: str = Field(..., description="Explanation of syntax failure")
    suggested_fix: str = Field(..., description="Concrete actionable remediation")

class CodeQualityWarning(BaseModel):
    warning_type: str = Field(..., description="Warning category, e.g., Unused Variable, Empty Catch Block, Null Risk")
    line_number: int = Field(..., description="1-indexed line number")
    column_number: Optional[int] = Field(None, description="Column offset if available")
    severity: str = Field("Medium", description="Critical, High, Medium, Low, or Info")
    message: str = Field(..., description="Warning description (Potential issue / Possible risk / Warning)")
    suggested_fix: str = Field(..., description="Recommended refactoring step")

class RiskFactorItem(BaseModel):
    name: str
    value: Any
    contribution_percent: float
    risk_influence: str  # "Low", "Moderate", "High", "Critical"
    explanation: str
    extraction_source: str = "Extracted Automatically"  # "Extracted Automatically" | "Supplied by User" | "Not Available"

class CodeMetrics(BaseModel):
    loc: int
    code_lines: int
    blank_lines: int
    comment_lines: int
    functions_count: int
    classes_count: int
    imports_count: int = 0
    comments_count: int
    cyclomatic_complexity: float
    if_statements: int
    conditions_count: int = 0
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
    syntax_errors: List[SyntaxErrorItem] = []
    syntax_errors_count: int = 0
    code_warnings: List[CodeQualityWarning] = []
    warnings_count: int = 0
    risk_score: float
    risk_level: str
    confidence: float
    risk_factors: List[RiskFactorItem] = []
    explanation: str = ""
    model_name: Optional[str] = None
    predicted_class: Optional[str] = None
    prediction_probability: Optional[float] = None
    recommendations: List[CodeRecommendation] = []
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
    syntax_errors_count: int = 0
    warnings_count: int = 0
    risk_score: float
    risk_level: str
    created_at: datetime

    class Config:
        from_attributes = True

class CodeAnalysisStats(BaseModel):
    total_analyzed: int
    total_syntax_issues: int = 0
    total_code_warnings: int = 0
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    average_complexity: float
    average_risk_score: float
    complexity_distribution: List[Dict[str, Any]]
    risk_score_trend: List[Dict[str, Any]]
    loc_comparison: List[Dict[str, Any]]
