from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

class PredictionRecord(Base):
    __tablename__ = "prediction_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="SET NULL"), nullable=True)
    module_name = Column(String(120), index=True, nullable=False)
    
    # Input software metrics
    loc = Column(Integer, nullable=False)
    complexity = Column(Float, nullable=False)
    commits = Column(Integer, nullable=False)
    
    # Prediction results
    risk_score = Column(Float, nullable=False)  # 0.0 - 100.0 %
    risk_level = Column(String(20), nullable=False)  # Low, Medium, High
    
    # Detailed AI explanations & recommendations stored as JSON
    explanation = Column(JSON, nullable=False)
    recommendations = Column(JSON, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationship
    module = relationship("Module", back_populates="predictions")
