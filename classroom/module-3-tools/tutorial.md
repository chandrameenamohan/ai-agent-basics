# Module 3: Tool System - Tutorial

## Introduction

In Module 2, you learned the agent loop. You passed tools as an array and searched for them by name. This works for 2-3 tools, but real agents use dozens of tools. You need a better system.

Enter the **Tool Registry**: a centralized manager for all your agent's tools.

## The Problem: Tool Sprawl

Here's what happens without a registry:

```typescript
// Agent function signature gets messy
async function runAgent(
  message: string,
  calculatorTool: Tool,
  weatherTool: Tool,
  fileTool: Tool,
  searchTool: Tool,
  // ... 20 more tools
): Promise<string> {
  const tools = [calculatorTool, weatherTool, fileTool, searchTool /* ... */];

  // Tool lookup is manual
  for (const block of response.content) {
    if (block.type === "tool_use") {
      const tool = tools.find(t => t.name === block.name);
      if (!tool) {
        // Error handling
      }
      const result = await tool.execute(block.input);
      // More code...
    }
  }
}
```

Problems:
- Function signatures grow endlessly
- Tool lookup is repeated everywhere
- Error handling is inconsistent
- No central place to see what tools exist
- Testing individual tools is awkward

## The Solution: Tool Registry Pattern

A registry is a Map-based manager that handles tools cleanly:

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getDefinitions(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema
    }));
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: unknown tool "${name}"`;
    }
    try {
      return await tool.execute(input);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}
```

Now your agent code is clean:

```typescript
const registry = new ToolRegistry();
registry.register(calculatorTool);
registry.register(weatherTool);
registry.register(fileTool);

// In your agent loop:
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages,
  tools: registry.getDefinitions()  // Clean!
});

// Tool execution is centralized:
for (const block of response.content) {
  if (block.type === "tool_use") {
    const result = await registry.execute(block.name, block.input);  // Simple!
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: result
    });
  }
}
```

## Key Methods Explained

### register(tool: Tool)

Adds a tool to the registry. Call this once per tool at startup:

```typescript
const registry = new ToolRegistry();

registry.register({
  name: "add",
  description: "Adds two numbers",
  input_schema: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" }
    },
    required: ["a", "b"]
  },
  execute: async (input) => {
    const { a, b } = input as { a: number; b: number };
    return String(a + b);
  }
});
```

### getDefinitions(): Anthropic.Tool[]

Returns tool schemas for the API. Strips the `execute` function:

```typescript
const toolDefs = registry.getDefinitions();
// Returns: [{ name: "add", description: "...", input_schema: {...} }]

// Pass to Claude:
await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages,
  tools: toolDefs
});
```

### execute(name: string, input: object): Promise<string>

Executes a tool by name. Handles errors gracefully:

```typescript
// In your agent loop:
const result = await registry.execute("add", { a: 5, b: 3 });
// Returns: "8"

const result2 = await registry.execute("unknown-tool", {});
// Returns: "Error: unknown tool \"unknown-tool\""
```

**Critical**: This method wraps execution in try/catch, so tools never crash your agent.

### has(name: string): boolean

Check if a tool exists:

```typescript
if (registry.has("calculator")) {
  console.log("Calculator is available");
}
```

### list(): string[]

Get all registered tool names:

```typescript
console.log("Available tools:", registry.list());
// Output: ["add", "multiply", "calculator", "get-time"]
```

## Error Handling Philosophy

**Key rule: Tools always return strings. Errors are strings too, never throw.**

```typescript
// WRONG - throws error
execute: async (input) => {
  if (!input.a) {
    throw new Error("Missing parameter a");
  }
  return String(input.a);
}

// RIGHT - returns error string
execute: async (input) => {
  if (!input.a) {
    return "Error: missing parameter a";
  }
  return String(input.a);
}
```

The registry's `execute` method adds a safety net:

```typescript
async execute(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = this.tools.get(name);
  if (!tool) {
    return `Error: unknown tool "${name}"`;
  }

  try {
    return await tool.execute(input);
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
```

This means:
1. If tool doesn't exist → returns error string
2. If tool throws an exception → catches it, returns error string
3. Agent loop never crashes from tool errors

## Tool Design Rules

### 1. Names: lowercase-kebab-case

```typescript
// GOOD
"add-numbers"
"get-current-time"
"search-web"

// BAD
"addNumbers"
"GetCurrentTime"
"search_web"
```

### 2. Descriptions: Precise and actionable

```typescript
// GOOD
description: "Adds two numbers and returns their sum"
description: "Searches the web for a query and returns top 5 results"

// BAD
description: "A tool"
description: "Does math stuff"
```

Claude uses descriptions to decide when to use tools. Be specific.

### 3. Always Return Strings

```typescript
// GOOD
execute: async (input) => {
  const result = someCalculation(input);
  return String(result);  // Explicit conversion
}

// BAD
execute: async (input) => {
  return someCalculation(input);  // Might return number
}
```

### 4. Validate Input

```typescript
execute: async (input) => {
  const { a, b } = input as { a: number; b: number };

  if (typeof a !== "number" || typeof b !== "number") {
    return "Error: both a and b must be numbers";
  }

  return String(a + b);
}
```

## Complete Example: Calculator Registry

Here's a complete calculator agent using the registry pattern:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<string>;
}

class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getDefinitions(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema
    }));
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return `Error: unknown tool "${name}"`;
    }
    try {
      return await tool.execute(input);
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

// Tool definitions
const addTool: Tool = {
  name: "add",
  description: "Adds two numbers and returns the sum",
  input_schema: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["a", "b"]
  },
  execute: async (input) => {
    const { a, b } = input as { a: number; b: number };
    return String(a + b);
  }
};

const multiplyTool: Tool = {
  name: "multiply",
  description: "Multiplies two numbers and returns the product",
  input_schema: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["a", "b"]
  },
  execute: async (input) => {
    const { a, b } = input as { a: number; b: number };
    return String(a * b);
  }
};

const factorialTool: Tool = {
  name: "factorial",
  description: "Calculates the factorial of a non-negative integer",
  input_schema: {
    type: "object",
    properties: {
      n: { type: "number", description: "Non-negative integer" }
    },
    required: ["n"]
  },
  execute: async (input) => {
    const { n } = input as { n: number };

    if (n < 0 || !Number.isInteger(n)) {
      return "Error: factorial requires a non-negative integer";
    }

    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }

    return String(result);
  }
};

// Setup registry
const registry = new ToolRegistry();
registry.register(addTool);
registry.register(multiplyTool);
registry.register(factorialTool);

// Agent function
async function runCalculatorAgent(userMessage: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  let turns = 0;
  const maxTurns = 10;

  while (turns < maxTurns) {
    turns++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages,
      tools: registry.getDefinitions()
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await registry.execute(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return `Error: exceeded ${maxTurns} turns`;
}

// Test
const result = await runCalculatorAgent("What is 5 factorial plus 20?");
console.log(result);
// Expected: "5! = 120, plus 20 = 140" (or similar)
```

## Registry Benefits

1. **Centralized tool management**: One place to see all tools
2. **Consistent error handling**: All tools use the same error pattern
3. **Easy testing**: Test tools individually via `registry.execute()`
4. **Clean agent code**: No tool arrays, no manual lookup
5. **Dynamic registration**: Add/remove tools at runtime
6. **Tool discovery**: `list()` and `has()` methods

## Testing Tools Directly

The registry makes testing easy:

```typescript
// Test a tool without running the full agent
const result = await registry.execute("add", { a: 5, b: 3 });
console.log(result);  // "8"

// Test error handling
const result2 = await registry.execute("add", { a: 5 });
console.log(result2);  // Error message

// Test unknown tool
const result3 = await registry.execute("nonexistent", {});
console.log(result3);  // "Error: unknown tool \"nonexistent\""
```

## Common Patterns

### Loading Tools from Modules

```typescript
// tools/math.ts
export const mathTools: Tool[] = [addTool, multiplyTool, factorialTool];

// tools/time.ts
export const timeTools: Tool[] = [getCurrentTimeTool, formatTimeTool];

// main.ts
import { mathTools } from "./tools/math";
import { timeTools } from "./tools/time";

const registry = new ToolRegistry();
mathTools.forEach(t => registry.register(t));
timeTools.forEach(t => registry.register(t));
```

### Conditional Tool Registration

```typescript
const registry = new ToolRegistry();

// Always available
registry.register(calculatorTool);

// Only in development
if (process.env.NODE_ENV === "development") {
  registry.register(debugTool);
}

// Only if API key exists
if (process.env.WEATHER_API_KEY) {
  registry.register(weatherTool);
}
```

## Key Takeaways

1. **Registry pattern centralizes tool management**
2. **Tools always return strings, including errors**
3. **getDefinitions() strips execute for API calls**
4. **execute() wraps tool calls with try/catch**
5. **Design rules: lowercase-kebab-case names, precise descriptions**
6. **Testing individual tools is straightforward**
7. **Agent code becomes cleaner and more maintainable**

## Next Steps

In Module 4, we'll build a **Coding Agent** that can read and write files. You'll use the registry pattern to manage file system tools, and learn about path validation and security concerns.
