"""Module 10: SFT dataset builder."""
import json


def build_sft_dataset(traces: list[dict], system_prompt: str) -> list[dict]:
    successes = [t for t in traces if t["success"]]
    print(f"Building SFT dataset from {len(successes)}/{len(traces)} successful traces")

    examples = []
    for trace in successes:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": trace["task"]},
        ]

        for turn in trace["transcript"].turns:
            if turn.role == "assistant":
                content = turn.content
                if turn.tool_calls:
                    content += "\n\n[Tool calls]\n" + "\n".join(
                        f"{tc['name']}({json.dumps(tc['input'])[:200]}) -> {tc['result'][:200]}"
                        for tc in turn.tool_calls
                    )
                messages.append({"role": "assistant", "content": content})

        examples.append({"messages": messages})
    return examples


def save_sft_dataset(examples: list[dict], output_path: str) -> None:
    with open(output_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
    print(f"Saved {len(examples)} SFT examples to {output_path}")
