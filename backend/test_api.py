import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_backend_endpoints():
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    print("[PASS] Health check passed")

    # 2. Dashboard Stats
    res = client.get("/api/stats/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["total_modules"] >= 12
    assert "High" in data["risk_distribution"]
    assert len(data["recent_predictions"]) >= 0
    print(f"[PASS] Dashboard stats endpoint passed: {data['total_modules']} modules found")

    # 3. Predict endpoint
    predict_payload = {
        "module_name": "TestAuthModule.py",
        "loc": 850,
        "complexity": 24.5,
        "commits": 45,
        "save_to_history": True
    }
    res = client.post("/api/predictions/predict", json=predict_payload)
    assert res.status_code == 200
    pred_data = res.json()
    assert "risk_score" in pred_data
    assert "risk_level" in pred_data
    assert len(pred_data["metric_factors"]) == 3
    assert len(pred_data["recommendations"]) > 0
    print(f"[PASS] Prediction endpoint passed: Score={pred_data['risk_score']}%, Level={pred_data['risk_level']}")

    # 4. Modules CRUD
    new_module = {
        "name": "E2ETestRunner.ts",
        "description": "Integration test runner module",
        "loc": 400,
        "complexity": 11.0,
        "commits": 15
    }
    res = client.post("/api/modules", json=new_module)
    assert res.status_code == 201
    mod_id = res.json()["id"]
    print(f"[PASS] Create module passed. ID: {mod_id}")

    # Update module
    update_payload = {"loc": 450, "complexity": 12.5}
    res = client.put(f"/api/modules/{mod_id}", json=update_payload)
    assert res.status_code == 200
    assert res.json()["loc"] == 450
    print("[PASS] Update module passed")

    # Delete module
    res = client.delete(f"/api/modules/{mod_id}")
    assert res.status_code == 204
    print("[PASS] Delete module passed")

    # 5. Reports Summary
    res = client.get("/api/reports/summary")
    assert res.status_code == 200
    assert "total_modules" in res.json()
    print("[PASS] Reports summary endpoint passed")

    print("\nALL BACKEND API TESTS COMPLETED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    test_backend_endpoints()
