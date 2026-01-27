"""Module 7: Deterministic code graders."""
import os
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from eval_types import GradeResult, Grader, Transcript


def string_match_grader(file_path: str, expected: str) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        try:
            with open(os.path.join(workspace_dir, file_path)) as f:
                content = f.read()
            found = expected in content
            return GradeResult(
                score=1.0 if found else 0.0,
                passed=found,
                explanation=f"Found expected string in {file_path}" if found else f"Expected string not found in {file_path}",
            )
        except FileNotFoundError:
            return GradeResult(score=0.0, passed=False, explanation=f"File {file_path} not found")

    return Grader(name=f"string-match({file_path})", grade=grade)


def file_exists_grader(file_path: str) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        exists = os.path.exists(os.path.join(workspace_dir, file_path))
        return GradeResult(
            score=1.0 if exists else 0.0,
            passed=exists,
            explanation=f"File {file_path} exists" if exists else f"File {file_path} not found",
        )

    return Grader(name=f"file-exists({file_path})", grade=grade)


def shell_test_grader(command: str, name: str = None) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True,
                cwd=workspace_dir, timeout=30,
            )
            if result.returncode == 0:
                return GradeResult(score=1.0, passed=True, explanation=f"Command passed: {result.stdout.strip()[:200]}")
            return GradeResult(score=0.0, passed=False, explanation=f"Command failed: {result.stderr.strip()[:200]}")
        except Exception as e:
            return GradeResult(score=0.0, passed=False, explanation=f"Command failed: {e}")

    return Grader(name=name or f"shell-test({command[:40]})", grade=grade)


def composite_grader(graders: list[Grader]) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        results = [g.grade(workspace_dir, transcript) for g in graders]
        avg_score = sum(r.score for r in results) / len(results)
        all_passed = all(r.passed for r in results)
        explanation = "\n".join(f"{'✓' if r.passed else '✗'} {r.explanation}" for r in results)
        return GradeResult(score=avg_score, passed=all_passed, explanation=explanation)

    return Grader(name=f"composite({', '.join(g.name for g in graders)})", grade=grade)
