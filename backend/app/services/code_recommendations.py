from typing import List, Dict, Any, Optional

class CodeRecommendationEngine:
    @staticmethod
    def generate_recommendations(
        metrics: Dict[str, Any],
        syntax_errors: Optional[List[Dict[str, Any]]] = None,
        code_warnings: Optional[List[Dict[str, Any]]] = None,
        risk_score: float = 0.0,
        risk_level: str = "Low"
    ) -> List[Dict[str, str]]:
        recs: List[Dict[str, str]] = []
        syntax_errors = syntax_errors or []
        code_warnings = code_warnings or []

        loc = metrics.get("loc", 0)
        code_lines = metrics.get("code_lines", 0)
        complexity = metrics.get("cyclomatic_complexity", 1.0)
        functions = metrics.get("functions_count", 0)
        classes = metrics.get("classes_count", 0)
        if_count = metrics.get("if_statements", 0)
        loops_count = metrics.get("loops_count", 0)
        comment_ratio = metrics.get("comment_ratio", 0.0)

        # 1. Syntax Remediation Priority
        if syntax_errors:
            error_types = set(e.get("error_type", "Syntax Error") for e in syntax_errors)
            recs.append({
                "category": "Syntax",
                "priority": "Critical",
                "action": "Resolve Compilation Syntax Errors Immediately",
                "details": f"Discovered {len(syntax_errors)} syntax compilation issues ({', '.join(list(error_types)[:3])}). "
                           f"Fix missing delimiters or semicolons before building."
            })

        # 2. Specific Code Quality Warnings Remediation
        has_empty_catch = any("Empty Catch" in w.get("warning_type", "") for w in code_warnings)
        if has_empty_catch:
            recs.append({
                "category": "Code Quality",
                "priority": "High",
                "action": "Implement Exception Handling & Logging",
                "details": "Empty catch/except blocks swallow errors silently. Add logging or re-throw exceptions."
            })

        has_infinite_loop = any("Infinite Loop" in w.get("warning_type", "") for w in code_warnings)
        if has_infinite_loop:
            recs.append({
                "category": "Code Quality",
                "priority": "Critical",
                "action": "Ensure Loop Exit Conditions & Break Statements",
                "details": "Potential infinite loop pattern detected without explicit exit condition."
            })

        has_creds = any("Credential" in w.get("warning_type", "") for w in code_warnings)
        if has_creds:
            recs.append({
                "category": "Security",
                "priority": "Critical",
                "action": "Extract Hard-Coded Credentials to Environment Variables",
                "details": "Hardcoded secrets, API tokens, or passwords detected. Store them in secure config or environment files."
            })

        has_unused_vars = any("Unused Variable" in w.get("warning_type", "") or "Unused Import" in w.get("warning_type", "") for w in code_warnings)
        if has_unused_vars:
            recs.append({
                "category": "Code Quality",
                "priority": "Low",
                "action": "Clean Up Dead Code & Unused Variables",
                "details": "Eliminate unused variables and redundant imports to reduce namespace clutter and improve readability."
            })

        has_null_risk = any("Null" in w.get("warning_type", "") for w in code_warnings)
        if has_null_risk:
            recs.append({
                "category": "Code Quality",
                "priority": "High",
                "action": "Add Defensive Null / None Checks",
                "details": "Validate object references with explicit null checks prior to method calls or attribute access."
            })

        # 3. Complexity Refactoring
        if complexity > 25:
            recs.append({
                "category": "Complexity",
                "priority": "Critical",
                "action": "Decompose High-Complexity Decision Trees",
                "details": f"Estimated Cyclomatic Complexity is {complexity:.1f}. Replace nested 'if-else' cascades ({if_count} conditionals) with lookup tables, polymorphism, or state pattern."
            })
        elif complexity > 12:
            recs.append({
                "category": "Complexity",
                "priority": "High",
                "action": "Flatten Conditional Logic with Guard Clauses",
                "details": f"Complexity is {complexity:.1f}. Apply early return / guard clauses to avoid deep nesting and reduce cognitive load."
            })

        # 4. Method / Function Sizing
        if functions > 0:
            avg_lines = code_lines / functions
            if avg_lines > 50:
                recs.append({
                    "category": "Methods",
                    "priority": "Critical",
                    "action": "Split Long Monolithic Methods",
                    "details": f"Methods average {avg_lines:.1f} lines of executable code. Extract focused, single-purpose subroutines under 25 lines."
                })
            elif avg_lines > 30:
                recs.append({
                    "category": "Methods",
                    "priority": "Medium",
                    "action": "Modularize Internal Method Steps",
                    "details": f"Average method size is {avg_lines:.1f} lines. Isolate calculation pipelines and validation checks into private helper functions."
                })
        elif code_lines > 100:
            recs.append({
                "category": "Methods",
                "priority": "High",
                "action": "Encapsulate Script into Structured Functions",
                "details": "File contains significant top-level code without functional modularization. Wrap execution logic into named functions."
            })

        # 5. Documentation
        if comment_ratio < 5.0 and code_lines > 20:
            recs.append({
                "category": "Documentation",
                "priority": "High",
                "action": "Improve Code Documentation & Contracts",
                "details": f"Comment-to-code ratio is critically low ({comment_ratio}%). Document function contracts, preconditions, and return expectations."
            })
        elif comment_ratio < 12.0 and code_lines > 40:
            recs.append({
                "category": "Documentation",
                "priority": "Medium",
                "action": "Document Edge Cases and Invariants",
                "details": f"Comment ratio is {comment_ratio}%. Add explanatory comments detailing why specific algorithm choices or boundary condition checks were made."
            })

        # 6. Testing Coverage
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
                "details": f"Ensure all {loops_count} loops and condition branches are tested with edge case inputs and boundary conditions."
            })
        elif not recs:
            recs.append({
                "category": "Testing",
                "priority": "Low",
                "action": "Maintain Regression Unit Test Suite",
                "details": "Module metrics indicate healthy, low-risk structure. Maintain standard test coverage for future enhancements."
            })

        return recs

code_recommendation_engine = CodeRecommendationEngine()
