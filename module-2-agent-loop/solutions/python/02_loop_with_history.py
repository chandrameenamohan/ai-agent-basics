"""Module 2.2: Agent loop with turn counting, maxTurns safety, and logging."""
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
import anthropic
from agent_types import Tool, AgentConfig

load_dotenv()

client = anthropic.Anthropic()

time_tool = Tool(
    name="get_time",
    description="Returns the current date and time",
    input_schema={"type": "object", "properties": {}, "required": []},
    execute=lambda _: datetime.now().isoformat(),
)

math_tool = Tool(
    name="calculate",
    description="Evaluates a math expression",
    input_schema={
        "type": "object",
        "properties": {"expression": {"type": "string", "description": "Math expression to evaluate"}},
        "required": ["expression"],
    },
    execute=lambda inp: _safe_eval(inp["expression"]),
)


def _safe_eval(expr: str) -> str:
    import re
    cleaned = re.sub(r"[^0-9+\-*/().%\s]", "", str(expr))
    try:
        return str(eval(cleaned))
    except Exception as e:
        return f"Error: {e}"


def agent_loop(user_message: str, config: AgentConfig) -> str:
    messages = [{"role": "user", "content": user_message}]
    tool_defs = [
        {"name": t.name, "description": t.description, "input_schema": t.input_schema}
        for t in config.tools
    ]

    for turn in range(config.max_turns):
        print(f"\n--- Turn {turn + 1}/{config.max_turns} ---")

        response = client.messages.create(
            model=config.model,
            max_tokens=config.max_tokens,
            system=config.system_prompt or "",
            tools=tool_defs,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})
        print(f"Stop reason: {response.stop_reason}")
        print(f"Tokens: {response.usage.input_tokens}in + {response.usage.output_tokens}out")

        for block in response.content:
            if block.type == "text":
                print(f"Text: {block.text}")

        if response.stop_reason == "end_turn":
            for block in response.content:
                if block.type == "text":
                    return block.text
            return "(no text)"

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"Tool call: {block.name}({json.dumps(block.input)})")
                tool = next((t for t in config.tools if t.name == block.name), None)
                result = tool.execute(block.input) if tool else f"Error: unknown tool {block.name}"
                print(f"Tool result: {result}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        messages.append({"role": "user", "content": tool_results})

    return f"(max turns {config.max_turns} reached)"


def main():
    config = AgentConfig(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        max_turns=10,
        system_prompt="You are a helpful assistant. Use tools when needed.",
        tools=[time_tool, math_tool],
    )

    result = agent_loop("What time is it? Also, what is 42 * 17 + 3?", config)
    print("\n=== Final answer ===")
    print(result)


if __name__ == "__main__":
    main()
