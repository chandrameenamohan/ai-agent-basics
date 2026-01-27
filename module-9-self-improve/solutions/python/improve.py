"""Module 9: Self-improvement meta-agent."""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-7-evals", "solutions", "python"))

from dotenv import load_dotenv
import anthropic
from eval_types import EvalReport

load_dotenv()

client = anthropic.Anthropic()


def analyze_and_improve(report: EvalReport, agent_source_dir: str) -> list[dict]:
    prompt_path = os.path.join(agent_source_dir, "module-5-coding-agent", "solutions", "python", "prompt.py")
    with open(prompt_path) as f:
        prompt_source = f.read()

    failures = []
    for task_result in report.tasks:
        for trial in task_result.trials:
            if not trial.grade.passed:
                failures.append({
                    "task": trial.task_id,
                    "explanation": trial.grade.explanation,
                    "turns": len(trial.transcript.turns),
                    "tool_calls": [
                        tc["name"]
                        for turn in trial.transcript.turns
                        for tc in (turn.tool_calls or [])
                    ],
                })

    if not failures:
        print("No failures to analyze — agent is performing well!")
        return []

    print(f"Analyzing {len(failures)} failures across {len(report.tasks)} tasks...")

    failure_text = "\n\n".join(
        f"- Task: {f['task']}\n  Explanation: {f['explanation']}\n  Turns used: {f['turns']}\n  Tools used: {', '.join(f['tool_calls'])}"
        for f in failures
    )

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"""You are an agent improvement specialist. Analyze these eval failures and propose improvements to the agent's system prompt.

## Current System Prompt
```python
{prompt_source}
```

## Eval Scorecard
Overall pass rate: {report.overall_pass_rate * 100:.1f}%

## Failure Details
{failure_text}

## Instructions
1. Identify recurring failure patterns
2. For each pattern, propose a specific addition to the system prompt
3. Return ONLY valid JSON array:
[{{"description": "what this fixes", "addition": "text to add to the prompt rules"}}]

Be specific and actionable. Don't add vague advice.""",
        }],
    )

    text = response.content[0]
    if text.type != "text":
        return []

    try:
        suggestions = json.loads(text.text)
        improvements = []
        updated_prompt = prompt_source

        for suggestion in suggestions:
            import re
            match = re.search(r'## Rules\n([\s\S]*?)(?=\n\n## |"""\s*$)', updated_prompt)
            if match:
                rule_lines = match.group(1).strip().split("\n")
                next_num = len(rule_lines) + 1
                new_rule = f"{next_num}. {suggestion['addition']}"
                new_rules = match.group(1).rstrip() + "\n" + new_rule
                updated_prompt = updated_prompt.replace(match.group(1), new_rules)
                improvements.append({
                    "file": "module-5-coding-agent/solutions/python/prompt.py",
                    "description": suggestion["description"],
                    "old_content": match.group(1),
                    "new_content": new_rules,
                })

        return improvements
    except Exception:
        print("Failed to parse improvement suggestions")
        return []


def apply_improvements(improvements: list[dict], base_dir: str) -> None:
    for imp in improvements:
        file_path = os.path.join(base_dir, imp["file"])
        with open(file_path) as f:
            content = f.read()
        content = content.replace(imp["old_content"], imp["new_content"])
        with open(file_path, "w") as f:
            f.write(content)
        print(f"Applied: {imp['description']}")
