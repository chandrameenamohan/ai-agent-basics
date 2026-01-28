# Module 3: Tool System - Quick Reference

## Tool Registry Pattern

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
    if (!tool) return `Error: unknown tool "${name}"`;
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

## Tool Interface

```typescript
interface Tool {
  name: string;                    // lowercase-kebab-case
  description: string;             // Precise, actionable
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<string>;  // Always string
}
```

## Tool Design Rules

| Rule | Example |
|------|---------|
| Names: lowercase-kebab-case | `"add-numbers"`, `"get-time"`, `"search-web"` |
| Descriptions: Precise | `"Adds two numbers and returns their sum"` |
| Always return strings | `return String(result)` |
| Return errors, don't throw | `return "Error: invalid input"` |
| Validate input | Check types and required fields |

## Usage in Agent Loop

```typescript
// Setup
const registry = new ToolRegistry();
registry.register(calculatorTool);
registry.register(timeTool);

// In agent loop
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages,
  tools: registry.getDefinitions()  // Get schemas
});

// Execute tools
for (const block of response.content) {
  if (block.type === "tool_use") {
    const result = await registry.execute(block.name, block.input);  // Centralized
    toolResults.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: result
    });
  }
}
```

## Complete Tool Example

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

    // Validate
    if (typeof a !== "number" || typeof b !== "number") {
      return "Error: both a and b must be numbers";
    }

    // Return string
    return String(a + b);
  }
};
```

## Error Handling

```typescript
// In tool execute:
execute: async (input) => {
  // Validate input
  if (!input.value) {
    return "Error: missing required field 'value'";
  }

  // Return errors as strings
  if (someCondition) {
    return "Error: invalid condition";
  }

  // Normal result as string
  return String(result);
}

// Registry wraps with try/catch:
try {
  return await tool.execute(input);
} catch (error) {
  return `Error: ${error.message}`;
}
```

## Registry Methods

| Method | Purpose | Example |
|--------|---------|---------|
| `register(tool)` | Add a tool | `registry.register(addTool)` |
| `getDefinitions()` | Get schemas for API | `tools: registry.getDefinitions()` |
| `execute(name, input)` | Run a tool | `await registry.execute("add", {a: 5, b: 3})` |
| `has(name)` | Check if tool exists | `if (registry.has("calculator"))` |
| `list()` | Get all tool names | `console.log(registry.list())` |

## Testing Tools

```typescript
// Test individual tool
const result = await registry.execute("add", { a: 5, b: 3 });
console.log(result);  // "8"

// Test error handling
const result2 = await registry.execute("add", { a: 5 });
console.log(result2);  // Error message

// Test unknown tool
const result3 = await registry.execute("unknown", {});
console.log(result3);  // "Error: unknown tool \"unknown\""
```

## Common Patterns

### Load Tools from Modules
```typescript
import { mathTools } from "./tools/math";
import { timeTools } from "./tools/time";

const registry = new ToolRegistry();
[...mathTools, ...timeTools].forEach(t => registry.register(t));
```

### Conditional Registration
```typescript
const registry = new ToolRegistry();

// Always available
registry.register(coreTool);

// Conditional
if (process.env.FEATURE_FLAG) {
  registry.register(experimentalTool);
}
```

### Tool Discovery
```typescript
// List available tools
console.log("Available tools:", registry.list());

// Check before execution
if (registry.has("calculator")) {
  console.log("Calculator available");
}
```

## Benefits

1. **Centralized management**: One place for all tools
2. **Consistent error handling**: All tools use same pattern
3. **Easy testing**: Test tools individually
4. **Clean agent code**: No arrays, no manual lookup
5. **Dynamic registration**: Add/remove tools at runtime
6. **Type safety**: TypeScript catches errors early

## Key Takeaways

- Registry = Map-based tool manager
- Tools always return strings (errors too)
- getDefinitions() returns schemas without execute
- execute() wraps tools with error handling
- Design rules: kebab-case names, precise descriptions
- Testing is simple and direct

## Model

Use **claude-sonnet-4-20250514** for production agents.
