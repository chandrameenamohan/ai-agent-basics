# Module 4: Filesystem Tools - Lab

## Overview

In this lab, you'll build a secure filesystem toolkit for AI agents. You'll implement sandbox security, create five core file tools, and test that your sandbox blocks path traversal attacks.

**Time estimate:** 90 minutes

## Setup

Create your work directory:

```bash
mkdir -p module-4-filesystem
cd module-4-filesystem
```

You'll create these files:
- `sandbox.ts` (or `sandbox.py`) - Sandbox class with path validation
- `tools.ts` (or `tools.py`) - Five filesystem tools
- `test-sandbox.ts` (or `test_sandbox.py`) - Security tests
- `agent.ts` (or `agent.py`) - Complete filesystem agent

## Part 1: Implement Sandbox (20 minutes)

The sandbox validates that all file paths stay within a designated root directory.

### Task 1.1: Create Sandbox Class

**TypeScript** (`sandbox.ts`):
```typescript
import * as path from 'path';

export class Sandbox {
  public readonly root: string;

  constructor(root: string) {
    // TODO: Store the absolute path to root
  }

  resolve(filePath: string): string {
    // TODO: Resolve the path relative to root
    // TODO: Check if resolved path starts with root
    // TODO: Throw error if path escapes sandbox
    // TODO: Return the safe absolute path
  }
}
```

**Python** (`sandbox.py`):
```python
import os

class Sandbox:
    def __init__(self, root: str):
        # TODO: Store the absolute path to root
        pass

    def resolve(self, file_path: str) -> str:
        # TODO: Join file_path with root and resolve to absolute
        # TODO: Check if resolved path starts with root
        # TODO: Raise ValueError if path escapes sandbox
        # TODO: Return the safe absolute path
        pass
```

**Hints:**
- TypeScript: Use `path.resolve()` to get absolute paths
- Python: Use `os.path.realpath()` to resolve paths
- Check containment with `startsWith()` (TS) or `.startswith()` (Python)

### Task 1.2: Test Sandbox Security

Create `test-sandbox.ts` (or `test_sandbox.py`):

**TypeScript:**
```typescript
import { Sandbox } from './sandbox';

const sandbox = new Sandbox('/home/user/project');

// Test 1: Valid relative paths should work
console.log('Test 1: Valid paths...');
try {
  console.log(sandbox.resolve('src/index.ts'));
  console.log(sandbox.resolve('./lib/utils.ts'));
  console.log(sandbox.resolve('nested/deep/file.txt'));
  console.log('✓ Valid paths work\n');
} catch (error) {
  console.log('✗ Valid paths failed\n');
}

// Test 2: Parent directory traversal should fail
console.log('Test 2: Traversal attacks...');
const attacks = [
  '../../etc/passwd',
  '/etc/passwd',
  '../../../../../../../etc/passwd',
  '../../../../bin/bash'
];

for (const attack of attacks) {
  try {
    sandbox.resolve(attack);
    console.log(`✗ SECURITY FAILURE: ${attack} was allowed`);
  } catch (error) {
    console.log(`✓ Blocked: ${attack}`);
  }
}

console.log('\nSandbox security tests complete!');
```

**Python:**
```python
from sandbox import Sandbox

sandbox = Sandbox('/home/user/project')

# Test 1: Valid relative paths should work
print('Test 1: Valid paths...')
try:
    print(sandbox.resolve('src/index.ts'))
    print(sandbox.resolve('./lib/utils.ts'))
    print(sandbox.resolve('nested/deep/file.txt'))
    print('✓ Valid paths work\n')
except Exception as e:
    print(f'✗ Valid paths failed: {e}\n')

# Test 2: Parent directory traversal should fail
print('Test 2: Traversal attacks...')
attacks = [
    '../../etc/passwd',
    '/etc/passwd',
    '../../../../../../../etc/passwd',
    '../../../../bin/bash'
]

for attack in attacks:
    try:
        sandbox.resolve(attack)
        print(f'✗ SECURITY FAILURE: {attack} was allowed')
    except ValueError:
        print(f'✓ Blocked: {attack}')

print('\nSandbox security tests complete!')
```

**Run your tests:**
```bash
# TypeScript
bun test-sandbox.ts

# Python
python test_sandbox.py
```

**Expected output:**
```
Test 1: Valid paths...
/home/user/project/src/index.ts
/home/user/project/lib/utils.ts
/home/user/project/nested/deep/file.txt
✓ Valid paths work

Test 2: Traversal attacks...
✓ Blocked: ../../etc/passwd
✓ Blocked: /etc/passwd
✓ Blocked: ../../../../../../../etc/passwd
✓ Blocked: ../../../../bin/bash

Sandbox security tests complete!
```

## Part 2: Create Filesystem Tools (40 minutes)

Now implement the five core tools. Each tool uses the sandbox for path validation.

### Task 2.1: read_file Tool

Create `tools.ts` (or `tools.py`). Start with the read_file tool:

**TypeScript:**
```typescript
import { Sandbox } from './sandbox';
import * as fs from 'fs/promises';

export interface Tool {
  name: string;
  description: string;
  input_schema: any;
  execute: (input: any) => Promise<string>;
}

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
        // TODO: Use sandbox.resolve() to get safe path
        // TODO: Read file with fs.readFile()
        // TODO: Return content
      } catch (error: any) {
        return `Error reading file: ${error.message}`;
      }
    }
  };
}
```

**Python:**
```python
from sandbox import Sandbox
from typing import Any, Callable, Dict

class Tool:
    def __init__(self, name: str, description: str, input_schema: Dict[str, Any],
                 execute: Callable[[Any], str]):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.execute = execute

def create_read_file_tool(sandbox: Sandbox) -> Tool:
    def execute(input_data: Dict[str, Any]) -> str:
        try:
            # TODO: Use sandbox.resolve() to get safe path
            # TODO: Read file
            # TODO: Return content
            pass
        except Exception as e:
            return f'Error reading file: {e}'

    return Tool(
        name='read_file',
        description='Read the entire contents of a file',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {
                    'type': 'string',
                    'description': 'Path to the file, relative to sandbox root'
                }
            },
            'required': ['path']
        },
        execute=execute
    )
```

### Task 2.2: write_file Tool

**TypeScript:**
```typescript
export function createWriteFileTool(sandbox: Sandbox): Tool {
  return {
    name: 'write_file',
    description: 'Write content to a file (creates or overwrites)',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['path', 'content']
    },
    execute: async (input: any): Promise<string> => {
      try {
        // TODO: Resolve path
        // TODO: Create parent directories if needed (fs.mkdir with recursive: true)
        // TODO: Write file
        // TODO: Return success message
      } catch (error: any) {
        return `Error writing file: ${error.message}`;
      }
    }
  };
}
```

**Python:**
```python
def create_write_file_tool(sandbox: Sandbox) -> Tool:
    def execute(input_data: Dict[str, Any]) -> str:
        try:
            # TODO: Resolve path
            # TODO: Create parent directories if needed (os.makedirs)
            # TODO: Write file
            # TODO: Return success message
            pass
        except Exception as e:
            return f'Error writing file: {e}'

    return Tool(
        name='write_file',
        description='Write content to a file (creates or overwrites)',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'Path to the file'},
                'content': {'type': 'string', 'description': 'Content to write'}
            },
            'required': ['path', 'content']
        },
        execute=execute
    )
```

### Task 2.3: list_dir Tool

**Key requirement:** Label entries with `[dir]` or `[file]`.

**TypeScript:**
```typescript
export function createListDirTool(sandbox: Sandbox): Tool {
  return {
    name: 'list_dir',
    description: 'List all files and directories in a path',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path (default: root)' }
      }
    },
    execute: async (input: any): Promise<string> => {
      try {
        const dirPath = input.path || '.';
        // TODO: Resolve path
        // TODO: Read directory with fs.readdir()
        // TODO: For each entry, check if it's a directory
        // TODO: Format as "[dir] name/" or "[file] name"
        // TODO: Sort alphabetically
        // TODO: Return formatted list
      } catch (error: any) {
        return `Error listing directory: ${error.message}`;
      }
    }
  };
}
```

**Python:**
```python
def create_list_dir_tool(sandbox: Sandbox) -> Tool:
    def execute(input_data: Dict[str, Any]) -> str:
        try:
            dir_path = input_data.get('path', '.')
            # TODO: Resolve path
            # TODO: List directory contents
            # TODO: Check each entry with os.path.isdir()
            # TODO: Format as "[dir] name/" or "[file] name"
            # TODO: Sort alphabetically
            # TODO: Return formatted list
            pass
        except Exception as e:
            return f'Error listing directory: {e}'

    return Tool(
        name='list_dir',
        description='List all files and directories in a path',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'Directory path (default: root)'}
            }
        },
        execute=execute
    )
```

### Task 2.4: search_grep Tool

**Key requirement:** Limit output to 50 lines.

**TypeScript starter:**
```typescript
export function createSearchGrepTool(sandbox: Sandbox): Tool {
  return {
    name: 'search_grep',
    description: 'Search for a pattern in files (supports regex)',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regex pattern' },
        path: { type: 'string', description: 'Directory to search' },
        file_pattern: { type: 'string', description: "File filter (e.g., '*.ts')" }
      },
      required: ['pattern']
    },
    execute: async (input: any): Promise<string> => {
      // TODO: Resolve path
      // TODO: Recursively walk directory
      // TODO: Filter files by file_pattern if provided
      // TODO: Search each file for pattern
      // TODO: Collect matches with format "file:line: content"
      // TODO: Limit to first 50 matches
      // TODO: Return results
    }
  };
}
```

### Task 2.5: run_shell Tool

**Key requirements:**
- 30-second timeout
- Block dangerous commands
- Run in sandbox directory

**TypeScript starter:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DANGEROUS_COMMANDS = ['rm -rf', 'dd', 'mkfs', '> /dev/'];

export function createRunShellTool(sandbox: Sandbox): Tool {
  return {
    name: 'run_shell',
    description: 'Execute a shell command in the sandbox directory',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command' }
      },
      required: ['command']
    },
    execute: async (input: any): Promise<string> => {
      try {
        // TODO: Check if command contains dangerous patterns
        // TODO: Execute with timeout and cwd set to sandbox.root
        // TODO: Return stdout/stderr
      } catch (error: any) {
        return `Error executing command: ${error.message}`;
      }
    }
  };
}
```

## Part 3: Test Your Tools (20 minutes)

Create a test directory and verify your tools work:

```typescript
// test-tools.ts
import { Sandbox } from './sandbox';
import {
  createReadFileTool,
  createWriteFileTool,
  createListDirTool
} from './tools';

async function main() {
  const sandbox = new Sandbox('./test-project');
  const readFile = createReadFileTool(sandbox);
  const writeFile = createWriteFileTool(sandbox);
  const listDir = createListDirTool(sandbox);

  // Test write
  console.log('Writing test file...');
  console.log(await writeFile.execute({
    path: 'hello.txt',
    content: 'Hello, world!'
  }));

  // Test read
  console.log('\nReading test file...');
  console.log(await readFile.execute({ path: 'hello.txt' }));

  // Test list
  console.log('\nListing directory...');
  console.log(await listDir.execute({ path: '.' }));
}

main();
```

**Run:**
```bash
mkdir -p test-project
bun test-tools.ts
```

**Expected output:**
```
Writing test file...
Successfully wrote to hello.txt

Reading test file...
Hello, world!

Listing directory...
[file] hello.txt
```

## Part 4: Build a Filesystem Agent (10 minutes)

Create a simple agent that uses your tools:

```typescript
// agent.ts
import Anthropic from '@anthropic-ai/sdk';
import { Sandbox } from './sandbox';
import { createReadFileTool, createWriteFileTool, createListDirTool } from './tools';

const SYSTEM_PROMPT = `You have access to filesystem tools. Follow these rules:

1. ALWAYS read a file before modifying it
2. After making changes, verify by reading the file again
3. Use list_dir to explore unfamiliar directories
4. Never assume file contents - always read first`;

async function runAgent(userMessage: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sandbox = new Sandbox('./test-project');

  const tools = [
    createReadFileTool(sandbox),
    createWriteFileTool(sandbox),
    createListDirTool(sandbox)
  ];

  const messages: any[] = [{ role: 'user', content: userMessage }];

  for (let turn = 0; turn < 10; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }))
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter((b: any) => b.type === 'text');
      console.log(textBlocks.map((b: any) => b.text).join('\n'));
      break;
    }

    // Execute tools
    const toolResults = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const tool = tools.find(t => t.name === block.name);
        const result = await tool!.execute(block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }
}

runAgent('List the files in the current directory, then create a file called notes.txt with the content "Learning filesystem tools"');
```

**Run:**
```bash
bun agent.ts
```

## Challenges

### Challenge 1: Recursive Directory Copy
Add a tool that copies entire directory trees.

### Challenge 2: Safe Delete
Add a `delete_file` tool with confirmation for important files.

### Challenge 3: Diff Tool
Add a tool that shows differences between two files.

## Submission

Your completed lab should include:
1. `sandbox.ts/py` - Working sandbox with security tests passing
2. `tools.ts/py` - All five tools implemented
3. `agent.ts/py` - Working agent demonstration
4. Screenshot or log of your agent successfully using filesystem tools

## Key Takeaways

- Path traversal is a real security risk - always validate paths
- The sandbox pattern (resolve + startsWith) provides strong protection
- Tools should return errors as strings, not throw exceptions
- Limiting output prevents token bloat
- Clear labeling ([dir]/[file]) helps LLMs make better decisions
