# Module 6: Context Engineering - Quiz

## Instructions

Answer all questions. For coding questions, write the code by hand (no IDE).

**Time limit:** 45 minutes

---

## Part 1: Conceptual Understanding (40 points)

### Question 1 (10 points)
Explain why context window management is critical for long-running agents. What happens if you don't manage context?

**Your answer:**

---

### Question 2 (10 points)
The token estimation heuristic uses "4 characters per token". Why is this rule-of-thumb acceptable even though it's not perfectly accurate? When might it be significantly wrong?

**Your answer:**

---

### Question 3 (10 points)
In the compaction algorithm, we keep the first message and the last 6 messages. Explain:
a) Why keep the first message?
b) Why keep the last 6 messages specifically?
c) What would happen if we kept only the last 2 messages?

**Your answer:**

---

### Question 4 (10 points)
Compare and contrast scratchpad tools vs. sub-agents. Give one scenario where scratchpad is better and one where sub-agent delegation is better.

**Your answer:**

---

## Part 2: Code Analysis (30 points)

### Question 5 (15 points)
This compaction implementation has a bug. Find it and explain why it's wrong:

```typescript
async function compactHistory(messages: Message[], tokenLimit: number) {
  const tokens = estimateTokens(messages);

  if (tokens <= tokenLimit) {
    return messages;
  }

  const first = messages[0];
  const recent = messages.slice(-6);
  const middle = messages.slice(1, -6);

  const summary = await summarizeMessages(middle);

  return [
    { role: "user", content: `Summary: ${summary}` },
    ...recent
  ];
}
```

**Bug:**

**Why it's wrong:**

**Correct version:**

---

### Question 6 (15 points)
This scratchpad read function has a security vulnerability. Identify it and fix it:

```typescript
async function scratchpadRead(key: string): Promise<string> {
  const filepath = `${SCRATCHPAD_DIR}/${key}.md`;
  const content = await fs.readFile(filepath, "utf-8");
  return content;
}
```

**Vulnerability:**

**How to exploit:**

**Secure version:**

---

## Part 3: Implementation (30 points)

### Question 7 (15 points)
Implement a function that determines whether to use sub-agent delegation based on task description. Return `true` if delegation is recommended, `false` otherwise.

Consider:
- Task complexity
- Keywords indicating multi-step work
- Whether task is self-contained

```typescript
function shouldDelegate(taskDescription: string): boolean {
  // Your implementation
}

// Test cases (should return true):
shouldDelegate("Analyze all files and summarize common patterns")
shouldDelegate("Debug why the test suite is failing")

// Test cases (should return false):
shouldDelegate("List files in current directory")
shouldDelegate("Read main.ts")
```

**Your implementation:**

---

### Question 8 (15 points)
Implement a function that tracks compaction frequency and warns if compaction is happening too often (more than once every 10 turns on average).

```typescript
class CompactionMonitor {
  private compactionTurns: number[] = [];

  recordCompaction(turnNumber: number): void {
    // Your implementation
  }

  shouldWarn(): boolean {
    // Your implementation
    // Return true if compaction frequency is too high
  }

  getAverageInterval(): number {
    // Your implementation
    // Return average turns between compactions
  }
}
```

**Your implementation:**

---

## Bonus Question (10 points)

### Question 9
Design a "smart compaction" strategy that's better than the simple "keep first + summarize middle + keep last 6" approach. Describe:

a) What additional information you'd track
b) How you'd decide what to keep vs. summarize
c) One trade-off your approach makes

**Your answer:**

---

## Answer Key (For Instructor)

### Question 1 (10 points)
**Expected answer:**
- Long-running agents accumulate messages (user + assistant + tool results)
- Without management: exceed context window → API errors
- Also: increased latency, higher costs
- Critical around 40+ turns
- Need proactive management

**Grading:**
- 3 pts: Mentions message accumulation
- 3 pts: Mentions API errors/limit exceeded
- 2 pts: Mentions costs or latency
- 2 pts: Mentions proactive vs reactive

### Question 2 (10 points)
**Expected answer:**
- It's acceptable because: agents need rough estimates, not exact counts
- Within 10-15% is close enough for threshold decisions
- Might be wrong for: code-heavy content (more tokens), highly structured data (JSON/XML)
- Fast to compute (no tokenizer needed)

**Grading:**
- 3 pts: Explains acceptable accuracy range
- 3 pts: Notes it's for estimates, not precise counts
- 2 pts: Gives examples when wrong
- 2 pts: Mentions speed/simplicity benefit

### Question 3 (10 points)
**Expected answer:**
a) First message contains system prompt/initial instructions
b) Last 6 = ~3 turns of recent context, enough for immediate conversation flow
c) Only last 2 → agent loses track of recent actions, poor continuity

**Grading:**
- 3 pts: Part (a) correct
- 4 pts: Part (b) correct with reasoning
- 3 pts: Part (c) identifies problem

### Question 4 (10 points)
**Expected answer:**
- Scratchpad: persistent data across compactions (better for: tracking progress, storing findings)
- Sub-agent: isolated context for subtasks (better for: complex analysis, debugging)
- Example scenarios provided

**Grading:**
- 3 pts: Explains scratchpad purpose
- 3 pts: Explains sub-agent purpose
- 2 pts: Good scratchpad scenario
- 2 pts: Good sub-agent scenario

### Question 5 (15 points)
**Bug:** Doesn't preserve the first message
**Why:** First message contains system prompt/initial context
**Correct:**
```typescript
return [
  first,
  { role: "user", content: `Summary: ${summary}` },
  ...recent
];
```

**Grading:**
- 6 pts: Identifies missing first message
- 4 pts: Explains why it matters
- 5 pts: Correct fix

### Question 6 (15 points)
**Vulnerability:** Path traversal (can read any file with `../`)
**Exploit:** `key = "../../etc/passwd"`
**Fix:**
```typescript
async function scratchpadRead(key: string): Promise<string> {
  // Validate key contains no path separators
  if (key.includes("/") || key.includes("\\")) {
    return "Error: invalid key";
  }
  const filepath = path.join(SCRATCHPAD_DIR, `${key}.md`);
  // Also validate resolved path is within SCRATCHPAD_DIR
  const resolvedPath = path.resolve(filepath);
  const resolvedDir = path.resolve(SCRATCHPAD_DIR);
  if (!resolvedPath.startsWith(resolvedDir)) {
    return "Error: invalid path";
  }
  const content = await fs.readFile(filepath, "utf-8");
  return content;
}
```

**Grading:**
- 5 pts: Identifies path traversal
- 5 pts: Shows exploit
- 5 pts: Correct validation

### Question 7 (15 points)
**Sample solution:**
```typescript
function shouldDelegate(taskDescription: string): boolean {
  const lower = taskDescription.toLowerCase();

  // Multi-step indicators
  const multiStepKeywords = ["analyze all", "for each", "debug", "investigate", "research"];
  const hasMultiStep = multiStepKeywords.some(kw => lower.includes(kw));

  // Self-contained indicators
  const selfContained = !lower.includes("then") && !lower.includes("after that");

  // Length (complex tasks are usually longer)
  const isComplex = taskDescription.split(" ").length > 10;

  return hasMultiStep && (selfContained || isComplex);
}
```

**Grading:**
- 5 pts: Checks for multi-step keywords
- 5 pts: Considers task complexity
- 5 pts: Reasonable logic/passes tests

### Question 8 (15 points)
**Sample solution:**
```typescript
class CompactionMonitor {
  private compactionTurns: number[] = [];

  recordCompaction(turnNumber: number): void {
    this.compactionTurns.push(turnNumber);
  }

  shouldWarn(): boolean {
    return this.getAverageInterval() < 10;
  }

  getAverageInterval(): number {
    if (this.compactionTurns.length < 2) return Infinity;

    let totalInterval = 0;
    for (let i = 1; i < this.compactionTurns.length; i++) {
      totalInterval += this.compactionTurns[i] - this.compactionTurns[i - 1];
    }

    return totalInterval / (this.compactionTurns.length - 1);
  }
}
```

**Grading:**
- 5 pts: recordCompaction correct
- 5 pts: getAverageInterval correct
- 5 pts: shouldWarn correct

### Question 9 (10 points - Bonus)
**Sample answer:**
- Track message importance scores (tool results > text)
- Keep high-importance messages even if not recent
- Summarize only low-importance middle messages
- Trade-off: more complex, slower compaction

**Grading:**
- 3 pts: Additional tracking described
- 4 pts: Decision logic explained
- 3 pts: Trade-off identified

---

## Scoring

- **90-100:** Excellent understanding
- **80-89:** Good understanding, minor gaps
- **70-79:** Adequate understanding, some confusion
- **Below 70:** Needs review

**Total possible:** 100 points (110 with bonus)
