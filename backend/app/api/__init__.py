from app.api.routes_modules import router as modules_router
from app.api.routes_predictions import router as predictions_router
from app.api.routes_dashboard import router as dashboard_router
from app.api.routes_reports import router as reports_router
from app.api.routes_code_analysis import router as analysis_router

__all__ = [
    "modules_router",
    "predictions_router",
    "dashboard_router",
    "reports_router",
    "analysis_router"
]
