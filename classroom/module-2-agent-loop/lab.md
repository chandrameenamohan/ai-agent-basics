# Module 2: Agent Loop - Lab

## Overview

In this lab, you'll build a working agent loop from scratch. You'll start with the bare minimum, then add tools, safety features, and configuration.

**Time estimate:** 45-60 minutes

## Setup

Create a new file in the module-2-agent-loop directory:

```bash
touch module-2-agent-loop/my-agent.ts
```

Add these imports:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

## Part 1: Minimal Loop (15 min)

Build the simplest possible agent loop. It should:
- Accept a user message
- Send it to Claude
- Return the response

**No tools yet** - just get the loop working.

```typescript
async function minimalAgent(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages
  });

  // TODO: Extract and return text from response.content
  // Hint: response.content is an array of blocks
  // Find the one with type === "text"
}

// Test it
const result = await minimalAgent("What is the capital of France?");
console.log(result);
```

**Expected output:** "The capital of France is Paris."

### Checkpoint
- Can you get a text response from Claude?
- What happens if there's no text block in the response?

## Part 2: Add the Loop (15 min)

Now turn this into a real loop. You won't have tools yet, but set up the structure:

```typescript
async function agentLoop(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages
    });

    // TODO: Add assistant response to messages

    // TODO: Check stop_reason
    // If "end_turn", extract text and return
    // If "tool_use", we'll handle that next

    // For now, just break after one turn
    break;
  }

  return "Loop completed";
}
```

**Test:** Run the same question. You should get the same answer, but now you have a loop structure.

### Checkpoint
- Does your loop add the assistant response to messages?
- Does it check stop_reason?
- Can it extract text on "end_turn"?

## Part 3: Add a Tool (20 min)

Let's add a simple calculator tool. First, define the tool interface:

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
```

Now create a calculator:

```typescript
const calculatorTool: Tool = {
  name: "calculator",
  description: "Performs basic arithmetic: add, subtract, multiply, divide",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation: add, subtract, multiply, or divide"
      },
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["operation", "a", "b"]
  },
  execute: async (input) => {
    const { operation, a, b } = input as { operation: string; a: number; b: number };

    switch (operation) {
      case "add":
        return String(a + b);
      case "subtract":
        return String(a - b);
      case "multiply":
        return String(a * b);
      case "divide":
        if (b === 0) return "Error: division by zero";
        return String(a / b);
      default:
        return `Error: unknown operation "${operation}"`;
    }
  }
};
```

Now update your agent to accept and use tools:

```typescript
async function agentWithTools(
  userMessage: string,
  tools: Tool[]
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  // Create tool definitions (without execute function)
  const toolDefs = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }));

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages,
      tools: toolDefs  // Pass tools to API
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    // TODO: Handle tool_use
    // 1. Loop through response.content
    // 2. Find blocks with type === "tool_use"
    // 3. Execute each tool
    // 4. Create tool_result blocks
    // 5. Add them as a user message
    // 6. Continue the loop

    // Hint: You'll need to build an array of tool results like:
    // const toolResults: Anthropic.ToolResultBlockParam[] = [];
  }
}

// Test it
const result = await agentWithTools(
  "What is 157 * 293?",
  [calculatorTool]
);
console.log(result);
```

**Expected output:** "157 × 293 = 46,001" (or similar)

### Checkpoint
- Does Claude use the calculator tool?
- Can you see the tool_use block in the response?
- Do tool results get added as user messages?
- Does the agent loop back and give you a final answer?

## Part 4: Add Safety (10 min)

Add a turn limit to prevent infinite loops:

```typescript
async function safeAgent(
  userMessage: string,
  tools: Tool[],
  maxTurns = 10
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  const toolDefs = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }));

  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    // TODO: Copy your agent loop from Part 3
    // Add turn counter and check at the start of the loop
  }

  return `Error: exceeded ${maxTurns} turns without completing task`;
}

// Test with a complex calculation
const result = await safeAgent(
  "Calculate (25 * 4) + (100 / 5) - 7",
  [calculatorTool],
  10
);
console.log(result);
```

**Note:** Claude may need multiple turns for complex calculations (multiple tool calls).

### Checkpoint
- Does your agent stop after maxTurns?
- Can it handle multi-step calculations?
- What happens if you set maxTurns to 1?

## Part 5: Configuration Pattern (10 min)

Clean up your code using a config object:

```typescript
interface AgentConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;
  systemPrompt?: string;
  tools: Tool[];
}

async function runAgent(
  userMessage: string,
  config: AgentConfig
): Promise<string> {
  // TODO: Implement using config object
  // This is just a refactor of Part 4
  // But now all parameters come from config
}

// Test it
const result = await runAgent(
  "What is 50 divided by 2, then multiplied by 7?",
  {
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
    maxTurns: 10,
    systemPrompt: "You are a helpful math assistant.",
    tools: [calculatorTool]
  }
);
console.log(result);
```

### Checkpoint
- Is your code cleaner with the config object?
- Can you easily change the model or max tokens?
- Does the system prompt affect Claude's responses?

## Challenge Exercises

### Challenge 1: Add More Tools

Add two more tools to your agent:

1. **get-time**: Returns the current time
2. **flip-coin**: Returns "heads" or "tails" randomly

Test with: "Flip a coin and tell me the current time"

### Challenge 2: Debug Logging

Add optional debug logging that shows:
- Each turn number
- What tools were called
- What results were returned

```typescript
interface AgentConfig {
  // ... existing fields
  debug?: boolean;
}

// In your loop:
if (config.debug) {
  console.log(`Turn ${turns}: ${response.stop_reason}`);
  if (response.stop_reason === "tool_use") {
    // Log tool calls
  }
}
```

### Challenge 3: Error Handling

What happens if a tool throws an error? Modify your tool execution to catch errors:

```typescript
for (const block of response.content) {
  if (block.type === "tool_use") {
    const tool = tools.find(t => t.name === block.name);

    let result: string;
    if (!tool) {
      result = `Error: unknown tool "${block.name}"`;
    } else {
      try {
        result = await tool.execute(block.input);
      } catch (error) {
        result = `Error executing tool: ${error.message}`;
      }
    }

    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: result
    });
  }
}
```

Test with a broken tool that throws an error.

## Full Solution Structure

Your final `my-agent.ts` should have:

1. Imports and client setup
2. Tool interface definition
3. AgentConfig interface
4. Calculator tool (and any others you added)
5. runAgent function with complete loop
6. Test cases at the bottom

**Run it:**
```bash
bun module-2-agent-loop/my-agent.ts
```

## Key Takeaways

After completing this lab, you should understand:

1. How the agent loop checks stop_reason
2. How to add assistant responses to message history
3. How to execute tools and return results
4. How to prevent infinite loops with maxTurns
5. How to structure agent configuration

## Next Steps

In the next lab, we'll build a **Tool Registry** to manage multiple tools cleanly. You'll see how to avoid passing tool arrays around and instead use a centralized registry.
