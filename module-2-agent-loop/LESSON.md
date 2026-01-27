# Module 2: The Agent Loop

## Goal
Build the single most important pattern in agent engineering: the while loop that turns an LLM into an agent.

## Concepts

### What is an agent?
An agent is a program that uses an LLM to decide what to do next. The core mechanic is simple:

```
User gives a task
  │
  ▼
┌─────────────────────────────┐
│  Send messages to LLM       │◄──┐
│  │                          │   │
│  ▼                          │   │
│  LLM responds with:        │   │
│    (a) Text → DONE          │   │
│    (b) Tool calls → execute │───┘
│        them, add results,
│        loop again
└─────────────────────────────┘
```

That's it. Not a framework, not a library — a while loop.

### stop_reason
The critical field in the API response. It tells you what happened:
- `"end_turn"` — The LLM is done. It wants to respond with text. **Exit the loop.**
- `"tool_use"` — The LLM wants to call one or more tools. **Execute them and loop again.**

### Tool definitions vs. tool execution
You send `tools: [...]` in the API call — just the **schemas** (name, description, input format). The LLM never executes code. It outputs a `tool_use` content block saying "call this tool with these arguments." You run it locally and send back a `tool_result`.

### Message alternation
The API requires alternating `user` and `assistant` roles. Tool results are sent as `role: "user"` messages containing `tool_result` blocks. So the pattern is:
```
[0] user: "What time is it?"
[1] assistant: [tool_use: get_time()]
[2] user: [tool_result: "2025-01-15T..."]
[3] assistant: "The current time is..."
```

### The Tool interface
Every tool in this course follows this shape:

```typescript
interface Tool {
  name: string;              // "read-file", "search-grep", etc.
  description: string;       // What the tool does (the LLM reads this!)
  input_schema: object;      // JSON Schema for the parameters
  execute: (input) => string // Your implementation
}
```

`description` and `input_schema` are what Claude reads to decide which tool to call and how. Write them carefully.

### AgentConfig
Configuration for the agent loop:

```typescript
interface AgentConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;    // Safety limit — don't loop forever
  systemPrompt?: string;
  tools: Tool[];
}
```

`maxTurns` prevents infinite loops when the LLM can't solve a task and keeps calling tools forever.

## Build It

### Step 1: Define the types

Create `module-2-agent-loop/types.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

// TODO: Define the Tool interface
//   - name: string
//   - description: string
//   - input_schema: Record<string, unknown>
//   - execute: (input: Record<string, unknown>) => Promise<string>

// TODO: Define the AgentConfig interface
//   - model: string
//   - maxTokens: number
//   - maxTurns: number
//   - systemPrompt?: string
//   - tools: Tool[]

// Export type aliases for convenience:
export type Message = Anthropic.MessageParam;
export type ContentBlock = Anthropic.ContentBlock;
export type ToolUseBlock = Anthropic.ToolUseBlock;
export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;
```

**Python:**
```python
from dataclasses import dataclass, field
from typing import Any, Callable

@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    execute: Callable[[dict[str, Any]], str]

@dataclass
class AgentConfig:
    model: str
    max_tokens: int
    max_turns: int
    system_prompt: str = ""
    tools: list[Tool] = field(default_factory=list)
```

### Step 2: Build the minimal agent loop

Create `module-2-agent-loop/01-loop-minimal.ts`:

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool, Message } from "./types.js";

const client = new Anthropic();

// A trivial tool for testing
const echoTool: Tool = {
  name: "echo",
  description: "Echoes back the input message",
  input_schema: {
    type: "object" as const,
    properties: { message: { type: "string", description: "Message to echo" } },
    required: ["message"],
  },
  execute: async (input) => `Echo: ${input.message}`,
};

async function agentLoop(userMessage: string, tools: Tool[]) {
  const messages: Message[] = [{ role: "user", content: userMessage }];

  // Convert tools to API format (strip out the execute function)
  const toolDefs = tools.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema: input_schema as Anthropic.Tool["input_schema"],
  }));

  while (true) {
    // TODO: Step 1 — Call client.messages.create() with model, max_tokens, tools, messages

    // TODO: Step 2 — Push the assistant response to messages history

    // TODO: Step 3 — Check stop_reason. If "end_turn", extract text and return it.

    // TODO: Step 4 — If not done, iterate over response.content blocks.
    //   For each block with type === "tool_use":
    //     - Find the matching tool by name
    //     - Call tool.execute(block.input)
    //     - Collect { type: "tool_result", tool_use_id: block.id, content: result }

    // TODO: Step 5 — Push tool results as a user message and loop
  }
}

async function main() {
  const result = await agentLoop(
    'Use the echo tool to say "Hello from the agent loop!"',
    [echoTool]
  );
  console.log("Agent:", result);
}

main().catch(console.error);
```

**Python:**
```python
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
    tool_defs = [{"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools]

    while True:
        # TODO: Step 1 — Call client.messages.create()
        # TODO: Step 2 — Append assistant response to messages
        # TODO: Step 3 — Check stop_reason == "end_turn", return text
        # TODO: Step 4 — For tool_use blocks, find tool, call execute()
        # TODO: Step 5 — Append tool_results and loop
        pass
```

Run it: `bun module-2-agent-loop/01-loop-minimal.ts`

The agent should call the echo tool and report the result.

### Step 3: Add safety and logging

Create `module-2-agent-loop/02-loop-with-history.ts`:

Enhance the loop with:
- **Turn counting** (`let turn = 0; turn++` each iteration)
- **maxTurns safety** (`while (turn < config.maxTurns)`)
- **Logging**: Print the turn number, stop_reason, token usage, text blocks, and tool calls each turn
- **AgentConfig**: Accept a config object instead of loose parameters
- **Two new tools**: `get_time` (returns current ISO timestamp) and `calculate` (evaluates a math expression)

```typescript
// TODO: Define timeTool — returns new Date().toISOString()
// TODO: Define mathTool — evaluates a math expression safely
//   (Strip non-math characters, use Function() to evaluate)

async function agentLoop(userMessage: string, config: AgentConfig): Promise<string> {
  // TODO: Same loop as Step 2, but with:
  //   - for (let turn = 0; turn < config.maxTurns; turn++)
  //   - console.log for each turn showing what happened
  //   - Return "(max turns reached)" if the loop exhausts maxTurns
}
```

**Python:**
```python
# TODO: Define time_tool — returns datetime.now().isoformat()
# TODO: Define math_tool — evaluates a math expression safely
#   (use re.sub to strip non-math chars, eval() to compute)

def agent_loop(user_message: str, config: AgentConfig) -> str:
    # TODO: Same loop as Step 2, but with:
    #   - for turn in range(config.max_turns):
    #   - print() for each turn showing what happened
    #   - Return "(max turns reached)" if loop exhausts max_turns
    pass
```

Run it: `bun module-2-agent-loop/02-loop-with-history.ts`

Watch the output: each turn shows what tool was called, what it returned, and how the LLM decided to continue or stop.

## Exercises

1. **Remove the maxTurns check**: Change `while (turn < config.maxTurns)` to `while (true)`. Ask the agent something it can't solve with the available tools. What happens? (Restore the check after!)

2. **Forget the history**: Comment out `messages.push({ role: "assistant", content: response.content })`. Run the agent. What goes wrong? Why?

3. **Wrong stop_reason handling**: Change the check from `"end_turn"` to `"stop"`. What happens? The agent may loop forever or exit prematurely.

4. **Add a new tool**: Create a `reverse` tool that reverses a string. Register it and ask the agent to reverse "hello". Does the LLM discover and use it correctly?

5. **Observe the message flow**: After the loop, print `JSON.stringify(messages, null, 2)`. Read the alternating user/assistant pattern. Notice how tool results are `role: "user"` with `type: "tool_result"` blocks.

## Checkpoint

You're ready for Module 3 when you can answer:
- What is `stop_reason` and what are its two important values?
- Why do tool results use `role: "user"`?
- What happens if you don't add the assistant response to the messages array?
- Why is `maxTurns` important?

## Solutions
Compare your code against `solutions/` if you're stuck.
