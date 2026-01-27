"""Module 2.1: Minimal agent loop (~50 lines)."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
import anthropic
from agent_types import Tool

load_dotenv()

client = anthropic.Anthropic()

echo_tool = Tool(
    name="echo",
    description="Echoes back the input message",
    input_schema={
        "type": "object",
        "properties": {"message": {"type": "string", "description": "Message to echo"}},
        "required": ["message"],
    },
    execute=lambda inp: f"Echo: {inp['message']}",
)


def agent_loop(user_message: str, tools: list[Tool]) -> str:
    messages = [{"role": "user", "content": user_message}]
    tool_defs = [
        {"name": t.name, "description": t.description, "input_schema": t.input_schema}
        for t in tools
    ]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            tools=tool_defs,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            for block in response.content:
                if block.type == "text":
                    return block.text
            return "(no text response)"

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                tool = next((t for t in tools if t.name == block.name), None)
                result = tool.execute(block.input) if tool else f"Error: unknown tool {block.name}"
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        messages.append({"role": "user", "content": tool_results})


def main():
    result = agent_loop('Use the echo tool to say "Hello from the agent loop!"', [echo_tool])
    print("Agent:", result)


if __name__ == "__main__":
    main()
