@echo off
echo ========================================================
echo Starting AI-Based Software Bug Prediction Backend (FastAPI)
echo ========================================================
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
