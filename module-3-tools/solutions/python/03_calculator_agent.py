"""Module 3: Calculator agent."""
import sys
import json
import math
from dotenv import load_dotenv
import anthropic
from tool_registry import ToolRegistry, Tool

load_dotenv()

client = anthropic.Anthropic()

add_tool = Tool(
    name="add",
    description="Add two numbers",
    input_schema={
        "type": "object",
        "properties": {
            "a": {"type": "number", "description": "First number"},
            "b": {"type": "number", "description": "Second number"},
        },
        "required": ["a", "b"],
    },
    execute=lambda inp: str(float(inp["a"]) + float(inp["b"])),
)

multiply_tool = Tool(
    name="multiply",
    description="Multiply two numbers",
    input_schema={
        "type": "object",
        "properties": {
            "a": {"type": "number", "description": "First number"},
            "b": {"type": "number", "description": "Second number"},
        },
        "required": ["a", "b"],
    },
    execute=lambda inp: str(float(inp["a"]) * float(inp["b"])),
)


def _factorial(inp):
    n = int(inp["n"])
    if n < 0 or n != float(inp["n"]):
        return "Error: n must be a non-negative integer"
    return str(math.factorial(n))


factorial_tool = Tool(
    name="factorial",
    description="Compute factorial of n",
    input_schema={
        "type": "object",
        "properties": {"n": {"type": "number", "description": "Non-negative integer"}},
        "required": ["n"],
    },
    execute=_factorial,
)


def calculator_agent(question: str) -> str:
    registry = ToolRegistry()
    registry.register(add_tool)
    registry.register(multiply_tool)
    registry.register(factorial_tool)

    messages = [{"role": "user", "content": question}]
    max_turns = 10

    for turn in range(max_turns):
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system="You are a calculator assistant. Use the provided tools to compute answers. Always use tools rather than mental math.",
            tools=registry.get_definitions(),
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            for block in response.content:
                if block.type == "text":
                    return block.text
            return "(no text)"

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                print(f"  → {block.name}({json.dumps(block.input)})")
                result = registry.execute(block.name, block.input)
                print(f"  ← {result}")
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })
        messages.append({"role": "user", "content": tool_results})

    return "(max turns reached)"


def main():
    question = sys.argv[1] if len(sys.argv) > 1 else "What is 7 factorial?"
    print(f"Q: {question}\n")
    answer = calculator_agent(question)
    print(f"\nA: {answer}")


if __name__ == "__main__":
    main()
