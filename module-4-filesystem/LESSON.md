# Module 4: Filesystem Tools

## Goal
Give your agent real filesystem access — reading, writing, searching, and running shell commands — while keeping it sandboxed to a workspace directory.

## Concepts

### Path traversal attacks
An agent that can read files is powerful. An agent that can read files *anywhere on your machine* is dangerous. If the LLM generates a path like `../../etc/passwd`, it escapes your workspace and reads system files.

The defense is **path containment**: resolve every path to an absolute path with `path.resolve()`, then check that it starts with your workspace root using `startsWith()`. If the resolved path escapes the workspace, reject it. This is 10 lines of code, and it protects everything that follows.

### Why sandbox first, tools second
You build the sandbox **before** any file tools. Every tool calls `sandbox.resolve()` on its input path before doing anything. This way, security is enforced at a single chokepoint, not scattered across five different tools.

### Tool design for agents
When building tools for an LLM to use:
- **Label directory entries** (`[dir]` vs `[file]`) — the LLM needs to tell them apart
- **Limit output** — grep results capped at 50 lines; LLMs choke on huge outputs
- **Filter file types** — only search relevant files (`.ts`, `.js`, `.json`, `.md`)
- **Block dangerous commands** — a shell tool needs a blocklist (`rm -rf /`, `mkfs`, etc.)
- **Enforce timeouts** — shell commands get 30 seconds max

## Build It

### Step 1: Build the sandbox

Create `module-4-filesystem/sandbox.ts`:

```typescript
import * as path from "path";

export class Sandbox {
  constructor(public readonly root: string) {}

  resolve(filePath: string): string {
    // TODO: Use path.resolve(this.root, filePath) to get an absolute path
    // TODO: Check if it startsWith(this.root)
    // TODO: If not, throw an Error with a clear message
    // TODO: Return the resolved path
  }
}
```

**Python:**
```python
import os

class Sandbox:
    def __init__(self, root: str):
        self.root = os.path.realpath(root)

    def resolve(self, file_path: str) -> str:
        # TODO: Use os.path.realpath(os.path.join(self.root, file_path))
        # TODO: Check resolved.startswith(self.root)
        # TODO: If not, raise ValueError
        # TODO: Return the resolved path
        pass
```

This is the most important code in the module. Test it mentally: what does `sandbox.resolve("../../etc/passwd")` do?

### Step 2: Build the file tools

Create `module-4-filesystem/tools.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import { Sandbox } from "./sandbox.js";
import type { Tool } from "../module-2-agent-loop/types.js";

export function createFileTools(sandbox: Sandbox): Tool[] {
  // TODO: Build 5 tools, each using sandbox.resolve() on all paths:

  // 1. read-file: Read a file's contents
  //    Input: { path: string }

  // 2. write-file: Write content to a file (create dirs with fs.mkdir recursive)
  //    Input: { path: string, content: string }

  // 3. list-dir: List files and directories (label each as [dir] or [file])
  //    Input: { path: string } (default ".")

  // 4. search-grep: Run grep -rn on the workspace
  //    Limit output to 50 lines. Filter to .ts/.js/.json/.md files.
  //    Input: { pattern: string, path?: string }

  // 5. run-shell: Run a shell command in the workspace directory
  //    Block dangerous commands. Enforce 30s timeout.
  //    Input: { command: string }

  return [readFile, writeFile, listDir, searchGrep, runShell];
}
```

**Python:**
```python
import os, subprocess
from sandbox import Sandbox

def create_file_tools(sandbox: Sandbox) -> list[dict]:
    # TODO: Build 5 tools, each using sandbox.resolve() on all paths:
    # 1. read-file: open().read()
    # 2. write-file: os.makedirs + open().write()
    # 3. list-dir: os.listdir(), label [dir] or [file]
    # 4. search-grep: subprocess.run(["grep", "-rn", ...])
    # 5. run-shell: subprocess.run(cmd, shell=True, cwd=sandbox.root)
    return [...]
```

### Step 3: Wire up the file agent

Create `module-4-filesystem/file-agent.ts`:

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as path from "path";
import { Sandbox } from "./sandbox.js";
import { createFileTools } from "./tools.js";
import { ToolRegistry } from "../module-3-tools/tool-registry.js";
import type { Message } from "../module-2-agent-loop/types.js";

const client = new Anthropic();

async function fileAgent(task: string, workspacePath: string): Promise<string> {
  const sandbox = new Sandbox(path.resolve(workspacePath));
  const registry = new ToolRegistry();
  for (const tool of createFileTools(sandbox)) {
    registry.register(tool);
  }

  // TODO: Standard agent loop (from Module 2) with:
  //   - maxTurns: 20
  //   - System prompt that tells the agent about its tools and workspace
  //   - IMPORTANT: Include "Always read files before modifying them. Verify changes after making them."
  //   - Log each tool call and result (truncated)
}

// TODO: main() reads task and workspace from process.argv
```

**Python:**
```python
from sandbox import Sandbox
from tools import create_file_tools
from tool_registry import ToolRegistry, Tool

def file_agent(task: str, workspace_path: str) -> str:
    sandbox = Sandbox(os.path.realpath(workspace_path))
    registry = ToolRegistry()
    for t in create_file_tools(sandbox):
        registry.register(Tool(**t))
    # TODO: Standard agent loop with registry.get_definitions() and registry.execute()
```

Run it: `bun module-4-filesystem/file-agent.ts "List the files in this workspace and summarize what you find."`

Watch the tool calls. The agent will typically `list-dir` first, then `read-file` to inspect what it found.

## Exercises

1. **Try to read /etc/passwd**: Ask your agent to `"Read the file /etc/passwd"`. Does the sandbox stop it? What error does the agent see? Does it recover?

2. **Try path traversal**: Ask the agent to `"Read the file ../../../etc/hosts"`. The sandbox should catch this. Verify by checking the error message.

3. **Create and read**: Ask the agent to create a file called `test.txt` with some content, then read it back. Verify the file was actually created in your workspace.

4. **Grep for patterns**: Point the agent at your own codebase: `bun module-4-filesystem/file-agent.ts "Find all TODO comments" /path/to/project`

5. **Shell command limits**: Ask the agent to run `sleep 60` (exceeds the 30s timeout). What happens? Ask it to run a blocked command. What error does it return?

## Checkpoint

You're ready for Module 5 when you can answer:
- How does `path.resolve()` + `startsWith()` prevent path traversal?
- Why does the system prompt say "read before modifying"?
- Why cap grep output at 50 lines?
- Why does each file tool call `sandbox.resolve()` instead of using the raw path?

## Solutions
Compare your code against `solutions/` if you're stuck.
