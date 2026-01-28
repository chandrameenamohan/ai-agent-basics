# Module 6: Context Engineering - Lab Exercises

## Lab Overview

In this lab, you'll build a context-managed agent step by step. Each exercise builds on the previous one.

**Time estimate:** 2-3 hours

**Prerequisites:**
- Completed Module 5 (coding agent)
- Understanding of async/await
- Basic file I/O knowledge

## Setup

Create a new directory for this lab:

```bash
mkdir module-6-context
cd module-6-context
```

Copy your tools from Module 5:
- `read_file`
- `write_file`
- `list_files`
- `search_files`

## Exercise 1: Token Estimation (20 minutes)

### Goal
Implement token estimation and add logging to your agent loop.

### Tasks

1. **Implement the estimation function:**

```typescript
function estimateTokens(messages: Message[]): number {
  // TODO: Convert messages to JSON string
  // TODO: Divide length by 4 and round up
}
```

2. **Add token logging to your agent loop:**

Before each API call, log:
- Current turn number
- Estimated token count
- Percentage of limit used

3. **Test with a simple prompt:**

Run your agent with: "List all TypeScript files in the current directory"

**Expected output:**
```
Turn 0, ~50 tokens (0.03% of limit)
Turn 1, ~380 tokens (0.21% of limit)
```

### Verification

- [ ] Function returns reasonable token counts
- [ ] Logs appear before each API call
- [ ] Percentage calculation is correct

## Exercise 2: History Compaction (45 minutes)

### Goal
Implement the compaction algorithm with summarization.

### Tasks

1. **Implement the summarizer:**

```typescript
async function summarizeMessages(messages: Message[]): Promise<string> {
  // TODO: Call Claude with summarization prompt
  // Focus on: decisions, findings, files modified, issues
}
```

2. **Implement compaction:**

```typescript
async function compactHistory(
  messages: Message[],
  tokenLimit: number
): Promise<Message[]> {
  // TODO: Check if compaction needed
  // TODO: Extract first, middle, recent messages
  // TODO: Summarize middle
  // TODO: Reconstruct message array
}
```

3. **Add to agent loop:**

```typescript
// Before API call
const tokens = estimateTokens(messages);
if (tokens > TOKEN_LIMIT * 0.8) {
  console.log("Compacting...");
  messages = await compactHistory(messages, TOKEN_LIMIT);
}
```

4. **Test with artificial bloat:**

Create a test that artificially inflates the message history:

```typescript
// Add 100 fake messages to trigger compaction
for (let i = 0; i < 100; i++) {
  messages.push({
    role: "user",
    content: "x".repeat(1000)
  });
  messages.push({
    role: "assistant",
    content: [{ type: "text", text: "y".repeat(1000) }]
  });
}
```

### Verification

- [ ] Compaction triggers when threshold exceeded
- [ ] First message preserved
- [ ] Last 6 messages preserved
- [ ] Middle messages summarized
- [ ] Token count reduced significantly
- [ ] Logs show before/after token counts

### Expected output:
```
Turn 5, ~145000 tokens (80.5% of limit)
Compacting 102 messages...
Compacted: 145000 → 12000 tokens
Turn 6, ~12000 tokens (6.7% of limit)
```

## Exercise 3: Scratchpad Tools (40 minutes)

### Goal
Implement external memory that survives compaction.

### Tasks

1. **Create scratchpad directory:**

```typescript
const SCRATCHPAD_DIR = ".scratchpad";
```

2. **Implement write function:**

```typescript
async function scratchpadWrite(key: string, content: string): Promise<string> {
  // TODO: Create directory if not exists
  // TODO: Write content to .scratchpad/{key}.md
  // TODO: Return success message
}
```

3. **Implement read function:**

```typescript
async function scratchpadRead(key: string): Promise<string> {
  // TODO: Try to read .scratchpad/{key}.md
  // TODO: Return content or error message
}
```

4. **Implement list function:**

```typescript
async function scratchpadList(): Promise<string> {
  // TODO: Read directory
  // TODO: Filter for .md files
  // TODO: Return formatted list or "No notes"
}
```

5. **Create tool definitions:**

```typescript
const scratchpadTools: Tool[] = [
  {
    name: "scratchpad_write",
    description: "Write or update a scratchpad note...",
    input_schema: { /* TODO */ },
    execute: async (input) => { /* TODO */ }
  },
  // TODO: scratchpad_read
  // TODO: scratchpad_list
];
```

6. **Update system prompt:**

Add instructions about scratchpad usage:
- When to use it
- Good key names
- Reading after compaction

7. **Test the tools:**

Prompt: "Create a scratchpad note called 'test' with the content 'Hello world', then list all notes, then read the test note back."

### Verification

- [ ] .scratchpad directory created
- [ ] Write creates .md files
- [ ] Read returns content correctly
- [ ] Read returns error for missing keys
- [ ] List shows all note keys
- [ ] List handles empty directory
- [ ] Agent successfully uses all three tools

### Expected files:
```
.scratchpad/
└── test.md
```

## Exercise 4: Context Survival Test (30 minutes)

### Goal
Verify that scratchpad survives compaction.

### Tasks

1. **Create a test scenario:**

```typescript
const testPrompt = `
Do this step by step:
1. Write a scratchpad note 'plan' with content 'Step 1: List files, Step 2: Count them'
2. List all TypeScript files
3. Write a scratchpad note 'findings' with the count
4. List your scratchpad notes
5. Confirm you can read both notes back
`;
```

2. **Artificially trigger compaction mid-task:**

After step 3, inject fake messages to force compaction:

```typescript
// After agent writes 'findings' note, inject bloat
if (turnCount === 6) { // Adjust based on your agent's behavior
  for (let i = 0; i < 50; i++) {
    messages.push({
      role: "user",
      content: "filler".repeat(1000)
    });
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: "filler".repeat(1000) }]
    });
  }
}
```

3. **Verify scratchpad persists:**

After compaction, the agent should still be able to:
- List scratchpad notes
- Read both 'plan' and 'findings'
- Complete the task

### Verification

- [ ] Agent writes 'plan' note
- [ ] Agent writes 'findings' note
- [ ] Compaction occurs mid-task
- [ ] Agent successfully lists notes after compaction
- [ ] Agent successfully reads notes after compaction
- [ ] Files persist on disk

### Expected output:
```
Turn 3: Wrote scratchpad note 'plan'
Turn 5: Wrote scratchpad note 'findings'
Turn 6: ~145000 tokens, compacting...
Compacted: 145000 → 8000 tokens
Turn 7: Listed scratchpad notes: plan, findings
Turn 8: Read plan note successfully
```

## Exercise 5: Sub-Agent Implementation (45 minutes)

### Goal
Implement sub-agent delegation for isolated subtasks.

### Tasks

1. **Implement sub-agent runner:**

```typescript
async function runSubAgent(
  taskDescription: string,
  tools: Tool[],
  maxTurns: number = 20
): Promise<string> {
  // TODO: Create fresh message history with task
  // TODO: Run agent loop with turn limit
  // TODO: Return final text response
}
```

2. **Create delegation tool:**

```typescript
const delegateTool: Tool = {
  name: "delegate_subtask",
  description: "Delegate a self-contained subtask to a fresh agent instance...",
  input_schema: {
    type: "object",
    properties: {
      task_description: {
        type: "string",
        description: "Clear description of what the sub-agent should accomplish"
      }
    },
    required: ["task_description"]
  },
  execute: async (input) => {
    const result = await runSubAgent(
      input.task_description,
      availableTools,
      20
    );
    return `Sub-agent result:\n${result}`;
  }
};
```

3. **Test delegation:**

Prompt: "Use a sub-agent to count how many functions are defined in main.ts"

The main agent should:
- Call delegate_subtask
- Pass clear task description
- Receive and report results

4. **Verify isolation:**

Add logging to show:
- Main agent context size
- Sub-agent starting with clean context
- Sub-agent context growth
- Main agent context stays small

### Verification

- [ ] Sub-agent starts with fresh messages
- [ ] Sub-agent has access to same tools
- [ ] Sub-agent runs independent loop
- [ ] Sub-agent returns text result
- [ ] Main agent receives result
- [ ] Main agent context not polluted by sub-agent turns

### Expected output:
```
Main agent: Turn 2, ~800 tokens
Starting sub-agent with clean context...
  Sub-agent: Turn 0, ~120 tokens
  Sub-agent: Turn 1, ~450 tokens
  Sub-agent: Turn 2, ~890 tokens
  Sub-agent: Complete
Main agent: Turn 3, ~1100 tokens (only added result, not all sub-agent turns)
```

## Exercise 6: Integration Test (30 minutes)

### Goal
Test all strategies together in a realistic scenario.

### Tasks

1. **Create a complex multi-step task:**

```typescript
const complexTask = `
You are helping with a code review. Do the following:

1. List all TypeScript files in the current directory
2. For each file, use a sub-agent to analyze it and report:
   - Number of functions
   - Number of imports
   - Any obvious issues
3. Write a scratchpad note 'review-summary' with all findings
4. After reviewing all files, read the review-summary back
5. Create a final report file 'review.md' with the summary

Work step by step and be thorough.
`;
```

2. **Run with monitoring:**

Track:
- Token usage per turn
- When compaction happens
- Sub-agent invocations
- Scratchpad operations

3. **Verify all strategies used:**

The agent should:
- Delegate file analysis to sub-agents
- Write findings to scratchpad
- Trigger compaction if many files
- Read scratchpad for final report
- Complete successfully

### Verification

- [ ] All files analyzed
- [ ] Sub-agents used for each file
- [ ] Scratchpad stores summary
- [ ] Compaction occurs if needed
- [ ] Final report created
- [ ] All information preserved

### Success Criteria

The agent completes the task even if:
- There are 10+ files to analyze
- Compaction happens mid-task
- Multiple sub-agents are spawned

## Bonus Exercise: Proactive Compaction (20 minutes)

### Goal
Implement routine compaction instead of emergency compaction.

### Tasks

1. **Modify agent loop:**

```typescript
// Compact every 15 turns OR when exceeding threshold
if (turnCount % 15 === 0 || tokens > THRESHOLD) {
  messages = await compactHistory(messages, TOKEN_LIMIT);
}
```

2. **Compare strategies:**

Run the same complex task twice:
- Once with reactive compaction only
- Once with proactive compaction

3. **Measure:**
- How many compactions occur
- When they occur
- Average token levels

### Expected Results

Proactive compaction should:
- Prevent emergency situations
- Keep tokens more stable
- Compact more frequently but less severely

## Lab Completion Checklist

- [ ] Token estimation implemented and tested
- [ ] History compaction working correctly
- [ ] Scratchpad tools functional
- [ ] Scratchpad survives compaction
- [ ] Sub-agent delegation implemented
- [ ] Sub-agent isolation verified
- [ ] Integration test passes
- [ ] All strategies working together
- [ ] Bonus: Proactive compaction tested

## Troubleshooting

### "Compaction not triggering"
- Check your TOKEN_LIMIT value
- Verify threshold calculation (80%)
- Ensure tokens checked before API call

### "Scratchpad notes not persisting"
- Check file write permissions
- Verify directory creation
- Check file paths are correct

### "Sub-agent not returning results"
- Verify stop_reason handling
- Check text extraction from content
- Ensure sub-agent has tools

### "Agent doesn't use scratchpad"
- Update system prompt with clear instructions
- Give examples of good keys
- Remind agent after compaction

## Next Steps

After completing this lab:
1. Add context management to your Module 5 coding agent
2. Test with long-running tasks (50+ turns)
3. Experiment with different compaction thresholds
4. Try different scratchpad key naming strategies
5. Move on to Module 7: Evaluations
