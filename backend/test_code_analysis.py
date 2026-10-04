from fastapi.testclient import TestClient
from app.main import app
import io

client = TestClient(app)

def test_code_analysis_endpoints():
    # 1. Test Raw Code Analysis - Python
    py_code = """
def calculate_interest(principal, rate, years):
    # Calculates compound interest
    if rate < 0:
        return 0
    total = principal
    for i in range(years):
        total *= (1 + rate)
    return total
"""
    res = client.post("/api/analysis/raw", json={
        "file_name": "interest_calc.py",
        "source_code": py_code,
        "commits": 10
    })
    assert res.status_code == 201
    data = res.json()
    assert data["metrics"]["functions_count"] == 1
    assert data["metrics"]["if_statements"] == 1
    assert data["metrics"]["loops_count"] == 1
    assert data["metrics"]["loc"] > 5
    assert "risk_score" in data
    assert len(data["recommendations"]) > 0
    print("[PASS] Python raw code analysis passed: Risk Score =", data["risk_score"])

    # 2. Test File Upload - Java
    java_code = """
public class MathHelper {
    public static int fib(int n) {
        if (n <= 1) return n;
        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }
}
"""
    file_bytes = io.BytesIO(java_code.encode("utf-8"))
    res = client.post(
        "/api/analysis/upload",
        files={"file": ("MathHelper.java", file_bytes, "text/plain")},
        data={"commits": 12}
    )
    assert res.status_code == 201
    java_data = res.json()
    assert java_data["file_type"] == "java"
    assert java_data["metrics"]["classes_count"] == 1
    assert java_data["metrics"]["functions_count"] >= 1
    assert java_data["metrics"]["loops_count"] == 1
    print("[PASS] Java file upload analysis passed: Classes =", java_data["metrics"]["classes_count"])

    # 3. Test Analysis History
    res = client.get("/api/analysis/history")
    assert res.status_code == 200
    history = res.json()
    assert len(history) >= 2
    print(f"[PASS] Analysis history endpoint passed: {len(history)} files found")

    # 4. Test Visualizations Stats
    res = client.get("/api/analysis/stats/visualizations")
    assert res.status_code == 200
    stats = res.json()
    assert "complexity_distribution" in stats
    assert "risk_score_trend" in stats
    assert "loc_comparison" in stats
    print("[PASS] Visualizations stats endpoint passed")

    print("\nALL CODE ANALYSIS TESTS COMPLETED SUCCESSFULLY! [OK]")

if __name__ == "__main__":
    test_code_analysis_endpoints()
