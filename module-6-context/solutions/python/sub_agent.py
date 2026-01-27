"""Module 6: Sub-agent delegation."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-3-tools", "solutions", "python"))

import anthropic
from tool_registry import ToolRegistry

client = anthropic.Anthropic()


def create_delegate_task_tool(registry: ToolRegistry, system_prompt: str) -> dict:
    def execute(inp):
        task = str(inp["task"])
        print(f"  [Sub-agent] Starting: {task[:80]}...")

        messages = [{"role": "user", "content": task}]
        max_turns = 15

        for turn in range(max_turns):
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=system_prompt,
                tools=registry.get_definitions(),
                messages=messages,
            )

            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                for block in response.content:
                    if block.type == "text":
                        print(f"  [Sub-agent] Done in {turn + 1} turns")
                        return block.text
                return "(sub-agent completed)"

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = registry.execute(block.name, block.input)
                    tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
            messages.append({"role": "user", "content": tool_results})

        return "(sub-agent max turns reached)"

    return {
        "name": "delegate-task",
        "description": "Delegate a subtask to a fresh sub-agent. The sub-agent has the same tools but a clean context. Use this for self-contained subtasks to avoid context bloat.",
        "input_schema": {"type": "object", "properties": {"task": {"type": "string", "description": "Clear description of the subtask"}}, "required": ["task"]},
        "execute": execute,
    }
