# Module 8 Tutorial: Harness Engineering

## Introduction

You've built agents that can call tools, execute code, and pass evaluations. But what happens when your agent crashes mid-task? Or when you need to track progress across a 20-step plan? Or when you want to integrate your agent into a larger ecosystem?

This module teaches **harness engineering**: the production infrastructure that wraps agents to make them reliable, observable, and composable.

## The Problem: Fragility

Without a harness, agents are fragile:

```typescript
// Fragile agent (no persistence)
const messages = [];
for (let turn = 0; turn < 10; turn++) {
  const response = await client.messages.create({ messages });
  messages.push({ role: "assistant", content: response.content });

  // CRASH HERE → lose all progress

  const toolResults = await executeTools(response.content);
  messages.push({ role: "user", content: toolResults });
}
```

If the process crashes (network error, rate limit, out of memory), you lose everything. You can't:
- Resume from where you left off
- Debug what went wrong
- Track progress toward completion
- Integrate with external tools

A harness fixes this by adding:
1. **Session persistence** → crash recovery
2. **Progress tracking** → observability
3. **Context injection** → project integration
4. **Protocol support** → composability (MCP)

## Part 1: Session Persistence

### What Is a Session?

A session is a snapshot of agent state:

```typescript
interface Session {
  id: string;                    // Unique identifier
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  task: string;                  // User's goal
  messages: MessageParam[];      // Full conversation
  turn: number;                  // Current iteration
  workspace: string;             // Working directory
}
```

Sessions are saved as JSON files: `sessions/{id}.json`

### The Double-Save Pattern

**Critical insight**: Save the session in TWO places per loop iteration:

```typescript
for (let turn = 0; turn < maxTurns; turn++) {
  // 1. Get assistant response
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages,
    tools
  });

  messages.push({ role: "assistant", content: response.content });
  session.messages = messages;
  session.turn = turn;
  await saveSession(session);  // SAVE 1: After assistant response

  if (response.stop_reason === "end_turn") break;

  // 2. Execute tools
  const toolResults = [];
  for (const block of response.content) {
    if (block.type === "tool_use") {
      const result = await executeToolCall(block, tools);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result
      });
    }
  }

  messages.push({ role: "user", content: toolResults });
  session.messages = messages;
  await saveSession(session);  // SAVE 2: After tool execution
}
```

**Why save twice?**

If you crash between the assistant response and tool execution, you want the assistant's output preserved. If you crash during tool execution, you want the partial results saved.

With double-save, you lose at most 1 turn on crash.

### Implementation

```typescript
import * as fs from "fs/promises";
import { randomUUID } from "crypto";

async function saveSession(session: Session): Promise<void> {
  session.updatedAt = new Date().toISOString();
  const path = `sessions/${session.id}.json`;
  await fs.mkdir("sessions", { recursive: true });
  await fs.writeFile(path, JSON.stringify(session, null, 2));
}

async function loadSession(id: string): Promise<Session | null> {
  try {
    const data = await fs.readFile(`sessions/${id}.json`, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function createSession(task: string, workspace: string): Promise<Session> {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    task,
    messages: [],
    turn: 0,
    workspace
  };
}
```

### Resume Logic

```typescript
async function runAgent(taskOrSessionId: string) {
  let session: Session;

  // Try to load existing session
  const existing = await loadSession(taskOrSessionId);
  if (existing) {
    console.log(`Resuming session ${existing.id} at turn ${existing.turn}`);
    session = existing;
  } else {
    console.log(`Starting new session`);
    session = await createSession(taskOrSessionId, process.cwd());

    // Initialize with system prompt
    session.messages.push({
      role: "user",
      content: `Task: ${session.task}\n\nComplete this task.`
    });
  }

  // Run from current turn
  for (let turn = session.turn; turn < maxTurns; turn++) {
    // ... agent loop with double-save ...
  }
}
```

Now you can run `runAgent(sessionId)` to resume a crashed session.

## Part 2: Progress Tracking

Agents working on multi-step tasks need to track progress. The standard pattern: **markdown checklist tools**.

### Progress Tools API

Three tools:

1. **progress-add**: Add a new task to the checklist
2. **progress-complete**: Mark a task as done
3. **progress-show**: Display current progress

### Format

Progress is stored as a markdown checklist string:

```
Progress: 2/4
0. [x] Task A
1. [ ] Task B
2. [x] Task C
3. [ ] Task D
```

Parse this to get completion ratio (2/4 = 50%).

### Implementation

```typescript
let progressItems: { description: string; done: boolean }[] = [];

const progressTools: Tool[] = [
  {
    name: "progress-add",
    description: "Add a new task to your progress checklist",
    input_schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description" }
      },
      required: ["task"]
    },
    execute: async ({ task }) => {
      progressItems.push({ description: task, done: false });
      return formatProgress();
    }
  },
  {
    name: "progress-complete",
    description: "Mark a task as complete",
    input_schema: {
      type: "object",
      properties: {
        index: { type: "number", description: "0-based task index" }
      },
      required: ["index"]
    },
    execute: async ({ index }) => {
      if (index >= 0 && index < progressItems.length) {
        progressItems[index].done = true;
      }
      return formatProgress();
    }
  },
  {
    name: "progress-show",
    description: "Show current progress",
    input_schema: { type: "object", properties: {} },
    execute: async () => formatProgress()
  }
];

function formatProgress(): string {
  const completed = progressItems.filter(item => item.done).length;
  const total = progressItems.length;

  let result = `Progress: ${completed}/${total}\n`;
  progressItems.forEach((item, i) => {
    const checkbox = item.done ? "[x]" : "[ ]";
    result += `${i}. ${checkbox} ${item.description}\n`;
  });

  return result;
}
```

### Usage Pattern

Agents typically:
1. Start with `progress-add` to plan all steps
2. Call `progress-complete` after each step
3. Call `progress-show` periodically to check status

Example agent behavior:

```
Assistant: I'll complete this task step by step.

Tool calls:
- progress-add: "Set up workspace"
- progress-add: "Write initial code"
- progress-add: "Run tests"
- progress-add: "Fix issues"

Progress: 0/4
0. [ ] Set up workspace
1. [ ] Write initial code
2. [ ] Run tests
3. [ ] Fix issues

[Agent works...]

Tool call: progress-complete(0)

Progress: 1/4
0. [x] Set up workspace
1. [ ] Write initial code
...
```

## Part 3: CLAUDE.md Integration

Projects often have a `CLAUDE.md` file with instructions for AI agents. Your harness should automatically load and inject this into the system prompt.

### Loading CLAUDE.md

```typescript
async function loadProjectContext(workspace: string): Promise<string | null> {
  const claudePath = `${workspace}/CLAUDE.md`;
  try {
    const content = await fs.readFile(claudePath, "utf-8");
    return content;
  } catch {
    return null;
  }
}
```

### Injection Pattern

```typescript
async function buildSystemPrompt(session: Session): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT;  // Your agent's core instructions

  const projectContext = await loadProjectContext(session.workspace);
  if (projectContext) {
    prompt += `\n\n## Project Context\n\n${projectContext}`;
  }

  return prompt;
}
```

Now every agent run automatically gets project-specific instructions.

## Part 4: Model Context Protocol (MCP)

MCP is a standard for exposing tools to AI agents. It uses JSON-RPC over stdin/stdout.

### Why MCP?

Without a protocol, every tool integration is custom. With MCP:
- Tools are **discoverable** (list available tools)
- Tools are **callable** (execute by name)
- Tools are **composable** (chain MCP servers)

An MCP server is just a process that responds to JSON-RPC messages on stdin/stdout.

### MCP Methods

1. **initialize**: Handshake to establish capabilities
2. **tools/list**: Return available tools
3. **tools/call**: Execute a tool by name

### Minimal MCP Server

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
    name: "echo",
    description: "Echo back the input",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" }
      }
    }
  }
];

async function handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
  if (req.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} }
      }
    };
  }

  if (req.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: req.id,
      result: { tools }
    };
  }

  if (req.method === "tools/call") {
    const { name, arguments: args } = req.params;
    if (name === "echo") {
      return {
        jsonrpc: "2.0",
        id: req.id,
        result: { content: [{ type: "text", text: args.message }] }
      };
    }
  }

  return {
    jsonrpc: "2.0",
    id: req.id,
    error: { code: -32601, message: "Method not found" }
  };
}

// Main loop
const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  const req: JsonRpcRequest = JSON.parse(line);
  const res = await handleRequest(req);
  console.log(JSON.stringify(res));
});
```

### Using an MCP Server

```typescript
import { spawn } from "child_process";

class McpClient {
  private process: ChildProcess;
  private requestId = 0;

  constructor(serverPath: string) {
    this.process = spawn("node", [serverPath]);
  }

  async call(method: string, params?: any): Promise<any> {
    const id = this.requestId++;
    const request = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve) => {
      this.process.stdout!.once("data", (data) => {
        const response = JSON.parse(data.toString());
        resolve(response.result);
      });

      this.process.stdin!.write(JSON.stringify(request) + "\n");
    });
  }

  async listTools() {
    return this.call("tools/list");
  }

  async callTool(name: string, args: any) {
    return this.call("tools/call", { name, arguments: args });
  }
}
```

Now you can connect any MCP server to your agent and use its tools.

## Putting It All Together

A production harness combines all four pieces:

```typescript
async function runHarnessedAgent(taskOrSessionId: string) {
  // 1. Session management
  let session = await loadSession(taskOrSessionId)
    ?? await createSession(taskOrSessionId, process.cwd());

  // 2. Project context
  const systemPrompt = await buildSystemPrompt(session);

  // 3. Progress tools
  const tools = [...progressTools, ...coreTools];

  // 4. Optional MCP integration
  const mcpClient = new McpClient("./mcp-server.js");
  const mcpTools = await mcpClient.listTools();
  tools.push(...convertMcpTools(mcpTools));

  // Agent loop with double-save
  for (let turn = session.turn; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      system: systemPrompt,
      messages: session.messages,
      tools
    });

    session.messages.push({ role: "assistant", content: response.content });
    session.turn = turn;
    await saveSession(session);  // Save 1

    if (response.stop_reason === "end_turn") break;

    const toolResults = await executeTools(response.content, tools);
    session.messages.push({ role: "user", content: toolResults });
    await saveSession(session);  // Save 2
  }

  console.log(`Session ${session.id} completed`);
  return session;
}
```

## Key Takeaways

1. **Session persistence** makes agents crash-resistant. Save after assistant response AND tool execution.
2. **Progress tools** give agents memory of multi-step plans. Use markdown checklists.
3. **CLAUDE.md integration** auto-loads project context. Inject into system prompt.
4. **MCP support** makes agents composable. JSON-RPC over stdin/stdout.

The harness is the difference between a prototype and a production agent. It's invisible when working, but essential when things go wrong.

## Next Steps

In Module 9, you'll build agents that use the harness to **improve themselves** via eval-driven bootstrapping. The session persistence lets them safely experiment with prompt changes and revert failures.
