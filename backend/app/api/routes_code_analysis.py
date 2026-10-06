import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.code_analysis import CodeAnalysisRecord
from app.schemas.code_analysis import (
    RawCodePayload,
    AnalyzeCodePayload,
    CodeAnalysisResponse,
    CodeAnalysisListItem,
    CodeAnalysisStats,
    CodeMetrics,
    CodeRecommendation,
    SyntaxErrorItem,
    CodeQualityWarning,
    RiskFactorItem
)
from app.services.code_analyzer import code_analyzer
from app.services.code_recommendations import code_recommendation_engine

router = APIRouter(prefix="", tags=["Source Code Analysis"])

ALLOWED_EXTENSIONS = {".java", ".py", ".cpp", ".c", ".h", ".hpp", ".cc", ".cxx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB limit

def _save_and_format_analysis(db: Session, file_name: str, content: str, commits: Optional[int] = None) -> CodeAnalysisResponse:
    if not content or not content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source code is empty. Please provide valid code content to analyze."
        )

    if len(content.encode("utf-8")) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 5MB security limit."
        )

    # 1. Run static code analyzer
    clean_name = os.path.basename(file_name.strip()) or "analyzed_code"
    analysis_data = code_analyzer.analyze(clean_name, content, commits=commits)
    m = analysis_data["metrics"]
    syntax_errors = analysis_data["syntax_errors"]
    code_warnings = analysis_data["code_warnings"]
    risk_factors = analysis_data["risk_factors"]
    recommendations = analysis_data["recommendations"]

    # 2. Store in SQLite
    record = CodeAnalysisRecord(
        file_name=clean_name,
        file_type=analysis_data["file_type"],
        file_size=analysis_data["file_size"],
        source_code=content,
        loc=m["loc"],
        code_lines=m["code_lines"],
        blank_lines=m["blank_lines"],
        comment_lines=m["comment_lines"],
        functions_count=m["functions_count"],
        classes_count=m["classes_count"],
        imports_count=m.get("imports_count", 0),
        comments_count=m["comments_count"],
        cyclomatic_complexity=m["cyclomatic_complexity"],
        if_statements=m["if_statements"],
        conditions_count=m.get("conditions_count", 0),
        loops_count=m["loops_count"],
        switch_statements=m["switch_statements"],
        syntax_errors_count=len(syntax_errors),
        warnings_count=len(code_warnings),
        syntax_errors=syntax_errors,
        code_warnings=code_warnings,
        risk_score=analysis_data["risk_score"],
        risk_level=analysis_data["risk_level"],
        confidence=analysis_data["confidence"],
        risk_factors=risk_factors,
        explanation=analysis_data["explanation"],
        metrics_breakdown=m,
        recommendations=recommendations,
        created_at=datetime.utcnow()
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return CodeAnalysisResponse(
        id=record.id,
        file_name=record.file_name,
        file_type=record.file_type,
        file_size=record.file_size,
        source_code=record.source_code,
        metrics=CodeMetrics(**m),
        syntax_errors=[SyntaxErrorItem(**e) for e in syntax_errors],
        syntax_errors_count=len(syntax_errors),
        code_warnings=[CodeQualityWarning(**w) for w in code_warnings],
        warnings_count=len(code_warnings),
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        confidence=record.confidence,
        risk_factors=[RiskFactorItem(**rf) for rf in risk_factors],
        explanation=record.explanation or "",
        model_name=analysis_data.get("model_name"),
        predicted_class=analysis_data.get("predicted_class"),
        prediction_probability=analysis_data.get("prediction_probability"),
        recommendations=[CodeRecommendation(**r) for r in recommendations],
        created_at=record.created_at
    )

@router.post("/upload", response_model=CodeAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_analyze_file(
    file: UploadFile = File(...),
    commits: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    clean_name = os.path.basename(file.filename or "")
    ext = os.path.splitext(clean_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Only .java, .py, .cpp, and .c files are accepted."
        )

    try:
        content_bytes = await file.read()
        if len(content_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of 5 MB."
            )
        content = content_bytes.decode("utf-8", errors="replace")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read source file: {str(e)}")

    return _save_and_format_analysis(db, clean_name, content, commits=commits)

@router.post("/analyze", response_model=CodeAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_code_payload(payload: AnalyzeCodePayload, db: Session = Depends(get_db)):
    clean_name = os.path.basename(payload.file_name.strip())
    ext = os.path.splitext(clean_name)[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Only .java, .py, .cpp, and .c files are accepted."
        )
    return _save_and_format_analysis(db, clean_name, payload.source_code, commits=payload.commits)

@router.post("/raw", response_model=CodeAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_raw_code(payload: RawCodePayload, db: Session = Depends(get_db)):
    return analyze_code_payload(
        AnalyzeCodePayload(
            file_name=payload.file_name,
            source_code=payload.source_code,
            file_type=payload.file_type,
            commits=payload.commits
        ),
        db
    )

@router.get("/history", response_model=List[CodeAnalysisListItem])
def get_analysis_history(
    search: Optional[str] = Query(None, description="Search by file name"),
    risk_level: Optional[str] = Query(None, description="Filter by risk tier (Low, Medium, High)"),
    db: Session = Depends(get_db)
):
    query = db.query(CodeAnalysisRecord)
    if search:
        query = query.filter(CodeAnalysisRecord.file_name.ilike(f"%{search.strip()}%"))
    if risk_level and risk_level.lower() != "all":
        query = query.filter(CodeAnalysisRecord.risk_level.ilike(risk_level.strip()))

    records = query.order_by(CodeAnalysisRecord.created_at.desc()).all()
    return [
        CodeAnalysisListItem(
            id=r.id,
            file_name=r.file_name,
            file_type=r.file_type,
            file_size=r.file_size,
            loc=r.loc,
            functions_count=r.functions_count,
            classes_count=r.classes_count,
            cyclomatic_complexity=r.cyclomatic_complexity,
            syntax_errors_count=r.syntax_errors_count if hasattr(r, "syntax_errors_count") and r.syntax_errors_count is not None else 0,
            warnings_count=r.warnings_count if hasattr(r, "warnings_count") and r.warnings_count is not None else 0,
            risk_score=r.risk_score,
            risk_level=r.risk_level,
            created_at=r.created_at
        )
        for r in records
    ]

@router.get("/stats/visualizations", response_model=CodeAnalysisStats)
def get_analysis_stats(db: Session = Depends(get_db)):
    records = db.query(CodeAnalysisRecord).order_by(CodeAnalysisRecord.created_at.asc()).all()

    total = len(records)
    high = sum(1 for r in records if r.risk_level == "High")
    medium = sum(1 for r in records if r.risk_level == "Medium")
    low = sum(1 for r in records if r.risk_level == "Low")

    total_syntax = sum(r.syntax_errors_count or 0 for r in records if hasattr(r, "syntax_errors_count"))
    total_warnings = sum(r.warnings_count or 0 for r in records if hasattr(r, "warnings_count"))

    avg_complexity = round(sum(r.cyclomatic_complexity for r in records) / total, 1) if total > 0 else 0.0
    avg_risk = round(sum(r.risk_score for r in records) / total, 1) if total > 0 else 0.0

    # Complexity distribution buckets
    buckets = {
        "1-5 (Simple)": 0,
        "6-10 (Structured)": 0,
        "11-20 (Moderate)": 0,
        "21-40 (High)": 0,
        "40+ (Critical)": 0
    }
    for r in records:
        c = r.cyclomatic_complexity
        if c <= 5:
            buckets["1-5 (Simple)"] += 1
        elif c <= 10:
            buckets["6-10 (Structured)"] += 1
        elif c <= 20:
            buckets["11-20 (Moderate)"] += 1
        elif c <= 40:
            buckets["21-40 (High)"] += 1
        else:
            buckets["40+ (Critical)"] += 1

    complexity_distribution = [
        {"range": k, "count": v, "color": "#10b981" if "Simple" in k or "Structured" in k else "#f59e0b" if "Moderate" in k else "#f43f5e"}
        for k, v in buckets.items()
    ]

    # Risk Score Trend
    risk_score_trend = [
        {
            "id": r.id,
            "fileName": r.file_name.split("/")[-1].split("\\")[-1][:16],
            "date": r.created_at.strftime("%b %d, %H:%M"),
            "riskScore": r.risk_score,
            "riskLevel": r.risk_level,
            "complexity": r.cyclomatic_complexity,
        }
        for r in records[-15:]
    ]

    # LOC Comparison
    loc_comparison = [
        {
            "id": r.id,
            "name": r.file_name.split("/")[-1].split("\\")[-1][:14],
            "fullName": r.file_name,
            "loc": r.loc,
            "codeLines": r.code_lines,
            "commentLines": r.comment_lines,
            "complexity": r.cyclomatic_complexity,
            "riskLevel": r.risk_level,
        }
        for r in records[-10:]
    ]

    return CodeAnalysisStats(
        total_analyzed=total,
        total_syntax_issues=total_syntax,
        total_code_warnings=total_warnings,
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        average_complexity=avg_complexity,
        average_risk_score=avg_risk,
        complexity_distribution=complexity_distribution,
        risk_score_trend=risk_score_trend,
        loc_comparison=loc_comparison
    )

@router.get("/{analysis_id}", response_model=CodeAnalysisResponse)
def get_analysis_detail(analysis_id: int, db: Session = Depends(get_db)):
    record = db.query(CodeAnalysisRecord).filter(CodeAnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis record not found")

    m = record.metrics_breakdown or {
        "loc": record.loc,
        "code_lines": record.code_lines,
        "blank_lines": record.blank_lines,
        "comment_lines": record.comment_lines,
        "functions_count": record.functions_count,
        "classes_count": record.classes_count,
        "imports_count": getattr(record, "imports_count", 0),
        "comments_count": record.comments_count,
        "cyclomatic_complexity": record.cyclomatic_complexity,
        "if_statements": record.if_statements,
        "conditions_count": getattr(record, "conditions_count", 0),
        "loops_count": record.loops_count,
        "switch_statements": record.switch_statements,
        "comment_ratio": round((record.comment_lines / max(1, record.code_lines)) * 100, 1),
    }

    recs = record.recommendations or []
    syntax_errors = getattr(record, "syntax_errors", []) or []
    code_warnings = getattr(record, "code_warnings", []) or []
    risk_factors = getattr(record, "risk_factors", []) or []

    mb = record.metrics_breakdown or {}
    return CodeAnalysisResponse(
        id=record.id,
        file_name=record.file_name,
        file_type=record.file_type,
        file_size=record.file_size,
        source_code=record.source_code,
        metrics=CodeMetrics(**m),
        syntax_errors=[SyntaxErrorItem(**e) for e in syntax_errors],
        syntax_errors_count=len(syntax_errors),
        code_warnings=[CodeQualityWarning(**w) for w in code_warnings],
        warnings_count=len(code_warnings),
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        confidence=record.confidence,
        risk_factors=[RiskFactorItem(**rf) for rf in risk_factors],
        explanation=getattr(record, "explanation", "") or "",
        model_name=mb.get("model_name"),
        predicted_class=mb.get("predicted_class"),
        prediction_probability=mb.get("prediction_probability"),
        recommendations=[CodeRecommendation(**r) for r in recs],
        created_at=record.created_at
    )

@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis_record(analysis_id: int, db: Session = Depends(get_db)):
    record = db.query(CodeAnalysisRecord).filter(CodeAnalysisRecord.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis record not found")
    db.delete(record)
    db.commit()
    return None
