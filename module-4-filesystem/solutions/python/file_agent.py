"""Module 4: File agent."""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-3-tools", "solutions", "python"))

from dotenv import load_dotenv
import anthropic
from sandbox import Sandbox
from tools import create_file_tools
from tool_registry import ToolRegistry, Tool

load_dotenv()

client = anthropic.Anthropic()


def file_agent(task: str, workspace_path: str) -> str:
    sandbox = Sandbox(os.path.realpath(workspace_path))
    registry = ToolRegistry()
    for t in create_file_tools(sandbox):
        registry.register(Tool(**t))

    messages = [{"role": "user", "content": task}]
    max_turns = 20

    for turn in range(max_turns):
        print(f"\n[Turn {turn + 1}/{max_turns}]")

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=f"You are a file system agent. You can read, write, list, search, and run shell commands in the workspace directory: {sandbox.root}\n\nAlways read files before modifying them. Verify changes after making them.",
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
                print(f"  → {block.name}({json.dumps(block.input)[:100]}...)")
                result = registry.execute(block.name, block.input)
                print(f"  ← {result[:200]}{'...' if len(result) > 200 else ''}")
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
        messages.append({"role": "user", "content": tool_results})

    return "(max turns reached)"


def main():
    task = sys.argv[1] if len(sys.argv) > 1 else "List the files in this workspace and summarize what you find."
    workspace = sys.argv[2] if len(sys.argv) > 2 else os.getcwd()
    print(f"Task: {task}")
    print(f"Workspace: {workspace}\n")
    result = file_agent(task, workspace)
    print(f"\n=== Result ===\n{result}")


if __name__ == "__main__":
    main()
