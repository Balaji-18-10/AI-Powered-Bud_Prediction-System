from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine
from app.api.routes_modules import router as modules_router
from app.api.routes_predictions import router as predictions_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_reports import router as reports_router
from app.api.routes_code_analysis import router as analysis_router

def migrate_sqlite_tables():
    """Ensures newly added columns are present in existing SQLite database tables."""
    try:
        with engine.begin() as conn:
            res = conn.execute(text("PRAGMA table_info(code_analysis_records)"))
            existing_cols = {row[1] for row in res.fetchall()}
            if existing_cols:
                cols_to_add = [
                    ("imports_count", "INTEGER DEFAULT 0"),
                    ("conditions_count", "INTEGER DEFAULT 0"),
                    ("syntax_errors_count", "INTEGER DEFAULT 0"),
                    ("warnings_count", "INTEGER DEFAULT 0"),
                    ("syntax_errors", "JSON"),
                    ("code_warnings", "JSON"),
                    ("risk_factors", "JSON"),
                    ("explanation", "TEXT"),
                ]
                for col_name, col_type in cols_to_add:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE code_analysis_records ADD COLUMN {col_name} {col_type}"))
    except Exception as e:
        print(f"Table migration notice: {e}")

# Ensure tables and migrations exist on load
Base.metadata.create_all(bind=engine)
migrate_sqlite_tables()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created for all models
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_tables()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI-driven software defect risk assessment and source code static analysis platform.",
    lifespan=lifespan
)

# Enable CORS for frontend development and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
app.include_router(modules_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
# Mount source code analysis under both /api/code-analysis and /api/analysis
app.include_router(analysis_router, prefix="/api/code-analysis")
app.include_router(analysis_router, prefix="/api/analysis")

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
