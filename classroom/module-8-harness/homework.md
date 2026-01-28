# Module 8 Homework: Production Harness Extensions

## Overview

Extend your basic harness with real-world features: session management UI, progress persistence, enhanced CLAUDE.md support, and a multi-tool MCP server.

**Time estimate**: 3-4 hours
**Difficulty**: Intermediate

## Setup

Use your Module 8 lab code as the starting point. You'll add four major features.

---

## Part 1: Session Management CLI (60 min)

Build a command-line interface for managing sessions.

### Requirements

Create `session-cli.ts` with the following commands:

#### 1.1 List Sessions

```bash
bun session-cli.ts list [--limit N]
```

Output:
```
ID                                    Status      Created              Updated              Task
8f3a...                              active      2024-01-15 10:30     2024-01-15 10:45     Build Python app
9d2b...                              complete    2024-01-15 09:00     2024-01-15 09:20     Fix bug in module 3
...
```

**Status**: `active` if turn < maxTurns, `complete` if ended with stop_reason "end_turn"

#### 1.2 Show Session Details

```bash
bun session-cli.ts show <session-id>
```

Output:
```
Session: 8f3a...
Created: 2024-01-15 10:30
Updated: 2024-01-15 10:45
Status: active
Task: Build a Python hello world program
Turn: 3/20
Workspace: /Users/me/projects/demo

Messages: 7
- user: Task: Build a Python hello world program...
- assistant: I'll break this down into steps. [2 tool calls]
- user: [tool results]
- assistant: I've created the file. [1 tool call]
...
```

#### 1.3 Delete Session

```bash
bun session-cli.ts delete <session-id>
```

Confirmation prompt:
```
Delete session 8f3a... (Build Python app)?
This cannot be undone. [y/N]
```

#### 1.4 Clean Old Sessions

```bash
bun session-cli.ts clean [--days N]
```

Delete sessions older than N days (default 7).

### Implementation Tips

- Use a command parser like `commander` or parse `process.argv` manually
- Read all files in `sessions/` to build list
- Store status in session object (add `status` field)
- Format timestamps with `new Date(timestamp).toLocaleString()`

### Deliverable

A working CLI that can list, show, delete, and clean sessions.

---

## Part 2: Progress Persistence (45 min)

Make progress state survive crashes by storing it in the session object.

### Requirements

#### 2.1 Session Schema Extension

Add progress to Session:

```typescript
interface Session {
  // ... existing fields ...
  progress?: {
    items: { description: string; done: boolean }[];
  };
}
```

#### 2.2 Persist Progress

Modify progress tools to:
1. Read initial state from `session.progress` on first call
2. Update `session.progress` after every change
3. Save session automatically (call `saveSession(session)`)

#### 2.3 Test Recovery

```typescript
async function testProgressRecovery() {
  // Start agent with multi-step task
  const session = await runAgent("Create 5 files named file1.txt through file5.txt");

  // Kill after 3 files created
  // Resume and verify progress shows 3/5 complete
}
```

### Implementation Tips

- Pass session object to progress tool executor
- Initialize `progressItems` from `session.progress?.items ?? []`
- Update session.progress before every saveSession call

### Deliverable

Progress state that persists across crashes. If agent crashes after completing 3/5 tasks, resuming shows "Progress: 3/5" with correct items marked done.

---

## Part 3: Enhanced CLAUDE.md Support (45 min)

Add support for multiple context sources and template variables.

### Requirements

#### 3.1 Multi-File Context

Support loading multiple context files:
- `CLAUDE.md` - Project instructions
- `ARCHITECTURE.md` - System design
- `CONVENTIONS.md` - Code style guide

Load all files that exist and inject under separate headers.

#### 3.2 Template Variables

Replace variables in context files:
- `{{WORKSPACE}}` → session.workspace
- `{{TASK}}` → session.task
- `{{DATE}}` → current date

Example `CLAUDE.md`:
```markdown
You are working in {{WORKSPACE}} on: {{TASK}}
Today is {{DATE}}.

Follow these conventions:
...
```

#### 3.3 Conditional Sections

Support conditional blocks:

```markdown
{{#IF LANGUAGE=python}}
Use type hints and follow PEP 8.
{{/IF}}

{{#IF LANGUAGE=typescript}}
Use strict mode and prefer functional patterns.
{{/IF}}
```

Set language via session metadata: `session.metadata = { LANGUAGE: "python" }`

### Implementation Tips

- Create `loadContextFiles()` that tries each filename
- Use regex for template replacement: `content.replace(/\{\{(\w+)\}\}/g, ...)`
- Parse conditional blocks with regex: `/\{\{#IF (\w+)=(\w+)\}\}(.*?)\{\{\/IF\}\}/gs`

### Deliverable

A system prompt builder that:
1. Loads multiple context files
2. Replaces template variables
3. Evaluates conditional blocks

---

## Part 4: Multi-Tool MCP Server (90 min)

Build an MCP server with multiple useful tools.

### Requirements

Create `mcp-server.ts` with these tools:

#### 4.1 File System Tools

- `fs-read`: Read file contents
- `fs-write`: Write file contents
- `fs-list`: List directory contents

All paths must be relative to a configured workspace root for security.

#### 4.2 HTTP Tools

- `http-get`: Fetch URL and return body
- `http-post`: POST JSON to URL

#### 4.3 System Tools

- `sys-exec`: Execute shell command (sanitized)
- `sys-env`: Get environment variable

### Security Constraints

- File tools: validate all paths are within workspace
- HTTP tools: timeout after 10 seconds
- Exec tool: blocklist dangerous commands (rm, dd, mkfs, etc.)
- Env tool: blocklist sensitive vars (API keys, tokens)

### Implementation

```typescript
const tools = [
  {
    name: "fs-read",
    description: "Read file contents",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to workspace" }
      },
      required: ["path"]
    }
  },
  // ... other tools
];

async function handleToolCall(name: string, args: any): Promise<any> {
  const workspace = process.env.WORKSPACE || process.cwd();

  if (name === "fs-read") {
    const fullPath = path.join(workspace, args.path);
    if (!fullPath.startsWith(workspace)) {
      throw new Error("Path outside workspace");
    }
    return { content: [{ type: "text", text: await fs.readFile(fullPath, "utf-8") }] };
  }

  // ... handle other tools
}
```

### Testing

Create a test script that:
1. Starts the MCP server
2. Calls `tools/list` to verify all tools are available
3. Calls each tool with valid inputs
4. Verifies security constraints (path validation, command blocklist)

### Deliverable

A production-ready MCP server with 7 tools and proper security validation.

---

## Verification Checklist

### Part 1: Session CLI
- [ ] `list` command shows all sessions with status
- [ ] `show` command displays full session details
- [ ] `delete` command removes session file
- [ ] `clean` command deletes old sessions by date

### Part 2: Progress Persistence
- [ ] Progress state saved to session.progress
- [ ] Progress restored on session resume
- [ ] Progress survives crash mid-task

### Part 3: Enhanced Context
- [ ] Loads CLAUDE.md, ARCHITECTURE.md, CONVENTIONS.md
- [ ] Replaces {{WORKSPACE}}, {{TASK}}, {{DATE}}
- [ ] Evaluates conditional blocks based on metadata

### Part 4: MCP Server
- [ ] Implements all 7 tools
- [ ] File paths validated against workspace
- [ ] HTTP requests timeout after 10s
- [ ] Dangerous commands blocked in sys-exec
- [ ] Sensitive env vars blocked in sys-env

---

## Bonus Challenges

### B1: Session Branching (60 min)

Add ability to fork a session:

```bash
bun session-cli.ts fork <session-id> [--from-turn N]
```

Creates a new session with messages copied up to turn N.

**Use case**: Try different approaches from a checkpoint.

### B2: Progress Templates (45 min)

Support loading progress templates:

```yaml
# templates/python-project.yml
tasks:
  - Create virtual environment
  - Install dependencies
  - Write main.py
  - Write tests
  - Run tests
```

Load with:
```typescript
await loadProgressTemplate("python-project");
```

### B3: MCP Tool Chaining (60 min)

Add `tools/chain` method to MCP server:

```json
{
  "method": "tools/chain",
  "params": {
    "steps": [
      { "tool": "fs-read", "args": { "path": "config.json" } },
      { "tool": "http-post", "args": { "url": "...", "body": "$prev" } }
    ]
  }
}
```

Execute tools in sequence, passing previous result as `$prev`.

---

## Submission

Submit:
1. `session-cli.ts` - Complete CLI implementation
2. Updated `session.ts` - With progress persistence
3. Updated `harness.ts` - With enhanced context loading
4. `mcp-server.ts` - With all 7 tools and security
5. `TEST_RESULTS.md` - Verification checklist with screenshots/output

---

## Grading Rubric

| Component | Points |
|-----------|--------|
| Session CLI (all 4 commands) | 25 |
| Progress persistence | 20 |
| Enhanced CLAUDE.md | 20 |
| MCP server (7 tools) | 25 |
| Security validation | 10 |
| **Total** | **100** |

**Bonus**: Up to 20 points for bonus challenges.

---

## Common Issues

**Session list empty**: Check that sessions are being saved to `sessions/` directory.

**Progress not restoring**: Verify you're reading from `session.progress` before first progress tool call.

**Template variables not replaced**: Check regex escaping and that variables exist in session object.

**MCP tools failing**: Ensure you're returning correct MCP response format with `content` array.

**Path validation failing**: Use `path.resolve()` to normalize paths before checking if they start with workspace.

---

## Learning Objectives

By completing this homework, you will:
- Build production-grade session management systems
- Implement crash-resistant progress tracking
- Design flexible context injection systems
- Create secure, multi-tool MCP servers
- Handle edge cases and security constraints

This prepares you for Module 9, where you'll use these harness features to build self-improving agents.
