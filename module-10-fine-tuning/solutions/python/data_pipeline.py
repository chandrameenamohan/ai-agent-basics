"""Module 10: Data pipeline — turn eval traces into training datasets."""
import json


def extract_traces(trials: list) -> list[dict]:
    return [
        {
            "id": f"trace-{i}",
            "task": trial.transcript.task,
            "success": trial.grade.passed,
            "turns": len(trial.transcript.turns),
            "tool_calls": [
                tc["name"]
                for t in trial.transcript.turns
                for tc in (t.tool_calls or [])
            ],
            "transcript": trial.transcript,
        }
        for i, trial in enumerate(trials)
    ]


def cluster_traces(traces: list[dict]) -> dict[str, list[dict]]:
    clusters: dict[str, list[dict]] = {}
    for trace in traces:
        key = " ".join(trace["task"].split()[:3]).lower()
        clusters.setdefault(key, []).append(trace)
    return clusters


def stratified_sample(clusters: dict[str, list[dict]], samples_per_cluster: int = 5) -> list[dict]:
    samples = []
    for traces in clusters.values():
        successes = [t for t in traces if t["success"]]
        failures = [t for t in traces if not t["success"]]
        half = (samples_per_cluster + 1) // 2
        samples.extend(successes[:half])
        samples.extend(failures[:samples_per_cluster - min(half, len(successes))])
    return samples


def save_traces(traces: list[dict], output_path: str) -> None:
    with open(output_path, "w") as f:
        for trace in traces:
            record = {k: v for k, v in trace.items() if k != "transcript"}
            f.write(json.dumps(record, default=str) + "\n")
    print(f"Saved {len(traces)} traces to {output_path}")
