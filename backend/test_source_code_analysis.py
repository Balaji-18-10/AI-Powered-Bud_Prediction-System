import unittest
from app.services.code_analyzer import code_analyzer

class TestSourceCodeAnalysis(unittest.TestCase):
    def test_1_valid_java_file(self):
        java_code = """
        package com.example;
        import java.util.List;

        public class Calculator {
            public int add(int a, int b) {
                return a + b;
            }

            public int computeMax(int a, int b) {
                if (a > b) {
                    return a;
                } else {
                    return b;
                }
            }
        }
        """
        res = code_analyzer.analyze("Calculator.java", java_code)
        self.assertEqual(res["file_type"], "java")
        self.assertEqual(res["syntax_errors_count"], 0)
        self.assertGreater(res["metrics"]["loc"], 0)
        self.assertGreater(res["metrics"]["functions_count"], 0)
        self.assertIn(res["risk_level"], ["Low", "Medium", "High"])

    def test_2_java_file_with_syntax_error(self):
        # Missing semicolon on return and unclosed brace
        broken_java = """
        public class Broken {
            public void test() {
                int x = 10
                System.out.println(x);
        }
        """
        res = code_analyzer.analyze("Broken.java", broken_java)
        self.assertGreater(res["syntax_errors_count"], 0)
        # Should detect missing semicolon or unclosed brace
        error_types = [e["error_type"] for e in res["syntax_errors"]]
        self.assertTrue(
            any("Semicolon" in t or "Delimiter" in t for t in error_types),
            f"Expected semicolon or delimiter error, got {error_types}"
        )
        # Risk level should be High when syntax errors are present
        self.assertEqual(res["risk_level"], "High")

    def test_3_python_file_with_syntax_error(self):
        # Missing colon and invalid syntax
        broken_py = "def compute_sum(a, b)\n    return a + b\n"
        res = code_analyzer.analyze("broken_sum.py", broken_py)
        self.assertGreater(res["syntax_errors_count"], 0)
        self.assertEqual(res["syntax_errors"][0]["line_number"], 1)
        self.assertIn("colon", res["syntax_errors"][0]["suggested_fix"].lower())
        self.assertEqual(res["risk_level"], "High")

    def test_4_unsupported_file_type_detection(self):
        ext = ".exe"
        self.assertNotIn(ext, code_analyzer.ALLOWED_EXTENSIONS)
        self.assertIn(".java", code_analyzer.ALLOWED_EXTENSIONS)
        self.assertIn(".py", code_analyzer.ALLOWED_EXTENSIONS)
        self.assertIn(".cpp", code_analyzer.ALLOWED_EXTENSIONS)
        self.assertIn(".c", code_analyzer.ALLOWED_EXTENSIONS)

    def test_5_empty_file_handling(self):
        res = code_analyzer.analyze("empty.py", "")
        self.assertEqual(res["metrics"]["loc"], 1)
        self.assertEqual(res["syntax_errors_count"], 0)
        self.assertEqual(res["warnings_count"], 0)

    def test_6_very_large_file_size_check(self):
        large_code = "# large file\n" * 1000
        size_bytes = len(large_code.encode("utf-8"))
        self.assertGreater(size_bytes, 1000)
        # Analyzer handles large line counts without choking
        res = code_analyzer.analyze("large.py", large_code)
        self.assertEqual(res["metrics"]["loc"], 1000)

    def test_7_file_with_multiple_warnings(self):
        py_code = """
        import math
        import os

        def calculate_payment():
            api_key = "sk_live_998877665544"
            x = 42
            try:
                pass
            except Exception:
                pass
            
            while True:
                pass
        """
        res = code_analyzer.analyze("payment.py", py_code)
        self.assertGreater(res["warnings_count"], 0)
        warning_types = [w["warning_type"] for w in res["code_warnings"]]
        # Should flag credential, empty except, unused variable / import, infinite loop
        self.assertTrue(any("Credential" in t for t in warning_types))
        self.assertTrue(any("Empty Catch" in t for t in warning_types))
        self.assertTrue(any("Infinite Loop" in t for t in warning_types))

if __name__ == "__main__":
    unittest.main()
