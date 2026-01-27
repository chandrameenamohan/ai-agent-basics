"""Module 6: Context compaction."""
import json
import anthropic

client = anthropic.Anthropic()


def estimate_tokens(messages: list) -> int:
    return len(json.dumps(messages, default=str)) // 4


def compact_history(messages: list, token_limit: int = 80000) -> list:
    estimated = estimate_tokens(messages)
    if estimated < token_limit:
        return messages

    first = messages[0]
    recent = messages[-6:]
    middle = messages[1:-6]

    if not middle:
        return messages

    print(f"[Compaction] {estimated} estimated tokens > {token_limit} limit")
    print(f"[Compaction] Summarizing {len(middle)} middle messages...")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Summarize the following agent conversation history concisely. Focus on: what was accomplished, key decisions made, files modified, and current state.\n\n{json.dumps(middle, default=str)}",
        }],
    )

    summary_text = response.content[0].text if response.content[0].type == "text" else "(summary failed)"
    print(f"[Compaction] Reduced to summary ({len(summary_text)} chars)")

    return [first, {"role": "assistant", "content": f"[Previous conversation summary]\n{summary_text}"}, *recent]
