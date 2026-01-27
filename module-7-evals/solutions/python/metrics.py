"""Module 7: Eval metrics."""
import math
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from eval_types import Trial, TaskResult, EvalReport


def compute_task_result(task_id: str, trials: list[Trial]) -> TaskResult:
    k = len(trials)
    pass_count = sum(1 for t in trials if t.grade.passed)
    pass_rate = pass_count / k if k > 0 else 0

    pass_at_k = 1 - (1 - pass_rate) ** k if k > 0 else 0
    pass_exp_k = pass_rate ** k if k > 0 else 0

    avg_score = sum(t.grade.score for t in trials) / k if k > 0 else 0
    avg_turns = sum(len(t.transcript.turns) for t in trials) / k if k > 0 else 0

    return TaskResult(
        task_id=task_id, trials=trials, pass_rate=pass_rate,
        pass_at_k=pass_at_k, pass_exp_k=pass_exp_k,
        avg_score=avg_score, avg_turns=avg_turns,
    )


def compute_report(task_results: list[TaskResult]) -> EvalReport:
    from datetime import datetime
    n = len(task_results)
    overall_pass_rate = sum(t.pass_rate for t in task_results) / n if n else 0
    overall_pass_at_k = sum(t.pass_at_k for t in task_results) / n if n else 0

    return EvalReport(
        timestamp=datetime.now().isoformat(),
        tasks=task_results,
        overall_pass_rate=overall_pass_rate,
        overall_pass_at_k=overall_pass_at_k,
    )
