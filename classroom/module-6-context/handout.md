# Module 6: Context Engineering - Quick Reference

## The Problem

Agents accumulate messages → exceed context window → API errors or high costs.

**Typical bloat timeline:**
- 10 turns: ~8k tokens
- 40 turns: ~35k tokens (critical threshold)
- 100 turns: ~100k+ tokens (danger zone)

## Token Estimation

### 4-Character Rule

```typescript
function estimateTokens(messages: Message[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}
```

**Accuracy:** Within 10-15% of actual count.

### When to Check

```typescript
const TOKEN_LIMIT = 180000;
const THRESHOLD = TOKEN_LIMIT * 0.8; // 80% threshold

if (estimateTokens(messages) > THRESHOLD) {
  messages = await compactHistory(messages, TOKEN_LIMIT);
}
```

## History Compaction

### Algorithm

1. Keep first message (system prompt)
2. Keep last 6 messages (recent context)
3. Summarize everything in between
4. Reconstruct: first + summary + recent

### Implementation

```typescript
async function compactHistory(messages: Message[], tokenLimit: number) {
  if (estimateTokens(messages) <= tokenLimit) return messages;

  const first = messages[0];
  const recent = messages.slice(-6);
  const middle = messages.slice(1, -6);

  const summary = await summarizeMessages(middle);

  return [
    first,
    { role: "user", content: `Previous context summary: ${summary}` },
    ...recent
  ];
}
```

### Summarization

```typescript
async function summarizeMessages(messages: Message[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Summarize this conversation history. Focus on:
- Key decisions made
- Important findings
- Files modified
- Unresolved issues

${JSON.stringify(messages, null, 2)}`
    }]
  });

  return response.content[0].text;
}
```

## Scratchpad Pattern

External memory that survives compaction.

### Three Tools

```typescript
// Write
scratchpad_write(key: string, content: string)

// Read
scratchpad_read(key: string)

// List
scratchpad_list()
```

### File Structure

```
.scratchpad/
├── plan.md        # Task plan and progress
├── findings.md    # Important discoveries
├── file-list.md   # Files examined
└── errors.md      # Bugs found/fixed
```

### Implementation

```typescript
import * as fs from "fs/promises";
import * as path from "path";

const SCRATCHPAD_DIR = ".scratchpad";

async function scratchpadWrite(key: string, content: string) {
  await fs.mkdir(SCRATCHPAD_DIR, { recursive: true });
  await fs.writeFile(
    path.join(SCRATCHPAD_DIR, `${key}.md`),
    content,
    "utf-8"
  );
  return `Wrote to scratchpad: ${key}`;
}

async function scratchpadRead(key: string) {
  try {
    return await fs.readFile(
      path.join(SCRATCHPAD_DIR, `${key}.md`),
      "utf-8"
    );
  } catch {
    return `Error: scratchpad note '${key}' not found`;
  }
}

async function scratchpadList() {
  try {
    const files = await fs.readdir(SCRATCHPAD_DIR);
    const notes = files.filter(f => f.endsWith(".md"))
                       .map(f => f.replace(".md", ""));
    return notes.length > 0
      ? `Scratchpad notes: ${notes.join(", ")}`
      : "No scratchpad notes yet";
  } catch {
    return "No scratchpad notes yet";
  }
}
```

## Sub-Agents

Delegate self-contained subtasks to fresh agent loops.

### Pattern

```typescript
async function runSubAgent(
  taskDescription: string,
  tools: Tool[],
  maxTurns: number = 20
): Promise<string> {
  const messages = [{ role: "user", content: taskDescription }];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages,
      tools
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      return response.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("\n");
    }

    const toolResults = await executeTools(response.content, tools);
    messages.push({ role: "user", content: toolResults });
  }

  return "Sub-agent exceeded turn limit";
}
```

### As a Tool

```typescript
{
  name: "delegate_subtask",
  description: "Delegate a self-contained subtask to a fresh agent",
  input_schema: {
    type: "object",
    properties: {
      task_description: { type: "string" }
    },
    required: ["task_description"]
  }
}
```

### When to Use

**Good for:**
- Complex analysis tasks
- Debugging investigations
- Research queries
- Self-contained refactoring

**Bad for:**
- Simple operations
- Tasks requiring main context
- Quick lookups

## Complete Agent Loop

```typescript
const TOKEN_LIMIT = 180000;
const THRESHOLD = TOKEN_LIMIT * 0.8;

async function agentLoop(initialPrompt: string) {
  const messages = [{ role: "user", content: initialPrompt }];
  let turnCount = 0;

  while (turnCount < 50) {
    // Check and compact
    const tokens = estimateTokens(messages);
    if (tokens > THRESHOLD) {
      messages = await compactHistory(messages, TOKEN_LIMIT);
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages,
      tools: [...fileTools, ...scratchpadTools, subAgentTool]
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    const toolResults = await executeTools(response.content);
    messages.push({ role: "user", content: toolResults });

    turnCount++;
  }

  return messages;
}
```

## Best Practices

### Token Management
- Check tokens before every API call
- Set threshold at 80% of limit
- Compact proactively (every 20 turns)
- Log token counts for debugging

### Compaction Strategy
- Keep first message (system context)
- Keep last 6 messages (recent context)
- Summarize middle (historical context)
- Never compact recent messages

### Scratchpad Usage
- Write early and often
- Use descriptive keys
- Read after compaction
- List to remind agent what exists

### Sub-Agent Delegation
- Write clear task descriptions
- Give same tools as main agent
- Set appropriate turn limits
- Return only essential information

## Common Pitfalls

1. **Forgetting to check tokens** → Sudden API errors
2. **Compacting too late** → No room for response
3. **Not using scratchpad** → Lost context after compaction
4. **Sub-agent task too vague** → Poor results
5. **Compacting recent messages** → Loss of critical context

## Metrics to Monitor

- Tokens per turn
- Compaction frequency
- Scratchpad read/write ratio
- Sub-agent invocation rate
- Average turns to completion

## Quick Checklist

Before deploying your agent:

- [ ] Token estimation implemented
- [ ] Compaction threshold set (80%)
- [ ] Scratchpad tools available
- [ ] Sub-agent delegation tool added
- [ ] System prompt explains scratchpad
- [ ] Token logging enabled
- [ ] Tested with 50+ turn session
