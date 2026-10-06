from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from app.core.database import Base

class CodeAnalysisRecord(Base):
    __tablename__ = "code_analysis_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    file_name = Column(String(255), nullable=False, index=True)
    file_type = Column(String(20), nullable=False)  # java, py, cpp, c
    file_size = Column(Integer, nullable=False, default=0)
    source_code = Column(Text, nullable=False)

    # Extracted Source Code Metrics
    loc = Column(Integer, nullable=False)                     # Total Lines of Code
    code_lines = Column(Integer, nullable=False, default=0)   # Non-empty, non-comment lines
    blank_lines = Column(Integer, nullable=False, default=0)  # Empty/whitespace lines
    comment_lines = Column(Integer, nullable=False, default=0)# Comment lines
    functions_count = Column(Integer, nullable=False, default=0)
    classes_count = Column(Integer, nullable=False, default=0)
    imports_count = Column(Integer, nullable=False, default=0)
    comments_count = Column(Integer, nullable=False, default=0)
    cyclomatic_complexity = Column(Float, nullable=False, default=1.0)
    if_statements = Column(Integer, nullable=False, default=0)
    conditions_count = Column(Integer, nullable=False, default=0)
    loops_count = Column(Integer, nullable=False, default=0)  # for, while, do-while
    switch_statements = Column(Integer, nullable=False, default=0)

    # Syntax Error & Quality Warning Analysis
    syntax_errors_count = Column(Integer, nullable=False, default=0)
    warnings_count = Column(Integer, nullable=False, default=0)
    syntax_errors = Column(JSON, nullable=True, default=list)
    code_warnings = Column(JSON, nullable=True, default=list)

    # Risk Assessment Results
    risk_score = Column(Float, nullable=False)   # 0.0 to 100.0%
    risk_level = Column(String(20), nullable=False)  # Low, Medium, High
    confidence = Column(Float, nullable=False, default=85.0)
    risk_factors = Column(JSON, nullable=True, default=list)
    explanation = Column(Text, nullable=True, default="")

    # Stored JSON details
    metrics_breakdown = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
