from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.module import Module
from app.models.prediction import PredictionRecord
from app.schemas.module import ModuleCreate, ModuleUpdate, ModuleResponse
from app.schemas.prediction import PredictionResponse
from app.services.ml_engine import bug_predictor
from app.services.recommendation import recommendation_engine

router = APIRouter(prefix="/modules", tags=["Modules"])

@router.get("", response_model=List[ModuleResponse])
def get_modules(
    search: Optional[str] = Query(None, description="Filter modules by name or description"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (Low, Medium, High)"),
    db: Session = Depends(get_db)
):
    query = db.query(Module)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter((Module.name.ilike(search_fmt)) | (Module.description.ilike(search_fmt)))
    if risk_level and risk_level.lower() != "all":
        query = query.filter(Module.last_risk_level.ilike(risk_level.strip()))
    
    return query.order_by(Module.updated_at.desc()).all()

@router.post("", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
def create_module(
    payload: ModuleCreate,
    auto_predict: bool = Query(True, description="Automatically calculate initial bug risk"),
    db: Session = Depends(get_db)
):
    existing = db.query(Module).filter(Module.name == payload.name.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Module with name '{payload.name}' already exists."
        )

    module = Module(
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        loc=payload.loc,
        complexity=payload.complexity,
        commits=payload.commits,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    if auto_predict:
        pred_result = bug_predictor.predict(module.loc, module.complexity, module.commits)
        module.last_risk_score = pred_result["risk_score"]
        module.last_risk_level = pred_result["risk_level"]
        module.last_predicted_at = datetime.utcnow()

    db.add(module)
    db.commit()
    db.refresh(module)

    # Also log prediction if auto_predicted
    if auto_predict:
        recs = recommendation_engine.generate_recommendations(
            module.loc, module.complexity, module.commits,
            pred_result["risk_score"], pred_result["risk_level"]
        )
        record = PredictionRecord(
            module_id=module.id,
            module_name=module.name,
            loc=module.loc,
            complexity=module.complexity,
            commits=module.commits,
            risk_score=pred_result["risk_score"],
            risk_level=pred_result["risk_level"],
            explanation={
                "confidence": pred_result["confidence"],
                "summary": pred_result["summary_explanation"],
                "factors": pred_result["metric_factors"]
            },
            recommendations=recs,
            created_at=datetime.utcnow()
        )
        db.add(record)
        db.commit()

    return module

@router.get("/{module_id}", response_model=ModuleResponse)
def get_module(module_id: int, db: Session = Depends(get_db)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    return module

@router.put("/{module_id}", response_model=ModuleResponse)
def update_module(
    module_id: int,
    payload: ModuleUpdate,
    re_predict: bool = Query(True, description="Re-calculate bug risk upon updating metrics"),
    db: Session = Depends(get_db)
):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    if payload.name is not None and payload.name.strip() != module.name:
        existing = db.query(Module).filter(Module.name == payload.name.strip()).first()
        if existing and existing.id != module.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Another module with name '{payload.name}' already exists."
            )
        module.name = payload.name.strip()

    if payload.description is not None:
        module.description = payload.description.strip() if payload.description else None
    if payload.loc is not None:
        module.loc = payload.loc
    if payload.complexity is not None:
        module.complexity = payload.complexity
    if payload.commits is not None:
        module.commits = payload.commits

    module.updated_at = datetime.utcnow()

    if re_predict:
        pred_result = bug_predictor.predict(module.loc, module.complexity, module.commits)
        module.last_risk_score = pred_result["risk_score"]
        module.last_risk_level = pred_result["risk_level"]
        module.last_predicted_at = datetime.utcnow()

        recs = recommendation_engine.generate_recommendations(
            module.loc, module.complexity, module.commits,
            pred_result["risk_score"], pred_result["risk_level"]
        )
        record = PredictionRecord(
            module_id=module.id,
            module_name=module.name,
            loc=module.loc,
            complexity=module.complexity,
            commits=module.commits,
            risk_score=pred_result["risk_score"],
            risk_level=pred_result["risk_level"],
            explanation={
                "confidence": pred_result["confidence"],
                "summary": pred_result["summary_explanation"],
                "factors": pred_result["metric_factors"]
            },
            recommendations=recs,
            created_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()
    db.refresh(module)
    return module

@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(module_id: int, db: Session = Depends(get_db)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    db.delete(module)
    db.commit()
    return None

@router.post("/{module_id}/predict", response_model=PredictionResponse)
def predict_module_now(module_id: int, db: Session = Depends(get_db)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    pred_result = bug_predictor.predict(module.loc, module.complexity, module.commits)
    recs = recommendation_engine.generate_recommendations(
        module.loc, module.complexity, module.commits,
        pred_result["risk_score"], pred_result["risk_level"]
    )

    module.last_risk_score = pred_result["risk_score"]
    module.last_risk_level = pred_result["risk_level"]
    module.last_predicted_at = datetime.utcnow()

    record = PredictionRecord(
        module_id=module.id,
        module_name=module.name,
        loc=module.loc,
        complexity=module.complexity,
        commits=module.commits,
        risk_score=pred_result["risk_score"],
        risk_level=pred_result["risk_level"],
        explanation={
            "confidence": pred_result["confidence"],
            "summary": pred_result["summary_explanation"],
            "factors": pred_result["metric_factors"]
        },
        recommendations=recs,
        created_at=datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictionResponse(
        id=record.id,
        module_id=module.id,
        module_name=module.name,
        loc=module.loc,
        complexity=module.complexity,
        commits=module.commits,
        risk_score=record.risk_score,
        risk_level=record.risk_level,
        confidence=pred_result["confidence"],
        metric_factors=pred_result["metric_factors"],
        summary_explanation=pred_result["summary_explanation"],
        recommendations=recs,
        created_at=record.created_at
    )
