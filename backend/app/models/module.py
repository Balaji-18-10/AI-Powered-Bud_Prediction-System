from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    loc = Column(Integer, nullable=False, default=100)
    complexity = Column(Float, nullable=False, default=5.0)
    commits = Column(Integer, nullable=False, default=10)
    
    # Latest prediction status
    last_risk_score = Column(Float, nullable=True)  # 0 to 100
    last_risk_level = Column(String(20), nullable=True)  # Low, Medium, High
    last_predicted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    predictions = relationship("PredictionRecord", back_populates="module", cascade="all, delete-orphan")
