from typing import List, Dict, Any

class CodeRecommendationEngine:
    @staticmethod
    def generate_recommendations(metrics: Dict[str, Any], risk_score: float, risk_level: str) -> List[Dict[str, str]]:
        recs = []

        loc = metrics.get("loc", 0)
        code_lines = metrics.get("code_lines", 0)
        complexity = metrics.get("cyclomatic_complexity", 1.0)
        functions = metrics.get("functions_count", 0)
        classes = metrics.get("classes_count", 0)
        if_count = metrics.get("if_statements", 0)
        loops_count = metrics.get("loops_count", 0)
        comment_ratio = metrics.get("comment_ratio", 0.0)

        # 1. Reduce Complexity
        if complexity > 25:
            recs.append({
                "category": "Complexity",
                "priority": "Critical",
                "action": "Decompose Nested Decision Trees",
                "details": f"Estimated Cyclomatic Complexity is {complexity:.1f} (extreme). Replace nested 'if-else' cascades ({if_count} conditionals) with lookup tables, polymorphism, or state pattern."
            })
        elif complexity > 12:
            recs.append({
                "category": "Complexity",
                "priority": "High",
                "action": "Flatten Conditional Logic with Guard Clauses",
                "details": f"Complexity is {complexity:.1f}. Apply early return / guard clauses to avoid deep indentation and reduce cognitive load."
            })

        # 2. Split Large Methods
        if functions > 0:
            avg_lines = code_lines / functions
            if avg_lines > 50:
                recs.append({
                    "category": "Methods",
                    "priority": "Critical",
                    "action": "Split Long Methods (Extract Method Refactoring)",
                    "details": f"Functions in this file average {avg_lines:.1f} lines of executable code. Break down monolithic functions into focused, single-purpose subroutines under 25 lines."
                })
            elif avg_lines > 30:
                recs.append({
                    "category": "Methods",
                    "priority": "Medium",
                    "action": "Modularize Function Internal Steps",
                    "details": f"Average method size is {avg_lines:.1f} lines. Isolate calculation pipelines and validation checks into private helper functions."
                })
        elif code_lines > 100:
            recs.append({
                "category": "Methods",
                "priority": "High",
                "action": "Encapsulate Script into Structured Functions",
                "details": "File contains significant top-level code without functional modularization. Wrap execution logic into named functions."
            })

        # 3. Improve Code Documentation
        if comment_ratio < 5.0:
            recs.append({
                "category": "Documentation",
                "priority": "High",
                "action": "Add Docstrings and Method Intent Comments",
                "details": f"Comment-to-code ratio is critically low ({comment_ratio}%). Document function contracts, argument preconditions, and expected return types."
            })
        elif comment_ratio < 12.0:
            recs.append({
                "category": "Documentation",
                "priority": "Medium",
                "action": "Document Edge Cases and Invariants",
                "details": f"Comment ratio is {comment_ratio}%. Add explanatory comments detailing why specific algorithm choices or boundary condition checks were made."
            })

        # 4. Increase Unit Testing
        if risk_level == "High":
            recs.append({
                "category": "Testing",
                "priority": "Critical",
                "action": "Implement Boundary and Branch Coverage Tests",
                "details": f"With a {risk_score}% defect risk, target ≥ 85% branch coverage. Write parameterized tests for all {if_count} conditionals and {loops_count} loop boundaries."
            })
        elif risk_level == "Medium":
            recs.append({
                "category": "Testing",
                "priority": "Medium",
                "action": "Add Unit Tests for Loop and Switch Conditions",
                "details": f"Ensure all {loops_count} loops and condition branches are tested with empty collections, null pointers, and boundary inputs."
            })
        else:
            recs.append({
                "category": "Testing",
                "priority": "Low",
                "action": "Maintain Regression Unit Test Suite",
                "details": "Module metrics indicate healthy, low-risk structure. Maintain standard test coverage for future enhancements."
            })

        # 5. Refactor Large Classes
        if classes > 1 and loc > 500:
            recs.append({
                "category": "Classes",
                "priority": "High",
                "action": "Split Multiple Classes into Separate Files",
                "details": f"File contains {classes} classes across {loc} lines. Adhere to standard project organization by isolating each class into its own dedicated source file."
            })
        elif classes == 1 and code_lines > 600:
            recs.append({
                "category": "Classes",
                "priority": "Critical",
                "action": "Refactor God Class (Single Responsibility Principle)",
                "details": f"Class has {code_lines} lines of code and high responsibility density. Decompose into delegator services and domain value objects."
            })

        return recs

code_recommendation_engine = CodeRecommendationEngine()
