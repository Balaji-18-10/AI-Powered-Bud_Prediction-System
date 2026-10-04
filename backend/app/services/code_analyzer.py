import re
import ast
from typing import Dict, Any, Tuple
from app.services.ml_engine import bug_predictor

class CodeAnalyzer:
    @staticmethod
    def detect_file_type(file_name: str, content: str = "") -> str:
        lower = file_name.lower().strip()
        if lower.endswith(".py"):
            return "py"
        elif lower.endswith(".java"):
            return "java"
        elif lower.endswith(".cpp") or lower.endswith(".cc") or lower.endswith(".cxx") or lower.endswith(".hpp") or lower.endswith(".h"):
            return "cpp"
        elif lower.endswith(".c"):
            return "c"
        
        # Fallback inspection by content
        if "def " in content or "import " in content and ":" in content:
            return "py"
        if "public class " in content or "System.out.println" in content:
            return "java"
        if "#include " in content and ("cout" in content or "std::" in content or "class " in content):
            return "cpp"
        if "#include " in content and "printf" in content:
            return "c"
        return "py"

    def analyze(self, file_name: str, source_code: str, commits: int = 15) -> Dict[str, Any]:
        file_type = self.detect_file_type(file_name, source_code)
        
        if file_type == "py":
            metrics = self._analyze_python(source_code)
        elif file_type == "java":
            metrics = self._analyze_java(source_code)
        else: # cpp, c
            metrics = self._analyze_c_cpp(source_code, is_cpp=(file_type == "cpp"))

        # Add common line count breakdowns
        total_lines, code_lines, blank_lines, comment_lines = self._count_lines(source_code, file_type)
        metrics["loc"] = max(1, total_lines)
        metrics["code_lines"] = code_lines
        metrics["blank_lines"] = blank_lines
        metrics["comment_lines"] = comment_lines
        
        # Comment-to-code ratio
        code_denom = max(1, code_lines)
        metrics["comment_ratio"] = round((comment_lines / code_denom) * 100.0, 1)

        # Bug Risk Prediction using our trained NASA JM1 ML model
        pred = bug_predictor.predict(
            loc=metrics["loc"],
            complexity=metrics["cyclomatic_complexity"],
            commits=commits,
            code_lines=metrics["code_lines"],
            comment_lines=metrics["comment_lines"],
            blank_lines=metrics["blank_lines"],
            branches=metrics.get("if_statements", 0) + metrics.get("loops_count", 0) * 2 + 1
        )

        risk_score = pred["risk_score"]
        risk_level = pred["risk_level"]

        return {
            "file_name": file_name,
            "file_type": file_type,
            "file_size": len(source_code.encode("utf-8")),
            "metrics": metrics,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "confidence": pred.get("confidence", 85.0),
            "model_name": pred.get("model_name"),
            "predicted_class": pred.get("predicted_class"),
            "prediction_probability": pred.get("prediction_probability"),
        }

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
                    # check toggle
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

    def _analyze_python(self, code: str) -> Dict[str, Any]:
        functions_count = 0
        classes_count = 0
        if_statements = 0
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
                elif isinstance(node, ast.If):
                    if_statements += 1
                    complexity += 1.0
                elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
                    loops_count += 1
                    complexity += 1.0
                elif hasattr(ast, 'Match') and isinstance(node, ast.Match):
                    switch_statements += 1
                elif hasattr(ast, 'MatchCase') and isinstance(node, ast.MatchCase):
                    complexity += 1.0
                elif isinstance(node, ast.ExceptHandler):
                    complexity += 1.0
                elif isinstance(node, ast.BoolOp):
                    # add condition count for boolean operations (and / or)
                    complexity += max(0, len(node.values) - 1)
                elif isinstance(node, ast.IfExp):
                    if_statements += 1
                    complexity += 1.0
        except SyntaxError:
            # Fallback regex parser for Python if syntax is incomplete
            functions_count = len(re.findall(r'^\s*def\s+[a-zA-Z_]\w*', code, re.MULTILINE))
            classes_count = len(re.findall(r'^\s*class\s+[a-zA-Z_]\w*', code, re.MULTILINE))
            if_statements = len(re.findall(r'\b(if|elif)\b', code))
            loops_count = len(re.findall(r'\b(for|while)\b', code))
            switch_statements = len(re.findall(r'\bmatch\b', code))
            complexity = 1.0 + if_statements + loops_count + len(re.findall(r'\b(and|or|except)\b', code))

        # Count comments
        comments_count = len(re.findall(r'#.*$', code, re.MULTILINE)) + len(re.findall(r'(""".*?"""|\'\'\'.*?\'\'\')', code, re.DOTALL))

        return {
            "functions_count": functions_count,
            "classes_count": classes_count,
            "comments_count": comments_count,
            "cyclomatic_complexity": round(float(complexity), 1),
            "if_statements": if_statements,
            "loops_count": loops_count,
            "switch_statements": switch_statements,
        }

    def _analyze_java(self, code: str) -> Dict[str, Any]:
        # 1. Clean out string literals to prevent regex false positives
        clean_code = re.sub(r'"(\\.|[^"\\])*"', '""', code)
        clean_code = re.sub(r"'(\\.|[^'\\])*'", "''", clean_code)

        # 2. Classes / Interfaces / Enums
        classes = re.findall(r'\b(?:class|interface|enum|record)\s+([A-Za-z_]\w*)', clean_code)
        classes_count = len(classes)

        # 3. Methods & Functions
        # Matches typical Java method declarations
        method_pattern = r'(?:public|protected|private|static|\s)+[\w<>\[\], ?]+\s+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{'
        methods = re.findall(method_pattern, clean_code)
        # Add constructors
        constructor_pattern = r'(?:public|protected|private)\s+([A-Z]\w*)\s*\([^)]*\)\s*(?:throws\s+[\w\s,]+)?\s*\{'
        constructors = [c for c in re.findall(constructor_pattern, clean_code) if c in classes]
        functions_count = len(methods) + len(constructors)
        if functions_count == 0 and ("main(" in clean_code or "void " in clean_code):
            functions_count = len(re.findall(r'\bvoid\s+[a-zA-Z_]\w*\s*\(', clean_code)) or 1

        # 4. If statements
        if_statements = len(re.findall(r'\bif\s*\(', clean_code))

        # 5. Loops (for, while, do-while)
        for_loops = len(re.findall(r'\bfor\s*\(', clean_code))
        while_loops = len(re.findall(r'\bwhile\s*\(', clean_code))
        do_loops = len(re.findall(r'\bdo\s*\{', clean_code))
        loops_count = for_loops + while_loops + do_loops

        # 6. Switch statements
        switch_statements = len(re.findall(r'\bswitch\s*\(', clean_code))

        # 7. Comments count
        single_comments = len(re.findall(r'//.*$', code, re.MULTILINE))
        block_comments = len(re.findall(r'/\*.*?\*/', code, re.DOTALL))
        comments_count = single_comments + block_comments

        # 8. McCabe Cyclomatic Complexity
        case_statements = len(re.findall(r'\bcase\s+[^:]+:', clean_code))
        catch_statements = len(re.findall(r'\bcatch\s*\(', clean_code))
        logical_and = len(re.findall(r'&&', clean_code))
        logical_or = len(re.findall(r'\|\|', clean_code))
        ternary_ops = len(re.findall(r'\?[^:]+:', clean_code))

        complexity = (
            1.0
            + if_statements
            + loops_count
            + case_statements
            + catch_statements
            + logical_and
            + logical_or
            + ternary_ops
        )

        return {
            "functions_count": functions_count,
            "classes_count": classes_count,
            "comments_count": comments_count,
            "cyclomatic_complexity": round(float(complexity), 1),
            "if_statements": if_statements,
            "loops_count": loops_count,
            "switch_statements": switch_statements,
        }

    def _analyze_c_cpp(self, code: str, is_cpp: bool = True) -> Dict[str, Any]:
        # 1. Clean out string and character literals
        clean_code = re.sub(r'"(\\.|[^"\\])*"', '""', code)
        clean_code = re.sub(r"'(\\.|[^'\\])*'", "''", clean_code)

        # 2. Classes & Structs
        if is_cpp:
            classes_count = len(re.findall(r'\b(?:class|struct)\s+([A-Za-z_]\w*)', clean_code))
        else:
            classes_count = len(re.findall(r'\bstruct\s+([A-Za-z_]\w*)', clean_code))

        # 3. Functions
        func_pattern = r'(?:[a-zA-Z_][\w:*&<>]*\s+)+([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:const)?\s*\{'
        functions = re.findall(func_pattern, clean_code)
        # Filter out control structures accidentally captured
        keywords_to_ignore = {'if', 'for', 'while', 'switch', 'catch'}
        real_functions = [f for f in functions if f not in keywords_to_ignore]
        functions_count = len(real_functions)
        if functions_count == 0 and "main" in clean_code:
            functions_count = 1

        # 4. If statements
        if_statements = len(re.findall(r'\bif\s*\(', clean_code))

        # 5. Loops (for, while, do-while)
        for_loops = len(re.findall(r'\bfor\s*\(', clean_code))
        while_loops = len(re.findall(r'\bwhile\s*\(', clean_code))
        do_loops = len(re.findall(r'\bdo\s*\{', clean_code))
        loops_count = for_loops + while_loops + do_loops

        # 6. Switch statements
        switch_statements = len(re.findall(r'\bswitch\s*\(', clean_code))

        # 7. Comments
        single_comments = len(re.findall(r'//.*$', code, re.MULTILINE))
        block_comments = len(re.findall(r'/\*.*?\*/', code, re.DOTALL))
        comments_count = single_comments + block_comments

        # 8. McCabe Cyclomatic Complexity
        case_statements = len(re.findall(r'\bcase\s+[^:]+:', clean_code))
        catch_statements = len(re.findall(r'\bcatch\s*\(', clean_code)) if is_cpp else 0
        logical_and = len(re.findall(r'&&', clean_code))
        logical_or = len(re.findall(r'\|\|', clean_code))
        ternary_ops = len(re.findall(r'\?[^:]+:', clean_code))

        complexity = (
            1.0
            + if_statements
            + loops_count
            + case_statements
            + catch_statements
            + logical_and
            + logical_or
            + ternary_ops
        )

        return {
            "functions_count": functions_count,
            "classes_count": classes_count,
            "comments_count": comments_count,
            "cyclomatic_complexity": round(float(complexity), 1),
            "if_statements": if_statements,
            "loops_count": loops_count,
            "switch_statements": switch_statements,
        }

code_analyzer = CodeAnalyzer()
