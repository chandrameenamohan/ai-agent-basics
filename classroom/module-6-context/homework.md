# Module 6: Context Engineering - Homework

## Overview

Build a production-ready context-managed coding agent that can handle long-running refactoring tasks.

**Due:** End of week
**Estimated time:** 4-6 hours
**Submit:** Git repository with working code + writeup

---

## Assignment: Long-Running Refactoring Agent

Build an agent that can perform multi-file refactoring tasks that require 50+ turns to complete. It must use all four context management strategies.

### Requirements

Your agent must:

1. **Implement all four strategies:**
   - Token estimation with logging
   - History compaction with summarization
   - Scratchpad tools (write, read, list)
   - Sub-agent delegation

2. **Include these file operation tools:**
   - `read_file` - read file contents
   - `write_file` - write file contents
   - `list_files` - list directory contents
   - `search_files` - search file contents with regex

3. **Track metrics:**
   - Token count per turn
   - Number of compactions
   - Scratchpad operations (read/write)
   - Sub-agent invocations
   - Total turns to completion

4. **Handle edge cases:**
   - Empty scratchpad directory
   - Compaction when history is small
   - Sub-agent exceeding turn limit
   - Invalid scratchpad keys

### Test Scenario

Your agent must successfully complete this task:

```
You are refactoring a TypeScript project. Do the following:

1. List all .ts files in the project
2. For each file:
   a. Use a sub-agent to analyze it
   b. Identify functions longer than 20 lines
   c. Write findings to scratchpad with key "long-functions-{filename}"
3. After analyzing all files, read all your scratchpad notes
4. Create a file "refactoring-plan.md" with:
   - List of all long functions found
   - Suggested improvements for each
   - Priority order for refactoring
5. Pick the highest priority function and refactor it
6. Write the refactored code back to the file
7. Create "refactoring-log.md" documenting what you changed

Work step by step. Use scratchpad to track progress.
```

### Starter Code Structure

```
homework/
├── agent.ts              # Main agent loop
├── tools/
│   ├── file-tools.ts     # File operation tools
│   ├── scratchpad.ts     # Scratchpad tools
│   └── delegation.ts     # Sub-agent tool
├── context/
│   ├── estimation.ts     # Token estimation
│   ├── compaction.ts     # History compaction
│   └── types.ts          # Message types
├── test-project/         # Sample project for testing
│   ├── main.ts
│   ├── utils.ts
│   └── handlers.ts
├── metrics.ts            # Metrics tracking
└── main.ts              # Entry point
```

### Metrics to Track

Create a `metrics.ts` module that tracks:

```typescript
interface AgentMetrics {
  totalTurns: number;
  tokensPerTurn: number[];
  compactions: number[];  // Turn numbers when compaction occurred
  scratchpadWrites: number;
  scratchpadReads: number;
  subAgentInvocations: number;
  completed: boolean;
  error?: string;
}
```

### Deliverables

1. **Code** (70 points)
   - All four strategies implemented correctly (40 pts)
   - Tools working properly (15 pts)
   - Metrics tracking (10 pts)
   - Clean, readable code (5 pts)

2. **Writeup** (20 points)
   - Document your design decisions
   - Explain your compaction threshold choice
   - Discuss any challenges encountered
   - Include metrics from your test run

3. **Test Results** (10 points)
   - Show successful completion of test scenario
   - Include logs showing context management working
   - Show metrics summary

---

## Part 1: Implementation (70 points)

### Task 1.1: Token Estimation (5 points)

Implement token estimation with logging:

```typescript
// context/estimation.ts
export function estimateTokens(messages: Message[]): number {
  // TODO: Implement 4-char rule
}

export function logTokens(
  turnNumber: number,
  messages: Message[],
  limit: number
): void {
  // TODO: Log turn, tokens, percentage
}
```

**Requirements:**
- Round up to nearest integer
- Log format: `Turn X, ~Y tokens (Z% of limit)`

### Task 1.2: History Compaction (10 points)

Implement compaction with summarization:

```typescript
// context/compaction.ts
export async function compactHistory(
  messages: Message[],
  tokenLimit: number
): Promise<Message[]> {
  // TODO: Implement compaction algorithm
}

async function summarizeMessages(messages: Message[]): Promise<string> {
  // TODO: Call Claude to summarize
}
```

**Requirements:**
- Keep first message
- Keep last 6 messages
- Summarize middle
- Log before/after token counts

### Task 1.3: Scratchpad Tools (10 points)

Implement all three scratchpad tools:

```typescript
// tools/scratchpad.ts
export const scratchpadTools: Tool[] = [
  {
    name: "scratchpad_write",
    description: "...",
    input_schema: { /* ... */ },
    execute: async (input) => {
      // TODO: Validate key (no path separators)
      // TODO: Write to .scratchpad/{key}.md
    }
  },
  {
    name: "scratchpad_read",
    // TODO
  },
  {
    name: "scratchpad_list",
    // TODO
  }
];
```

**Requirements:**
- Validate keys (no `/` or `\`)
- Handle missing files gracefully
- Create directory if not exists

### Task 1.4: Sub-Agent Delegation (15 points)

Implement sub-agent runner and delegation tool:

```typescript
// tools/delegation.ts
export async function runSubAgent(
  taskDescription: string,
  tools: Tool[],
  maxTurns: number = 20
): Promise<string> {
  // TODO: Fresh message history
  // TODO: Agent loop with turn limit
  // TODO: Extract and return final text
}

export const delegationTool: Tool = {
  name: "delegate_subtask",
  description: "...",
  input_schema: { /* ... */ },
  execute: async (input) => {
    // TODO: Call runSubAgent
    // TODO: Return formatted result
  }
};
```

**Requirements:**
- Start with clean context
- Same tools as main agent
- Return only text content
- Handle turn limit exceeded

### Task 1.5: Main Agent Loop (20 points)

Integrate all strategies:

```typescript
// agent.ts
export async function runAgent(
  initialPrompt: string,
  tools: Tool[],
  maxTurns: number = 50
): Promise<AgentMetrics> {
  const messages: Message[] = [
    { role: "user", content: initialPrompt }
  ];

  const metrics: AgentMetrics = {
    totalTurns: 0,
    tokensPerTurn: [],
    compactions: [],
    scratchpadWrites: 0,
    scratchpadReads: 0,
    subAgentInvocations: 0,
    completed: false
  };

  for (let turn = 0; turn < maxTurns; turn++) {
    // TODO: Estimate tokens
    // TODO: Compact if needed
    // TODO: Make API call
    // TODO: Handle stop_reason
    // TODO: Execute tools
    // TODO: Track metrics
  }

  return metrics;
}
```

**Requirements:**
- Check tokens before each call
- Compact at 80% threshold
- Track all metrics
- Handle errors gracefully
- Return complete metrics

### Task 1.6: Metrics Tracking (10 points)

Implement comprehensive metrics:

```typescript
// metrics.ts
export class MetricsCollector {
  private metrics: AgentMetrics;

  recordTurn(messages: Message[]): void {
    // TODO
  }

  recordCompaction(turnNumber: number): void {
    // TODO
  }

  recordScratchpadWrite(): void {
    // TODO
  }

  recordScratchpadRead(): void {
    // TODO
  }

  recordSubAgentInvocation(): void {
    // TODO
  }

  getSummary(): string {
    // TODO: Format metrics as readable summary
  }

  getMetrics(): AgentMetrics {
    return this.metrics;
  }
}
```

---

## Part 2: Writeup (20 points)

Create `WRITEUP.md` with the following sections:

### Section 1: Design Decisions (8 points)

Explain:
- Why you chose your compaction threshold
- How you decided when sub-agents are helpful
- Your scratchpad key naming strategy
- Any optimizations you added

### Section 2: Challenges (6 points)

Discuss:
- Hardest part of implementation
- Any bugs you encountered
- How you debugged context issues
- Trade-offs you made

### Section 3: Metrics Analysis (6 points)

Include:
- Full metrics from test run
- Token usage graph (if possible)
- Analysis of compaction frequency
- Discussion of whether strategies worked

---

## Part 3: Test Results (10 points)

### Task 3.1: Successful Completion (5 points)

Show that your agent completed the test scenario:
- Logs showing all steps
- Created files (refactoring-plan.md, refactoring-log.md)
- Scratchpad notes created
- No errors

### Task 3.2: Context Management Evidence (5 points)

Show evidence that context management worked:
- Token counts approaching limit
- Compaction occurring
- Scratchpad surviving compaction
- Sub-agents spawned
- Final completion within turn limit

---

## Test Project Setup

Create these test files:

**test-project/main.ts:**
```typescript
// Function with 25 lines (should be flagged)
export async function processUserRequest(userId: string, action: string) {
  const user = await fetchUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const permissions = await getPermissions(user);
  if (!permissions.includes(action)) {
    throw new Error("Permission denied");
  }

  let result;
  if (action === "create") {
    result = await createResource(user);
  } else if (action === "update") {
    result = await updateResource(user);
  } else if (action === "delete") {
    result = await deleteResource(user);
  } else {
    throw new Error("Unknown action");
  }

  await logAction(user, action, result);
  await notifyUser(user, result);

  return result;
}

// Short function (should not be flagged)
export function formatUsername(name: string): string {
  return name.trim().toLowerCase();
}
```

**test-project/utils.ts:**
```typescript
// Another long function
export async function validateAndProcessData(data: any) {
  // 22 lines of validation logic
  // ...
}
```

**test-project/handlers.ts:**
```typescript
// Several medium-length functions
export function handleRequest(req: any) {
  // 15 lines
}

export function handleResponse(res: any) {
  // 12 lines
}
```

---

## Grading Rubric

### Code Quality (70 points)
- **40 pts:** All strategies implemented correctly
  - Token estimation (5 pts)
  - Compaction (10 pts)
  - Scratchpad (10 pts)
  - Sub-agents (15 pts)
- **15 pts:** Tools work properly
- **10 pts:** Metrics tracked accurately
- **5 pts:** Clean, readable code

### Writeup (20 points)
- **8 pts:** Design decisions well explained
- **6 pts:** Challenges discussed thoughtfully
- **6 pts:** Metrics analyzed meaningfully

### Test Results (10 points)
- **5 pts:** Successful completion
- **5 pts:** Context management evidence

**Total: 100 points**

---

## Submission

1. Push code to Git repository
2. Include WRITEUP.md in repo root
3. Include test run logs in `logs/` directory
4. Submit repository URL

**Repository structure:**
```
homework/
├── src/              # Your code
├── test-project/     # Test files
├── logs/            # Test run logs
├── WRITEUP.md       # Your writeup
├── package.json
└── README.md        # Setup instructions
```

---

## Extra Credit (Up to 15 points)

### EC1: Adaptive Compaction (5 points)
Implement "smart" compaction that adjusts threshold based on token velocity (tokens added per turn).

### EC2: Scratchpad Visualization (5 points)
Create a tool that generates a visual timeline showing when scratchpad notes were created/modified.

### EC3: Sub-Agent Chaining (5 points)
Allow sub-agents to spawn their own sub-agents (with depth limit). Show it working.

---

## Tips

1. **Start simple:** Get basic loop working before adding context management
2. **Test incrementally:** Test each strategy separately before integration
3. **Use logging:** Detailed logs make debugging much easier
4. **Artificial bloat:** Test compaction by injecting fake messages
5. **Watch the metrics:** They'll tell you if strategies are working

## Common Mistakes

- Forgetting to check tokens before API call
- Compacting recent messages
- Not validating scratchpad keys
- Sub-agents without tools
- Not tracking metrics
- Poor error handling

## Resources

- Module 6 tutorial for algorithm details
- Module 5 for tool patterns
- Anthropic API docs for message format
- TypeScript async/await guide

Good luck!
