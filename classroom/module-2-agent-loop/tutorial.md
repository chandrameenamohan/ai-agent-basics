# Module 2: The Agent Loop - Tutorial

## Introduction

You've learned how to call the Claude API. Now we'll turn that single call into an **agent** that can use tools and solve complex tasks autonomously.

The key insight: **an agent is just a while loop checking stop_reason**.

## What Makes an LLM an Agent?

A bare LLM call is like asking a friend a question and getting one answer. An agent is like working with a partner who can:
1. Think about your request
2. Realize they need a tool (calculator, search engine, file system)
3. Use that tool
4. Think about the result
5. Repeat until done

The "repeat until done" part is the **agent loop**.

## The Stop Reason: Your Loop Condition

Every Claude API response includes a `stop_reason` field. It tells you why Claude stopped generating:

- **"end_turn"**: Claude is done, has given you a final answer
- **"tool_use"**: Claude wants to use one or more tools

Your agent loop checks this field. If it's "tool_use", you execute the tools and send results back. If it's "end_turn", you're done.

```typescript
while (true) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: messages,
    tools: toolDefinitions
  });

  if (response.stop_reason === "end_turn") {
    // Extract text and return - we're done
    break;
  }

  if (response.stop_reason === "tool_use") {
    // Execute tools and loop again
    continue;
  }
}
```

## Message Structure: The Conversation History

The `messages` array is your conversation history. It alternates between `user` and `assistant` roles:

```typescript
const messages = [
  { role: "user", content: "What is 25 * 47?" },
  { role: "assistant", content: [
    { type: "text", text: "I'll use the calculator" },
    { type: "tool_use", id: "tool_xyz", name: "calculator", input: { operation: "multiply", a: 25, b: 47 } }
  ]},
  { role: "user", content: [
    { type: "tool_result", tool_use_id: "tool_xyz", content: "1175" }
  ]},
  { role: "assistant", content: [
    { type: "text", text: "25 × 47 = 1,175" }
  ]}
];
```

**Key rules:**
- Messages alternate: user, assistant, user, assistant...
- Tool results are sent as **user** messages (you are providing the tool output)
- Each tool_result must reference its tool_use via `tool_use_id`

## Content Blocks: Mixed Responses

Claude's responses use a `content` array that can contain multiple blocks:

```typescript
response.content = [
  { type: "text", text: "Let me calculate that for you." },
  { type: "tool_use", id: "toolu_123", name: "calculator", input: { a: 5, b: 3 } }
]
```

On "end_turn", you'll typically get just text blocks. On "tool_use", you get tool_use blocks (and often text explaining what Claude is doing).

## Tool Definitions: The Schema

Tools are defined using JSON Schema. Here's a complete example:

```typescript
interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<string>;
}

const calculatorTool: Tool = {
  name: "calculator",
  description: "Performs basic arithmetic operations",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "The operation: add, subtract, multiply, divide"
      },
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["operation", "a", "b"]
  },
  execute: async (input) => {
    const { operation, a, b } = input as { operation: string; a: number; b: number };
    switch (operation) {
      case "add": return String(a + b);
      case "multiply": return String(a * b);
      default: return "Error: unknown operation";
    }
  }
};
```

**What Claude sees**: The `name`, `description`, and `input_schema`. It uses these to decide when and how to call the tool.

**What stays local**: The `execute` function. This runs in your code, not in Claude.

## Building the Complete Loop

Here's a complete minimal agent:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Tool {
  name: string;
  description: string;
  input_schema: object;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

async function runAgent(
  userMessage: string,
  tools: Tool[],
  model = "claude-sonnet-4-20250514"
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  // Tool definitions (without execute function)
  const toolDefs = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }));

  while (true) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages,
      tools: toolDefs
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    // Check stop reason
    if (response.stop_reason === "end_turn") {
      // Extract text from response
      const textBlock = response.content.find(b => b.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "(no text)";
    }

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const tool = tools.find(t => t.name === block.name);
        const result = tool
          ? await tool.execute(block.input)
          : `Error: unknown tool "${block.name}"`;

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result
        });
      }
    }

    // Add tool results as user message
    messages.push({ role: "user", content: toolResults });
  }
}
```

## The Flow Visualized

```
User: "What is 25 * 47?"
  │
  ▼
┌─────────────────────────────────────────┐
│ Agent Loop (Turn 1)                     │
│ ─────────────────────────────────────── │
│ Send: [user: "What is 25 * 47?"]       │
│   │                                     │
│   ▼                                     │
│ Claude responds:                        │
│   content: [                            │
│     {text: "I'll calculate..."},        │
│     {tool_use: calculator, 25, 47}      │
│   ]                                     │
│   stop_reason: "tool_use"               │
│   │                                     │
│   ▼                                     │
│ Execute tool: calculator(25, 47)        │
│   Result: "1175"                        │
│   │                                     │
│   ▼                                     │
│ Loop again with tool result...          │
└─────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────┐
│ Agent Loop (Turn 2)                     │
│ ─────────────────────────────────────── │
│ Send: [user, assistant, user: result]  │
│   │                                     │
│   ▼                                     │
│ Claude responds:                        │
│   content: [                            │
│     {text: "25 × 47 = 1,175"}          │
│   ]                                     │
│   stop_reason: "end_turn"               │
│   │                                     │
│   ▼                                     │
│ Extract text → DONE                     │
└─────────────────────────────────────────┘
  │
  ▼
Return: "25 × 47 = 1,175"
```

## Agent Configuration Pattern

As agents get complex, use a config object:

```typescript
interface AgentConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;  // Prevent infinite loops
  systemPrompt?: string;
  tools: Tool[];
}

async function runAgent(
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  let turns = 0;

  while (turns < config.maxTurns) {
    turns++;

    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.systemPrompt,
      messages,
      tools: config.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }))
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const tool = config.tools.find(t => t.name === block.name);
        const result = tool
          ? await tool.execute(block.input)
          : `Error: unknown tool`;
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return `Error: exceeded ${config.maxTurns} turns`;
}
```

## Why maxTurns Matters

Without a turn limit, bugs can cause infinite loops:
- Tool returns malformed output Claude doesn't understand
- Tool fails but Claude keeps retrying
- Task is impossible but Claude doesn't give up

Always set a reasonable `maxTurns` (10-50 depending on task complexity).

## Common Pitfalls

### 1. Wrong Message Role for Tool Results
```typescript
// WRONG - tool results must be user role
messages.push({ role: "assistant", content: toolResults });

// RIGHT
messages.push({ role: "user", content: toolResults });
```

### 2. Missing tool_use_id
```typescript
// WRONG - no link to original tool call
{ type: "tool_result", content: result }

// RIGHT - references the tool_use block
{ type: "tool_result", tool_use_id: block.id, content: result }
```

### 3. Not Handling All Content Blocks
```typescript
// WRONG - might miss tool calls
const toolBlock = response.content[0];
if (toolBlock.type === "tool_use") { ... }

// RIGHT - iterate all blocks
for (const block of response.content) {
  if (block.type === "tool_use") { ... }
}
```

### 4. Forgetting to Add Assistant Response
```typescript
// WRONG - skips adding Claude's response to history
if (response.stop_reason === "end_turn") {
  return extractText(response);
}

// RIGHT - always add to messages first
messages.push({ role: "assistant", content: response.content });
if (response.stop_reason === "end_turn") { ... }
```

## Testing Your Loop

Start with a simple echo tool:

```typescript
const echoTool: Tool = {
  name: "echo",
  description: "Returns the input text unchanged",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to echo" }
    },
    required: ["text"]
  },
  execute: async (input) => {
    return (input.text as string) || "empty";
  }
};

// Test
const result = await runAgent(
  "Use the echo tool to say 'Hello from the agent loop!'",
  { model: "claude-sonnet-4-20250514", maxTokens: 1024, maxTurns: 5, tools: [echoTool] }
);
console.log(result);
```

You should see Claude use the tool and then respond with the echoed text.

## Next Steps

You now understand the agent loop. In the next module, we'll build a **Tool Registry** to manage tools cleanly at scale. For now, practice building simple agents with 2-3 tools and experiment with different task types.

## Key Takeaways

1. **Agent = while loop + stop_reason check**
2. **stop_reason "end_turn"** → extract text, return
3. **stop_reason "tool_use"** → execute tools, add results as user message, loop
4. **Messages alternate** user/assistant, tool results are user role
5. **Tool definitions** (schema) sent to Claude, execution is local
6. **maxTurns** prevents infinite loops
7. **Always add assistant response to messages** before checking stop_reason
