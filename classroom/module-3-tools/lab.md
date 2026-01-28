# Module 3: Tool System - Lab

## Overview

Build a complete tool registry system and wire it into your agent from Module 2. You'll create multiple tools, test them individually, and see how much cleaner your code becomes.

**Time estimate:** 50-60 minutes

## Setup

Create a new file:

```bash
touch module-3-tools/my-registry.ts
```

Add imports:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

## Part 1: Build the Registry (15 min)

Implement the ToolRegistry class with all methods:

```typescript
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
    // TODO: Add tool to the Map
    // Key = tool.name, Value = tool
  }

  getDefinitions(): Anthropic.Tool[] {
    // TODO: Convert Map to array of tool definitions
    // Strip the execute function, keep name, description, input_schema
    // Hint: Array.from(this.tools.values()).map(...)
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    // TODO: Look up tool by name
    // If not found, return error string: "Error: unknown tool \"<name>\""
    // If found, wrap execution in try/catch
    // Return result on success, error string on exception
  }

  has(name: string): boolean {
    // TODO: Check if tool exists in Map
  }

  list(): string[] {
    // TODO: Return array of all tool names
    // Hint: Array.from(this.tools.keys())
  }
}
```

**Test your registry:**

```typescript
const testTool: Tool = {
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

const registry = new ToolRegistry();
registry.register(testTool);

console.log("Has echo:", registry.has("echo"));          // true
console.log("Has other:", registry.has("other"));        // false
console.log("Tools:", registry.list());                   // ["echo"]

const result = await registry.execute("echo", { text: "Hello!" });
console.log("Result:", result);                           // "Hello!"
```

### Checkpoint
- Does register() add tools to the Map?
- Does getDefinitions() return an array of schemas?
- Does execute() handle unknown tools gracefully?
- Do has() and list() work correctly?

## Part 2: Create Math Tools (15 min)

Build three math tools with proper error handling:

```typescript
const addTool: Tool = {
  name: "add",
  description: "Adds two numbers and returns their sum",
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
    // TODO: Add validation - check if a and b are actually numbers
    // Return error string if validation fails
    // Return sum as string if successful
  }
};

const multiplyTool: Tool = {
  name: "multiply",
  description: "Multiplies two numbers and returns their product",
  input_schema: {
    type: "object",
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" }
    },
    required: ["a", "b"]
  },
  execute: async (input) => {
    // TODO: Implement similar to add
  }
};

const powerTool: Tool = {
  name: "power",
  description: "Raises a number to a power (a^b)",
  input_schema: {
    type: "object",
    properties: {
      base: { type: "number", description: "Base number" },
      exponent: { type: "number", description: "Exponent" }
    },
    required: ["base", "exponent"]
  },
  execute: async (input) => {
    const { base, exponent } = input as { base: number; exponent: number };
    // TODO: Implement using Math.pow()
    // Add validation
  }
};
```

**Test your tools:**

```typescript
const registry = new ToolRegistry();
registry.register(addTool);
registry.register(multiplyTool);
registry.register(powerTool);

console.log("\n=== Testing Math Tools ===");
console.log("5 + 3 =", await registry.execute("add", { a: 5, b: 3 }));
console.log("5 * 3 =", await registry.execute("multiply", { a: 5, b: 3 }));
console.log("2^8 =", await registry.execute("power", { base: 2, exponent: 8 }));
```

**Expected output:**
```
5 + 3 = 8
5 * 3 = 15
2^8 = 256
```

### Checkpoint
- Do all three tools work correctly?
- Do they validate input types?
- Do they return strings?
- What happens if you pass invalid input?

## Part 3: Wire Registry to Agent (15 min)

Now integrate your registry with the agent loop from Module 2:

```typescript
async function runAgentWithRegistry(
  userMessage: string,
  registry: ToolRegistry,
  maxTurns = 10
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage }
  ];

  let turns = 0;

  while (turns < maxTurns) {
    turns++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages,
      tools: registry.getDefinitions()  // Use registry method!
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find(b => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    // TODO: Execute tools using registry
    // Hint: For each tool_use block:
    //   const result = await registry.execute(block.name, block.input);
    // Then create tool_result blocks and add as user message
  }

  return `Error: exceeded ${maxTurns} turns`;
}

// Test it
const registry = new ToolRegistry();
registry.register(addTool);
registry.register(multiplyTool);
registry.register(powerTool);

const result = await runAgentWithRegistry(
  "What is (5 + 3) multiplied by (2 to the power of 4)?",
  registry
);
console.log("\n=== Agent Result ===");
console.log(result);
```

**Expected:** Claude uses multiple tools and returns "128" or similar.

### Checkpoint
- Does your agent use registry.getDefinitions()?
- Does it use registry.execute() for each tool call?
- Is the code cleaner than Module 2's tool array approach?
- Can Claude chain multiple tool calls together?

## Part 4: Add Non-Math Tools (10 min)

Add variety with two non-math tools:

```typescript
const getCurrentTimeTool: Tool = {
  name: "get-current-time",
  description: "Returns the current date and time",
  input_schema: {
    type: "object",
    properties: {},
    required: []
  },
  execute: async () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  }
};

const randomNumberTool: Tool = {
  name: "random-number",
  description: "Generates a random integer between min and max (inclusive)",
  input_schema: {
    type: "object",
    properties: {
      min: { type: "number", description: "Minimum value" },
      max: { type: "number", description: "Maximum value" }
    },
    required: ["min", "max"]
  },
  execute: async (input) => {
    const { min, max } = input as { min: number; max: number };

    // TODO: Validate min <= max
    // Generate random integer between min and max
    // Hint: Math.floor(Math.random() * (max - min + 1)) + min
  }
};
```

**Register and test:**

```typescript
registry.register(getCurrentTimeTool);
registry.register(randomNumberTool);

console.log("\n=== Testing New Tools ===");
console.log("Current time:", await registry.execute("get-current-time", {}));
console.log("Random 1-10:", await registry.execute("random-number", { min: 1, max: 10 }));

// Test with agent
const result = await runAgentWithRegistry(
  "Generate a random number between 1 and 100, then tell me what time it is",
  registry
);
console.log("\n=== Multi-Tool Result ===");
console.log(result);
```

### Checkpoint
- Do your new tools work individually?
- Can Claude use both in one conversation?
- Does the registry handle all five tools correctly?

## Part 5: Tool Discovery (10 min)

Add a meta-tool that lists available tools:

```typescript
const listToolsTool: Tool = {
  name: "list-tools",
  description: "Lists all available tools the agent can use",
  input_schema: {
    type: "object",
    properties: {},
    required: []
  },
  execute: async () => {
    const toolNames = registry.list();
    return `Available tools: ${toolNames.join(", ")}`;
  }
};

registry.register(listToolsTool);

// Test
const result = await runAgentWithRegistry(
  "What tools do you have available?",
  registry
);
console.log("\n=== Tool Discovery ===");
console.log(result);
```

**Note:** The list-tools tool has a closure over `registry`, so it can access it. This is a useful pattern for meta-tools.

### Checkpoint
- Does the list-tools tool work?
- Can Claude discover its own capabilities?
- What happens if you ask "Can you generate random numbers?"

## Challenge Exercises

### Challenge 1: Tool Validation

Add a validation step when registering tools:

```typescript
register(tool: Tool): void {
  // Validate tool.name is lowercase-kebab-case
  if (!/^[a-z][a-z0-9-]*$/.test(tool.name)) {
    throw new Error(`Invalid tool name "${tool.name}": must be lowercase-kebab-case`);
  }

  // Validate no duplicate names
  if (this.tools.has(tool.name)) {
    throw new Error(`Tool "${tool.name}" already registered`);
  }

  this.tools.set(tool.name, tool);
}
```

Test with invalid tool names:
```typescript
const badTool: Tool = {
  name: "Bad_Name",  // Should throw
  // ...
};
```

### Challenge 2: Execution Logging

Add optional logging to track tool usage:

```typescript
class ToolRegistry {
  private tools = new Map<string, Tool>();
  private executionLog: Array<{ tool: string; input: any; result: string; timestamp: Date }> = [];

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) return `Error: unknown tool "${name}"`;

    const startTime = new Date();
    try {
      const result = await tool.execute(input);
      this.executionLog.push({ tool: name, input, result, timestamp: startTime });
      return result;
    } catch (error) {
      const errorMsg = `Error: ${error.message}`;
      this.executionLog.push({ tool: name, input, result: errorMsg, timestamp: startTime });
      return errorMsg;
    }
  }

  getExecutionLog() {
    return this.executionLog;
  }

  clearLog() {
    this.executionLog = [];
  }
}
```

After running your agent, inspect the log:
```typescript
console.log("\n=== Execution Log ===");
console.log(JSON.stringify(registry.getExecutionLog(), null, 2));
```

### Challenge 3: Tool Categories

Organize tools by category:

```typescript
interface CategorizedTool extends Tool {
  category: "math" | "time" | "random" | "meta";
}

class CategorizedRegistry extends ToolRegistry {
  getToolsByCategory(category: string): string[] {
    return Array.from(this.tools.values())
      .filter(t => (t as CategorizedTool).category === category)
      .map(t => t.name);
  }
}
```

## Full Solution Structure

Your `my-registry.ts` should have:

1. Imports and client setup
2. Tool interface
3. ToolRegistry class
4. Tool definitions (5+ tools)
5. runAgentWithRegistry function
6. Test cases

**Run it:**
```bash
bun module-3-tools/my-registry.ts
```

## Comparison: Before vs After

**Before (Module 2):**
```typescript
async function runAgent(message: string, tools: Tool[]) {
  // ...
  const toolDefs = tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }));

  // ... in loop
  const tool = tools.find(t => t.name === block.name);
  if (!tool) {
    // Manual error handling
  }
  const result = await tool.execute(block.input);
}
```

**After (Module 3):**
```typescript
async function runAgent(message: string, registry: ToolRegistry) {
  // ...
  tools: registry.getDefinitions()

  // ... in loop
  const result = await registry.execute(block.name, block.input);
}
```

Much cleaner!

## Key Takeaways

After completing this lab, you should understand:

1. How to build a Map-based tool registry
2. How getDefinitions() strips execute functions
3. How execute() wraps tools with error handling
4. Why this pattern is cleaner than passing tool arrays
5. How to test tools individually
6. How to organize tools at scale

## Next Steps

In Module 4, you'll build a **Coding Agent** using this registry pattern. You'll add file system tools (read, write, list) and learn about path validation and security.
