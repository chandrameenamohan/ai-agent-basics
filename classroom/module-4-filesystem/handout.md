# Module 4: Filesystem Tools - Handout

## Sandbox Security Pattern

### TypeScript
```typescript
import * as path from 'path';

class Sandbox {
  constructor(public readonly root: string) {
    this.root = path.resolve(root);
  }

  resolve(filePath: string): string {
    const resolved = path.resolve(this.root, filePath);
    if (!resolved.startsWith(this.root)) {
      throw new Error(`Path "${filePath}" escapes sandbox root`);
    }
    return resolved;
  }
}
```

### Python
```python
import os

class Sandbox:
    def __init__(self, root: str):
        self.root = os.path.realpath(root)

    def resolve(self, file_path: str) -> str:
        resolved = os.path.realpath(os.path.join(self.root, file_path))
        if not resolved.startswith(self.root):
            raise ValueError(f'Path "{file_path}" escapes sandbox root')
        return resolved
```

## The Five Filesystem Tools

### 1. read_file
```json
{
  "name": "read_file",
  "description": "Read the entire contents of a file",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "File path relative to sandbox" }
    },
    "required": ["path"]
  }
}
```

### 2. write_file
```json
{
  "name": "write_file",
  "description": "Write content to a file (creates or overwrites)",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "File path" },
      "content": { "type": "string", "description": "Content to write" }
    },
    "required": ["path", "content"]
  }
}
```

### 3. list_dir
```json
{
  "name": "list_dir",
  "description": "List all files and directories in a path",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": { "type": "string", "description": "Directory path (default: root)" }
    }
  }
}
```

**Output format:**
```
[dir] src/
[dir] tests/
[file] package.json
[file] tsconfig.json
```

### 4. search_grep
```json
{
  "name": "search_grep",
  "description": "Search for a pattern in files (supports regex)",
  "input_schema": {
    "type": "object",
    "properties": {
      "pattern": { "type": "string", "description": "Regex pattern" },
      "path": { "type": "string", "description": "Directory to search" },
      "file_pattern": { "type": "string", "description": "File filter (e.g., '*.ts')" }
    },
    "required": ["pattern"]
  }
}
```

**Output format:**
```
src/index.ts:15: export function processData(input: string) {
src/utils.ts:8: function processData(raw: any) {
```

**Limit to 50 lines to avoid token bloat.**

### 5. run_shell
```json
{
  "name": "run_shell",
  "description": "Execute a shell command in the sandbox directory",
  "input_schema": {
    "type": "object",
    "properties": {
      "command": { "type": "string", "description": "Shell command" }
    },
    "required": ["command"]
  }
}
```

**Security:**
- 30-second timeout
- Block dangerous commands: `rm -rf`, `dd`, `mkfs`, etc.
- Run in sandbox directory as cwd

## Tool Design Principles

### 1. Return Strings, Never Throw
```typescript
async execute(input: any): Promise<string> {
  try {
    const result = await doWork(input);
    return result;
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}
```

### 2. Limit Output Size
```typescript
const MAX_GREP_LINES = 50;
const MAX_DIR_ENTRIES = 200;
const MAX_OUTPUT_CHARS = 10000;
```

### 3. Provide Context
```typescript
// Bad
"processData"

// Good
"src/index.ts:15: export function processData(input: string) {"
```

### 4. Use Clear Labels
```typescript
// For directories
"[dir] src/"

// For files
"[file] index.ts"
```

## System Prompt Rules

```
You have access to filesystem tools. Follow these rules:

1. ALWAYS read a file before modifying it
2. After making changes, verify by reading the file again
3. Use list_dir to explore unfamiliar directories
4. Use search_grep to find code patterns across files
5. Never assume file contents - always read first
6. When errors occur, read the error message and adjust your approach
```

## Security Testing

```typescript
const sandbox = new Sandbox('/home/user/project');

// Should work
sandbox.resolve('src/index.ts');
sandbox.resolve('./lib/utils.ts');

// Should throw
sandbox.resolve('../../etc/passwd');
sandbox.resolve('/etc/passwd');
```

## Quick Reference

| Tool | Purpose | Key Parameter |
|------|---------|---------------|
| read_file | Read file contents | path |
| write_file | Create/overwrite file | path, content |
| list_dir | Show directory contents | path (optional) |
| search_grep | Find code patterns | pattern, file_pattern |
| run_shell | Execute commands | command |

## Common Patterns

### Read-Before-Edit
```
1. list_dir to explore
2. read_file to understand
3. write_file to modify
4. read_file to verify
```

### Search-Then-Read
```
1. search_grep to find relevant files
2. read_file to examine matches
3. Plan changes based on context
```

### Test-Driven Development
```
1. write_file to create test
2. run_shell to execute tests
3. read_file to examine failures
4. write_file to fix code
5. run_shell to verify
```
