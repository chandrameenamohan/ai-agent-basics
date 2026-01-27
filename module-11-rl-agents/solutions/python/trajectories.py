"""Module 11: Trajectory collection."""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-5-coding-agent", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-7-evals", "solutions", "python"))

import anthropic
from environment import AgentEnvironment
from rewards import compute_reward, RewardConfig
from prompt import CODING_AGENT_PROMPT
from eval_types import Transcript, TranscriptTurn

client = anthropic.Anthropic()


def collect_trajectory(env: AgentEnvironment, setup: dict, grader, reward_config: RewardConfig = None) -> dict:
    state = env.reset(setup)
    steps = []
    transcript_turns = [TranscriptTurn(role="user", content=setup["prompt"])]
    messages = [{"role": "user", "content": setup["prompt"]}]

    start_time = time.time()
    total_tokens = 0

    for turn in range(state["max_steps"]):
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=CODING_AGENT_PROMPT + f"\nWorkspace: {state['workspace_dir']}",
            tools=state["registry"].get_definitions(),
            messages=messages,
        )

        total_tokens += response.usage.input_tokens + response.usage.output_tokens
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            text = ""
            for block in response.content:
                if block.type == "text":
                    text = block.text
                    break
            transcript_turns.append(TranscriptTurn(role="assistant", content=text))
            break

        tool_calls = []
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                inp = block.input if isinstance(block.input, dict) else {}
                step_result = env.step(block.name, inp)
                was_valid = not step_result["result"].startswith("Error:")
                steps.append({"tool_name": block.name, "input": inp, "result": step_result["result"], "was_valid": was_valid})
                tool_calls.append({"name": block.name, "input": inp, "result": step_result["result"]})
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": step_result["result"]})

        transcript_turns.append(TranscriptTurn(role="assistant", content="", tool_calls=tool_calls))
        messages.append({"role": "user", "content": tool_results})

    transcript = Transcript(
        task=setup["prompt"], turns=transcript_turns,
        total_tokens=total_tokens, duration_ms=int((time.time() - start_time) * 1000),
    )

    grade = grader.grade(state["workspace_dir"], transcript)
    reward = compute_reward(grade, steps, reward_config)

    env.cleanup()

    return {
        "episode_id": f"ep-{int(time.time() * 1000)}",
        "prompt": setup["prompt"],
        "steps": steps,
        "transcript": transcript,
        "reward": reward,
        "success": grade.passed,
    }
