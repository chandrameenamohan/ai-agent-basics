# Module 4: Filesystem Tools - Tutorial

## Introduction

In this module, you'll learn how to give agents real filesystem access while maintaining security. The challenge: LLMs can generate any file path, including `../../etc/passwd` or other paths that escape your intended working directory. We need **sandbox security** to constrain file operations to a safe root directory.

## Why Filesystem Tools Matter

A coding agent needs to:
- Read existing code to understand context
- Write new files or modify existing ones
- Navigate directory structures
- Search for specific code patterns
- Execute build/test commands

Without filesystem tools, agents can only talk about code. With them, agents can actually work with code.

## The Security Problem

Consider this naive implementation:

```typescript
// DANGEROUS - DO NOT USE
async function readFile(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8');
}
```

What happens if an LLM generates `filePath = "../../etc/passwd"`? The agent can read any file on the system.

**The attack vector**: Path traversal using `..` to escape the intended directory.

## Solution: Sandbox Pattern

A sandbox restricts all file operations to a designated root directory:

```typescript
import * as path from 'path';
import * as fs from 'fs/promises';

class Sandbox {
  constructor(public readonly root: string) {
    // Store the absolute path to the sandbox root
    this.root = path.resolve(root);
  }

  resolve(filePath: string): string {
    // Convert to absolute path within the sandbox
    const resolved = path.resolve(this.root, filePath);

    // Check if the resolved path is inside the sandbox
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path "${filePath}" escapes sandbox root`);
    }

    return resolved;
  }
}
```

**How it works:**

1. `path.resolve(this.root, filePath)` combines the root with the user-provided path and resolves `..` segments
2. If the result doesn't start with `this.root`, the path escaped
3. Throw an error to prevent the operation

**Example:**

```typescript
const sandbox = new Sandbox('/home/user/project');

// Safe paths
sandbox.resolve('src/index.ts');
// → '/home/user/project/src/index.ts'

sandbox.resolve('./lib/utils.ts');
// → '/home/user/project/lib/utils.ts'

// Dangerous paths - throws error
sandbox.resolve('../../etc/passwd');
// → Error: Path escapes sandbox root

sandbox.resolve('/etc/passwd');
// → Error: Path escapes sandbox root
```

## Python Equivalent

```python
import os

class Sandbox:
    def __init__(self, root: str):
        self.root = os.path.realpath(root)

    def resolve(self, file_path: str) -> str:
        # Join and resolve to absolute path
        resolved = os.path.realpath(os.path.join(self.root, file_path))

        # Check containment
        if not resolved.startswith(self.root):
            raise ValueError(f'Path "{file_path}" escapes sandbox root')

        return resolved
```

## The Five Essential Tools

A coding agent needs five core filesystem tools:

### 1. read-file

Read file contents.

```typescript
{
  name: "read_file",
  description: "Read the entire contents of a file",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file, relative to sandbox root"
      }
    },
    required: ["path"]
  }
}
```

**Implementation notes:**
- Use sandbox.resolve() before reading
- Return file contents as string
- On error, return error message as string (don't throw)

### 2. write-file

Write or overwrite a file.

```typescript
{
  name: "write_file",
  description: "Write content to a file (creates or overwrites)",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file"
      },
      content: {
        type: "string",
        description: "Content to write"
      }
    },
    required: ["path", "content"]
  }
}
```

**Implementation notes:**
- Create parent directories if they don't exist
- UTF-8 encoding by default
- Return success message or error

### 3. list-dir

List directory contents.

```typescript
{
  name: "list_dir",
  description: "List all files and directories in a path",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Directory path (default: root)"
      }
    }
  }
}
```

**Implementation notes:**
- Label entries: `[dir] src/` vs `[file] index.ts`
- Sort alphabetically
- This helps the LLM distinguish files from directories

**Example output:**
```
[dir] src/
[dir] tests/
[file] package.json
[file] tsconfig.json
```

### 4. search-grep

Search file contents using regex.

```typescript
{
  name: "search_grep",
  description: "Search for a pattern in files (supports regex)",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Regex pattern to search for"
      },
      path: {
        type: "string",
        description: "Directory to search (default: root)"
      },
      file_pattern: {
        type: "string",
        description: "Filter files by pattern (e.g., '*.ts')"
      }
    },
    required: ["pattern"]
  }
}
```

**Implementation notes:**
- Recursively search files
- Support file filtering (e.g., only `.ts` files)
- Limit output to 50 lines to avoid token bloat
- Show filename, line number, and matching line

**Example output:**
```
src/index.ts:15: export function processData(input: string) {
src/utils.ts:8: function processData(raw: any) {
lib/parser.ts:42:   // Process data in chunks
```

### 5. run-shell

Execute shell commands.

```typescript
{
  name: "run_shell",
  description: "Execute a shell command in the sandbox directory",
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Shell command to execute"
      }
    },
    required: ["command"]
  }
}
```

**Implementation notes:**
- Set cwd to sandbox root
- 30-second timeout to prevent hanging
- Block dangerous commands (rm -rf, dd, mkfs, etc.)
- Return stdout, stderr, and exit code

**Security considerations:**
- Maintain a blocklist of dangerous commands
- Check for command injection patterns
- Consider running in a container for extra isolation

## Tool Design Principles

### 1. Tools Return Strings, Never Throw

```typescript
// Good
async function execute(input: any): Promise<string> {
  try {
    const result = await doWork(input);
    return result;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

// Bad - don't throw into the loop
async function execute(input: any): Promise<string> {
  const result = await doWork(input);  // might throw
  return result;
}
```

**Why?** The agent loop should keep running even when tools fail. Return errors as strings so the LLM can read them and try a different approach.

### 2. Limit Output Size

Grep results, directory listings, and command output can be huge. Always limit:

```typescript
const MAX_GREP_LINES = 50;
const MAX_DIR_ENTRIES = 200;
const MAX_OUTPUT_CHARS = 10000;
```

Truncate with a message: `... (output truncated, 150 more lines)`

### 3. Provide Context in Output

Instead of:
```
processData
processData
```

Do this:
```
src/index.ts:15: export function processData(input: string) {
src/utils.ts:8: function processData(raw: any) {
```

The LLM needs to know WHERE results came from.

### 4. Use Clear Labels

For list-dir:
```
[dir] src/
[file] index.ts
```

This prevents the LLM from trying to read directories as files.

## System Prompt for Filesystem Agents

When you give an agent filesystem tools, add these rules to the system prompt:

```
You have access to filesystem tools. Follow these rules:

1. ALWAYS read a file before modifying it
2. After making changes, verify by reading the file again
3. Use list_dir to explore unfamiliar directories
4. Use search_grep to find code patterns across files
5. Never assume file contents - always read first
6. When errors occur, read the error message and adjust your approach
```

These rules establish the **read-before-edit** pattern that prevents blind modifications.

## Putting It Together

Here's a complete tool implementation:

```typescript
import { Tool } from './types';
import { Sandbox } from './sandbox';
import * as fs from 'fs/promises';

export function createReadFileTool(sandbox: Sandbox): Tool {
  return {
    name: 'read_file',
    description: 'Read the entire contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file, relative to sandbox root'
        }
      },
      required: ['path']
    },
    execute: async (input: any): Promise<string> => {
      try {
        const safePath = sandbox.resolve(input.path);
        const content = await fs.readFile(safePath, 'utf-8');
        return content;
      } catch (error: any) {
        return `Error reading file: ${error.message}`;
      }
    }
  };
}
```

**Usage in agent loop:**

```typescript
const sandbox = new Sandbox('/home/user/project');
const tools = [
  createReadFileTool(sandbox),
  createWriteFileTool(sandbox),
  createListDirTool(sandbox),
  createSearchGrepTool(sandbox),
  createRunShellTool(sandbox)
];

const response = await callClaude({
  model: 'claude-sonnet-4',
  system: FILESYSTEM_AGENT_PROMPT,
  messages: [{ role: 'user', content: 'Read package.json and list dependencies' }],
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
});
```

## Testing Sandbox Security

Always test that your sandbox rejects escape attempts:

```typescript
import { Sandbox } from './sandbox';
import assert from 'assert';

const sandbox = new Sandbox('/home/user/project');

// Should work
assert.doesNotThrow(() => {
  sandbox.resolve('src/index.ts');
  sandbox.resolve('./lib/utils.ts');
  sandbox.resolve('nested/deep/file.txt');
});

// Should throw
assert.throws(() => {
  sandbox.resolve('../../etc/passwd');
});

assert.throws(() => {
  sandbox.resolve('/etc/passwd');
});

assert.throws(() => {
  sandbox.resolve('../../../../../../../etc/passwd');
});

console.log('Sandbox security tests passed!');
```

## Common Pitfalls

### 1. Forgetting to Resolve Paths

```typescript
// Wrong - bypasses sandbox
async execute(input: any) {
  return await fs.readFile(input.path, 'utf-8');
}

// Right - sandbox checks first
async execute(input: any) {
  const safePath = sandbox.resolve(input.path);
  return await fs.readFile(safePath, 'utf-8');
}
```

### 2. Throwing Errors Instead of Returning Them

```typescript
// Wrong - crashes the agent loop
async execute(input: any) {
  const safePath = sandbox.resolve(input.path);  // might throw
  return await fs.readFile(safePath, 'utf-8');   // might throw
}

// Right - returns errors as strings
async execute(input: any) {
  try {
    const safePath = sandbox.resolve(input.path);
    return await fs.readFile(safePath, 'utf-8');
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}
```

### 3. Unlimited Output

```typescript
// Wrong - could return megabytes of text
const results = allMatches.map(m => m.line).join('\n');

// Right - limit and truncate
const LIMITED = allMatches.slice(0, 50);
const output = LIMITED.map(m => `${m.file}:${m.lineNum}: ${m.line}`).join('\n');
if (allMatches.length > 50) {
  output += `\n... (truncated, ${allMatches.length - 50} more matches)`;
}
```

## Summary

Filesystem tools unlock real agent capabilities, but require careful security:

1. **Sandbox pattern**: Validate all paths with `resolve()` and `startsWith()` check
2. **Five core tools**: read, write, list, search, run
3. **Tool design**: Labels, limits, context, error handling
4. **System prompt**: Establish read-before-edit pattern

With these foundations, you can build agents that safely interact with real codebases.

## Next Steps

In the lab, you'll:
1. Implement the Sandbox class
2. Build all five filesystem tools
3. Test sandbox security with traversal attacks
4. Run a filesystem agent that explores a project

Then in Module 5, we'll add the most important tool of all: surgical file editing.
