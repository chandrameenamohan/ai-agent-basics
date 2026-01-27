"""Module 9: Bootstrap loop — eval -> analyze -> improve -> re-eval -> commit or revert."""
import os
import sys
import json
import subprocess

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-7-evals", "solutions", "python"))

from dotenv import load_dotenv
load_dotenv()

from harness import run_evals
from metrics import compute_task_result, compute_report
from report import print_report
from tasks.coding_tasks import coding_tasks
from improve import analyze_and_improve, apply_improvements
from eval_types import EvalReport

BASE_DIR = os.path.realpath(os.getcwd())


def run_eval_cycle(trials_per_task: int) -> EvalReport:
    print("\n Running evals...")
    trials = run_evals(coding_tasks, trials_per_task)
    task_results = [
        compute_task_result(task.id, [t for t in trials if t.task_id == task.id])
        for task in coding_tasks
    ]
    return compute_report(task_results)


def git_snapshot(message: str) -> str | None:
    try:
        subprocess.run(["git", "add", "-A"], cwd=BASE_DIR, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", message, "--allow-empty"], cwd=BASE_DIR, check=True, capture_output=True)
        result = subprocess.run(["git", "rev-parse", "HEAD"], cwd=BASE_DIR, capture_output=True, text=True)
        return result.stdout.strip()
    except Exception:
        return None


def git_revert(commit_hash: str) -> None:
    try:
        subprocess.run(["git", "revert", "--no-commit", commit_hash], cwd=BASE_DIR, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", "Revert failed improvement"], cwd=BASE_DIR, check=True, capture_output=True)
    except Exception:
        print("Failed to revert — manual cleanup may be needed")


def main():
    cycles = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    trials_per_task = int(sys.argv[2]) if len(sys.argv) > 2 else 2

    print(f"Bootstrap: {cycles} cycles, {trials_per_task} trials per task")
    print(f"Base dir: {BASE_DIR}\n")

    best_pass_rate = 0.0

    for cycle in range(1, cycles + 1):
        print(f"\n{'=' * 60}")
        print(f"CYCLE {cycle}/{cycles}")
        print("=" * 60)

        report = run_eval_cycle(trials_per_task)
        print_report(report)

        with open(os.path.join(BASE_DIR, f"eval-report-cycle-{cycle}.json"), "w") as f:
            json.dump({"overall_pass_rate": report.overall_pass_rate, "timestamp": report.timestamp}, f, indent=2)

        if report.overall_pass_rate >= 1.0:
            print("\n100% pass rate — no improvement needed!")
            break

        if report.overall_pass_rate > best_pass_rate:
            best_pass_rate = report.overall_pass_rate

        print("\nAnalyzing failures...")
        improvements = analyze_and_improve(report, BASE_DIR)

        if not improvements:
            print("No improvements proposed this cycle.")
            continue

        print(f"\nProposed {len(improvements)} improvements:")
        for imp in improvements:
            print(f"  - {imp['description']}")

        git_snapshot(f"Before cycle {cycle} improvements")
        apply_improvements(improvements, BASE_DIR)
        after_commit = git_snapshot(f"Cycle {cycle}: {'; '.join(i['description'] for i in improvements)}")

        print("\nRe-evaluating after improvements...")
        new_report = run_eval_cycle(trials_per_task)
        print_report(new_report)

        if new_report.overall_pass_rate > report.overall_pass_rate:
            print(f"\nImprovement! {report.overall_pass_rate * 100:.1f}% -> {new_report.overall_pass_rate * 100:.1f}%")
        else:
            print(f"\nNo improvement ({new_report.overall_pass_rate * 100:.1f}% vs {report.overall_pass_rate * 100:.1f}%). Reverting...")
            if after_commit:
                git_revert(after_commit)

    print("\nBootstrap complete.")
    print(f"Best pass rate achieved: {best_pass_rate * 100:.1f}%")


if __name__ == "__main__":
    main()
