# Module 8 Lab: Build a Production Harness

## Objective

Build a complete agent harness with session persistence, progress tracking, CLAUDE.md integration, and basic MCP support.

## Setup

Create a new directory for your harness:

```bash
mkdir module-8-harness/my-harness
cd module-8-harness/my-harness
```

You'll build four files:
1. `session.ts` - Session management
2. `progress.ts` - Progress tracking tools
3. `harness.ts` - Main harness implementation
4. `mcp-server.ts` - Simple MCP server

## Part 1: Session Management (30 min)

### Task 1.1: Define Session Type

Create `session.ts`:

```typescript
export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  task: string;
  messages: MessageParam[];
  turn: number;
  workspace: string;
}
```

### Task 1.2: Implement saveSession

```typescript
import * as fs from "fs/promises";

export async function saveSession(session: Session): Promise<void> {
  // TODO:
  // 1. Update session.updatedAt to current ISO timestamp
  // 2. Ensure sessions/ directory exists
  // 3. Write session to sessions/{id}.json with pretty formatting
}
```

**Test**: Create a dummy session and save it. Check that `sessions/` directory is created and JSON file exists.

### Task 1.3: Implement loadSession

```typescript
export async function loadSession(id: string): Promise<Session | null> {
  // TODO:
  // 1. Try to read sessions/{id}.json
  // 2. Parse JSON and return Session
  // 3. Return null if file doesn't exist
}
```

**Test**: Load the session you saved. Verify fields match.

### Task 1.4: Implement createSession

```typescript
import { randomUUID } from "crypto";

export async function createSession(task: string, workspace: string): Promise<Session> {
  // TODO:
  // 1. Generate UUID for id
  // 2. Set createdAt and updatedAt to current timestamp
  // 3. Initialize empty messages array
  // 4. Set turn to 0
  // 5. Return Session object
}
```

**Test**: Create a new session and verify all fields are populated correctly.

## Part 2: Progress Tracking (30 min)

Create `progress.ts`:

### Task 2.1: Progress State

```typescript
import { Tool } from "@anthropic-ai/sdk/resources";

let progressItems: { description: string; done: boolean }[] = [];

function formatProgress(): string {
  // TODO:
  // 1. Count completed items
  // 2. Build "Progress: X/Y" header
  // 3. Format each item as "N. [x]/[ ] Description"
  // 4. Return formatted string
}
```

**Format example**:
```
Progress: 2/4
0. [x] First task
1. [ ] Second task
2. [x] Third task
3. [ ] Fourth task
```

### Task 2.2: Progress Tools

```typescript
export const progressTools: Tool[] = [
  {
    name: "progress-add",
    description: "Add a new task to your progress checklist",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description" }
      },
      required: ["task"]
    }
  },
  {
    name: "progress-complete",
    description: "Mark a task as complete by index",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "number", description: "0-based task index" }
      },
      required: ["index"]
    }
  },
  {
    name: "progress-show",
    description: "Show current progress checklist",
    input_schema: {
      type: "object",
      properties: {}
    }
  }
];
```

### Task 2.3: Tool Execution

```typescript
export async function executeProgressTool(name: string, input: any): Promise<string> {
  // TODO: Implement logic for each tool
  // progress-add: Add item to progressItems, return formatProgress()
  // progress-complete: Mark item[index].done = true, return formatProgress()
  // progress-show: Return formatProgress()
}
```

**Test**: Manually call each tool and verify output format.

## Part 3: CLAUDE.md Integration (20 min)

In `harness.ts`:

### Task 3.1: Load Project Context

```typescript
import * as fs from "fs/promises";

async function loadProjectContext(workspace: string): Promise<string | null> {
  // TODO:
  // 1. Try to read {workspace}/CLAUDE.md
  // 2. Return content if exists
  // 3. Return null if file doesn't exist
}
```

### Task 3.2: Build System Prompt

```typescript
const BASE_SYSTEM_PROMPT = `You are a helpful AI agent with access to tools.
Use progress-add to plan tasks, progress-complete when done, progress-show to check status.`;

async function buildSystemPrompt(session: Session): Promise<string> {
  // TODO:
  // 1. Start with BASE_SYSTEM_PROMPT
  // 2. Load project context from workspace
  // 3. If context exists, append it under "## Project Context" header
  // 4. Return complete prompt
}
```

**Test**: Create a test CLAUDE.md file and verify it gets appended to system prompt.

## Part 4: Main Harness (40 min)

### Task 4.1: Tool Execution

```typescript
async function executeTools(
  content: ContentBlock[],
  tools: Tool[]
): Promise<ToolResultBlockParam[]> {
  // TODO:
  // 1. Filter content blocks for type === "tool_use"
  // 2. For each tool use:
  //    - Match tool by name
  //    - Execute appropriate handler (progress tools vs. core tools)
  //    - Build tool_result block
  // 3. Return array of tool results
}
```

### Task 4.2: Agent Loop with Double-Save

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runAgent(taskOrSessionId: string, maxTurns = 20) {
  // TODO: Implement complete agent loop

  // 1. Try to load existing session by ID
  //    If not found, create new session with taskOrSessionId as task

  // 2. Build system prompt (with CLAUDE.md)

  // 3. Assemble tools (progress + any core tools)

  // 4. Agent loop from session.turn to maxTurns:
  //    a. Call client.messages.create with system, messages, tools
  //    b. Push assistant response to messages
  //    c. Update session.turn
  //    d. SAVE SESSION (Save 1)
  //    e. Check stop_reason - if "end_turn", break
  //    f. Execute all tool calls
  //    g. Push tool results to messages
  //    h. SAVE SESSION (Save 2)

  // 5. Return final session
}
```

**Key points**:
- Initialize messages with task if new session
- Save after assistant response AND after tool execution
- Resume from session.turn if loading existing session

### Task 4.3: Test Crash Recovery

```typescript
// Test script
async function testCrashRecovery() {
  const session = await runAgent("Create a 4-step plan and complete first 2 steps");
  console.log(`Session ID: ${session.id}`);

  // Simulate crash by stopping after 5 turns
  // Then resume:
  // const resumed = await runAgent(session.id);
}
```

**Verify**:
1. First run creates session and saves progress
2. Second run resumes from where it left off
3. No duplicate work is done

## Part 5: MCP Server (Bonus, 30 min)

Create `mcp-server.ts`:

### Task 5.1: Basic JSON-RPC Server

```typescript
import * as readline from "readline";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: { code: number; message: string };
}

const tools = [
  {
    name: "get-time",
    description: "Get current time",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  // TODO: Implement handlers for:
  // - initialize: Return { protocolVersion: "2024-11-05", capabilities: { tools: {} } }
  // - tools/list: Return { tools }
  // - tools/call: Execute tool by name and return result
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  const req: JsonRpcRequest = JSON.parse(line);
  const res = await handleRequest(req);
  console.log(JSON.stringify(res));
});
```

### Task 5.2: Test MCP Server

Create a test client:

```typescript
import { spawn } from "child_process";

const proc = spawn("bun", ["mcp-server.ts"]);

// Test initialize
proc.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {}
}) + "\n");

proc.stdout.on("data", (data) => {
  console.log("Response:", data.toString());
});
```

## Verification Checklist

- [ ] Session persistence works (save/load)
- [ ] Double-save pattern implemented (after response + after tools)
- [ ] Progress tools work (add/complete/show)
- [ ] Progress format is correct (Progress: X/Y with checklist)
- [ ] CLAUDE.md auto-loads and injects into system prompt
- [ ] Agent can resume from crashed session
- [ ] No duplicate work on resume
- [ ] MCP server responds to initialize and tools/list (bonus)

## Expected Output

When you run `runAgent("Build a hello world program in Python")`:

```
Starting new session
Session 8f3a... created

Turn 0:
Assistant: I'll break this down into steps.
Tools: progress-add("Create Python file"), progress-add("Write code"), progress-add("Test")
Progress: 0/3
0. [ ] Create Python file
1. [ ] Write code
2. [ ] Test

Turn 1:
Tools: write-file("hello.py", "print('Hello, world!')"), progress-complete(0)
Progress: 1/3
0. [x] Create Python file
1. [ ] Write code
2. [ ] Test

...

Session 8f3a... completed
```

If you kill the process mid-run and restart with the session ID:

```
Resuming session 8f3a... at turn 2

Turn 2:
[Continues from where it left off]
```

## Common Issues

**Session not resuming**: Check that you're using session.turn as loop start, not 0.

**Progress not showing checkboxes**: Verify formatProgress() uses `[x]` and `[ ]` exactly.

**CLAUDE.md not loading**: Ensure you're using absolute path or correct relative path from workspace.

**MCP not responding**: Check that you're writing newline after JSON and flushing stdout.

## Extension Ideas

1. Add session listing: `listSessions()` returns all session IDs
2. Store progress in session object so it persists across crashes
3. Add session cleanup: delete old sessions after N days
4. Build MCP client to connect external tools
5. Add logging to track all tool calls and results
