# Module 8: Harness Engineering

## Goal
Wrap your agent in a production harness with session persistence (crash recovery), progress tracking, CLAUDE.md integration, and MCP server support.

## Concepts

### Why a raw agent isn't a daily-driver tool
The Module 5 agent runs in memory. If it crashes on turn 15 of a 30-turn task, you lose everything. It has no awareness of the project it's working in. It can't show you progress on multi-step tasks. A harness adds this infrastructure.

### Session persistence
Sessions are JSON files saved after every turn. They contain the full message history, turn count, workspace path, and timestamps. If the process crashes, you resume from the last saved state — losing at most one turn of work.

### Progress tracking
A markdown checklist the agent manages through tools: `progress-add`, `progress-complete`, `progress-show`. This gives both the agent and the human visibility into multi-step tasks.

### CLAUDE.md
A markdown file in the project root containing project-specific context: build commands, architecture notes, conventions. The harness loads it automatically and injects it into the system prompt. The agent reads it without you having to explain the project each time.

### MCP (Model Context Protocol)
A standard for tool servers to communicate with agents over JSON-RPC on stdin/stdout. Three methods: `initialize` (handshake), `tools/list` (discover tools), `tools/call` (execute a tool). This is how external tools integrate with agent harnesses.

## Build It

### Step 1: Build session persistence

Create `module-8-harness/session.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import type { Message } from "../module-2-agent-loop/types.js";

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  task: string;
  messages: Message[];
  turn: number;
  workspace: string;
}

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

// TODO: saveSession(session) — write to sessions/{id}.json, update updatedAt
// TODO: loadSession(id) — read and parse, return null if not found
// TODO: listSessions() — read directory, parse each file, sort by updatedAt desc
// TODO: createSession(task, workspace) — return new Session with timestamp-based id
```

### Step 2: Build progress tracking

Create `module-8-harness/progress.ts`:

```typescript
import type { Tool } from "../module-2-agent-loop/types.js";

export interface ProgressState {
  items: { text: string; done: boolean }[];
}

export function createProgressTools(): { tools: Tool[]; state: ProgressState } {
  const state: ProgressState = { items: [] };

  // TODO: progress-add — add an item to the checklist
  // TODO: progress-complete — mark item done by index
  // TODO: progress-show — display the checklist with counts
  //   Format: "Progress: 2/4\n0. [x] Task A\n1. [x] Task B\n2. [ ] Task C\n3. [ ] Task D"

  return { tools: [addItem, completeItem, showProgress], state };
}
```

### Step 3: Build the harness

Create `module-8-harness/harness.ts`:

```typescript
// TODO: loadClaudeMd(workspace) — try to read CLAUDE.md, return "" if not found

export async function runHarness(
  task: string,
  workspacePath: string,
  sessionId?: string
): Promise<string> {
  // TODO: Load or create session
  // TODO: Build registry with ALL tools:
  //   file tools + edit tool + scratchpad + progress + delegation
  // TODO: Build system prompt:
  //   CODING_AGENT_PROMPT + workspace + CLAUDE.md content + progress instructions
  // TODO: Agent loop with:
  //   - Compaction before each turn
  //   - Save session after EVERY assistant response AND after tool results
  //   - maxTurns: 40
}
```

Key insight: save the session in **two places** in the loop — after the assistant response and after tool execution. This minimizes data loss on crash.

### Step 4: Build the MCP server

Create `module-8-harness/mcp-server.ts`:

```typescript
import * as readline from "readline";

// TODO: Define JSON-RPC request/response interfaces
// TODO: Define a tool (e.g., "get-project-info")
// TODO: Handle three methods:
//   "initialize" → return protocol version and capabilities
//   "tools/list" → return tool definitions
//   "tools/call" → execute the tool and return result
// TODO: Read JSON lines from stdin, write responses to stdout
```

### Step 5: Build the CLI

Create `module-8-harness/main.ts`:

```typescript
// TODO: Handle --list flag (show all sessions)
// TODO: Handle --resume <session-id> (continue a session)
// TODO: Default: new session with task from argv
```

Run it: `bun module-8-harness/main.ts "Add input validation to all API endpoints"`

Try: `bun module-8-harness/main.ts --list`

## Exercises

1. **Test crash recovery**: Start a task. Kill the process mid-task (Ctrl+C). Check `sessions/` for the JSON file. Resume with `--resume`. Verify the agent picks up where it left off.

2. **Inspect a session file**: Open a session JSON file. Read the messages array. You'll see the full transcript — every user message, assistant response, and tool call. This is your debugging goldmine.

3. **Create a CLAUDE.md**: Write a CLAUDE.md in your workspace with specific instructions (e.g., "Always use semicolons. Never use var."). Run the agent on a coding task. Does it follow the instructions?

4. **Test progress tracking**: Ask the agent to do a multi-step task ("Create 3 files with specific content"). Watch the progress checklist in the output. Does it add items before starting and complete them as it goes?

5. **Test the MCP server**: Run `bun module-8-harness/mcp-server.ts` and pipe JSON-RPC requests to stdin:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | bun module-8-harness/mcp-server.ts
   ```

## Checkpoint

You're ready for Module 9 when you can answer:
- Why save the session in two places per loop iteration?
- What goes in CLAUDE.md and why is it better than hardcoding context in the system prompt?
- What are the three JSON-RPC methods in MCP?
- How does progress tracking help both the agent and the human?

## Solutions
Compare your code against `solutions/` if you're stuck.
