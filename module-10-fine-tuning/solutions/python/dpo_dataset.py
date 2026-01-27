"""Module 10: DPO dataset builder."""
import json


def _format_trace(trace: dict) -> str:
    parts = []
    for turn in trace["transcript"].turns:
        if turn.role == "assistant":
            content = turn.content
            if turn.tool_calls:
                content += "\n" + "\n".join(
                    f"[{tc['name']}] {tc['result'][:100]}" for tc in turn.tool_calls
                )
            parts.append(content)
    return "\n---\n".join(parts)


def build_dpo_dataset(traces: list[dict]) -> list[dict]:
    by_task: dict[str, list[dict]] = {}
    for trace in traces:
        by_task.setdefault(trace["task"], []).append(trace)

    pairs = []
    for task, task_traces in by_task.items():
        successes = [t for t in task_traces if t["success"]]
        failures = [t for t in task_traces if not t["success"]]
        for s in successes:
            for f in failures:
                pairs.append({
                    "prompt": task,
                    "chosen": _format_trace(s),
                    "rejected": _format_trace(f),
                })

    print(f"Built {len(pairs)} DPO pairs from {len(traces)} traces")
    return pairs


def save_dpo_dataset(pairs: list[dict], output_path: str) -> None:
    with open(output_path, "w") as f:
        for p in pairs:
            f.write(json.dumps(p) + "\n")
    print(f"Saved {len(pairs)} DPO pairs to {output_path}")
