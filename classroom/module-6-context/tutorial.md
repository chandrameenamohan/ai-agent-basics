# Module 6: Context Engineering Tutorial

## Introduction

Context window management is one of the most critical challenges in building production agent systems. While modern LLMs have large context windows (100k+ tokens), agents can easily exceed these limits during long-running sessions. This tutorial teaches you three essential strategies for managing context effectively.

## The Context Problem

### Why Context Matters

Every message in your agent loop consumes tokens:
- User messages
- Assistant responses
- Tool use blocks
- Tool results (often the largest!)

A coding agent fixing bugs might accumulate:
- 20 user messages (avg 50 tokens each) = 1,000 tokens
- 20 assistant responses (avg 200 tokens each) = 4,000 tokens
- 60 tool calls with results (avg 500 tokens each) = 30,000 tokens
- **Total: 35,000 tokens in just 40 turns**

### When Context Becomes Critical

Context bloat typically emerges:
- After 40+ conversation turns
- When reading large files repeatedly
- During multi-file refactoring tasks
- In long debugging sessions

Without management, your agent will:
1. Exceed the context window → API errors
2. Slow down (more tokens = higher latency)
3. Increase costs (pay per token)

## Strategy 1: Token Estimation

Before you can manage context, you need to measure it.

### The 4-Character Rule

A simple heuristic works surprisingly well:

```typescript
function estimateTokens(messages: Message[]): number {
  const text = JSON.stringify(messages);
  return Math.ceil(text.length / 4);
}
```

**Why this works:**
- Average English word: ~4.5 characters
- Average token: ~0.75 words
- Result: ~4 characters per token

**Accuracy:** Within 10-15% of actual token counts for most content.

### When to Check

Check tokens before each API call:

```typescript
async function agentTurn(messages: Message[], tools: Tool[]) {
  // Always check first
  const tokens = estimateTokens(messages);
  console.log(`Current context: ~${tokens} tokens`);

  if (tokens > TOKEN_LIMIT * 0.8) {
    console.warn("Approaching token limit, compacting...");
    messages = await compactHistory(messages, TOKEN_LIMIT);
  }

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages,
    tools
  });

  return response;
}
```

**Pro tip:** Set your threshold at 80% of the limit to leave room for the response.

## Strategy 2: History Compaction

When context grows too large, compress it intelligently.

### The Compaction Algorithm

**Core principle:** Preserve structure while reducing content.

```typescript
async function compactHistory(
  messages: Message[],
  tokenLimit: number
): Promise<Message[]> {
  const currentTokens = estimateTokens(messages);

  // No compaction needed
  if (currentTokens <= tokenLimit) {
    return messages;
  }

  console.log(`Compacting ${messages.length} messages...`);

  // Always keep first message (system prompt / initial context)
  const firstMessage = messages[0];

  // Always keep recent history (last 6 messages = ~3 turns)
  const recentMessages = messages.slice(-6);

  // Everything in between gets summarized
  const middleMessages = messages.slice(1, -6);

  if (middleMessages.length === 0) {
    // Nothing to compact
    return messages;
  }

  // Use Claude to summarize the middle
  const summary = await summarizeMessages(middleMessages);

  // Reconstruct: first + summary + recent
  const compacted = [
    firstMessage,
    {
      role: "user",
      content: `Previous context summary: ${summary}`
    },
    ...recentMessages
  ];

  const newTokens = estimateTokens(compacted);
  console.log(`Compacted: ${currentTokens} → ${newTokens} tokens`);

  return compacted;
}
```

### Summarization Implementation

The summarizer is itself a Claude call:

```typescript
async function summarizeMessages(messages: Message[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Summarize this conversation history concisely. Focus on:
- Key decisions made
- Important findings or results
- Unresolved issues
- Files created or modified

Conversation:
${JSON.stringify(messages, null, 2)}

Summary (2-3 paragraphs):`
      }
    ]
  });

  return response.content[0].type === "text"
    ? response.content[0].text
    : "";
}
```

### What Gets Lost

Compaction is lossy:
- Exact wording of earlier messages
- Intermediate reasoning steps
- Tool call/result details

What's preserved:
- Recent context (last 6 messages)
- High-level summary of earlier work
- Initial instructions

### When to Compact

**Reactive approach:**
```typescript
if (estimateTokens(messages) > TOKEN_LIMIT * 0.8) {
  messages = await compactHistory(messages, TOKEN_LIMIT);
}
```

**Proactive approach:**
```typescript
// Compact every N turns as routine maintenance
if (turnCount % 20 === 0) {
  messages = await compactHistory(messages, TOKEN_LIMIT);
}
```

**Best practice:** Use both. Routine compaction prevents emergency situations.

## Strategy 3: Scratchpad Pattern

Sometimes you need context that survives compaction.

### The Problem

When you compact history, you lose:
- File content that was read earlier
- Incremental findings from analysis
- Multi-step plan progress

### The Solution: External Memory

Store important information outside the message history:

```
.scratchpad/
├── file-list.md
├── findings.md
├── plan.md
└── errors.md
```

### Scratchpad Tools

Give your agent three tools:

**1. Write Scratchpad**
```typescript
{
  name: "scratchpad_write",
  description: "Write or update a scratchpad note. Use this to save important information that should persist across conversation compaction.",
  input_schema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "Note identifier (e.g., 'findings', 'plan', 'file-list')"
      },
      content: {
        type: "string",
        description: "Content to write"
      }
    },
    required: ["key", "content"]
  }
}
```

**2. Read Scratchpad**
```typescript
{
  name: "scratchpad_read",
  description: "Read a scratchpad note",
  input_schema: {
    type: "object",
    properties: {
      key: {
        type: "string",
        description: "Note identifier"
      }
    },
    required: ["key"]
  }
}
```

**3. List Scratchpad**
```typescript
{
  name: "scratchpad_list",
  description: "List all scratchpad notes",
  input_schema: {
    type: "object",
    properties: {}
  }
}
```

### Implementation

```typescript
import * as fs from "fs/promises";
import * as path from "path";

const SCRATCHPAD_DIR = ".scratchpad";

async function scratchpadWrite(key: string, content: string): Promise<string> {
  await fs.mkdir(SCRATCHPAD_DIR, { recursive: true });
  const filepath = path.join(SCRATCHPAD_DIR, `${key}.md`);
  await fs.writeFile(filepath, content, "utf-8");
  return `Wrote to scratchpad: ${key}`;
}

async function scratchpadRead(key: string): Promise<string> {
  try {
    const filepath = path.join(SCRATCHPAD_DIR, `${key}.md`);
    const content = await fs.readFile(filepath, "utf-8");
    return content;
  } catch (error) {
    return `Error: scratchpad note '${key}' not found`;
  }
}

async function scratchpadList(): Promise<string> {
  try {
    const files = await fs.readdir(SCRATCHPAD_DIR);
    const notes = files.filter(f => f.endsWith(".md"))
                       .map(f => f.replace(".md", ""));
    return notes.length > 0
      ? `Scratchpad notes: ${notes.join(", ")}`
      : "No scratchpad notes yet";
  } catch (error) {
    return "No scratchpad notes yet";
  }
}
```

### Agent Usage Pattern

Teach your agent to use scratchpad early:

**System prompt addition:**
```
When working on complex tasks:
1. Use scratchpad_write to save important findings
2. Use scratchpad_read to recall previous work after context compaction
3. Use scratchpad_list to see what information you've saved

Good scratchpad keys:
- "plan" - overall task plan and progress
- "findings" - important discoveries
- "file-list" - files you've examined
- "errors" - bugs found and fixed
```

## Strategy 4: Sub-Agents

For complex subtasks, spawn a fresh agent with a clean context.

### When to Use Sub-Agents

Use sub-agents when:
- A subtask is self-contained
- The subtask might take many turns
- You want to isolate context bloat
- You need focused problem-solving

**Example scenarios:**
- "Analyze this file and suggest improvements"
- "Debug why this test fails"
- "Research how this API works"

### Sub-Agent Pattern

```typescript
async function runSubAgent(
  taskDescription: string,
  tools: Tool[],
  maxTurns: number = 20
): Promise<string> {
  // Fresh message history
  const messages: Message[] = [
    {
      role: "user",
      content: taskDescription
    }
  ];

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages,
      tools
    });

    messages.push({
      role: "assistant",
      content: response.content
    });

    if (response.stop_reason === "end_turn") {
      // Extract final text response
      const textContent = response.content
        .filter(c => c.type === "text")
        .map(c => c.text)
        .join("\n");

      return textContent;
    }

    // Execute tools
    const toolResults = await executeTools(response.content, tools);
    messages.push({
      role: "user",
      content: toolResults
    });
  }

  return "Sub-agent exceeded turn limit";
}
```

### Using Sub-Agents in Main Agent

Add as a tool:

```typescript
{
  name: "delegate_subtask",
  description: "Delegate a self-contained subtask to a fresh agent instance. Use this for complex analysis or debugging that might take many turns.",
  input_schema: {
    type: "object",
    properties: {
      task_description: {
        type: "string",
        description: "Clear description of what the sub-agent should accomplish"
      }
    },
    required: ["task_description"]
  }
}

async function executeDelegateSubtask(task_description: string): Promise<string> {
  const result = await runSubAgent(task_description, availableTools, 20);
  return `Sub-agent result:\n${result}`;
}
```

### Sub-Agent Best Practices

**1. Clear task definition:**
```
Good: "Analyze main.ts and list all functions that make API calls"
Bad: "Help with the code"
```

**2. Return only essential information:**
```typescript
// In sub-agent's final response, summarize
return `Found 3 functions making API calls:
1. fetchUser() - line 45
2. updateProfile() - line 89
3. deleteAccount() - line 134

All use fetch() with proper error handling.`;
```

**3. Give sub-agents same tools:**
Sub-agents need the same tools as the main agent to be effective.

**4. Set reasonable turn limits:**
- Simple analysis: 10 turns
- Debugging: 20 turns
- Complex refactoring: 30 turns

## Putting It All Together

### Complete Context-Managed Agent

```typescript
const TOKEN_LIMIT = 180000; // ~180k tokens
const COMPACT_THRESHOLD = TOKEN_LIMIT * 0.8;

async function agentLoop(initialPrompt: string) {
  const messages: Message[] = [
    { role: "user", content: initialPrompt }
  ];

  let turnCount = 0;
  const maxTurns = 50;

  while (turnCount < maxTurns) {
    // Always check context size
    const tokens = estimateTokens(messages);
    console.log(`Turn ${turnCount}, ~${tokens} tokens`);

    // Compact if needed
    if (tokens > COMPACT_THRESHOLD) {
      messages = await compactHistory(messages, TOKEN_LIMIT);
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages,
      tools: [
        ...fileTools,
        ...scratchpadTools,
        subAgentTool
      ]
    });

    messages.push({
      role: "assistant",
      content: response.content
    });

    if (response.stop_reason === "end_turn") {
      break;
    }

    const toolResults = await executeTools(response.content);
    messages.push({
      role: "user",
      content: toolResults
    });

    turnCount++;
  }

  return messages;
}
```

## Summary

Context engineering uses four strategies:

1. **Token Estimation:** Monitor context size using ~4 chars/token heuristic
2. **History Compaction:** Keep first + recent messages, summarize middle
3. **Scratchpad:** External memory that survives compaction
4. **Sub-Agents:** Delegate subtasks to fresh contexts

**Key insights:**
- Context bloat is inevitable in long sessions
- Proactive management beats reactive fixes
- Lossy compression is acceptable if done right
- External memory provides persistence

**Next steps:**
- Implement token estimation in your agent
- Add compaction before it's needed
- Give agents scratchpad tools
- Experiment with sub-agent delegation

In Module 7, we'll learn how to evaluate whether these strategies actually work through systematic testing.
