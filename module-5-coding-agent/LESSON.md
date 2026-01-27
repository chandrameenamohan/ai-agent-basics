# Module 5: Coding Agent

## Goal
Build a coding agent that can make surgical edits to files — and understand why the system prompt matters more than you think.

## Concepts

### Why search-and-replace, not line numbers
Line-number-based editing fails because LLMs hallucinate line numbers. They'll say "edit line 15" when the code is on line 23. Search-and-replace forces the LLM to **copy exact text** from the file, which only works if it read the file first. The tool design enforces good behavior.

### The edit-file tool design
Three key properties:
1. **Empty `old_string` = create new file** — One tool handles both creation and editing
2. **Exactly one match required** — Zero matches means the LLM got the content wrong (probably didn't read the file). Multiple matches means the string isn't unique enough.
3. **Errors are strings** — `"old_string not found"` teaches the LLM to read the file first next time

### System prompts as behavioral guardrails
The system prompt is your most powerful lever. Every rule is a response to a real failure mode:
- "Read before editing" → agents skip reading and hallucinate file contents
- "Make minimal changes" → agents rewrite entire files for a one-line fix
- "Understand the root cause" → agents apply surface-level patches without understanding the bug
- "Verify after changing" → agents make edits and move on without checking their work

### The read-edit-verify pattern
A well-behaved coding agent follows this cycle:
1. **Read** the file to understand current state
2. **Edit** with a minimal, targeted change
3. **Read again** to verify the edit took effect

## Build It

### Step 1: Build the edit-file tool

Create `module-5-coding-agent/edit-file.ts`:

```typescript
import * as fs from "fs/promises";
import { Sandbox } from "../module-4-filesystem/sandbox.js";
import type { Tool } from "../module-2-agent-loop/types.js";

export function createEditFileTool(sandbox: Sandbox): Tool {
  return {
    name: "edit-file",
    description: "Edit a file by replacing old_string with new_string. The old_string must match exactly (including whitespace). To create a new file, use old_string='' and new_string with the full content.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to workspace" },
        old_string: { type: "string", description: "Exact string to find and replace (empty = create new file)" },
        new_string: { type: "string", description: "Replacement string" },
      },
      required: ["path", "old_string", "new_string"],
    },
    execute: async (input) => {
      const filePath = sandbox.resolve(String(input.path));
      const oldStr = String(input.old_string);
      const newStr = String(input.new_string);

      // TODO: If oldStr is empty, create a new file with newStr as content
      //   (create parent directories with fs.mkdir recursive)

      // TODO: Otherwise, read the existing file
      //   - Count occurrences of oldStr
      //   - If 0: return error "old_string not found"
      //   - If > 1: return error with count, asking for a more unique string
      //   - If exactly 1: replace and write the file back
    },
  };
}
```

### Step 2: Write the system prompt

Create `module-5-coding-agent/prompt.ts`:

```typescript
export const CODING_AGENT_PROMPT = `You are a coding agent. You can read, write, edit, and search files, and run shell commands.

## Rules
1. ALWAYS read a file before editing it.
2. After making changes, verify them by reading the file again.
3. Think step-by-step: understand the task, explore the codebase, plan changes, implement, verify.
4. Make minimal, targeted changes. Don't rewrite entire files when a small edit suffices.
5. When fixing bugs, understand the root cause before changing code.
6. Use search-grep to find relevant code before making changes.
7. If a task requires multiple steps, work through them one at a time.
8. When creating new files, include appropriate imports and follow existing code style.

## Edit Strategy
- Use edit-file with old_string/new_string for surgical edits.
- The old_string must match exactly ONE location in the file.
- If old_string matches multiple times, use more surrounding context to make it unique.
- To create a new file, use old_string="" and put the full content in new_string.
`;
```

Read each rule. Every one prevents a specific failure mode.

### Step 3: Wire up the coding agent CLI

Create `module-5-coding-agent/main.ts`:

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as path from "path";
import { Sandbox } from "../module-4-filesystem/sandbox.js";
import { createFileTools } from "../module-4-filesystem/tools.js";
import { createEditFileTool } from "./edit-file.js";
import { ToolRegistry } from "../module-3-tools/tool-registry.js";
import { CODING_AGENT_PROMPT } from "./prompt.js";
import type { Message } from "../module-2-agent-loop/types.js";

const client = new Anthropic();

async function codingAgent(task: string, workspacePath: string): Promise<string> {
  const sandbox = new Sandbox(path.resolve(workspacePath));
  const registry = new ToolRegistry();

  // TODO: Register file tools AND the edit-file tool
  // The agent now has 6 tools: read-file, write-file, list-dir, search-grep, run-shell, edit-file

  // TODO: Standard agent loop with:
  //   - maxTurns: 30 (coding tasks take more steps)
  //   - system: CODING_AGENT_PROMPT + workspace path
  //   - Log tool calls with truncated input/output
}

async function main() {
  const task = process.argv[2];
  if (!task) {
    console.error('Usage: bun module-5-coding-agent/main.ts "<task>" [workspace-path]');
    process.exit(1);
  }
  const workspace = process.argv[3] || process.cwd();
  // TODO: Run the agent and print the result
}

main().catch(console.error);
```

Run it: `bun module-5-coding-agent/main.ts "List the files and describe what this project does"`

## Exercises

1. **Test the read-edit-verify pattern**: Create a small file with a typo. Ask the agent to fix it. Read the transcript — did it read the file first? Did it verify after editing?

2. **Force a failed edit**: Ask the agent to edit a file, but first manually change the file so the `old_string` won't match. Watch how the agent handles the "old_string not found" error. Does it re-read the file and retry?

3. **Test uniqueness enforcement**: Create a file with duplicate lines. Ask the agent to edit one of the duplicated lines. It should get the "found N times" error and use more context.

4. **Create a buggy project and fix it**: Write a small TypeScript file with a deliberate bug (e.g., off-by-one error). Ask your agent to find and fix it. Read the full transcript — did it follow the system prompt rules?

5. **Modify the system prompt**: Remove rule #1 ("ALWAYS read a file before editing it"). Run the same task. Does the agent still read first, or does it try to edit blindly? This shows how much the system prompt controls behavior.

## Checkpoint

You're ready for Module 6 when you can answer:
- Why is search-and-replace better than line-number editing for LLMs?
- Why must the old_string match exactly once?
- What happens when you remove a rule from the system prompt?
- Why is maxTurns 30 here vs 20 in Module 4?

## Solutions
Compare your code against `solutions/` if you're stuck.
