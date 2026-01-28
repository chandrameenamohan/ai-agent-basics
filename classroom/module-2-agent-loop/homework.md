# Module 2: Agent Loop - Homework

## Assignment Overview

Build a **Task Assistant Agent** that can help users manage tasks, check the time, and perform calculations. This assignment requires implementing a complete agent loop with multiple tools.

**Deliverable:** A single TypeScript file `task-assistant.ts` that implements all requirements below.

**Due:** Complete before starting Module 3.

---

## Requirements

### Part 1: Core Agent Implementation (40 points)

Implement a complete agent loop with:

1. **Proper stop_reason handling** (10 points)
   - Check stop_reason on every turn
   - Extract text on "end_turn"
   - Execute tools on "tool_use"

2. **Correct message management** (10 points)
   - Maintain message history
   - Add assistant responses before checking stop_reason
   - Add tool results as user messages
   - Ensure proper role alternation

3. **Tool execution** (10 points)
   - Loop through all content blocks
   - Find and execute tool_use blocks
   - Create proper tool_result blocks with tool_use_id
   - Handle unknown tools gracefully

4. **Safety features** (10 points)
   - Implement maxTurns limit (default: 15)
   - Return error message if limit exceeded
   - Add basic error handling for tool execution

---

### Part 2: Required Tools (40 points)

Implement these four tools:

#### 1. add-task (10 points)

```typescript
{
  name: "add-task",
  description: "Adds a new task to the task list",
  input_schema: {
    type: "object",
    properties: {
      task: { type: "string", description: "The task description" },
      priority: { type: "string", description: "Priority: low, medium, or high" }
    },
    required: ["task", "priority"]
  }
}
```

- Store tasks in an array: `{ task: string, priority: string, id: number }[]`
- Assign auto-incrementing IDs starting from 1
- Return confirmation message like: "Added task #1: [task] (priority: high)"

#### 2. list-tasks (10 points)

```typescript
{
  name: "list-tasks",
  description: "Lists all tasks, optionally filtered by priority",
  input_schema: {
    type: "object",
    properties: {
      priority: { type: "string", description: "Filter by priority: low, medium, high, or all" }
    },
    required: ["priority"]
  }
}
```

- If priority is "all", show all tasks
- Otherwise filter by specified priority
- Return formatted list like:
  ```
  Tasks (priority: high):
  #1: Complete homework assignment
  #2: Study for exam
  ```
- If no tasks match, return "No tasks found."

#### 3. get-current-time (10 points)

```typescript
{
  name: "get-current-time",
  description: "Returns the current date and time",
  input_schema: {
    type: "object",
    properties: {},
    required: []
  }
}
```

- Return current time formatted like: "Tuesday, January 28, 2026 at 2:30 PM"
- Use JavaScript's Date object and toLocaleString()

#### 4. calculate (10 points)

```typescript
{
  name: "calculate",
  description: "Performs arithmetic calculations: add, subtract, multiply, divide, power, sqrt",
  input_schema: {
    type: "object",
    properties: {
      operation: { type: "string", description: "Operation: add, subtract, multiply, divide, power, sqrt" },
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number (not used for sqrt)" }
    },
    required: ["operation", "a"]
  }
}
```

- Support operations: add, subtract, multiply, divide, power, sqrt
- For sqrt, only use parameter `a` (ignore `b`)
- Handle division by zero gracefully
- Return numeric result as string

---

### Part 3: Configuration and Testing (20 points)

#### Configuration Interface (10 points)

```typescript
interface TaskAssistantConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;
  systemPrompt: string;
  tools: Tool[];
}
```

Default system prompt:
```
"You are a helpful task management assistant. You can help users add tasks, list tasks, check the time, and perform calculations. Be concise and friendly."
```

#### Test Cases (10 points)

Include at least 5 test cases at the bottom of your file:

```typescript
// Test 1: Simple calculation
console.log("\n=== Test 1: Calculation ===");
const result1 = await runTaskAssistant("What is 25 * 4 + 10?");
console.log(result1);

// Test 2: Add tasks
console.log("\n=== Test 2: Add Tasks ===");
const result2 = await runTaskAssistant(
  "Add three tasks: 'Finish homework' (high priority), 'Buy groceries' (medium), and 'Call mom' (low)"
);
console.log(result2);

// Test 3: List tasks
console.log("\n=== Test 3: List Tasks ===");
const result3 = await runTaskAssistant("Show me all high priority tasks");
console.log(result3);

// Test 4: Get time
console.log("\n=== Test 4: Current Time ===");
const result4 = await runTaskAssistant("What time is it?");
console.log(result4);

// Test 5: Multi-step task
console.log("\n=== Test 5: Multi-step ===");
const result5 = await runTaskAssistant(
  "Add a task 'Review agent loops' with high priority, then tell me the current time, then calculate 100 divided by 4"
);
console.log(result5);
```

---

## Starter Code Structure

```typescript
import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tool interface
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

// Config interface
interface TaskAssistantConfig {
  // TODO: Define config interface
}

// Task storage (module-level variable)
let tasks: Array<{ id: number; task: string; priority: string }> = [];
let nextId = 1;

// Tool implementations
const addTaskTool: Tool = {
  // TODO: Implement add-task tool
};

const listTasksTool: Tool = {
  // TODO: Implement list-tasks tool
};

const getCurrentTimeTool: Tool = {
  // TODO: Implement get-current-time tool
};

const calculateTool: Tool = {
  // TODO: Implement calculate tool
};

// Main agent function
async function runTaskAssistant(
  userMessage: string,
  config?: Partial<TaskAssistantConfig>
): Promise<string> {
  // TODO: Implement agent loop

  // Default config:
  const defaultConfig: TaskAssistantConfig = {
    model: "claude-sonnet-4-20250514",
    maxTokens: 4096,
    maxTurns: 15,
    systemPrompt: "You are a helpful task management assistant...",
    tools: [addTaskTool, listTasksTool, getCurrentTimeTool, calculateTool]
  };

  // Merge with provided config
  const finalConfig = { ...defaultConfig, ...config };

  // TODO: Implement agent loop here
}

// Test cases
async function runTests() {
  // TODO: Add your 5 test cases here
}

runTests();
```

---

## Grading Rubric

### Core Agent Loop (40 points)
- [ ] stop_reason handling (10 pts)
- [ ] Message management (10 pts)
- [ ] Tool execution (10 pts)
- [ ] Safety features (10 pts)

### Tools (40 points)
- [ ] add-task tool (10 pts)
- [ ] list-tasks tool (10 pts)
- [ ] get-current-time tool (10 pts)
- [ ] calculate tool (10 pts)

### Configuration & Testing (20 points)
- [ ] Config interface (10 pts)
- [ ] Test cases (10 pts)

### Bonus (up to +10 points)
- [ ] Add remove-task tool (+3 pts)
- [ ] Add update-task tool (+3 pts)
- [ ] Add debug mode that logs each turn (+2 pts)
- [ ] Add conversation history export (+2 pts)

---

## Submission Guidelines

1. Create `module-2-agent-loop/task-assistant.ts`
2. Implement all requirements
3. Test thoroughly with the provided test cases
4. Add comments explaining your code
5. Ensure it runs without errors: `bun module-2-agent-loop/task-assistant.ts`

---

## Common Mistakes to Avoid

1. **Forgetting to add assistant response to messages** before checking stop_reason
2. **Not linking tool_result to tool_use** via tool_use_id
3. **Using wrong message role** for tool results (should be "user")
4. **Not iterating all content blocks** - using find() instead of filter() or for loop
5. **Not handling unknown tools** - returning error string instead of throwing
6. **Tool execute returning non-strings** - always return Promise<string>
7. **No maxTurns limit** - agent can loop infinitely

---

## Tips for Success

- Start with the agent loop from the lab and modify it
- Implement tools one at a time and test each
- Use the echo tool pattern to test your loop before adding complex tools
- Add console.log statements to debug message flow
- Test with simple prompts first, then complex multi-step ones
- Read error messages carefully - they often point to the exact problem

---

## Extensions (Optional)

If you finish early, try these:

1. **Task persistence**: Save tasks to a JSON file and load on startup
2. **Task completion**: Add a complete-task tool that marks tasks as done
3. **Smart scheduling**: Add a suggest-priority tool that uses Claude to suggest priority based on task content
4. **Conversation memory**: Keep the full conversation in memory so follow-up questions work naturally

---

## Help and Resources

- Review the Module 2 tutorial
- Check the handout for quick reference patterns
- Look at the lab solution if you're stuck on the loop structure
- The Anthropic API docs have examples: https://docs.anthropic.com/

Good luck!
