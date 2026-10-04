from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.module import Module
from app.models.prediction import PredictionRecord
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.ml_engine import bug_predictor
from app.services.recommendation import recommendation_engine

router = APIRouter(prefix="/predictions", tags=["Predictions"])

@router.get("/ml-info", response_model=Dict[str, Any])
def get_ml_model_info():
    """
    Returns empirical evaluation metrics, confusion matrices, dataset stats,
    and model comparison for the NASA MDP JM1 defect prediction engine.
    """
    return bug_predictor.get_model_metadata()

@router.post("/predict", response_model=PredictionResponse)
def predict_bug_risk(payload: PredictionRequest, db: Session = Depends(get_db)):
    # 1. Run ML prediction & explanation with NASA JM1 trained model
    pred_result = bug_predictor.predict(payload.loc, payload.complexity, payload.commits)
    
    # 2. Run Recommendation Engine
    recs = recommendation_engine.generate_recommendations(
        payload.loc, payload.complexity, payload.commits,
        pred_result["risk_score"], pred_result["risk_level"]
    )

    record_id = None
    created_at = datetime.utcnow()

    # 3. Optionally persist to history
    if payload.save_to_history:
        # Check if module exists by id or name
        matched_module = None
        if payload.module_id:
            matched_module = db.query(Module).filter(Module.id == payload.module_id).first()
        if not matched_module:
            matched_module = db.query(Module).filter(Module.name == payload.module_name.strip()).first()

        record = PredictionRecord(
            module_id=matched_module.id if matched_module else None,
            module_name=payload.module_name.strip(),
            loc=payload.loc,
            complexity=payload.complexity,
            commits=payload.commits,
            risk_score=pred_result["risk_score"],
            risk_level=pred_result["risk_level"],
            explanation={
                "confidence": pred_result["confidence"],
                "summary": pred_result["summary_explanation"],
                "factors": pred_result["metric_factors"],
                "model_name": pred_result.get("model_name"),
                "predicted_class": pred_result.get("predicted_class"),
                "prediction_probability": pred_result.get("prediction_probability")
            },
            recommendations=recs,
            created_at=created_at
        )
        db.add(record)

        # Update module if matched
        if matched_module:
            matched_module.last_risk_score = pred_result["risk_score"]
            matched_module.last_risk_level = pred_result["risk_level"]
            matched_module.last_predicted_at = created_at
            matched_module.loc = payload.loc
            matched_module.complexity = payload.complexity
            matched_module.commits = payload.commits

        db.commit()
        db.refresh(record)
        record_id = record.id

    return PredictionResponse(
        id=record_id,
        module_id=payload.module_id,
        module_name=payload.module_name,
        loc=payload.loc,
        complexity=payload.complexity,
        commits=payload.commits,
        risk_score=pred_result["risk_score"],
        risk_level=pred_result["risk_level"],
        confidence=pred_result["confidence"],
        model_name=pred_result.get("model_name"),
        predicted_class=pred_result.get("predicted_class"),
        prediction_probability=pred_result.get("prediction_probability"),
        metric_factors=pred_result["metric_factors"],
        summary_explanation=pred_result["summary_explanation"],
        recommendations=recs,
        created_at=created_at
    )

@router.get("", response_model=List[PredictionResponse])
def get_prediction_history(
    search: Optional[str] = Query(None, description="Search by module name"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(PredictionRecord)
    if search:
        query = query.filter(PredictionRecord.module_name.ilike(f"%{search.strip()}%"))
    if risk_level and risk_level.lower() != "all":
        query = query.filter(PredictionRecord.risk_level.ilike(risk_level.strip()))

    records = query.order_by(PredictionRecord.created_at.desc()).limit(limit).all()

    results = []
    for r in records:
        explanation = r.explanation or {}
        results.append(PredictionResponse(
            id=r.id,
            module_id=r.module_id,
            module_name=r.module_name,
            loc=r.loc,
            complexity=r.complexity,
            commits=r.commits,
            risk_score=r.risk_score,
            risk_level=r.risk_level,
            confidence=explanation.get("confidence", 85.0),
            model_name=explanation.get("model_name", "Random Forest (NASA JM1)"),
            predicted_class=explanation.get("predicted_class", "Defective" if r.risk_score >= 50 else "Non-Defective"),
            prediction_probability=explanation.get("prediction_probability", round(r.risk_score / 100.0, 4)),
            metric_factors=explanation.get("factors", []),
            summary_explanation=explanation.get("summary", ""),
            recommendations=r.recommendations or [],
            created_at=r.created_at
        ))
    return results

@router.get("/{record_id}", response_model=PredictionResponse)
def get_prediction_detail(record_id: int, db: Session = Depends(get_db)):
    record = db.query(PredictionRecord).filter(PredictionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found")

    explanation = record.explanation or {}
    return PredictionResponse(
        id=record.id,
        module_id=record.module_id,
        module_name=record.module_name,
        loc=record.loc,
        complexity=record.complexity,
        commits=record.commits,
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        confidence=explanation.get("confidence", 85.0),
        model_name=explanation.get("model_name", "Random Forest (NASA JM1)"),
        predicted_class=explanation.get("predicted_class", "Defective" if record.risk_score >= 50 else "Non-Defective"),
        prediction_probability=explanation.get("prediction_probability", round(record.risk_score / 100.0, 4)),
        metric_factors=explanation.get("factors", []),
        summary_explanation=explanation.get("summary", ""),
        recommendations=record.recommendations or [],
        created_at=record.created_at
    )

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prediction(record_id: int, db: Session = Depends(get_db)):
    record = db.query(PredictionRecord).filter(PredictionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction record not found")
    db.delete(record)
    db.commit()
    return None

@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_predictions(db: Session = Depends(get_db)):
    db.query(PredictionRecord).delete()
    db.commit()
    return None
