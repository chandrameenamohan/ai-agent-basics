# Module 5: Coding Agent - Lab

## Overview

In this lab, you'll build a complete coding agent capable of reading, editing, and verifying code changes. You'll implement the `edit_file` tool using search-and-replace, write a comprehensive system prompt, and test your agent with real coding tasks.

**Time estimate:** 90 minutes

## Setup

Create your work directory:

```bash
mkdir -p module-5-coding-agent
cd module-5-coding-agent
```

You'll create these files:
- `edit-tool.ts` (or `edit_tool.py`) - The edit_file tool
- `test-edit.ts` (or `test_edit.py`) - Unit tests for editing
- `system-prompt.ts` (or `system_prompt.py`) - The 8-rule prompt
- `agent.ts` (or `agent.py`) - Complete coding agent

## Part 1: Implement edit_file Tool (30 minutes)

### Task 1.1: Create the Tool

**TypeScript** (`edit-tool.ts`):
```typescript
import { Sandbox } from '../module-4-filesystem/sandbox';
import * as fs from 'fs/promises';

export interface Tool {
  name: string;
  description: string;
  input_schema: any;
  execute: (input: any) => Promise<string>;
}

export function createEditFileTool(sandbox: Sandbox): Tool {
  return {
    name: 'edit_file',
    description: 'Replace old_string with new_string in a file. old_string must match exactly once.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to edit'
        },
        old_string: {
          type: 'string',
          description: 'The exact text to replace (must match exactly once)'
        },
        new_string: {
          type: 'string',
          description: 'The text to replace it with'
        }
      },
      required: ['path', 'old_string', 'new_string']
    },
    execute: async (input: any): Promise<string> => {
      try {
        const safePath = sandbox.resolve(input.path);

        // TODO: Read current file content
        // TODO: Count occurrences of old_string
        // TODO: Handle special case: create new file if empty
        // TODO: Return error if old_string not found
        // TODO: Return error if old_string found multiple times
        // TODO: Perform replacement
        // TODO: Write updated content back to file
        // TODO: Return success message

      } catch (error: any) {
        return `Error: ${error.message}`;
      }
    }
  };
}
```

**Python** (`edit_tool.py`):
```python
from typing import Any, Dict

class Tool:
    def __init__(self, name: str, description: str, input_schema: Dict[str, Any],
                 execute):
        self.name = name
        self.description = description
        self.input_schema = input_schema
        self.execute = execute

def create_edit_file_tool(sandbox):
    def execute(input_data: Dict[str, Any]) -> str:
        try:
            safe_path = sandbox.resolve(input_data['path'])

            # TODO: Read current file content
            # TODO: Count occurrences of old_string
            # TODO: Handle special case: create new file if empty
            # TODO: Return error if old_string not found
            # TODO: Return error if old_string found multiple times
            # TODO: Perform replacement
            # TODO: Write updated content back to file
            # TODO: Return success message

        except Exception as e:
            return f'Error: {e}'

    return Tool(
        name='edit_file',
        description='Replace old_string with new_string in a file. old_string must match exactly once.',
        input_schema={
            'type': 'object',
            'properties': {
                'path': {'type': 'string', 'description': 'Path to the file to edit'},
                'old_string': {'type': 'string', 'description': 'The exact text to replace (must match exactly once)'},
                'new_string': {'type': 'string', 'description': 'The text to replace it with'}
            },
            'required': ['path', 'old_string', 'new_string']
        },
        execute=execute
    )
```

**Hints:**
- Count occurrences: `content.split(oldStr).length - 1` (TS) or `content.count(old_str)` (Python)
- Check for empty file: `content === ''` or `content == ''`
- Use `content.replace(oldStr, newStr)` for replacement (replaces first match in both languages)

### Task 1.2: Write Unit Tests

Create `test-edit.ts` (or `test_edit.py`) to test all scenarios:

**TypeScript:**
```typescript
import { Sandbox } from '../module-4-filesystem/sandbox';
import { createEditFileTool } from './edit-tool';
import * as fs from 'fs/promises';
import * as path from 'path';

async function setupTestDir() {
  const testDir = path.join(process.cwd(), 'test-edit-sandbox');
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

async function cleanup(testDir: string) {
  await fs.rm(testDir, { recursive: true, force: true });
}

async function runTests() {
  const testDir = await setupTestDir();
  const sandbox = new Sandbox(testDir);
  const editTool = createEditFileTool(sandbox);

  console.log('Running edit_file tests...\n');

  // Test 1: Create new file
  console.log('Test 1: Create new file with empty old_string');
  let result = await editTool.execute({
    path: 'new.txt',
    old_string: '',
    new_string: 'Hello, world!'
  });
  console.log(result);
  const content1 = await fs.readFile(path.join(testDir, 'new.txt'), 'utf-8');
  console.log('Content:', content1);
  console.log(content1 === 'Hello, world!' ? '✓ PASSED\n' : '✗ FAILED\n');

  // Test 2: Edit existing file
  console.log('Test 2: Edit existing file');
  result = await editTool.execute({
    path: 'new.txt',
    old_string: 'Hello, world!',
    new_string: 'Hello, TypeScript!'
  });
  console.log(result);
  const content2 = await fs.readFile(path.join(testDir, 'new.txt'), 'utf-8');
  console.log('Content:', content2);
  console.log(content2 === 'Hello, TypeScript!' ? '✓ PASSED\n' : '✗ FAILED\n');

  // Test 3: Error - old_string not found
  console.log('Test 3: Error when old_string not found');
  result = await editTool.execute({
    path: 'new.txt',
    old_string: 'Python',
    new_string: 'JavaScript'
  });
  console.log(result);
  console.log(result.includes('Error') && result.includes('not found') ? '✓ PASSED\n' : '✗ FAILED\n');

  // Test 4: Error - multiple matches
  console.log('Test 4: Error when multiple matches');
  await fs.writeFile(path.join(testDir, 'multi.txt'), 'test\ntest\ntest');
  result = await editTool.execute({
    path: 'multi.txt',
    old_string: 'test',
    new_string: 'modified'
  });
  console.log(result);
  console.log(result.includes('Error') && result.includes('times') ? '✓ PASSED\n' : '✗ FAILED\n');

  // Test 5: Multi-line replacement
  console.log('Test 5: Multi-line replacement');
  await fs.writeFile(path.join(testDir, 'code.ts'),
    'function hello() {\n  return "world";\n}');
  result = await editTool.execute({
    path: 'code.ts',
    old_string: 'function hello() {\n  return "world";\n}',
    new_string: 'function hello() {\n  return "universe";\n}'
  });
  console.log(result);
  const content5 = await fs.readFile(path.join(testDir, 'code.ts'), 'utf-8');
  console.log('Content:', content5);
  console.log(content5.includes('universe') ? '✓ PASSED\n' : '✗ FAILED\n');

  await cleanup(testDir);
  console.log('All tests complete!');
}

runTests().catch(console.error);
```

**Run your tests:**
```bash
bun test-edit.ts
```

**Expected output:**
```
Running edit_file tests...

Test 1: Create new file with empty old_string
Created new file: new.txt
Content: Hello, world!
✓ PASSED

Test 2: Edit existing file
Successfully edited new.txt
Content: Hello, TypeScript!
✓ PASSED

Test 3: Error when old_string not found
Error: old_string not found in new.txt
✓ PASSED

Test 4: Error when multiple matches
Error: old_string found 3 times in multi.txt. Please include more context to make it unique.
✓ PASSED

Test 5: Multi-line replacement
Successfully edited code.ts
Content: function hello() {
  return "universe";
}
✓ PASSED

All tests complete!
```

## Part 2: Write System Prompt (20 minutes)

### Task 2.1: Create the Eight Rules

Create `system-prompt.ts` (or `system_prompt.py`):

**TypeScript:**
```typescript
export const CODING_AGENT_PROMPT = `You are a coding agent with access to file operations and editing tools.

Follow these rules:

1. ALWAYS read a file before editing it
   - [TODO: Add explanation]

2. After making changes, verify by reading the file again
   - [TODO: Add explanation]

3. Think step-by-step before acting:
   - [TODO: Add steps]

4. Make minimal, targeted changes
   - [TODO: Add guidelines]

5. When fixing bugs, understand the root cause first
   - [TODO: Add guidelines]

6. Use search_grep to find relevant code patterns
   - [TODO: Add guidelines]

7. Work through steps one at a time
   - [TODO: Add guidelines]

8. For new files, follow the existing code style
   - [TODO: Add guidelines]
`;
```

**Your task:** Fill in each rule with detailed explanations. Reference the handout for the complete text.

### Task 2.2: Test Prompt Clarity

Read your prompt and ask:
- [ ] Is each rule specific and actionable?
- [ ] Would an LLM understand when to apply each rule?
- [ ] Do the rules prevent common mistakes?
- [ ] Is the language clear and unambiguous?

## Part 3: Build Complete Coding Agent (30 minutes)

### Task 3.1: Assemble the Agent

Create `agent.ts` (or `agent.py`):

**TypeScript:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import { Sandbox } from '../module-4-filesystem/sandbox';
import {
  createReadFileTool,
  createWriteFileTool,
  createListDirTool,
  createSearchGrepTool
} from '../module-4-filesystem/tools';
import { createEditFileTool } from './edit-tool';
import { CODING_AGENT_PROMPT } from './system-prompt';

async function runCodingAgent(userRequest: string, sandboxRoot: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sandbox = new Sandbox(sandboxRoot);

  // Combine file tools with edit tool
  const tools = [
    createReadFileTool(sandbox),
    createWriteFileTool(sandbox),
    createListDirTool(sandbox),
    createSearchGrepTool(sandbox),
    createEditFileTool(sandbox)  // The key addition
  ];

  const messages: any[] = [{ role: 'user', content: userRequest }];
  const maxTurns = 30;

  console.log(`User: ${userRequest}\n`);

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: CODING_AGENT_PROMPT,
      messages,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }))
    });

    // Log tool uses for debugging
    const toolUses = response.content.filter((b: any) => b.type === 'tool_use');
    if (toolUses.length > 0) {
      console.log(`Turn ${turn + 1} - Tool uses:`);
      toolUses.forEach((t: any) => {
        console.log(`  - ${t.name}(${JSON.stringify(t.input).slice(0, 60)}...)`);
      });
    }

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter((b: any) => b.type === 'text');
      const finalResponse = textBlocks.map((b: any) => b.text).join('\n');
      console.log(`\nAgent: ${finalResponse}\n`);
      return finalResponse;
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

  console.log('Max turns reached');
  return 'Max turns reached';
}

// Example usage
async function main() {
  const testProject = './test-project';

  // Create test project with a file to edit
  const fs = require('fs/promises');
  await fs.mkdir(testProject, { recursive: true });
  await fs.writeFile(
    `${testProject}/math.ts`,
    'export function add(a: number, b: number) {\n  return a + b;\n}\n\nexport function multiply(a: number, b: number) {\n  return a * b;\n}'
  );

  // Test the agent
  await runCodingAgent(
    'In math.ts, add a new function called subtract that takes two numbers and returns their difference',
    testProject
  );
}

main().catch(console.error);
```

**Python equivalent** (`agent.py`):
```python
import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

# Import your tools
from module_4_filesystem.sandbox import Sandbox
from module_4_filesystem.tools import (
    create_read_file_tool,
    create_write_file_tool,
    create_list_dir_tool,
    create_search_grep_tool
)
from edit_tool import create_edit_file_tool
from system_prompt import CODING_AGENT_PROMPT

def run_coding_agent(user_request: str, sandbox_root: str):
    client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
    sandbox = Sandbox(sandbox_root)

    tools = [
        create_read_file_tool(sandbox),
        create_write_file_tool(sandbox),
        create_list_dir_tool(sandbox),
        create_search_grep_tool(sandbox),
        create_edit_file_tool(sandbox)
    ]

    messages = [{'role': 'user', 'content': user_request}]
    max_turns = 30

    print(f'User: {user_request}\n')

    for turn in range(max_turns):
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=4096,
            system=CODING_AGENT_PROMPT,
            messages=messages,
            tools=[{
                'name': t.name,
                'description': t.description,
                'input_schema': t.input_schema
            } for t in tools]
        )

        # Log tool uses
        tool_uses = [b for b in response.content if b.type == 'tool_use']
        if tool_uses:
            print(f'Turn {turn + 1} - Tool uses:')
            for t in tool_uses:
                print(f'  - {t.name}(...)')

        messages.append({'role': 'assistant', 'content': response.content})

        if response.stop_reason == 'end_turn':
            text_blocks = [b for b in response.content if b.type == 'text']
            final_response = '\n'.join(b.text for b in text_blocks)
            print(f'\nAgent: {final_response}\n')
            return final_response

        # Execute tools
        tool_results = []
        for block in response.content:
            if block.type == 'tool_use':
                tool = next(t for t in tools if t.name == block.name)
                result = tool.execute(block.input)
                tool_results.append({
                    'type': 'tool_result',
                    'tool_use_id': block.id,
                    'content': result
                })

        messages.append({'role': 'user', 'content': tool_results})

    return 'Max turns reached'
```

### Task 3.2: Run Test Scenarios

Test your agent with these tasks:

**Scenario 1: Simple Addition**
```typescript
await runCodingAgent(
  'In math.ts, add a subtract function',
  './test-project'
);
```

**Expected behavior:**
1. read_file('math.ts')
2. edit_file to add the function
3. read_file to verify

**Scenario 2: Bug Fix**
```typescript
// First, create a file with a bug
await fs.writeFile(
  `${testProject}/greet.ts`,
  'export function greet(name: string) {\n  return "Hello, " + nam;\n}'
);

await runCodingAgent(
  'Fix the bug in greet.ts - the variable name is misspelled',
  './test-project'
);
```

**Expected behavior:**
1. read_file to see the bug
2. edit_file to fix 'nam' → 'name'
3. read_file to verify

**Scenario 3: Multi-File Search**
```typescript
await runCodingAgent(
  'Find all functions named "multiply" and show me where they are',
  './test-project'
);
```

**Expected behavior:**
1. search_grep for 'multiply'
2. Return findings

## Part 4: Debugging and Refinement (10 minutes)

### Task 4.1: Common Issues

If your agent isn't working correctly, check:

**Issue 1: Agent doesn't verify after editing**
- Fix: Add emphasis in rule 2 of system prompt
- Add example: "After editing, always read the file to confirm"

**Issue 2: Agent makes overly large edits**
- Fix: Strengthen rule 4 about minimal changes
- Add: "Include only the lines you're changing plus 1-2 lines of context"

**Issue 3: Agent doesn't handle multiple matches well**
- Fix: When error says "found N times", re-read the file and add more context lines

**Issue 4: Sandbox path errors**
- Fix: Ensure all tools use `sandbox.resolve()` before file operations

### Task 4.2: Log Analysis

Add logging to understand agent behavior:

```typescript
console.log(`\n=== Turn ${turn + 1} ===`);
console.log('Tool uses:', toolUses.map(t => t.name));
console.log('Tool inputs:', toolUses.map(t => JSON.stringify(t.input, null, 2)));
```

Look for:
- Is it reading before editing?
- Is it verifying after editing?
- Are edits minimal and targeted?

## Challenges

### Challenge 1: Refactoring Agent
Build an agent that can refactor code:
- Rename variables across files
- Extract functions
- Move code between files

### Challenge 2: Test Generator
Build an agent that:
- Reads implementation
- Generates unit tests
- Runs tests to verify

### Challenge 3: Documentation Generator
Build an agent that:
- Reads code
- Generates JSDoc/docstring comments
- Adds README sections

## Submission

Your completed lab should include:
1. `edit-tool.ts/py` - Working edit tool with all tests passing
2. `system-prompt.ts/py` - Complete 8-rule prompt
3. `agent.ts/py` - Working coding agent
4. Logs from three test scenarios showing read-edit-verify pattern

## Key Takeaways

- Search-and-replace is superior to line-number editing for LLMs
- Exactly-one-match requirement forces precision and clarity
- The 8-rule system prompt establishes safe coding patterns
- Read-edit-verify is the fundamental pattern for code changes
- Small, targeted edits are more reliable than large changes
- Error messages guide the agent to self-correct
