# Module 5: Coding Agent - Tutorial

## Introduction

You now have an agent with filesystem tools. It can read, write, and search files. But there's a problem: when editing code, the `write_file` tool is too blunt. It overwrites entire files, losing all existing content.

What we need is **surgical editing** - the ability to change specific parts of a file while preserving everything else. This module introduces the `edit_file` tool and the patterns that make coding agents effective.

## The Problem with write_file

Imagine you want to fix a typo in one function. With `write_file`, the agent must:

1. Read the entire file
2. Generate the complete file content with the fix
3. Write the entire file back

**Problems:**
- Token-intensive: Large files cost lots of tokens to regenerate
- Error-prone: Easy to accidentally delete or corrupt parts of the file
- No surgical precision: Can't target specific changes

**What we really want:**
```
"In file.ts, change 'teh' to 'the' in the processData function"
```

Not:
```
"In file.ts, rewrite the entire file with this change..."
```

## Approaches to File Editing

### Approach 1: Line-Number Editing (Bad)

```typescript
{
  name: "edit_file",
  input_schema: {
    start_line: { type: "number" },
    end_line: { type: "number" },
    new_content: { type: "string" }
  }
}
```

**Why this fails:**
- LLMs hallucinate line numbers
- Line numbers change after every edit
- Hard to specify multi-line changes precisely

**Example of failure:**
```
LLM: "Replace lines 15-17 with..."
Reality: The function actually spans lines 14-18
Result: Corrupted file
```

### Approach 2: Search-and-Replace (Good)

```typescript
{
  name: "edit_file",
  input_schema: {
    path: { type: "string" },
    old_string: { type: "string" },
    new_string: { type: "string" }
  }
}
```

**Why this works:**
- LLMs are good at working with text, not numbers
- The exact text to replace is explicit
- No line numbers to hallucinate
- Easy to validate (must match exactly once)

**Example:**
```typescript
edit_file({
  path: "src/utils.ts",
  old_string: "function processData(input: string) {\n  return input.toUppercase();",
  new_string: "function processData(input: string) {\n  return input.toUpperCase();"
})
```

The LLM copies the exact existing text (including context) and specifies the exact replacement. Clear and unambiguous.

## The edit_file Tool Design

### Input Schema

```typescript
{
  name: "edit_file",
  description: "Replace old_string with new_string in a file. old_string must match exactly once.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file to edit"
      },
      old_string: {
        type: "string",
        description: "The exact text to replace (must match exactly once)"
      },
      new_string: {
        type: "string",
        description: "The text to replace it with"
      }
    },
    required: ["path", "old_string", "new_string"]
  }
}
```

### Core Logic

```typescript
async function editFile(path: string, oldStr: string, newStr: string): Promise<string> {
  // 1. Read current content
  const content = await fs.readFile(path, 'utf-8');

  // 2. Count occurrences
  const occurrences = content.split(oldStr).length - 1;

  // 3. Handle special case: create new file
  if (occurrences === 0 && content === '') {
    await fs.writeFile(path, newStr, 'utf-8');
    return `Created new file: ${path}`;
  }

  // 4. Validate: must match exactly once
  if (occurrences === 0) {
    return `Error: old_string not found in ${path}`;
  }

  if (occurrences > 1) {
    return `Error: old_string found ${occurrences} times in ${path}. ` +
           `Please include more context to make it unique.`;
  }

  // 5. Perform replacement
  const updated = content.replace(oldStr, newStr);

  // 6. Write back
  await fs.writeFile(path, updated, 'utf-8');

  return `Successfully edited ${path}`;
}
```

### Python Equivalent

```python
def edit_file(path: str, old_str: str, new_str: str) -> str:
    # 1. Read current content
    with open(path, 'r') as f:
        content = f.read()

    # 2. Count occurrences
    occurrences = content.count(old_str)

    # 3. Handle special case: create new file
    if occurrences == 0 and content == '':
        with open(path, 'w') as f:
            f.write(new_str)
        return f'Created new file: {path}'

    # 4. Validate: must match exactly once
    if occurrences == 0:
        return f'Error: old_string not found in {path}'

    if occurrences > 1:
        return (f'Error: old_string found {occurrences} times in {path}. '
                f'Please include more context to make it unique.')

    # 5. Perform replacement
    updated = content.replace(old_str, new_str)

    # 6. Write back
    with open(path, 'w') as f:
        f.write(updated)

    return f'Successfully edited {path}'
```

## Key Design Decisions

### 1. Exactly One Match Required

Why not allow multiple replacements?

```typescript
if (occurrences > 1) {
  return `Error: Found ${occurrences} times. Include more context.`;
}
```

**Reason:** When multiple matches exist, the LLM's intent is ambiguous. Should we replace all occurrences? Just the first? Making it an error forces the LLM to be specific.

**Example:**

File contains:
```javascript
function process(x) { return x * 2; }
function process(y) { return y * 3; }
```

If LLM says:
```
old_string: "function process"
```

Which function should we edit? Both? By requiring exactly one match, the LLM must specify:

```
old_string: "function process(x) { return x * 2; }"
```

Now it's unambiguous.

### 2. Empty old_string = Create File

```typescript
if (occurrences === 0 && content === '') {
  await fs.writeFile(path, newStr, 'utf-8');
  return `Created new file: ${path}`;
}
```

This allows the edit tool to double as a file creation tool:

```typescript
edit_file({
  path: "new-file.ts",
  old_string: "",  // File doesn't exist yet
  new_string: "export function hello() { console.log('Hello!'); }"
})
```

Simplifies the tool set - one tool for both editing and creating.

### 3. Errors as Strings

```typescript
return `Error: old_string not found in ${path}`;
```

Never throw. The agent needs to read the error and adapt. Maybe it misread the file content, or needs to search first.

## The System Prompt

Tools alone aren't enough. You need a system prompt that teaches the agent how to use them effectively.

### The Eight Rules of Coding Agents

```
You are a coding agent with access to file operations and editing tools.

Follow these rules:

1. ALWAYS read a file before editing it
   - Never assume file contents
   - Use read_file to see the current state

2. After making changes, verify by reading the file again
   - Confirm your edit had the desired effect
   - Check for syntax errors or unintended changes

3. Think step-by-step before acting:
   - Understand: What is the user asking for?
   - Explore: What files are relevant?
   - Plan: What changes are needed?
   - Implement: Make the minimal necessary changes
   - Verify: Confirm the changes worked

4. Make minimal, targeted changes
   - Don't refactor unless asked
   - Don't add features beyond the request
   - Don't change code style unless fixing bugs

5. When fixing bugs, understand the root cause first
   - Don't just patch symptoms
   - Use search_grep to find related code
   - Consider edge cases and side effects

6. Use search_grep to find relevant code patterns
   - Search before editing if you don't know the structure
   - Find all usages of functions/variables you're changing

7. Work through steps one at a time
   - Complete one task before starting the next
   - Don't make multiple unrelated changes in one turn

8. For new files, follow the existing code style
   - Read similar files in the project
   - Match indentation, naming, and structure
```

### Why Each Rule Matters

**Rule 1: Read before editing**
Prevents blind edits. The LLM needs to know the exact current state.

**Rule 2: Verify after editing**
Catches errors immediately. Better to find out now than three edits later.

**Rule 3: Think step-by-step**
Prevents impulsive actions. Forces a deliberate, methodical approach.

**Rule 4: Minimal changes**
Reduces risk. Each change is a potential bug. Less is more.

**Rule 5: Understand root cause**
Prevents symptom-patching. Fixes the actual problem, not just one instance.

**Rule 6: Use search**
Helps the LLM understand the codebase. Find all affected areas before changing.

**Rule 7: One thing at a time**
Keeps changes isolated. Easier to verify and debug.

**Rule 8: Follow existing style**
Maintains consistency. The codebase should look like one person wrote it.

## The Read-Edit-Verify Pattern

Every edit should follow this sequence:

```
1. READ: read_file to see current state
2. SEARCH (if needed): search_grep to understand context
3. EDIT: edit_file with exact old_string and new_string
4. VERIFY: read_file to confirm the change
```

**Example flow:**

```
User: "Fix the typo in processData function - it says 'teh' instead of 'the'"

Agent:
1. read_file("src/utils.ts")
   → Sees the file content, finds "teh data"

2. edit_file({
     path: "src/utils.ts",
     old_string: "// Process teh data\nfunction processData",
     new_string: "// Process the data\nfunction processData"
   })
   → Makes the change

3. read_file("src/utils.ts")
   → Confirms "the data" is now correct

4. Response: "Fixed the typo in the comment. Changed 'teh' to 'the' in the processData function."
```

## Handling Edit Failures

The LLM will make mistakes. Your tool's error messages guide it to success.

### Failure 1: old_string Not Found

```
Error: old_string not found in src/utils.ts
```

**What the LLM should do:**
1. Re-read the file to see current content
2. Find the correct text to match
3. Try again with exact text

### Failure 2: Multiple Matches

```
Error: old_string found 3 times in src/utils.ts. Please include more context to make it unique.
```

**What the LLM should do:**
1. Include more surrounding lines in old_string
2. Add unique context (function name, comments, etc.)
3. Try again

**Example:**

Bad (ambiguous):
```typescript
old_string: "return x * 2;"
```

Good (unique):
```typescript
old_string: "function calculate(x: number) {\n  return x * 2;\n}"
```

## Complete Coding Agent

Here's how it all comes together:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Sandbox } from './sandbox';
import { createReadFileTool, createWriteFileTool, createSearchGrepTool } from './file-tools';
import { createEditFileTool } from './edit-tool';

const CODING_AGENT_PROMPT = `You are a coding agent with access to file operations and editing tools.

[Include all 8 rules here...]`;

async function runCodingAgent(userRequest: string, sandboxRoot: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sandbox = new Sandbox(sandboxRoot);

  const tools = [
    createReadFileTool(sandbox),
    createWriteFileTool(sandbox),
    createSearchGrepTool(sandbox),
    createEditFileTool(sandbox),  // The key addition
    createListDirTool(sandbox)
  ];

  const messages: any[] = [{ role: 'user', content: userRequest }];
  const maxTurns = 30;  // Prevent infinite loops

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

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      // Extract text response
      const textBlocks = response.content.filter((b: any) => b.type === 'text');
      return textBlocks.map((b: any) => b.text).join('\n');
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

  return 'Max turns reached';
}
```

## Advanced Patterns

### Pattern 1: Multi-File Refactoring

When changing multiple files:

```
1. List all files that need changes
2. Read each file
3. Plan all changes
4. Make changes one file at a time
5. Verify each file after editing
```

Don't try to edit multiple files in parallel - errors compound.

### Pattern 2: Test-Driven Fixes

When fixing bugs:

```
1. Read the failing test
2. Search for the relevant code
3. Read the implementation
4. Identify the bug
5. Fix the implementation
6. Run the test to verify
```

The test guides the fix.

### Pattern 3: Incremental Additions

When adding new features:

```
1. Search for similar existing code
2. Read those files to understand patterns
3. Create new file following the pattern
4. Add imports/exports to connect it
5. Verify with search that references are correct
```

Learn from existing code before writing new code.

## Common Pitfalls

### Pitfall 1: Not Including Enough Context

```typescript
// Too little context - might match multiple places
old_string: "return x;"

// Better - includes function signature
old_string: "function calculate(x: number) {\n  return x;\n}"
```

**Rule of thumb:** Include at least 2-3 lines of context around the change.

### Pitfall 2: Forgetting to Verify

An edit might succeed but introduce a bug:

```typescript
// Edit looks fine
old_string: "const total = a + b;"
new_string: "const total = a * b;"

// But breaks other code that depends on addition
```

Always read back after editing to catch unintended effects.

### Pitfall 3: Making Too Many Changes at Once

```typescript
// Bad: One edit that changes 50 lines
old_string: "entire function..."
new_string: "completely rewritten function..."

// Good: Multiple small edits
edit 1: Change function signature
edit 2: Update first parameter usage
edit 3: Update second parameter usage
```

Small edits are easier to verify and debug.

## Testing Your Coding Agent

Test with these scenarios:

### Test 1: Simple Fix
```
"In math.ts, the add function has a typo. It says 'retrun' instead of 'return'."
```

Expected flow: read → edit → verify

### Test 2: Multi-File Change
```
"Rename the function 'processData' to 'transformData' everywhere it's used."
```

Expected flow: search → read each file → edit each file → verify each edit

### Test 3: Create New Feature
```
"Create a new file called greet.ts with a hello function that returns 'Hello, [name]'."
```

Expected flow: edit (create) → verify

### Test 4: Bug Fix
```
"The calculateTotal function in billing.ts isn't including tax. Add 10% tax to the result."
```

Expected flow: read → understand → edit → verify

## Summary

The coding agent combines:

1. **edit_file tool**: Search-and-replace editing
   - `old_string` + `new_string` pattern
   - Exactly one match required
   - Errors as strings for self-correction

2. **Eight-rule system prompt**:
   - Read before editing
   - Verify after editing
   - Think step-by-step
   - Minimal changes
   - Understand root causes
   - Use search
   - One thing at a time
   - Follow existing style

3. **Read-Edit-Verify pattern**:
   - Always read current state
   - Make targeted changes
   - Confirm the result

With these foundations, you have an agent that can safely and effectively work with real codebases.

## Next Steps

In the lab, you'll:
1. Implement the edit_file tool
2. Test it with various scenarios
3. Write the complete coding agent system prompt
4. Run end-to-end tests with real coding tasks

This is where agents become truly useful - they can read, understand, modify, and verify code autonomously.
