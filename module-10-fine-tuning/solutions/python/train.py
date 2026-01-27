"""Module 10: Training orchestrator."""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-5-coding-agent", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-7-evals", "solutions", "python"))

from dotenv import load_dotenv
load_dotenv()

from data_pipeline import extract_traces, cluster_traces, stratified_sample, save_traces
from sft_dataset import build_sft_dataset, save_sft_dataset
from dpo_dataset import build_dpo_dataset, save_dpo_dataset
from classifier import route_intent
from prompt import CODING_AGENT_PROMPT
from eval_types import Trial, Transcript, TranscriptTurn, GradeResult

OUTPUT_DIR = os.path.join(os.getcwd(), "training-data")


def create_synthetic_trials() -> list[Trial]:
    return [
        Trial(
            task_id="rename-variable",
            trial_index=0,
            transcript=Transcript(
                task="Rename variable x to count",
                turns=[
                    TranscriptTurn(role="user", content="Rename variable x to count"),
                    TranscriptTurn(role="assistant", content="I'll rename the variable.", tool_calls=[
                        {"name": "read-file", "input": {"path": "app.ts"}, "result": "const x = 0;"},
                        {"name": "edit-file", "input": {"path": "app.ts", "old_string": "x", "new_string": "count"}, "result": "Edited"},
                    ]),
                ],
                total_tokens=500, duration_ms=3000,
            ),
            grade=GradeResult(score=1.0, passed=True, explanation="Variable renamed correctly"),
        ),
        Trial(
            task_id="rename-variable",
            trial_index=1,
            transcript=Transcript(
                task="Rename variable x to count",
                turns=[
                    TranscriptTurn(role="user", content="Rename variable x to count"),
                    TranscriptTurn(role="assistant", content="Done."),
                ],
                total_tokens=200, duration_ms=1000,
            ),
            grade=GradeResult(score=0.0, passed=False, explanation="Did not actually edit the file"),
        ),
    ]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=== Module 10: Fine-Tuning Pipeline ===\n")

    print("Step 1: Loading eval traces...")
    trials = []
    try:
        report_path = os.path.join(os.getcwd(), "eval-report-cycle-1.json")
        with open(report_path) as f:
            report = json.load(f)
        # In real pipeline, would reconstruct Trial objects from report
        print(f"  Found eval report, but using synthetic data for demo")
        trials = create_synthetic_trials()
    except FileNotFoundError:
        print("  No eval report found. Using synthetic data for demo...")
        trials = create_synthetic_trials()

    print("\nStep 2: Extracting and clustering traces...")
    traces = extract_traces(trials)
    save_traces(traces, os.path.join(OUTPUT_DIR, "traces.jsonl"))

    clusters = cluster_traces(traces)
    print(f"  Found {len(clusters)} clusters")

    sampled = stratified_sample(clusters)
    print(f"  Sampled {len(sampled)} representative traces")

    print("\nStep 3: Building SFT dataset...")
    sft_examples = build_sft_dataset(traces, CODING_AGENT_PROMPT)
    save_sft_dataset(sft_examples, os.path.join(OUTPUT_DIR, "sft-dataset.jsonl"))

    print("\nStep 4: Building DPO dataset...")
    dpo_pairs = build_dpo_dataset(traces)
    save_dpo_dataset(dpo_pairs, os.path.join(OUTPUT_DIR, "dpo-dataset.jsonl"))

    print("\nStep 5: Intent classification demo...")
    test_tasks = [
        "Fix the null pointer bug in auth.ts",
        "Create a new config file for the database",
        "What does the login function do?",
    ]
    for task in test_tasks:
        result = route_intent(task)
        print(f'  "{task[:50]}" -> {result["label"]} ({result["confidence"] * 100:.0f}%)')

    print(f"\nTraining data saved to {OUTPUT_DIR}/")
    print("  - traces.jsonl: Raw trace records")
    print("  - sft-dataset.jsonl: SFT training examples")
    print("  - dpo-dataset.jsonl: DPO preference pairs")
    print("\nTo fine-tune, upload these datasets to Fireworks AI or OpenAI.")


if __name__ == "__main__":
    main()
