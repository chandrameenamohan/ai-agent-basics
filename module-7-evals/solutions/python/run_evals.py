"""Module 7: Run evaluations."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from harness import run_evals
from metrics import compute_task_result, compute_report
from report import print_report
from tasks.coding_tasks import coding_tasks


def main():
    trials_per_task = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    print(f"Running {len(coding_tasks)} tasks × {trials_per_task} trials each\n")

    trials = run_evals(coding_tasks, trials_per_task)
    task_results = [
        compute_task_result(task.id, [t for t in trials if t.task_id == task.id])
        for task in coding_tasks
    ]
    report = compute_report(task_results)
    print_report(report)


if __name__ == "__main__":
    main()
