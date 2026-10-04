from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.module import Module
from app.models.prediction import PredictionRecord
from app.schemas.prediction import DashboardStats, PredictionResponse
from app.services.ml_engine import bug_predictor

router = APIRouter(prefix="/stats", tags=["Dashboard"])

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    modules = db.query(Module).all()
    total_modules = len(modules)

    high_risk = 0
    med_risk = 0
    low_risk = 0
    unassessed = 0
    total_score = 0.0
    scored_count = 0

    for m in modules:
        if m.last_risk_score is None:
            unassessed += 1
        else:
            scored_count += 1
            total_score += m.last_risk_score
            if m.last_risk_level == "High" or m.last_risk_score > 70.0:
                high_risk += 1
            elif m.last_risk_level == "Medium" or m.last_risk_score >= 35.0:
                med_risk += 1
            else:
                low_risk += 1

    avg_score = round(total_score / scored_count, 1) if scored_count > 0 else 0.0

    # Top riskiest modules
    scored_modules = [m for m in modules if m.last_risk_score is not None]
    scored_modules.sort(key=lambda m: m.last_risk_score or 0.0, reverse=True)
    top_riskiest = [
        {
            "id": m.id,
            "name": m.name,
            "loc": m.loc,
            "complexity": m.complexity,
            "commits": m.commits,
            "risk_score": m.last_risk_score,
            "risk_level": m.last_risk_level,
            "updated_at": m.updated_at
        }
        for m in scored_modules[:5]
    ]

    # Recent 5 predictions
    recent_records = db.query(PredictionRecord).order_by(PredictionRecord.created_at.desc()).limit(5).all()
    recent_preds = []
    for r in recent_records:
        exp = r.explanation or {}
        recent_preds.append(PredictionResponse(
            id=r.id,
            module_id=r.module_id,
            module_name=r.module_name,
            loc=r.loc,
            complexity=r.complexity,
            commits=r.commits,
            risk_score=r.risk_score,
            risk_level=r.risk_level,
            confidence=exp.get("confidence", 85.0),
            model_name=exp.get("model_name", "Random Forest (NASA JM1)"),
            predicted_class=exp.get("predicted_class", "Defective" if r.risk_score >= 50 else "Non-Defective"),
            prediction_probability=exp.get("prediction_probability", round(r.risk_score / 100.0, 4)),
            metric_factors=exp.get("factors", []),
            summary_explanation=exp.get("summary", ""),
            recommendations=r.recommendations or [],
            created_at=r.created_at
        ))

    # ML Metadata from trained engine
    ml_meta = bug_predictor.get_model_metadata()

    return DashboardStats(
        total_modules=total_modules,
        high_risk_modules=high_risk,
        medium_risk_modules=med_risk,
        low_risk_modules=low_risk,
        unassessed_modules=unassessed,
        average_risk_score=avg_score,
        risk_distribution={
            "High": high_risk,
            "Medium": med_risk,
            "Low": low_risk,
            "Unassessed": unassessed
        },
        top_riskiest_modules=top_riskiest,
        recent_predictions=recent_preds,
        ml_dataset_info=ml_meta.get("dataset"),
        ml_best_model=ml_meta.get("best_model"),
        ml_models_comparison=ml_meta.get("models_comparison")
    )
