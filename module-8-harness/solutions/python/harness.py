"""Module 8: Agent harness."""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-4-filesystem", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-5-coding-agent", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-3-tools", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-6-context", "solutions", "python"))

import anthropic
from sandbox import Sandbox
from tools import create_file_tools
from edit_file import create_edit_file_tool
from prompt import CODING_AGENT_PROMPT
from tool_registry import ToolRegistry, Tool
from scratchpad import create_scratchpad_tools
from sub_agent import create_delegate_task_tool
from compaction import compact_history
from progress import create_progress_tools
from session import save_session, load_session, create_session

client = anthropic.Anthropic()


def _load_claude_md(workspace_dir: str) -> str:
    try:
        with open(os.path.join(workspace_dir, "CLAUDE.md")) as f:
            return f.read()
    except FileNotFoundError:
        return ""


def run_harness(task: str, workspace_path: str, session_id: str = None) -> str:
    workspace = os.path.realpath(workspace_path)
    sandbox = Sandbox(workspace)

    if session_id:
        session = load_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        print(f"Resumed session {session['id']} (turn {session['turn']})")
    else:
        session = create_session(task, workspace)
        print(f"New session {session['id']}")

    registry = ToolRegistry()
    for t in create_file_tools(sandbox):
        registry.register(Tool(**t))
    registry.register(Tool(**create_edit_file_tool(sandbox)))
    for t in create_scratchpad_tools(workspace):
        registry.register(Tool(**t))
    progress_tools, _ = create_progress_tools()
    for t in progress_tools:
        registry.register(Tool(**t))

    claude_md = _load_claude_md(workspace)
    system_prompt = CODING_AGENT_PROMPT + f"\nWorkspace: {workspace}"
    if claude_md:
        system_prompt += f"\n\n## Project Context (CLAUDE.md)\n{claude_md}"
    system_prompt += "\nYou have progress tracking tools. Use them for multi-step tasks."
    system_prompt += "\nYou can delegate subtasks to sub-agents to keep context clean."

    registry.register(Tool(**create_delegate_task_tool(registry, system_prompt)))

    max_turns = 40
    messages = session["messages"]

    for turn in range(session["turn"], max_turns):
        session["turn"] = turn
        messages = compact_history(messages, 80000)

        print(f"\n[Turn {turn + 1}/{max_turns}]")

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

        session["messages"] = messages
        save_session(session)

        if response.stop_reason == "end_turn":
            for block in response.content:
                if block.type == "text":
                    return block.text
            return "(done)"

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  → {block.name}")
                result = registry.execute(block.name, block.input)
                print(f"  ← {result[:200]}{'...' if len(result) > 200 else ''}")
                tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
        messages.append({"role": "user", "content": tool_results})
        session["messages"] = messages
        save_session(session)

    return "(max turns reached)"
