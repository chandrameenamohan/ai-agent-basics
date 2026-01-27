"""Module 6: Context-aware coding agent."""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-4-filesystem", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-5-coding-agent", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-3-tools", "solutions", "python"))

from dotenv import load_dotenv
import anthropic
from sandbox import Sandbox
from tools import create_file_tools
from edit_file import create_edit_file_tool
from prompt import CODING_AGENT_PROMPT
from tool_registry import ToolRegistry, Tool
from compaction import compact_history, estimate_tokens
from scratchpad import create_scratchpad_tools
from sub_agent import create_delegate_task_tool

load_dotenv()

client = anthropic.Anthropic()


def context_agent(task: str, workspace_path: str) -> str:
    sandbox = Sandbox(os.path.realpath(workspace_path))
    registry = ToolRegistry()

    for t in create_file_tools(sandbox):
        registry.register(Tool(**t))
    registry.register(Tool(**create_edit_file_tool(sandbox)))
    for t in create_scratchpad_tools(sandbox.root):
        registry.register(Tool(**t))

    system_prompt = (
        CODING_AGENT_PROMPT
        + f"\nWorkspace: {sandbox.root}\n\n"
        + "You also have a scratchpad for persistent notes and can delegate subtasks to sub-agents. "
        + "Use the scratchpad to track progress on complex tasks. Use delegation for self-contained subtasks."
    )

    delegate_dict = create_delegate_task_tool(registry, system_prompt)
    registry.register(Tool(**delegate_dict))

    messages = [{"role": "user", "content": task}]
    max_turns = 40
    token_limit = 80000

    for turn in range(max_turns):
        messages = compact_history(messages, token_limit)
        tokens = estimate_tokens(messages)
        print(f"\n[Turn {turn + 1}/{max_turns}] (~{tokens} tokens, {len(messages)} messages)")

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            tools=registry.get_definitions(),
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        for block in response.content:
            if block.type == "text":
                print(block.text)

        if response.stop_reason == "end_turn":
            for block in response.content:
                if block.type == "text":
                    return block.text
            return "(done)"

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                input_str = json.dumps(block.input)
                print(f"  → {block.name}({input_str[:120]}{'...' if len(input_str) > 120 else ''})")
                result = registry.execute(block.name, block.input)
                print(f"  ← {result[:200]}{'...' if len(result) > 200 else ''}")
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
        messages.append({"role": "user", "content": tool_results})

    return "(max turns reached)"


def main():
    if len(sys.argv) < 2:
        print('Usage: python context_agent.py "<task>" [workspace-path]')
        sys.exit(1)
    task = sys.argv[1]
    workspace = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    print(f"Task: {task}")
    print(f"Workspace: {workspace}")
    result = context_agent(task, workspace)
    print(f"\n=== Result ===\n{result}")


if __name__ == "__main__":
    main()
