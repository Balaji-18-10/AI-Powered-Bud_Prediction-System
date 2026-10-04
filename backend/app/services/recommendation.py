from typing import List, Dict, Any

class RecommendationEngine:
    @staticmethod
    def generate_recommendations(loc: int, complexity: float, commits: int, risk_score: float, risk_level: str) -> List[Dict[str, str]]:
        recommendations = []

        # 1. Cyclomatic Complexity Recommendations
        if complexity > 30:
            recommendations.append({
                "category": "Refactoring",
                "priority": "Critical",
                "action": "Extract Subroutines & Decompose Branches",
                "details": f"Cyclomatic complexity ({complexity:.1f}) is dangerously high. Apply the Strategy Pattern or replace nested conditional statements (switch/if-else cascades) with polymorphism or lookup tables."
            })
        elif complexity > 15:
            recommendations.append({
                "category": "Refactoring",
                "priority": "High",
                "action": "Reduce Decision Path Depth",
                "details": f"Cyclomatic complexity ({complexity:.1f}) exceeds the standard threshold of 15. Simplify boolean expressions and guard clauses to flatten nesting levels."
            })

        # 2. LOC (Lines of Code) Recommendations
        if loc > 1000:
            recommendations.append({
                "category": "Architecture",
                "priority": "Critical",
                "action": "Split Large Module (Single Responsibility Principle)",
                "details": f"At {loc} lines of code, this module is approaching 'God Object' antipattern. Separate concerns into dedicated domain services or utility helpers."
            })
        elif loc > 450:
            recommendations.append({
                "category": "Architecture",
                "priority": "Medium",
                "action": "Evaluate Cohesion and Extract Helpers",
                "details": f"Module size ({loc} LOC) is growing. Audit methods to ensure high cohesion; isolate pure helper functions into separate testable units."
            })

        # 3. Commit / Churn Recommendations
        if commits > 50:
            recommendations.append({
                "category": "Code Review",
                "priority": "Critical",
                "action": "Mandate Two-Person Senior Code Review",
                "details": f"High churn rate ({commits} commits) denotes volatility. Enforce strict pull request approvals and require design justification for subsequent modifications."
            })
            recommendations.append({
                "category": "Testing",
                "priority": "High",
                "action": "Automate Full Regression Test Suite",
                "details": "Frequent edits correlate with regression defects. Ensure this module is covered by automated end-to-end and regression test runs on every pull request."
            })
        elif commits > 25:
            recommendations.append({
                "category": "Code Review",
                "priority": "Medium",
                "action": "Investigate Churn Root Causes",
                "details": f"Module has {commits} commits. Review recent git commit logs to determine whether changes stem from scope instability or incomplete initial requirements."
            })

        # 4. Testing & Coverage Recommendations based on overall Risk Level
        if risk_level == "High":
            recommendations.append({
                "category": "Testing",
                "priority": "Critical",
                "action": "Target > 85% Branch Coverage with Mutation Testing",
                "details": "Given the elevated defect risk profile, standard line coverage is insufficient. Implement branch coverage assertions and run mutation tests (e.g. mutmut) to verify test robustness."
            })
            recommendations.append({
                "category": "CI/CD Pipeline",
                "priority": "High",
                "action": "Block Merges on Static Analysis Linter Flags",
                "details": "Integrate SonarQube / Ruff / ESLint in CI to fail builds on any new cognitive complexity or maintainability smell additions."
            })
        elif risk_level == "Medium":
            recommendations.append({
                "category": "Testing",
                "priority": "Medium",
                "action": "Expand Boundary Value Unit Tests",
                "details": "Construct parameterized unit tests focusing on edge cases, null/empty inputs, and error handlers across all branch paths."
            })
        else:
            # Low Risk recommendations
            recommendations.append({
                "category": "Testing",
                "priority": "Low",
                "action": "Maintain Baseline Unit Test Coverage (> 75%)",
                "details": "Current risk profile is healthy. Maintain standard smoke and unit tests alongside API contract checks."
            })
            recommendations.append({
                "category": "Architecture",
                "priority": "Low",
                "action": "Document Public Interfaces",
                "details": "Module is clean and stable. Preserve architectural integrity by documenting module contracts and interface specifications."
            })

        return recommendations

recommendation_engine = RecommendationEngine()
