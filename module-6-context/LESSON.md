# Module 6: Context Engineering

## Goal
Learn three strategies for when your agent hits the context window limit: compaction, scratchpad, and sub-agents.

## Concepts

### The context window problem
The context window is your agent's working memory. Claude Sonnet has a ~200K token window. Sounds huge, but do the math:

- Each turn: ~1K–4K tokens (prompt + tool call + result)
- 40 turns: 40K–160K tokens
- Plus system prompt and tools: another 2K–5K

On a 40-turn task, you're already pushing limits. When the context fills up, the model starts losing track of earlier work, costs explode, and responses degrade.

### Strategy 1: Compaction
Summarize old messages when approaching the token limit:
- Keep the **first** message (the original task)
- Keep the **last 6** messages (recent context)
- Summarize everything in between with a separate LLM call
- Replace hundreds of messages with one summary paragraph

Token estimation is rough (`JSON.stringify(messages).length / 4`) but good enough for a safety threshold.

### Strategy 2: Scratchpad (external memory)
Notes that persist through compaction. The agent writes key information to `.scratchpad/{key}.md` files. When old messages get summarized away, the scratchpad still has the details.

Use cases: plans, progress tracking, findings from earlier exploration.

### Strategy 3: Sub-agents (delegation)
Spawn a fresh agent loop for a self-contained subtask. The sub-agent gets the same tools but a **clean** message history. When it finishes, only its final summary goes back to the parent — not the full transcript.

This keeps the parent's context clean. Use for: "refactor this file", "write tests for this function", "fix the CSS."

### When to use which
- **Compaction**: Always. Run it before every turn as a safety check.
- **Scratchpad**: For plans and key decisions that must survive compaction.
- **Sub-agents**: For self-contained subtasks that would bloat the parent's context.

## Build It

### Step 1: Build compaction

Create `module-6-context/compaction.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "../module-2-agent-loop/types.js";

const client = new Anthropic();

// Rough token estimate: ~4 chars per token
function estimateTokens(messages: Message[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}

export async function compactHistory(
  messages: Message[],
  tokenLimit: number = 80000
): Promise<Message[]> {
  const estimated = estimateTokens(messages);
  if (estimated < tokenLimit) return messages;  // No compaction needed

  // TODO: Keep messages[0] (original task) and messages.slice(-6) (recent)
  // TODO: Extract messages.slice(1, -6) as the "middle"
  // TODO: If no middle messages, return as-is
  // TODO: Send the middle messages to Claude for summarization
  //   "Summarize this agent conversation: what was accomplished, key decisions, files modified, current state"
  // TODO: Return [first, {role: "assistant", content: summary}, ...recent]
}

export { estimateTokens };
```

### Step 2: Build scratchpad tools

Create `module-6-context/scratchpad.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import type { Tool } from "../module-2-agent-loop/types.js";

export function createScratchpadTools(workspaceRoot: string): Tool[] {
  const scratchDir = path.join(workspaceRoot, ".scratchpad");

  // TODO: Build 3 tools:
  // 1. scratchpad-write: Save a note with a key and content
  //    Creates .scratchpad/{key}.md
  // 2. scratchpad-read: Read a note by key
  // 3. scratchpad-list: List all note keys

  return [write, read, list];
}
```

### Step 3: Build the delegation tool

Create `module-6-context/sub-agent.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "../module-3-tools/tool-registry.js";
import type { Tool, Message } from "../module-2-agent-loop/types.js";

const client = new Anthropic();

export function createDelegateTaskTool(
  registry: ToolRegistry,
  systemPrompt: string
): Tool {
  return {
    name: "delegate-task",
    description: "Delegate a subtask to a fresh sub-agent. The sub-agent has the same tools but a clean context. Use this for self-contained subtasks to avoid context bloat.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: { type: "string", description: "Clear description of the subtask" },
      },
      required: ["task"],
    },
    execute: async (input) => {
      // TODO: Run a fresh agent loop (same tools, same system prompt)
      //   - maxTurns: 15
      //   - Return only the final text response (not the full transcript)
    },
  };
}
```

### Step 4: Assemble the context-aware agent

Create `module-6-context/context-agent.ts`:

Wire the Module 5 coding agent with all three context strategies:

```typescript
// TODO: Register file tools + edit tool + scratchpad tools + delegate tool
// TODO: In the agent loop, call compactHistory(messages, tokenLimit) before each turn
// TODO: maxTurns: 40 (context management lets the agent work longer)
// TODO: Print estimated token count each turn
```

Run it: `bun module-6-context/context-agent.ts "Refactor this project to use a src/ directory structure"`

## Exercises

1. **Force compaction**: Set `tokenLimit` to a very low value (e.g., 5000). Run a multi-step task. Watch the compaction trigger — you'll see the token count drop. Read the summary message. Is it accurate?

2. **Test scratchpad persistence**: Ask the agent to write a plan to the scratchpad, do 10+ turns of work, then read the plan back. Verify it survived even if compaction happened.

3. **Test delegation**: Ask the agent to "Refactor file A, then separately refactor file B." Watch the logs for `[Sub-agent]` — does it delegate? Compare the parent's message count with and without delegation.

4. **Measure context growth**: Print `estimateTokens(messages)` before and after each turn. Plot it (or just eyeball). How fast does it grow? When does compaction kick in?

5. **Compare with and without compaction**: Run the same long task twice — once with compaction enabled, once with `tokenLimit: Infinity` (disabled). Compare the quality of the agent's later turns. Does it lose track of earlier work without compaction?

## Checkpoint

You're ready for Module 7 when you can answer:
- Why keep the first and last 6 messages during compaction?
- Why is a scratchpad better than just relying on context?
- When should you delegate vs. do the work in the main loop?
- Why is `estimateTokens` rough but sufficient?

## Solutions
Compare your code against `solutions/` if you're stuck.
