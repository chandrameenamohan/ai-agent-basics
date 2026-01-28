# Module 5: Coding Agent - Homework

## Assignment: Build a Production-Ready Coding Agent

**Due:** End of week
**Points:** 100
**Difficulty:** Advanced

## Objective

Build a complete coding agent that can read, search, edit, and verify code changes using the search-and-replace pattern. Your agent must demonstrate the read-edit-verify pattern, handle errors gracefully, and follow all eight rules from the system prompt.

## Requirements

### Part 1: Edit Tool Implementation (30 points)

#### 1.1 Core Edit Functionality (20 points)

Implement the `edit_file` tool with complete functionality:

**Required features:**
- Search-and-replace using `old_string` and `new_string`
- Count occurrences correctly (split method or count method)
- Reject edits with 0 matches (unless creating new file)
- Reject edits with multiple matches
- Create new files when `old_string` is empty and file is empty
- Return errors as strings, never throw

**Test cases that must pass:**

```typescript
// Test 1: Create new file
edit_file({ path: 'new.ts', old_string: '', new_string: 'export const x = 1;' })
// Expected: "Created new file: new.ts"

// Test 2: Single match - success
edit_file({ path: 'new.ts', old_string: 'const x = 1', new_string: 'const x = 2' })
// Expected: "Successfully edited new.ts"

// Test 3: No match - error
edit_file({ path: 'new.ts', old_string: 'const y = 1', new_string: 'const y = 2' })
// Expected: "Error: old_string not found in new.ts"

// Test 4: Multiple matches - error
// (Create file with duplicate content first)
edit_file({ path: 'dup.ts', old_string: 'test', new_string: 'modified' })
// Expected: "Error: old_string found N times in dup.ts. Please include more context to make it unique."

// Test 5: Multi-line edit
edit_file({
  path: 'code.ts',
  old_string: 'function hello() {\n  return "world";\n}',
  new_string: 'function hello() {\n  return "universe";\n}'
})
// Expected: "Successfully edited code.ts"
```

**Grading:**
- 8 points: Correct occurrence counting
- 4 points: Handles new file creation
- 4 points: Returns appropriate errors
- 4 points: Performs replacement correctly

#### 1.2 Integration with Sandbox (10 points)

Your edit tool must:
- Accept a `Sandbox` instance in the constructor/factory
- Use `sandbox.resolve()` for all path operations
- Handle sandbox errors gracefully
- Work with your Module 4 filesystem tools

**Test case:**
```typescript
const sandbox = new Sandbox('/home/user/project');
const editTool = createEditFileTool(sandbox);

// Should work
await editTool.execute({ path: 'src/index.ts', ... });

// Should error (path escapes sandbox)
await editTool.execute({ path: '../../etc/passwd', ... });
```

**Grading:**
- 5 points: Proper sandbox integration
- 5 points: Security tests pass

### Part 2: System Prompt (20 points)

Write a complete system prompt that includes all eight rules with clear explanations.

**Required structure:**

```
You are a coding agent with access to file operations and editing tools.

Follow these rules:

1. ALWAYS read a file before editing it
   [Your explanation: why this matters, what to do]

2. After making changes, verify by reading the file again
   [Your explanation]

3. Think step-by-step before acting:
   - Understand: [what to understand]
   - Explore: [what to explore]
   - Plan: [what to plan]
   - Implement: [what to implement]
   - Verify: [what to verify]

[Continue with rules 4-8...]
```

**Grading criteria:**
- 10 points: All eight rules present and clearly explained
- 5 points: Rules are specific and actionable (not vague)
- 5 points: Examples or guidelines provided for complex rules

### Part 3: Complete Agent (30 points)

Build a working coding agent that combines your edit tool with filesystem tools.

#### 3.1 Agent Loop (15 points)

Implement the agent loop with:
- API integration (Anthropic Claude)
- Tool registration (all filesystem tools + edit tool)
- Message handling (user and assistant messages)
- Tool execution (extract tool_use blocks, execute, return results)
- Stop condition (end_turn or max turns)
- Proper error handling

#### 3.2 Demonstration Tasks (15 points)

Run your agent on these five tasks and submit logs:

**Task 1: Simple Edit**
```
Create a file called calculator.ts with an add function that takes two numbers and returns their sum.
```

**Task 2: Bug Fix**
```
# First, create buggy code:
# calculator.ts: function add(a, b) { return a - b; }

Fix the bug in calculator.ts - the add function is subtracting instead of adding.
```

**Task 3: Multi-line Modification**
```
In calculator.ts, modify the add function to include input validation that checks if both arguments are numbers.
```

**Task 4: New Feature**
```
Add a multiply function to calculator.ts that works like the add function.
```

**Task 5: Refactoring**
```
In calculator.ts, find all occurrences of 'a' and 'b' parameter names and change them to 'x' and 'y' for consistency.
```

**Each task graded on:**
- 1 point: Agent reads before editing
- 1 point: Agent makes correct edit
- 1 point: Agent verifies after editing

### Part 4: Analysis and Testing (20 points)

#### 4.1 Pattern Analysis (10 points)

For each of your five demonstration tasks, document:

1. **Tools used**: List the sequence of tool calls
2. **Pattern followed**: Did it follow read-edit-verify? Explain.
3. **Errors encountered**: Any errors and how the agent recovered
4. **Improvement opportunities**: What could the agent have done better?

**Format:**
```markdown
## Task 1: Simple Edit

### Tools Used
1. edit_file (create new file)
2. read_file (verify creation)

### Pattern Followed
Yes, followed read-edit-verify. Since this was a new file, it skipped the initial read, created the file, then verified.

### Errors Encountered
None.

### Improvement Opportunities
Could have used list_dir first to check if file already exists.
```

#### 4.2 Edge Case Testing (10 points)

Test your agent with these challenging scenarios:

**Edge Case 1: Whitespace Sensitivity**
```typescript
// File has:
"function test() {\n  return 1;\n}"

// Agent tries to edit with wrong whitespace:
old_string: "function test() {\n    return 1;\n}"  // 4 spaces instead of 2
```

**What should happen:** Error - old_string not found

---

**Edge Case 2: Partial Match**
```typescript
// File has:
"const x = 1;"

// Agent tries:
old_string: "x = 1"  // Missing "const " prefix
```

**What should happen:** Error - old_string not found

---

**Edge Case 3: Greedy Matching**
```typescript
// File has:
"test\ntest\ntest"

// Agent wants to change only the middle one
// How should it specify old_string to match exactly once?
```

**Answer:** Include surrounding context to make it unique

---

**Edge Case 4: Empty File Edit**
```typescript
// File exists but is completely empty
// Agent wants to add initial content
```

**What should happen:** Treat as new file creation

---

**Edge Case 5: Same old_string and new_string**
```typescript
edit_file({ path: 'x.ts', old_string: 'test', new_string: 'test' })
```

**What should happen:** No error, but file unchanged (no-op edit)

---

**Your task:** Test all five edge cases and document:
- What happened
- Whether it matches expected behavior
- If not, what you would fix

## Submission Format

Submit a ZIP file or GitHub repository with:

```
module-5-homework/
├── edit-tool.ts (or .py)
├── system-prompt.ts (or .py)
├── agent.ts (or .py)
├── tests/
│   ├── test-edit-tool.ts (or .py)
│   └── test-edge-cases.ts (or .py)
├── logs/
│   ├── task1-simple-edit.txt
│   ├── task2-bug-fix.txt
│   ├── task3-multiline.txt
│   ├── task4-new-feature.txt
│   └── task5-refactoring.txt
├── ANALYSIS.md (pattern analysis for all 5 tasks)
├── EDGE_CASES.md (edge case testing results)
└── README.md (setup and usage instructions)
```

## Grading Rubric

| Component | Points | Criteria |
|-----------|--------|----------|
| Edit Tool Core | 20 | All 5 test cases pass, correct logic |
| Sandbox Integration | 10 | Secure path handling, errors handled |
| System Prompt | 20 | All 8 rules clearly explained |
| Agent Loop | 15 | Correct API usage, tool execution |
| Demonstration Tasks | 15 | All 5 tasks complete successfully |
| Pattern Analysis | 10 | Thorough analysis of tool usage |
| Edge Case Testing | 10 | All 5 edge cases tested and documented |
| **Total** | **100** | |

## Bonus Challenges (+10 points each, max +30)

### Bonus 1: Undo Functionality (+10 points)

Add an `undo_edit` tool that:
- Tracks edit history
- Allows reverting the last edit
- Maintains a stack of previous file states
- Limits history to last 10 edits

**Schema:**
```typescript
{
  name: "undo_edit",
  description: "Undo the last edit to a file",
  input_schema: {
    properties: {
      path: { type: "string", description: "File to undo edits on" }
    }
  }
}
```

### Bonus 2: Multi-File Search and Replace (+10 points)

Add a `replace_across_files` tool that:
- Searches for a pattern across multiple files
- Shows all matches with context
- Allows replacing all occurrences (with confirmation)
- Reports how many files were changed

### Bonus 3: Intelligent Context Addition (+10 points)

When the edit tool gets a "multiple matches" error, have the agent:
1. Automatically re-read the file
2. Identify unique context around each match
3. Ask the user which occurrence to change (or infer from the request)
4. Retry with appropriate context added

Demonstrate this with a test case.

## Tips for Success

1. **Start with tests**: Write test cases for your edit tool before implementing it.

2. **Use small test files**: Don't test on huge codebases initially. Use 5-10 line files.

3. **Log everything**: Add console.log statements to see what the agent is thinking.

4. **Validate incrementally**: Test each component (edit tool, then system prompt, then agent loop) separately.

5. **Read the reference code**: Module 5 solutions show patterns you can follow.

6. **Test error cases**: Most bugs appear in error handling, not happy paths.

7. **Watch for whitespace**: Whitespace mismatches are the #1 cause of "not found" errors.

## Common Pitfalls to Avoid

1. **Not counting occurrences correctly**
   - Wrong: `content.includes(oldStr) ? 1 : 0`
   - Right: `content.split(oldStr).length - 1`

2. **Throwing instead of returning errors**
   - Wrong: `throw new Error('not found')`
   - Right: `return 'Error: not found'`

3. **Forgetting the new-file case**
   - Must handle `occurrences === 0 && content === ''`

4. **Vague system prompt rules**
   - Wrong: "Be careful when editing"
   - Right: "ALWAYS read a file before editing it to see the current state"

5. **Not using sandbox.resolve()**
   - Every file path must go through the sandbox

6. **Over-engineering the edit logic**
   - Keep it simple: count, validate, replace, write

## Resources

- Module 5 Tutorial: `/classroom/module-5-coding-agent/tutorial.md`
- Module 5 Handout: `/classroom/module-5-coding-agent/handout.md`
- Reference Implementation: `/module-5-coding-agent/solutions/`
- String methods:
  - TypeScript: [String.split()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split)
  - Python: [str.count()](https://docs.python.org/3/library/stdtypes.html#str.count)

## Academic Integrity

- You may reference the tutorial and handout freely
- You may look at the reference solutions for inspiration
- You must write your own code
- Do not copy code directly from classmates
- Cite any external resources (Stack Overflow, etc.)

## Evaluation Criteria

Your submission will be evaluated on:

1. **Correctness**: Do all components work as specified?
2. **Completeness**: Are all required features implemented?
3. **Code Quality**: Is the code clean, readable, and well-organized?
4. **Documentation**: Are the analysis and edge case reports thorough?
5. **Agent Behavior**: Does the agent follow the read-edit-verify pattern?

## Questions?

If you're stuck:
1. Review the tutorial section on your problem area
2. Check the handout for quick reference patterns
3. Look at the reference solutions for similar code
4. Test components in isolation to identify the issue
5. Ask in the course forum with specific error messages

Good luck! This assignment demonstrates you can build an agent that safely modifies real code - a critical skill for production AI engineering.
