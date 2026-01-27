"""Module 7: Eval harness."""
import os
import sys
import tempfile
import shutil
import time

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-4-filesystem", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-5-coding-agent", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-3-tools", "solutions", "python"))

import anthropic
from eval_types import EvalTask, Trial, Transcript, TranscriptTurn
from sandbox import Sandbox
from tools import create_file_tools
from edit_file import create_edit_file_tool
from prompt import CODING_AGENT_PROMPT
from tool_registry import ToolRegistry, Tool

client = anthropic.Anthropic()


def run_agent(prompt: str, workspace_dir: str) -> Transcript:
    sandbox = Sandbox(workspace_dir)
    registry = ToolRegistry()
    for t in create_file_tools(sandbox):
        registry.register(Tool(**t))
    registry.register(Tool(**create_edit_file_tool(sandbox)))

    messages = [{"role": "user", "content": prompt}]
    turns = [TranscriptTurn(role="user", content=prompt)]
    max_turns = 20
    start_time = time.time()
    total_tokens = 0

    for turn in range(max_turns):
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=CODING_AGENT_PROMPT + f"\nWorkspace: {sandbox.root}",
            tools=registry.get_definitions(),
            messages=messages,
        )

        total_tokens += response.usage.input_tokens + response.usage.output_tokens
        messages.append({"role": "assistant", "content": response.content})

        text_parts = [b.text for b in response.content if b.type == "text"]
        text = "\n".join(text_parts)

        if response.stop_reason == "end_turn":
            turns.append(TranscriptTurn(role="assistant", content=text))
            break

        tool_calls = []
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = registry.execute(block.name, block.input)
                tool_calls.append({"name": block.name, "input": block.input, "result": result})
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})

        turns.append(TranscriptTurn(role="assistant", content=text, tool_calls=tool_calls))
        messages.append({"role": "user", "content": tool_results})

    return Transcript(
        task=prompt, turns=turns, total_tokens=total_tokens,
        duration_ms=int((time.time() - start_time) * 1000),
    )


def run_single_trial(task: EvalTask, trial_index: int) -> Trial:
    workspace_dir = tempfile.mkdtemp(prefix=f"eval-{task.id}-")
    print(f"  Trial {trial_index + 1}: workspace={workspace_dir}")

    task.setup(workspace_dir)
    transcript = run_agent(task.prompt, workspace_dir)
    grade = task.grader.grade(workspace_dir, transcript)
    print(f"  Trial {trial_index + 1}: {'PASS' if grade.passed else 'FAIL'} ({grade.score:.2f}) — {grade.explanation[:100]}")

    shutil.rmtree(workspace_dir, ignore_errors=True)
    return Trial(task_id=task.id, trial_index=trial_index, transcript=transcript, grade=grade)


def run_evals(tasks: list[EvalTask], trials_per_task: int = 3) -> list[Trial]:
    all_trials = []
    for task in tasks:
        print(f"\nTask: {task.id} — {task.description}")
        for i in range(trials_per_task):
            trial = run_single_trial(task, i)
            all_trials.append(trial)
    return all_trials
