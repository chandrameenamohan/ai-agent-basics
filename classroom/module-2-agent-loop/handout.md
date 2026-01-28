# Module 2: Agent Loop - Quick Reference

## Core Concept

**Agent = while loop checking stop_reason**

```typescript
while (true) {
  const response = await client.messages.create({ model, max_tokens, messages, tools });
  messages.push({ role: "assistant", content: response.content });

  if (response.stop_reason === "end_turn") {
    return extractText(response.content);
  }

  // Execute tools and add results
  const toolResults = executeTools(response.content);
  messages.push({ role: "user", content: toolResults });
}
```

## Stop Reasons

| stop_reason | Meaning | Action |
|-------------|---------|--------|
| `"end_turn"` | Claude is done | Extract text, return |
| `"tool_use"` | Claude wants tools | Execute tools, add results, loop |

## Message Structure

```typescript
type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };
```

**Rules:**
- Messages alternate: user, assistant, user, assistant...
- Tool results are **user** role messages
- Always link tool_result to tool_use via `tool_use_id`

## Tool Interface

```typescript
interface Tool {
  name: string;                    // Lowercase-kebab-case
  description: string;             // What it does, when to use it
  input_schema: {                  // JSON Schema
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<string>;  // Local function
}
```

## Agent Config Pattern

```typescript
interface AgentConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;      // Prevent infinite loops
  systemPrompt?: string;
  tools: Tool[];
}
```

## Complete Minimal Loop

```typescript
async function runAgent(userMessage: string, tools: Tool[]): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  const toolDefs = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }));

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages,
      tools: toolDefs
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const tool = tools.find(t => t.name === block.name);
        const result = tool ? await tool.execute(block.input) : "Error: unknown tool";
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }
}
```

## Flow Diagram

```
User gives task
  │
  ▼
┌────────────────────────┐
│ Send messages to LLM   │◄──┐
│  │                     │   │
│  ▼                     │   │
│ Check stop_reason:     │   │
│  • end_turn → DONE     │   │
│  • tool_use → Execute  │───┘
│    tools, add results,
│    loop again
└────────────────────────┘
```

## Common Patterns

### Extract Final Text
```typescript
if (response.stop_reason === "end_turn") {
  const textBlock = response.content.find(b => b.type === "text");
  return textBlock?.type === "text" ? textBlock.text : "(no text)";
}
```

### Execute All Tool Calls
```typescript
const toolResults: Anthropic.ToolResultBlockParam[] = [];
for (const block of response.content) {
  if (block.type === "tool_use") {
    const tool = tools.find(t => t.name === block.name);
    const result = tool ? await tool.execute(block.input) : "Error: unknown tool";
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: result
    });
  }
}
messages.push({ role: "user", content: toolResults });
```

### maxTurns Safety
```typescript
let turns = 0;
while (turns < config.maxTurns) {
  turns++;
  // ... agent loop
}
return `Error: exceeded ${config.maxTurns} turns`;
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Tool results as assistant role | Use `role: "user"` |
| Missing `tool_use_id` | Always include `tool_use_id: block.id` |
| Not iterating all content blocks | Use `for (const block of response.content)` |
| Forgetting to add assistant response | Add before checking stop_reason |
| No turn limit | Always set `maxTurns` |

## Quick Test Tool

```typescript
const echoTool: Tool = {
  name: "echo",
  description: "Returns input unchanged",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string" }
    },
    required: ["text"]
  },
  execute: async (input) => String(input.text)
};
```

## Model

Use **claude-sonnet-4-20250514** for production agents.
