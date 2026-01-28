# Module 8 Handout: Harness Engineering

## Core Concept

A **harness** is production infrastructure that wraps an agent to provide:
- Session persistence (crash recovery)
- Progress tracking (observability)
- Context injection (project integration)
- Protocol support (composability)

## Session Structure

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

Stored as: `sessions/{id}.json`

## Double-Save Pattern

**Critical**: Save session in TWO places per loop iteration.

```typescript
for (let turn = 0; turn < maxTurns; turn++) {
  // Get assistant response
  const response = await client.messages.create({ messages, tools });
  messages.push({ role: "assistant", content: response.content });
  session.messages = messages;
  await saveSession(session);  // SAVE 1: After assistant response

  // Execute tools
  const toolResults = await executeTools(response.content);
  messages.push({ role: "user", content: toolResults });
  session.messages = messages;
  await saveSession(session);  // SAVE 2: After tool execution
}
```

**Why?** Lose at most 1 turn on crash (vs. losing entire session).

## Session Management

```typescript
// Save
async function saveSession(session: Session) {
  session.updatedAt = new Date().toISOString();
  await fs.writeFile(`sessions/${session.id}.json`, JSON.stringify(session, null, 2));
}

// Load
async function loadSession(id: string): Promise<Session | null> {
  try {
    const data = await fs.readFile(`sessions/${id}.json`, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Create
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

## Progress Tracking

Three tools for markdown checklists:

1. **progress-add**: Add task to checklist
2. **progress-complete**: Mark task done
3. **progress-show**: Display progress

### Format

```
Progress: 2/4
0. [x] Task A
1. [ ] Task B
2. [x] Task C
3. [ ] Task D
```

### Implementation Sketch

```typescript
let progressItems: { description: string; done: boolean }[] = [];

function formatProgress(): string {
  const completed = progressItems.filter(item => item.done).length;
  let result = `Progress: ${completed}/${progressItems.length}\n`;
  progressItems.forEach((item, i) => {
    const checkbox = item.done ? "[x]" : "[ ]";
    result += `${i}. ${checkbox} ${item.description}\n`;
  });
  return result;
}
```

## CLAUDE.md Integration

Auto-load project instructions:

```typescript
async function loadProjectContext(workspace: string): Promise<string | null> {
  try {
    return await fs.readFile(`${workspace}/CLAUDE.md`, "utf-8");
  } catch {
    return null;
  }
}

async function buildSystemPrompt(session: Session): Promise<string> {
  let prompt = BASE_SYSTEM_PROMPT;
  const context = await loadProjectContext(session.workspace);
  if (context) {
    prompt += `\n\n## Project Context\n\n${context}`;
  }
  return prompt;
}
```

## Model Context Protocol (MCP)

JSON-RPC over stdin/stdout for tool discovery and execution.

### Core Methods

1. **initialize**: Handshake to establish capabilities
2. **tools/list**: Return available tools with schemas
3. **tools/call**: Execute tool by name with arguments

### Message Format

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "echo",
        "description": "Echo input",
        "inputSchema": { "type": "object", "properties": {...} }
      }
    ]
  }
}
```

### Minimal Server

```typescript
import * as readline from "readline";

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  const req = JSON.parse(line);
  const res = await handleRequest(req);
  console.log(JSON.stringify(res));
});

async function handleRequest(req) {
  if (req.method === "tools/list") {
    return { jsonrpc: "2.0", id: req.id, result: { tools: [...] } };
  }
  // ... handle other methods
}
```

## Complete Harness Pattern

```typescript
async function runHarnessedAgent(taskOrSessionId: string) {
  // 1. Load or create session
  let session = await loadSession(taskOrSessionId)
    ?? await createSession(taskOrSessionId, process.cwd());

  // 2. Build system prompt with project context
  const systemPrompt = await buildSystemPrompt(session);

  // 3. Assemble tools (core + progress + MCP)
  const tools = [...coreTools, ...progressTools];

  // 4. Agent loop with double-save
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

  return session;
}
```

## Key Principles

1. **Durability**: Sessions survive crashes via double-save pattern
2. **Observability**: Progress tools show agent's plan and status
3. **Context**: CLAUDE.md gives project-specific instructions
4. **Composability**: MCP enables tool ecosystem integration

## Common Patterns

- Save session after EVERY state change (assistant response, tool execution)
- Store progress items in session object for persistence across crashes
- Load CLAUDE.md once at session start, inject into system prompt
- Connect MCP servers at harness initialization, convert tools to Claude format

## Debugging Tips

- Check `sessions/` directory for saved sessions
- Resume crashed sessions by passing session ID to agent
- Parse progress format to extract completion percentage
- Test MCP servers standalone before connecting to agent
