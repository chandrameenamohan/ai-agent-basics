# Module 4: Filesystem Tools - Homework

## Assignment: Build a Secure File Management Agent

**Due:** End of week
**Points:** 100
**Difficulty:** Intermediate

## Objective

Build a complete filesystem agent that can safely explore, read, modify, and search through a codebase. Your agent must implement proper sandbox security, all five filesystem tools, and demonstrate safe file operations.

## Requirements

### Part 1: Core Implementation (50 points)

#### 1.1 Sandbox Security (15 points)

Implement a `Sandbox` class that:
- Accepts a root directory path in the constructor
- Provides a `resolve(filePath: string)` method
- Validates all paths stay within the sandbox root
- Throws an error if path traversal is attempted

**Security test cases (must all pass):**
```typescript
const sandbox = new Sandbox('/home/user/project');

// These should work
sandbox.resolve('src/index.ts');
sandbox.resolve('./lib/utils.ts');
sandbox.resolve('nested/deep/file.txt');

// These should throw errors
sandbox.resolve('../../etc/passwd');
sandbox.resolve('/etc/passwd');
sandbox.resolve('../../../../../usr/bin/bash');
```

**Grading criteria:**
- 5 points: Correct path resolution
- 5 points: Proper containment checking
- 5 points: All security tests pass

#### 1.2 Five Filesystem Tools (35 points)

Implement all five tools with proper schemas and error handling:

1. **read_file** (7 points)
   - Reads file contents
   - Returns content as string
   - Handles missing files gracefully

2. **write_file** (7 points)
   - Writes or overwrites file
   - Creates parent directories if needed
   - Returns success/error message

3. **list_dir** (7 points)
   - Lists directory contents
   - Labels entries: `[dir]` or `[file]`
   - Sorts alphabetically

4. **search_grep** (7 points)
   - Searches files for regex pattern
   - Supports file filtering (e.g., `*.ts`)
   - Limits output to 50 lines
   - Shows file:line: context

5. **run_shell** (7 points)
   - Executes shell commands
   - 30-second timeout
   - Blocks dangerous commands
   - Returns stdout/stderr

**Grading criteria per tool:**
- 3 points: Correct input schema
- 3 points: Working implementation
- 1 point: Error handling

### Part 2: Agent Integration (30 points)

Build a complete agent that uses your filesystem tools.

#### 2.1 System Prompt (10 points)

Write a system prompt that includes:
- Rules for safe file operations
- Read-before-edit pattern
- Verification after changes
- Exploration strategies

**Example tasks your prompt should enable:**
- "List all TypeScript files in src/"
- "Read package.json and tell me what dependencies are used"
- "Find all functions named 'processData'"

#### 2.2 Agent Loop (10 points)

Implement a working agent loop that:
- Sends messages to Claude API
- Handles tool use blocks
- Executes tools via your implementations
- Returns tool results to the model
- Continues until end_turn

#### 2.3 Demonstration (10 points)

Run your agent on these three tasks and submit logs:

**Task 1: Exploration**
```
"Explore the project structure. List the root directory, then read any README file if it exists."
```

**Task 2: Search**
```
"Find all files that contain the word 'export' and show me the first 5 matches."
```

**Task 3: Create and Verify**
```
"Create a new file called test-output.txt with the content 'Agent test successful'. Then read it back to verify it was created correctly."
```

### Part 3: Security Analysis (20 points)

#### 3.1 Attack Scenarios (10 points)

Write test cases for 5 different path traversal attacks and demonstrate that your sandbox blocks them:

Example format:
```typescript
// Attack 1: Relative parent directory
try {
  sandbox.resolve('../../etc/passwd');
  console.log('✗ FAILED: Attack was allowed');
} catch (error) {
  console.log('✓ PASSED: Attack blocked');
}
```

Required attacks to test:
1. Relative parent traversal (`../../etc/passwd`)
2. Absolute path (`/etc/passwd`)
3. Deep traversal (`../../../../../etc/passwd`)
4. Absolute path with traversal (`/home/../../etc/passwd`)
5. Your choice of creative attack

#### 3.2 Security Analysis (10 points)

Write a short analysis (300-500 words) answering:

1. **How does your sandbox prevent path traversal?** Explain the mechanism in detail.

2. **What are the limitations?** Are there edge cases your sandbox doesn't handle?

3. **Additional security measures**: Beyond path validation, what other security measures could you add to make the tools safer? (Consider: command filtering, resource limits, filesystem permissions, etc.)

## Submission Format

Submit a ZIP file or GitHub repository with:

```
module-4-homework/
├── sandbox.ts (or .py)
├── tools.ts (or .py)
├── agent.ts (or .py)
├── test-security.ts (or .py)
├── SECURITY_ANALYSIS.md
├── logs/
│   ├── task1-exploration.txt
│   ├── task2-search.txt
│   └── task3-create-verify.txt
└── README.md (setup instructions)
```

## Grading Rubric

| Component | Points | Criteria |
|-----------|--------|----------|
| Sandbox Implementation | 15 | All security tests pass, correct path resolution |
| Five Filesystem Tools | 35 | All tools work correctly with proper schemas |
| System Prompt | 10 | Establishes safe patterns and clear rules |
| Agent Loop | 10 | Successfully executes multi-turn interactions |
| Demonstration Logs | 10 | All three tasks complete successfully |
| Attack Test Cases | 10 | Five attacks tested and blocked |
| Security Analysis | 10 | Thoughtful analysis of security mechanisms |
| **Total** | **100** | |

## Bonus Challenges (+10 points each)

### Bonus 1: Advanced Search
Implement a `find_files` tool that supports:
- Name patterns (e.g., `*.test.ts`)
- Size filters (e.g., larger than 1KB)
- Modification time filters
- Max depth limiting

### Bonus 2: File Watching
Implement a `watch_file` tool that monitors a file for changes and reports them.

### Bonus 3: Diff Tool
Implement a `diff_files` tool that shows differences between two files in a readable format.

## Tips for Success

1. **Start with security**: Get the sandbox working and tested first. Everything depends on this.

2. **Test incrementally**: Don't build all five tools at once. Build one, test it, then move to the next.

3. **Error handling matters**: Every tool should catch errors and return them as strings. Never throw into the agent loop.

4. **Limit output**: Grep results and directory listings can be huge. Always truncate.

5. **Read the reference code**: If you're stuck, look at the solutions in `module-4-filesystem/solutions/`

6. **Test with real scenarios**: Don't just test with simple cases. Try complex directory structures and edge cases.

## Common Pitfalls to Avoid

1. **Forgetting to resolve paths** - Every tool must use `sandbox.resolve()` before file operations

2. **Not creating parent directories** - `write_file` should create `a/b/c/` if writing `a/b/c/file.txt`

3. **Throwing exceptions** - Tools should return error strings, not throw

4. **Unlimited output** - Always limit grep, list, and shell output

5. **No timeout on shell commands** - Commands can hang forever without timeouts

## Resources

- Module 4 Tutorial: `/classroom/module-4-filesystem/tutorial.md`
- Module 4 Handout: `/classroom/module-4-filesystem/handout.md`
- Reference implementation: `/module-4-filesystem/solutions/`
- Node.js fs/promises docs: https://nodejs.org/api/fs.html
- Python pathlib docs: https://docs.python.org/3/library/pathlib.html

## Questions?

If you're stuck or have questions:
1. Review the tutorial and handout
2. Check the reference solutions for patterns
3. Test individual components in isolation
4. Ask in the course forum with specific error messages

## Academic Integrity

- You may use the reference solutions for inspiration
- You must write your own code
- You may discuss approaches with classmates
- Do not copy code directly from classmates
- Cite any external resources you use

Good luck! This assignment brings together security, tool design, and agent orchestration - the core skills for building production AI agents.
