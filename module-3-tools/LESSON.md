# Module 3: Tool System

## Goal
Build a tool registry that lets you add/remove tools cleanly and prevents tool errors from crashing your agent.

## Concepts

### Why tools always return strings
If a tool throws an exception, your agent loop crashes. The entire program stops. Instead, catch errors and return them as strings: `"Error: file not found"`. The LLM can **read** this error and try a different approach. A crash teaches the LLM nothing.

This is the #1 rule of tool design: **tools always return strings, errors too, never throw into the loop.**

### The registry pattern
Instead of passing a plain array of tools, use a registry — a `Map<string, Tool>` with three responsibilities:
1. **Lookup by name** — When the LLM calls `"add"`, find the matching tool instantly
2. **Error wrapping** — Centralized try/catch means no tool can crash the loop
3. **API separation** — `getDefinitions()` gives the API the schemas; `execute()` runs the code

### JSON Schema
JSON Schema defines what parameters a tool accepts. Claude reads this to decide how to call the tool. Example:

```json
{
  "type": "object",
  "properties": {
    "n": { "type": "number", "description": "Non-negative integer" }
  },
  "required": ["n"]
}
```

Write good descriptions. Claude uses them to decide *which* tool to call and *how*. Vague descriptions = wrong tool calls.

### Design rules for tools
- **Names**: lowercase-kebab-case (`read-file`, not `ReadFile`)
- **Descriptions**: One sentence explaining what it does and when to use it
- **Input schema**: Be specific. Use `required` for mandatory params. Add `description` to each property.
- **Return value**: Always a string. For structured data, return JSON strings.
- **Errors**: Return `"Error: ..."` strings, never throw.

## Build It

### Step 1: Build the ToolRegistry

Create `module-3-tools/tool-registry.ts`:

```typescript
import type Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "../module-2-agent-loop/types.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  // TODO: register(tool) — add to the map by name

  // TODO: getDefinitions() — return Anthropic.Tool[] format
  //   (name, description, input_schema only — strip out execute)

  // TODO: execute(name, input) — find the tool, run it, catch errors
  //   - If tool not found: return "Error: unknown tool "name""
  //   - If tool throws: return "Error: <message>"
  //   - Otherwise: return the result string

  // TODO: has(name) — check if a tool exists
  // TODO: list() — return all tool names
}
```

The key method is `execute`. It **must** have a try/catch that converts any thrown error into a string. This is the firewall between tools and the agent loop.

### Step 2: Build the calculator agent

Create `module-3-tools/03-calculator-agent.ts`:

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "./tool-registry.js";
import type { Tool, Message } from "../module-2-agent-loop/types.js";

const client = new Anthropic();

// TODO: Define three tools:
// addTool — takes a, b (numbers), returns a + b as string
// multiplyTool — takes a, b (numbers), returns a * b as string
// factorialTool — takes n (number), computes n!, returns as string
//   (validate: n must be a non-negative integer)

async function calculatorAgent(question: string): Promise<string> {
  const registry = new ToolRegistry();
  // TODO: Register all three tools

  const messages: Message[] = [{ role: "user", content: question }];
  const maxTurns = 10;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are a calculator assistant. Use the provided tools to compute answers. Always use tools rather than mental math.",
      tools: registry.getDefinitions(),  // <-- Registry provides API-formatted tools
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    // TODO: Execute tool calls using registry.execute() instead of manual lookup
    // TODO: Log each tool call and result
    // TODO: Push tool results to messages
  }

  return "(max turns reached)";
}

async function main() {
  const question = process.argv[2] || "What is 7 factorial?";
  console.log(`Q: ${question}\n`);
  const answer = await calculatorAgent(question);
  console.log(`\nA: ${answer}`);
}

main().catch(console.error);
```

Run it: `bun module-3-tools/03-calculator-agent.ts`

Try: `bun module-3-tools/03-calculator-agent.ts "What is 7 factorial plus 3 times 12?"`

## Exercises

1. **Add a subtract tool**: Define `subtractTool` with `a - b`. Register it. Ask the agent "What is 100 minus 37?" Does it use the right tool?

2. **Make a tool throw**: Create a tool whose `execute` function always throws `new Error("boom!")`. Register it. Ask the agent to use it. With the registry's try/catch, the agent should see the error string and recover. Now remove the try/catch from `execute()` — what happens?

3. **Bad descriptions**: Change the `add` tool's description to "Does something with numbers." Ask the agent to add two numbers. Does it still call the right tool? How about with description "Subtracts two numbers" (intentionally wrong)?

4. **Multi-step calculation**: Ask "What is (5 factorial) times (3 + 4)?" The agent needs to chain multiple tool calls. Watch the turn-by-turn logs.

5. **Missing required field**: Change the factorial tool's schema to require a field called `number` but keep the execute function reading `input.n`. What happens when the LLM calls it?

## Checkpoint

You're ready for Module 4 when you can answer:
- Why must tools return strings instead of throwing errors?
- What does `getDefinitions()` strip out, and why?
- What happens if you register a tool with a vague description?
- How does the registry's `execute` method protect the agent loop?

## Solutions
Compare your code against `solutions/` if you're stuck.
