from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ModuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Module identifier or filename")
    description: Optional[str] = Field(None, max_length=500)
    loc: int = Field(..., ge=1, description="Lines of Code")
    complexity: float = Field(..., ge=1.0, description="Cyclomatic Complexity")
    commits: int = Field(..., ge=0, description="Number of commits / revision history")

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = None
    loc: Optional[int] = Field(None, ge=1)
    complexity: Optional[float] = Field(None, ge=1.0)
    commits: Optional[int] = Field(None, ge=0)

class ModuleResponse(ModuleBase):
    id: int
    last_risk_score: Optional[float] = None
    last_risk_level: Optional[str] = None
    last_predicted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
