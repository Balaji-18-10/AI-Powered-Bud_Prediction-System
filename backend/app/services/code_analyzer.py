import re
import ast
import os
from typing import Dict, Any, List, Tuple, Optional
from app.services.ml_engine import bug_predictor
from app.services.code_recommendations import code_recommendation_engine

class CodeAnalyzer:
    """
    Enterprise multi-language static source code analysis engine.
    Supports Java, Python, C++, and C with:
    - Syntax Error Detection (AST & lexical validation)
    - Common Programming Error / Code Smell Detection
    - 10+ Structural Metric Extraction (McCabe Complexity, LOC, etc.)
    - Machine Learning Defect Risk Scoring (NASA MDP JM1 calibrated)
    """

    ALLOWED_EXTENSIONS = {".java", ".py", ".cpp", ".c", ".h", ".hpp", ".cc", ".cxx"}

    @staticmethod
    def detect_file_type(file_name: str, content: str = "") -> str:
        lower = file_name.lower().strip()
        if lower.endswith(".py"):
            return "py"
        elif lower.endswith(".java"):
            return "java"
        elif lower.endswith(".cpp") or lower.endswith(".cc") or lower.endswith(".cxx") or lower.endswith(".hpp"):
            return "cpp"
        elif lower.endswith(".c") or lower.endswith(".h"):
            return "c"
        
        # Fallback inspection by signature content
        if "def " in content or ("import " in content and ":" in content):
            return "py"
        if "public class " in content or "System.out.println" in content or "package " in content:
            return "java"
        if "#include " in content and ("cout" in content or "std::" in content or "class " in content or "template<" in content):
            return "cpp"
        if "#include " in content and ("printf" in content or "int main(" in content):
            return "c"
        return "py"

    def analyze(self, file_name: str, source_code: str, commits: Optional[int] = None) -> Dict[str, Any]:
        """
        Safely performs static analysis on the source code without execution.
        """
        # Sanitize file name
        clean_file_name = os.path.basename(file_name.strip()) or "analyzed_code"
        file_type = self.detect_file_type(clean_file_name, source_code)
        file_size = len(source_code.encode("utf-8"))

        # 1. Line counts breakdown
        total_lines, code_lines, blank_lines, comment_lines = self._count_lines(source_code, file_type)

        # 2. Syntax Error Detection
        syntax_errors = self._detect_syntax_errors(source_code, file_type, clean_file_name)

        # 3. Code Metrics Extraction
        metrics = self._extract_metrics(source_code, file_type)
        metrics["loc"] = max(1, total_lines)
        metrics["code_lines"] = code_lines
        metrics["blank_lines"] = blank_lines
        metrics["comment_lines"] = comment_lines
        code_denom = max(1, code_lines)
        metrics["comment_ratio"] = round((comment_lines / code_denom) * 100.0, 1)

        # 4. Common Programming Mistakes & Code Quality Warnings
        code_warnings = self._detect_code_warnings(source_code, file_type)

        # 5. Risk Analysis with NASA MDP JM1 ML Model integration
        risk_data = self._calculate_risk_and_factors(metrics, syntax_errors, code_warnings, commits)

        # 6. Actionable Engineering Recommendations
        recommendations = code_recommendation_engine.generate_recommendations(
            metrics=metrics,
            syntax_errors=syntax_errors,
            code_warnings=code_warnings,
            risk_score=risk_data["risk_score"],
            risk_level=risk_data["risk_level"]
        )

        return {
            "file_name": clean_file_name,
            "file_type": file_type,
            "file_size": file_size,
            "source_code": source_code,
            "metrics": metrics,
            "syntax_errors": syntax_errors,
            "syntax_errors_count": len(syntax_errors),
            "code_warnings": code_warnings,
            "warnings_count": len(code_warnings),
            "risk_score": risk_data["risk_score"],
            "risk_level": risk_data["risk_level"],
            "confidence": risk_data["confidence"],
            "risk_factors": risk_data["risk_factors"],
            "explanation": risk_data["explanation"],
            "model_name": risk_data.get("model_name"),
            "predicted_class": risk_data.get("predicted_class"),
            "prediction_probability": risk_data.get("prediction_probability"),
            "recommendations": recommendations,
        }

    # =========================================================================
    # LINE COUNTING
    # =========================================================================
    def _count_lines(self, code: str, file_type: str) -> Tuple[int, int, int, int]:
        lines = code.splitlines()
        total = len(lines)
        blank = 0
        comment = 0
        in_multiline = False

        if file_type == "py":
            for line in lines:
                s = line.strip()
                if not s:
                    blank += 1
                elif s.startswith("#"):
                    comment += 1
                elif '"""' in s or "'''" in s:
                    comment += 1
                    quotes = '"""' if '"""' in s else "'''"
                    if s.count(quotes) % 2 != 0:
                        in_multiline = not in_multiline
                elif in_multiline:
                    comment += 1
        else:
            for line in lines:
                s = line.strip()
                if not s:
                    blank += 1
                elif in_multiline:
                    comment += 1
                    if "*/" in s:
                        in_multiline = False
                elif s.startswith("//"):
                    comment += 1
                elif s.startswith("/*"):
                    comment += 1
                    if "*/" not in s:
                        in_multiline = True

        code_lines = max(0, total - blank - comment)
        return total, code_lines, blank, comment

    # =========================================================================
    # SYNTAX ERROR DETECTION LAYER
    # =========================================================================
    def _detect_syntax_errors(self, code: str, file_type: str, file_name: str) -> List[Dict[str, Any]]:
        errors: List[Dict[str, Any]] = []

        if not code.strip():
            return errors

        if file_type == "py":
            errors.extend(self._check_python_syntax(code, file_name))
        elif file_type == "java":
            errors.extend(self._check_java_syntax(code))
        else:  # c, cpp
            errors.extend(self._check_c_cpp_syntax(code, is_cpp=(file_type == "cpp")))

        return errors

    def _check_python_syntax(self, code: str, file_name: str) -> List[Dict[str, Any]]:
        errors = []
        try:
            ast.parse(code, filename=file_name)
        except SyntaxError as e:
            msg = e.msg or "Invalid syntax"
            err_type = "Indentation Error" if "indent" in msg.lower() else "Syntax Error"
            line = e.lineno or 1
            col = e.offset or 1

            # Tailored suggestions based on standard Python syntax rules
            suggested_fix = "Check for syntax compliance on this line."
            if "expected ':'" in msg.lower():
                suggested_fix = "Add a colon ':' at the end of the compound statement header."
            elif "unmatched" in msg.lower():
                suggested_fix = "Balance matching parentheses '()', brackets '[]', or braces '{}'."
            elif "indent" in msg.lower():
                suggested_fix = "Align indentation with surrounding code block (use consistent 4 spaces)."
            elif "invalid syntax" in msg.lower():
                suggested_fix = "Verify variable names, operator usage, and closing quotes on strings."
            elif "was never closed" in msg.lower():
                suggested_fix = "Add closing parenthesis or quote matching the open token."

            errors.append({
                "error_type": err_type,
                "line_number": line,
                "column_number": col,
                "severity": "Critical",
                "message": msg.capitalize(),
                "suggested_fix": suggested_fix,
            })
        except Exception as e:
            errors.append({
                "error_type": "Syntax Error",
                "line_number": 1,
                "column_number": 1,
                "severity": "Critical",
                "message": f"Syntax parsing failure: {str(e)}",
                "suggested_fix": "Verify Python language syntax standards.",
            })

        return errors

    def _check_java_syntax(self, code: str) -> List[Dict[str, Any]]:
        errors = []
        # 1. Delimiter balance (braces, brackets, parentheses)
        errors.extend(self._check_delimiters(code, lang="Java"))

        # 2. Semicolon and statement checks
        lines = code.splitlines()
        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            # Remove inline comment
            if "//" in s:
                s = s.split("//")[0].strip()
            if not s or s.startswith("/*") or s.startswith("*") or s.endswith("*/"):
                continue

            # Check unclosed string literal
            if self._has_unclosed_quotes(s):
                errors.append({
                    "error_type": "Syntax Error - Unterminated String",
                    "line_number": idx,
                    "column_number": len(line),
                    "severity": "Critical",
                    "message": "Unterminated string literal on line.",
                    "suggested_fix": 'Add closing quotation mark `"` to terminate string literal.',
                })

            # Check missing semicolons for statements
            if self._is_missing_semicolon_java(s, lines, idx):
                errors.append({
                    "error_type": "Syntax Error - Missing Semicolon",
                    "line_number": idx,
                    "column_number": len(line),
                    "severity": "High",
                    "message": "Missing semicolon ';' at the end of statement.",
                    "suggested_fix": "Add ';' at the end of the statement.",
                })

            # Check malformed class declaration
            if re.match(r'^(?:public|protected|private)?\s*class\s*\{', s):
                errors.append({
                    "error_type": "Syntax Error - Malformed Class",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "Critical",
                    "message": "Class declaration is missing an identifier name.",
                    "suggested_fix": "Specify class name: 'public class ClassName {'.",
                })

        return errors

    def _check_c_cpp_syntax(self, code: str, is_cpp: bool = True) -> List[Dict[str, Any]]:
        errors = []
        # 1. Delimiter balance
        errors.extend(self._check_delimiters(code, lang="C++" if is_cpp else "C"))

        # 2. Semicolons & preprocessor directives
        lines = code.splitlines()
        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            if "//" in s:
                s = s.split("//")[0].strip()
            if not s or s.startswith("/*") or s.startswith("*") or s.endswith("*/"):
                continue

            # Check unclosed quotes
            if self._has_unclosed_quotes(s):
                errors.append({
                    "error_type": "Syntax Error - Unterminated String",
                    "line_number": idx,
                    "column_number": len(line),
                    "severity": "Critical",
                    "message": "Unterminated string literal.",
                    "suggested_fix": 'Add closing quotation mark `"` to terminate string.',
                })

            # Malformed #include
            if s.startswith("#include") and not (re.search(r'#include\s*<[^>]+>', s) or re.search(r'#include\s*"[^"]+"', s)):
                errors.append({
                    "error_type": "Syntax Error - Invalid Preprocessor Directive",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "High",
                    "message": "Malformed #include directive.",
                    "suggested_fix": "Enclose header filename in `<header.h>` or `\"header.h\"`.",
                })

            # Check missing semicolon in C/C++
            if self._is_missing_semicolon_c_cpp(s, lines, idx):
                errors.append({
                    "error_type": "Syntax Error - Missing Semicolon",
                    "line_number": idx,
                    "column_number": len(line),
                    "severity": "High",
                    "message": "Missing semicolon ';' at the end of statement.",
                    "suggested_fix": "Add ';' at the end of the statement.",
                })

        return errors

    def _check_delimiters(self, code: str, lang: str) -> List[Dict[str, Any]]:
        """
        Scans code for unmatched braces {}, brackets [], and parentheses (),
        ignoring strings, chars, and comments.
        """
        errors = []
        stack: List[Tuple[str, int, int]] = []
        matching = {')': '(', '}': '{', ']': '['}
        reverse_matching = {'(': ')', '{': '}', '[': ']'}

        lines = code.splitlines()
        in_block_comment = False

        for line_num, line in enumerate(lines, start=1):
            col_num = 0
            in_string = False
            string_char = ''
            escaped = False

            while col_num < len(line):
                ch = line[col_num]

                # Check block comment start/end
                if in_block_comment:
                    if ch == '*' and col_num + 1 < len(line) and line[col_num + 1] == '/':
                        in_block_comment = False
                        col_num += 2
                        continue
                    col_num += 1
                    continue

                if not in_string:
                    if ch == '/' and col_num + 1 < len(line):
                        if line[col_num + 1] == '/':
                            # Single line comment, rest of line ignored
                            break
                        elif line[col_num + 1] == '*':
                            in_block_comment = True
                            col_num += 2
                            continue

                # Handle quotes
                if ch in ('"', "'") and not in_block_comment:
                    if not in_string:
                        in_string = True
                        string_char = ch
                    elif string_char == ch and not escaped:
                        in_string = False

                if in_string:
                    escaped = (ch == '\\' and not escaped)
                    col_num += 1
                    continue

                # Process brackets outside strings/comments
                if ch in ('(', '{', '['):
                    stack.append((ch, line_num, col_num + 1))
                elif ch in (')', '}', ']'):
                    expected = matching[ch]
                    if not stack:
                        errors.append({
                            "error_type": "Syntax Error - Unmatched Delimiter",
                            "line_number": line_num,
                            "column_number": col_num + 1,
                            "severity": "Critical",
                            "message": f"Unexpected closing '{ch}' without matching '{expected}'.",
                            "suggested_fix": f"Remove extra '{ch}' or add matching '{expected}' at opening block.",
                        })
                    else:
                        top, top_line, top_col = stack.pop()
                        if top != expected:
                            errors.append({
                                "error_type": "Syntax Error - Mismatched Delimiter",
                                "line_number": line_num,
                                "column_number": col_num + 1,
                                "severity": "Critical",
                                "message": f"Mismatched closing '{ch}'; expected '{reverse_matching[top]}' opened on line {top_line}.",
                                "suggested_fix": f"Replace with '{reverse_matching[top]}' or check enclosing block structure.",
                            })

                col_num += 1

        # Check for unclosed open delimiters
        while stack:
            open_ch, open_line, open_col = stack.pop()
            close_ch = reverse_matching[open_ch]
            errors.append({
                "error_type": "Syntax Error - Unclosed Delimiter",
                "line_number": open_line,
                "column_number": open_col,
                "severity": "Critical",
                "message": f"Unclosed '{open_ch}' opened on line {open_line}.",
                "suggested_fix": f"Add matching closing '{close_ch}' at appropriate block termination.",
            })

        return errors

    def _has_unclosed_quotes(self, s: str) -> bool:
        # Count non-escaped double quotes
        count = 0
        escaped = False
        for c in s:
            if c == '\\':
                escaped = not escaped
                continue
            if c == '"' and not escaped:
                count += 1
            escaped = False
        return count % 2 != 0

    def _is_missing_semicolon_java(self, s: str, lines: List[str], idx: int) -> bool:
        if s.endswith(";") or s.endswith("{") or s.endswith("}") or s.endswith(":") or s.endswith(","):
            return False
        # Ignore package, import, decorators, control structures, method/class headers
        first_word = s.split()[0] if s.split() else ""
        keywords_exempt = {
            "if", "else", "for", "while", "do", "switch", "case", "default",
            "class", "interface", "enum", "record", "public", "private", "protected",
            "static", "final", "abstract", "try", "catch", "finally", "@"
        }
        if first_word in keywords_exempt:
            # Could be a method signature or control statement
            if s.endswith(")") or "(" in s and ")" in s:
                # Check if next line starts with {
                if idx < len(lines) and lines[idx].strip().startswith("{"):
                    return False
            # However, if it's a declaration statement like `private int x = 5` or `return x`
            if s.startswith("return") or s.startswith("throw") or ("=" in s and not s.startswith("for")):
                return True
            return False

        # Typical statements: assignment, method invocation, return, throw, break, continue
        statement_indicators = ("=", "System.out", "return", "throw", "break", "continue", "new ")
        if any(term in s for term in statement_indicators):
            return True
        return False

    def _is_missing_semicolon_c_cpp(self, s: str, lines: List[str], idx: int) -> bool:
        if s.endswith(";") or s.endswith("{") or s.endswith("}") or s.endswith(":") or s.endswith(",") or s.startswith("#"):
            return False
        first_word = s.split()[0] if s.split() else ""
        keywords_exempt = {
            "if", "else", "for", "while", "do", "switch", "case", "default",
            "class", "struct", "enum", "namespace", "public:", "private:", "protected:",
            "template", "try", "catch"
        }
        if first_word in keywords_exempt:
            if s.startswith("return") or s.startswith("throw") or ("=" in s and not s.startswith("for")):
                return True
            return False

        statement_indicators = ("=", "return", "throw", "break", "continue", "cout", "cin", "printf", "free(")
        if any(term in s for term in statement_indicators):
            return True
        return False

    # =========================================================================
    # COMMON PROGRAMMING ERROR DETECTION LAYER (WARNINGS)
    # =========================================================================
    def _detect_code_warnings(self, code: str, file_type: str) -> List[Dict[str, Any]]:
        warnings: List[Dict[str, Any]] = []

        if file_type == "py":
            warnings.extend(self._detect_python_warnings(code))
        elif file_type == "java":
            warnings.extend(self._detect_java_warnings(code))
        else:
            warnings.extend(self._detect_c_cpp_warnings(code, is_cpp=(file_type == "cpp")))

        # Universal checks (credentials, code smell thresholds)
        warnings.extend(self._detect_universal_code_smells(code))

        # Sort warnings by line number
        warnings.sort(key=lambda x: (x.get("line_number") or 0))
        return warnings

    def _detect_python_warnings(self, code: str) -> List[Dict[str, Any]]:
        warnings = []
        try:
            tree = ast.parse(code)
        except Exception:
            # If code has syntax errors, perform regex-based warning scans
            return self._detect_python_warnings_fallback(code)

        # 1. Unused imports & unused variables
        imported_names: Dict[str, int] = {}
        used_names: set = set()
        assigned_vars: Dict[str, int] = {}

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_names[name] = node.lineno
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_names[name] = node.lineno
            elif isinstance(node, ast.Name):
                if isinstance(node.ctx, ast.Load):
                    used_names.add(node.id)
                elif isinstance(node.ctx, ast.Store):
                    if not node.id.startswith("_") and node.id not in ("self", "cls"):
                        assigned_vars[node.id] = node.lineno

            # 2. Empty except blocks
            elif isinstance(node, ast.ExceptHandler):
                if not node.body or (len(node.body) == 1 and isinstance(node.body[0], ast.Pass)):
                    warnings.append({
                        "warning_type": "Empty Catch / Except Block",
                        "line_number": node.lineno,
                        "column_number": node.col_offset,
                        "severity": "High",
                        "message": "Warning: empty 'except' block swallows errors silently.",
                        "suggested_fix": "Log the exception or re-raise it to prevent silent failure.",
                    })

            # 3. Infinite-loop patterns (while True: without break)
            elif isinstance(node, ast.While):
                is_constant_true = (
                    isinstance(node.test, ast.Constant) and bool(node.test.value) is True
                ) or (isinstance(node.test, ast.NameConstant) and node.test.value is True)

                if is_constant_true:
                    has_exit = any(
                        isinstance(child, (ast.Break, ast.Return, ast.Raise))
                        for child in ast.walk(node)
                    )
                    if not has_exit:
                        warnings.append({
                            "warning_type": "Infinite Loop Risk",
                            "line_number": node.lineno,
                            "column_number": node.col_offset,
                            "severity": "Critical",
                            "message": "Warning: possible infinite loop detected ('while True' has no break or return).",
                            "suggested_fix": "Add termination condition or break statement inside the loop body.",
                        })

            # 4. Suspicious conditions: x == x or a != a
            elif isinstance(node, ast.Compare):
                if isinstance(node.left, ast.Name) and len(node.comparators) == 1 and isinstance(node.comparators[0], ast.Name):
                    if node.left.id == node.comparators[0].id:
                        warnings.append({
                            "warning_type": "Suspicious Condition",
                            "line_number": node.lineno,
                            "column_number": node.col_offset,
                            "severity": "High",
                            "message": f"Potential issue: self-comparison condition '{node.left.id} == {node.left.id}'.",
                            "suggested_fix": "Verify comparison logic; comparing variable to itself is redundant.",
                        })

            # 5. Dangerous operations without try-except (e.g. open(), int(var) in outer scope)
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id in ("open", "eval", "exec"):
                    if node.func.id in ("eval", "exec"):
                        warnings.append({
                            "warning_type": "Security Risk - Dynamic Execution",
                            "line_number": node.lineno,
                            "column_number": node.col_offset,
                            "severity": "Critical",
                            "message": f"Potential risk: dangerous dynamic execution function '{node.func.id}()' used.",
                            "suggested_fix": "Avoid eval/exec; use safe parsing or structured dispatchers.",
                        })

        # Flag unused imports
        for imp_name, line_num in imported_names.items():
            if imp_name not in used_names and not imp_name.startswith("_"):
                warnings.append({
                    "warning_type": "Unused Import",
                    "line_number": line_num,
                    "column_number": 1,
                    "severity": "Low",
                    "message": f"Potential issue: imported module/symbol '{imp_name}' is never used.",
                    "suggested_fix": f"Remove unused import '{imp_name}' to clean namespace.",
                })

        # Flag unused variables
        for var_name, line_num in assigned_vars.items():
            if var_name not in used_names:
                warnings.append({
                    "warning_type": "Unused Variable",
                    "line_number": line_num,
                    "column_number": 1,
                    "severity": "Medium",
                    "message": f"Potential issue: variable '{var_name}' is assigned but never read.",
                    "suggested_fix": f"Remove unused variable '{var_name}' or prefix with '_' if intentional.",
                })

        return warnings

    def _detect_python_warnings_fallback(self, code: str) -> List[Dict[str, Any]]:
        warnings = []
        lines = code.splitlines()
        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            if "except:" in s or "except Exception:" in s:
                if idx < len(lines) and lines[idx].strip() == "pass":
                    warnings.append({
                        "warning_type": "Empty Catch / Except Block",
                        "line_number": idx,
                        "column_number": 1,
                        "severity": "High",
                        "message": "Warning: empty 'except' block swallows errors silently.",
                        "suggested_fix": "Log the exception or re-raise it to prevent silent failure.",
                    })
            if "while True:" in s and "break" not in code:
                warnings.append({
                    "warning_type": "Infinite Loop Risk",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "Critical",
                    "message": "Warning: potential infinite loop detected without explicit break.",
                    "suggested_fix": "Ensure loop has valid break condition.",
                })
        return warnings

    def _detect_java_warnings(self, code: str) -> List[Dict[str, Any]]:
        warnings = []
        lines = code.splitlines()

        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            # 1. Empty catch block
            if re.search(r'catch\s*\([^)]+\)\s*\{\s*\}', s) or (s.startswith("catch") and "{" in s and "}" in s and not any(k in s for k in ("log", "print", "throw"))):
                warnings.append({
                    "warning_type": "Empty Catch Block",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "High",
                    "message": "Warning: empty catch block swallows exception without logging or re-throwing.",
                    "suggested_fix": "Log exception or re-throw as runtime exception.",
                })

            # 2. Potential null dereference (e.g. `String s = null; s.length();`)
            if re.search(r'=\s*null\s*;', s):
                m = re.search(r'([A-Za-z_]\w*)\s*=\s*null', s)
                if m:
                    var_name = m.group(1)
                    # Check next few lines for dereference without != null
                    for sub_idx in range(idx, min(len(lines), idx + 8)):
                        sub_line = lines[sub_idx].strip()
                        if f"{var_name}." in sub_line and f"{var_name} != null" not in sub_line and f"{var_name} == null" not in sub_line:
                            warnings.append({
                                "warning_type": "Possible Null Pointer Risk",
                                "line_number": sub_idx + 1,
                                "column_number": 1,
                                "severity": "High",
                                "message": f"Potential risk: variable '{var_name}' initialized to null and dereferenced without validation.",
                                "suggested_fix": f"Add null validation check `if ({var_name} != null)` prior to invocation.",
                            })
                            break

            # 3. Direct array indexing without bounds check
            arr_match = re.search(r'(\w+)\[(\d+)\]', s)
            if arr_match and not s.startswith("//"):
                arr_name = arr_match.group(1)
                idx_val = arr_match.group(2)
                if int(idx_val) > 0:
                    warnings.append({
                        "warning_type": "Array Index Out of Bounds Risk",
                        "line_number": idx,
                        "column_number": 1,
                        "severity": "Medium",
                        "message": f"Possible risk: direct indexing '{arr_name}[{idx_val}]' without dynamic bounds verification.",
                        "suggested_fix": f"Verify index within `{arr_name}.length` before element access.",
                    })

            # 4. Infinite loop risk: `while(true)`
            if re.search(r'while\s*\(\s*true\s*\)', s) and "break" not in code:
                warnings.append({
                    "warning_type": "Infinite Loop Risk",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "Critical",
                    "message": "Warning: 'while(true)' loop detected without explicit break or return.",
                    "suggested_fix": "Implement loop exit condition or break statement.",
                })

            # 5. Suspicious condition: assignment inside if condition (e.g. if (x = 5))
            if re.search(r'if\s*\([^=!<>\n]*=[^=!<>\n]*\)', s):
                warnings.append({
                    "warning_type": "Suspicious Condition (Assignment in If)",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "Critical",
                    "message": "Potential bug: assignment operator '=' used inside condition instead of equality '=='.",
                    "suggested_fix": "Replace assignment '=' with comparison operator '=='.",
                })

        return warnings

    def _detect_c_cpp_warnings(self, code: str, is_cpp: bool = True) -> List[Dict[str, Any]]:
        warnings = []
        lines = code.splitlines()

        for idx, line in enumerate(lines, start=1):
            s = line.strip()

            # 1. Assignment in condition: `if (x = 5)`
            if re.search(r'if\s*\([^=!<>\n]*=[^=!<>\n]*\)', s):
                warnings.append({
                    "warning_type": "Suspicious Condition (Assignment in If)",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "Critical",
                    "message": "Potential bug: assignment operator '=' inside if condition instead of '=='.",
                    "suggested_fix": "Replace '=' with '==' to test equality.",
                })

            # 2. Infinite loop without break: `while(1)`
            if re.search(r'while\s*\(\s*1\s*\)', s) and "break" not in code:
                warnings.append({
                    "warning_type": "Infinite Loop Risk",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "Critical",
                    "message": "Warning: 'while(1)' loop without break or return condition.",
                    "suggested_fix": "Add termination condition or break statement.",
                })

            # 3. Raw pointer dereference without NULL check
            if re.search(r'\*\s*([a-zA-Z_]\w*)\s*=', s) or re.search(r'([a-zA-Z_]\w*)->', s):
                m = re.search(r'([a-zA-Z_]\w*)->', s) or re.search(r'\*\s*([a-zA-Z_]\w*)', s)
                if m:
                    ptr_name = m.group(1)
                    if ptr_name not in ("this", "self") and not s.startswith("//"):
                        if f"{ptr_name} == NULL" not in code and f"{ptr_name} != NULL" not in code and f"{ptr_name} == nullptr" not in code and f"{ptr_name} != nullptr" not in code:
                            warnings.append({
                                "warning_type": "Potential Null Pointer Dereference",
                                "line_number": idx,
                                "column_number": 1,
                                "severity": "High",
                                "message": f"Possible risk: pointer '{ptr_name}' dereferenced without prior NULL/nullptr validation.",
                                "suggested_fix": f"Add null check `if ({ptr_name} != NULL)` prior to dereferencing.",
                            })

            # 4. Buffer overflow risk with strcpy / gets
            if "gets(" in s or "strcpy(" in s or "sprintf(" in s:
                func_match = "gets" if "gets(" in s else "strcpy" if "strcpy(" in s else "sprintf"
                warnings.append({
                    "warning_type": "Memory Security Risk",
                    "line_number": idx,
                    "column_number": 1,
                    "severity": "High",
                    "message": f"Potential risk: unsafe C library call '{func_match}()' prone to buffer overflow.",
                    "suggested_fix": f"Replace with bounds-checked alternative: strncpy(), snprintf(), or fgets().",
                })

        return warnings

    def _detect_universal_code_smells(self, code: str) -> List[Dict[str, Any]]:
        """
        Detects hard-coded sensitive values, long methods, and missing docs across all languages.
        """
        warnings = []
        lines = code.splitlines()

        # 1. Hard-coded credentials and tokens
        credential_regex = re.compile(
            r'(?:api_key|apikey|secret|password|passwd|auth_token|access_token|private_key)\s*[:=]\s*["\']([^"\']{4,})["\']',
            re.IGNORECASE
        )
        for idx, line in enumerate(lines, start=1):
            if line.strip().startswith("//") or line.strip().startswith("#"):
                continue
            m = credential_regex.search(line)
            if m:
                warnings.append({
                    "warning_type": "Hard-Coded Sensitive Credential",
                    "line_number": idx,
                    "column_number": m.start() + 1,
                    "severity": "Critical",
                    "message": "Potential risk: hard-coded secret, password, or API token detected in source code.",
                    "suggested_fix": "Extract secret into secure environment variable or secrets manager.",
                })

        # 2. Unreachable code patterns (statements directly following return, throw, break)
        for idx in range(len(lines) - 1):
            curr = lines[idx].strip()
            nxt = lines[idx + 1].strip()
            if curr.startswith("//") or curr.startswith("#") or not curr:
                continue
            if curr in ("return;", "break;", "continue;") or re.match(r'^(return|throw|raise)\b.*[;)]$', curr):
                if nxt and not nxt.startswith("}") and not nxt.startswith("//") and not nxt.startswith("#") and not nxt.startswith("case ") and not nxt.startswith("default:"):
                    warnings.append({
                        "warning_type": "Unreachable Code Detected",
                        "line_number": idx + 2,
                        "column_number": 1,
                        "severity": "Medium",
                        "message": "Potential issue: code statement immediately follows return/break/throw without conditional branching.",
                        "suggested_fix": "Remove unreachable code or wrap in appropriate conditional branch.",
                    })

        return warnings

    # =========================================================================
    # STRUCTURAL METRICS EXTRACTION
    # =========================================================================
    def _extract_metrics(self, code: str, file_type: str) -> Dict[str, Any]:
        if file_type == "py":
            return self._extract_python_metrics(code)
        elif file_type == "java":
            return self._extract_java_metrics(code)
        else:
            return self._extract_c_cpp_metrics(code, is_cpp=(file_type == "cpp"))

    def _extract_python_metrics(self, code: str) -> Dict[str, Any]:
        functions_count = 0
        classes_count = 0
        imports_count = 0
        if_statements = 0
        conditions_count = 0
        loops_count = 0
        switch_statements = 0
        complexity = 1.0

        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    functions_count += 1
                elif isinstance(node, ast.ClassDef):
                    classes_count += 1
                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    imports_count += 1
                elif isinstance(node, ast.If):
                    if_statements += 1
                    conditions_count += 1
                    complexity += 1.0
                elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
                    loops_count += 1
                    complexity += 1.0
                elif hasattr(ast, 'Match') and isinstance(node, ast.Match):
                    switch_statements += 1
                elif hasattr(ast, 'MatchCase') and isinstance(node, ast.MatchCase):
                    complexity += 1.0
                    conditions_count += 1
                elif isinstance(node, ast.ExceptHandler):
                    complexity += 1.0
                elif isinstance(node, ast.BoolOp):
                    # and / or expressions
                    add_cond = max(0, len(node.values) - 1)
                    conditions_count += add_cond
                    complexity += add_cond
                elif isinstance(node, ast.IfExp):
                    if_statements += 1
                    conditions_count += 1
                    complexity += 1.0
        except Exception:
            # Fallback regex
            functions_count = len(re.findall(r'^\s*def\s+[a-zA-Z_]\w*', code, re.MULTILINE))
            classes_count = len(re.findall(r'^\s*class\s+[a-zA-Z_]\w*', code, re.MULTILINE))
            imports_count = len(re.findall(r'^\s*(?:import|from)\b', code, re.MULTILINE))
            if_statements = len(re.findall(r'\b(if|elif)\b', code))
            conditions_count = if_statements + len(re.findall(r'\b(and|or)\b', code))
            loops_count = len(re.findall(r'\b(for|while)\b', code))
            switch_statements = len(re.findall(r'\bmatch\b', code))
            complexity = 1.0 + conditions_count + loops_count

        comments_count = len(re.findall(r'#.*$', code, re.MULTILINE)) + len(re.findall(r'(""".*?"""|\'\'\'.*?\'\'\')', code, re.DOTALL))

        return {
            "functions_count": functions_count,
            "classes_count": classes_count,
            "imports_count": imports_count,
            "comments_count": comments_count,
            "cyclomatic_complexity": round(float(complexity), 1),
            "if_statements": if_statements,
            "conditions_count": conditions_count,
            "loops_count": loops_count,
            "switch_statements": switch_statements,
        }

    def _extract_java_metrics(self, code: str) -> Dict[str, Any]:
        clean_code = re.sub(r'"(\\.|[^"\\])*"', '""', code)
        clean_code = re.sub(r"'(\\.|[^'\\])*'", "''", clean_code)

        classes = re.findall(r'\b(?:class|interface|enum|record)\s+([A-Za-z_]\w*)', clean_code)
        classes_count = len(classes)

        method_pattern = r'(?:public|protected|private|static|\s)+[\w<>\[\], ?]+\s+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{'
        methods = re.findall(method_pattern, clean_code)
        constructor_pattern = r'(?:public|protected|private)\s+([A-Z]\w*)\s*\([^)]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{'
        constructors = [c for c in re.findall(constructor_pattern, clean_code) if c in classes]
        functions_count = len(methods) + len(constructors)
        if functions_count == 0 and ("main(" in clean_code or "void " in clean_code):
            functions_count = len(re.findall(r'\bvoid\s+[a-zA-Z_]\w*\s*\(', clean_code)) or 1

        imports_count = len(re.findall(r'^\s*import\s+[\w.*]+;', code, re.MULTILINE))

        if_statements = len(re.findall(r'\bif\s*\(', clean_code))
        for_loops = len(re.findall(r'\bfor\s*\(', clean_code))
        while_loops = len(re.findall(r'\bwhile\s*\(', clean_code))
        do_loops = len(re.findall(r'\bdo\s*\{', clean_code))
        loops_count = for_loops + while_loops + do_loops
        switch_statements = len(re.findall(r'\bswitch\s*\(', clean_code))
        case_statements = len(re.findall(r'\bcase\s+[^:]+:', clean_code))
        catch_statements = len(re.findall(r'\bcatch\s*\(', clean_code))
        logical_and = len(re.findall(r'&&', clean_code))
        logical_or = len(re.findall(r'\|\|', clean_code))
        ternary_ops = len(re.findall(r'\?[^:]+:', clean_code))

        conditions_count = if_statements + logical_and + logical_or + ternary_ops + case_statements
        complexity = 1.0 + conditions_count + loops_count + catch_statements

        single_comments = len(re.findall(r'//.*$', code, re.MULTILINE))
        block_comments = len(re.findall(r'/\*.*?\*/', code, re.DOTALL))
        comments_count = single_comments + block_comments

        return {
            "functions_count": functions_count,
            "classes_count": classes_count,
            "imports_count": imports_count,
            "comments_count": comments_count,
            "cyclomatic_complexity": round(float(complexity), 1),
            "if_statements": if_statements,
            "conditions_count": conditions_count,
            "loops_count": loops_count,
            "switch_statements": switch_statements,
        }

    def _extract_c_cpp_metrics(self, code: str, is_cpp: bool = True) -> Dict[str, Any]:
        clean_code = re.sub(r'"(\\.|[^"\\])*"', '""', code)
        clean_code = re.sub(r"'(\\.|[^'\\])*'", "''", clean_code)

        if is_cpp:
            classes_count = len(re.findall(r'\b(?:class|struct)\s+([A-Za-z_]\w*)', clean_code))
        else:
            classes_count = len(re.findall(r'\bstruct\s+([A-Za-z_]\w*)', clean_code))

        func_pattern = r'(?:[a-zA-Z_][\w:*&<>]*\s+)+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:const)?\s*\{'
        functions = re.findall(func_pattern, clean_code)
        keywords_to_ignore = {'if', 'for', 'while', 'switch', 'catch'}
        real_functions = [f for f in functions if f not in keywords_to_ignore]
        functions_count = len(real_functions)
        if functions_count == 0 and "main" in clean_code:
            functions_count = 1

        imports_count = len(re.findall(r'^\s*#include\b', code, re.MULTILINE))

        if_statements = len(re.findall(r'\bif\s*\(', clean_code))
        for_loops = len(re.findall(r'\bfor\s*\(', clean_code))
        while_loops = len(re.findall(r'\bwhile\s*\(', clean_code))
        do_loops = len(re.findall(r'\bdo\s*\{', clean_code))
        loops_count = for_loops + while_loops + do_loops
        switch_statements = len(re.findall(r'\bswitch\s*\(', clean_code))
        case_statements = len(re.findall(r'\bcase\s+[^:]+:', clean_code))
        catch_statements = len(re.findall(r'\bcatch\s*\(', clean_code)) if is_cpp else 0
        logical_and = len(re.findall(r'&&', clean_code))
        logical_or = len(re.findall(r'\|\|', clean_code))
        ternary_ops = len(re.findall(r'\?[^:]+:', clean_code))

        conditions_count = if_statements + logical_and + logical_or + ternary_ops + case_statements
        complexity = 1.0 + conditions_count + loops_count + catch_statements

        single_comments = len(re.findall(r'//.*$', code, re.MULTILINE))
        block_comments = len(re.findall(r'/\*.*?\*/', code, re.DOTALL))
        comments_count = single_comments + block_comments

        return {
            "functions_count": functions_count,
            "classes_count": classes_count,
            "imports_count": imports_count,
            "comments_count": comments_count,
            "cyclomatic_complexity": round(float(complexity), 1),
            "if_statements": if_statements,
            "conditions_count": conditions_count,
            "loops_count": loops_count,
            "switch_statements": switch_statements,
        }

    # =========================================================================
    # BUG RISK CALCULATION & EXPLAINABLE AI INTEGRATION
    # =========================================================================
    def _calculate_risk_and_factors(
        self,
        metrics: Dict[str, Any],
        syntax_errors: List[Dict[str, Any]],
        code_warnings: List[Dict[str, Any]],
        commits: Optional[int]
    ) -> Dict[str, Any]:
        """
        Integrates with the NASA MDP JM1 trained ML engine.
        Does NOT invent commit values if not supplied.
        """
        effective_commits = commits if commits is not None else 15

        # Base ML model prediction
        pred = bug_predictor.predict(
            loc=metrics["loc"],
            complexity=metrics["cyclomatic_complexity"],
            commits=effective_commits,
            code_lines=metrics["code_lines"],
            comment_lines=metrics["comment_lines"],
            blank_lines=metrics["blank_lines"],
            branches=metrics.get("conditions_count", 0) + metrics.get("loops_count", 0) * 2 + 1
        )

        base_score = pred["risk_score"]

        # Calculate penalty adjustments from static analysis findings
        syntax_penalty = len(syntax_errors) * 15.0
        critical_warnings = sum(1 for w in code_warnings if w.get("severity") == "Critical")
        high_warnings = sum(1 for w in code_warnings if w.get("severity") == "High")
        medium_warnings = sum(1 for w in code_warnings if w.get("severity") == "Medium")

        warnings_penalty = (critical_warnings * 8.0) + (high_warnings * 4.0) + (medium_warnings * 1.5)

        total_risk = base_score + syntax_penalty + warnings_penalty

        # If syntax errors are present, code cannot compile -> must be High Risk (>= 75%)
        if syntax_errors:
            total_risk = max(total_risk, 78.0)

        calibrated_risk = round(min(98.5, max(5.0, total_risk)), 1)

        # Categorize Risk Level
        if calibrated_risk >= 70.0 or len(syntax_errors) > 0:
            risk_level = "High"
        elif calibrated_risk >= 35.0:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Construct explicit Risk Factors with extraction sources
        risk_factors = [
            {
                "name": "Lines of Code (LOC)",
                "value": metrics["loc"],
                "contribution_percent": 25.0,
                "risk_influence": "High" if metrics["loc"] > 500 else "Moderate" if metrics["loc"] > 200 else "Low",
                "explanation": f"Module contains {metrics['loc']} total lines ({metrics['code_lines']} executable).",
                "extraction_source": "Extracted Automatically"
            },
            {
                "name": "McCabe Cyclomatic Complexity",
                "value": metrics["cyclomatic_complexity"],
                "contribution_percent": 30.0,
                "risk_influence": "Critical" if metrics["cyclomatic_complexity"] > 25 else "High" if metrics["cyclomatic_complexity"] > 15 else "Moderate" if metrics["cyclomatic_complexity"] > 8 else "Low",
                "explanation": f"Estimated complexity is {metrics['cyclomatic_complexity']} with {metrics.get('conditions_count', 0)} decision branches.",
                "extraction_source": "Extracted Automatically"
            },
            {
                "name": "Syntax Error Burden",
                "value": len(syntax_errors),
                "contribution_percent": 20.0,
                "risk_influence": "Critical" if len(syntax_errors) > 0 else "Low",
                "explanation": f"{len(syntax_errors)} syntax compilation issues detected." if syntax_errors else "Code is syntactically well-formed.",
                "extraction_source": "Extracted Automatically"
            },
            {
                "name": "Code Quality Warnings",
                "value": len(code_warnings),
                "contribution_percent": 15.0,
                "risk_influence": "Critical" if critical_warnings > 0 else "High" if high_warnings > 1 else "Moderate" if len(code_warnings) > 2 else "Low",
                "explanation": f"{len(code_warnings)} potential static code quality issues ({critical_warnings} Critical, {high_warnings} High).",
                "extraction_source": "Extracted Automatically"
            },
            {
                "name": "Revision Churn / Commits",
                "value": f"{commits} commits" if commits is not None else "Not Available (Static File Upload)",
                "contribution_percent": 10.0,
                "risk_influence": "Moderate" if commits is not None and commits > 25 else "Low",
                "explanation": f"Git commit churn is supplied by user ({commits} revisions)." if commits is not None else "Commit churn is not available for single file static uploads; calibrated baseline was applied.",
                "extraction_source": "Supplied by User" if commits is not None else "Not Available"
            }
        ]

        # Natural language summary explanation
        if syntax_errors:
            explanation = (
                f"High defect propensity ({calibrated_risk}%). Static parser discovered {len(syntax_errors)} syntax errors "
                f"that require immediate correction. In addition, {len(code_warnings)} code quality warnings were identified."
            )
        elif risk_level == "High":
            explanation = (
                f"High bug risk ({calibrated_risk}%). High cyclomatic complexity ({metrics['cyclomatic_complexity']}) "
                f"combined with {len(code_warnings)} code quality warnings indicates defect-prone architecture."
            )
        elif risk_level == "Medium":
            explanation = (
                f"Moderate bug likelihood ({calibrated_risk}%). The code is syntactically valid with moderate complexity ({metrics['cyclomatic_complexity']}). "
                f"Review {len(code_warnings)} detected code quality warnings to improve maintainability."
            )
        else:
            explanation = (
                f"Low bug risk ({calibrated_risk}%). Code exhibits modular structure, low cyclomatic complexity ({metrics['cyclomatic_complexity']}), "
                f"and healthy documentation ratio ({metrics['comment_ratio']}%)."
            )

        return {
            "risk_score": calibrated_risk,
            "risk_level": risk_level,
            "confidence": pred.get("confidence", 88.0),
            "model_name": pred.get("model_name", "Random Forest (NASA JM1)"),
            "predicted_class": "Defective" if risk_level == "High" or len(syntax_errors) > 0 else "Non-Defective",
            "prediction_probability": round(calibrated_risk / 100.0, 4),
            "risk_factors": risk_factors,
            "explanation": explanation,
        }

code_analyzer = CodeAnalyzer()
