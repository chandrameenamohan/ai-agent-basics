"""Module 7: Scorecard report."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from eval_types import EvalReport


def print_report(report: EvalReport) -> None:
    print("\n" + "=" * 60)
    print("EVAL SCORECARD")
    print(f"Timestamp: {report.timestamp}")
    print("=" * 60)

    for task in report.tasks:
        pass_count = sum(1 for t in task.trials if t.grade.passed)
        k = len(task.trials)
        print(f"\n  {task.task_id}")
        print(f"    Pass rate:  {pass_count}/{k} ({task.pass_rate * 100:.0f}%)")
        print(f"    pass@{k}:    {task.pass_at_k * 100:.1f}%")
        print(f"    pass^{k}:    {task.pass_exp_k * 100:.1f}%")
        print(f"    Avg score:  {task.avg_score:.2f}")
        print(f"    Avg turns:  {task.avg_turns:.1f}")

        failures = [t for t in task.trials if not t.grade.passed]
        if failures:
            print("    Failures:")
            for f in failures:
                print(f"      Trial {f.trial_index + 1}: {f.grade.explanation[:80]}")

    print("\n" + "-" * 60)
    print(f"  OVERALL pass rate: {report.overall_pass_rate * 100:.1f}%")
    print(f"  OVERALL pass@k:    {report.overall_pass_at_k * 100:.1f}%")
    print("=" * 60)
