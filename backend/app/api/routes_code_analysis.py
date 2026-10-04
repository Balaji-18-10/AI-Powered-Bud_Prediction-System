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
    CodeAnalysisResponse,
    CodeAnalysisListItem,
    CodeAnalysisStats,
    CodeMetrics,
    CodeRecommendation
)
from app.services.code_analyzer import code_analyzer
from app.services.code_recommendations import code_recommendation_engine

router = APIRouter(prefix="/analysis", tags=["Source Code Analysis"])

ALLOWED_EXTENSIONS = {".java", ".py", ".cpp", ".c", ".h", ".hpp", ".cc"}

def _save_and_format_analysis(db: Session, file_name: str, content: str, commits: int = 15) -> CodeAnalysisResponse:
    # 1. Run static code analyzer
    analysis_data = code_analyzer.analyze(file_name, content, commits=commits)
    m = analysis_data["metrics"]

    # 2. Generate specialized recommendations
    recs = code_recommendation_engine.generate_recommendations(
        metrics=m,
        risk_score=analysis_data["risk_score"],
        risk_level=analysis_data["risk_level"]
    )

    # Store in SQLite with ML model information in metrics_breakdown
    mb = dict(m)
    mb["model_name"] = analysis_data.get("model_name")
    mb["predicted_class"] = analysis_data.get("predicted_class")
    mb["prediction_probability"] = analysis_data.get("prediction_probability")

    record = CodeAnalysisRecord(
        file_name=file_name,
        file_type=analysis_data["file_type"],
        file_size=analysis_data["file_size"],
        source_code=content,
        loc=m["loc"],
        code_lines=m["code_lines"],
        blank_lines=m["blank_lines"],
        comment_lines=m["comment_lines"],
        functions_count=m["functions_count"],
        classes_count=m["classes_count"],
        comments_count=m["comments_count"],
        cyclomatic_complexity=m["cyclomatic_complexity"],
        if_statements=m["if_statements"],
        loops_count=m["loops_count"],
        switch_statements=m["switch_statements"],
        risk_score=analysis_data["risk_score"],
        risk_level=analysis_data["risk_level"],
        confidence=analysis_data["confidence"],
        metrics_breakdown=mb,
        recommendations=recs,
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
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        confidence=record.confidence,
        model_name=analysis_data.get("model_name"),
        predicted_class=analysis_data.get("predicted_class"),
        prediction_probability=analysis_data.get("prediction_probability"),
        recommendations=[CodeRecommendation(**r) for r in recs],
        created_at=record.created_at
    )

@router.post("/upload", response_model=CodeAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_analyze_file(
    file: UploadFile = File(...),
    commits: int = Form(15),
    db: Session = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Please upload .java, .py, .cpp, or .c files."
        )

    try:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read file: {str(e)}")

    return _save_and_format_analysis(db, file.filename, content, commits=commits)

@router.post("/raw", response_model=CodeAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_raw_code(payload: RawCodePayload, db: Session = Depends(get_db)):
    return _save_and_format_analysis(db, payload.file_name, payload.source_code, commits=payload.commits or 15)

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
            risk_score=r.risk_score,
            risk_level=r.risk_level,
            created_at=r.created_at
        )
        for r in records
    ]

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
        "comments_count": record.comments_count,
        "cyclomatic_complexity": record.cyclomatic_complexity,
        "if_statements": record.if_statements,
        "loops_count": record.loops_count,
        "switch_statements": record.switch_statements,
        "comment_ratio": round((record.comment_lines / max(1, record.code_lines)) * 100, 1),
    }

    recs = record.recommendations or []

    mb = record.metrics_breakdown or {}
    return CodeAnalysisResponse(
        id=record.id,
        file_name=record.file_name,
        file_type=record.file_type,
        file_size=record.file_size,
        source_code=record.source_code,
        metrics=CodeMetrics(**m),
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        confidence=record.confidence,
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

@router.get("/stats/visualizations", response_model=CodeAnalysisStats)
def get_analysis_stats(db: Session = Depends(get_db)):
    records = db.query(CodeAnalysisRecord).order_by(CodeAnalysisRecord.created_at.asc()).all()

    total = len(records)
    high = sum(1 for r in records if r.risk_level == "High")
    medium = sum(1 for r in records if r.risk_level == "Medium")
    low = sum(1 for r in records if r.risk_level == "Low")

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
        for r in records[-15:] # latest 15 points
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
        for r in records[-10:] # latest 10 files
    ]

    return CodeAnalysisStats(
        total_analyzed=total,
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        average_complexity=avg_complexity,
        average_risk_score=avg_risk,
        complexity_distribution=complexity_distribution,
        risk_score_trend=risk_score_trend,
        loc_comparison=loc_comparison
    )
