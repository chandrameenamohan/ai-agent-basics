# Module 3: Tool System - Quiz

## Instructions

Answer all 10 questions. Check your answers against the solutions at the end.

---

## Questions

### 1. What is the primary benefit of using a Tool Registry?

a) It makes tools run faster
b) It centralizes tool management and eliminates passing tool arrays
c) It's required by the Anthropic API
d) It reduces the number of API calls

---

### 2. What data structure does the ToolRegistry use internally?

a) Array
b) Set
c) Map
d) WeakMap

---

### 3. What does the getDefinitions() method return?

a) All tools including their execute functions
b) Tool schemas without execute functions
c) Only tool names
d) The internal Map object

---

### 4. What should tools always return?

a) Objects
b) Numbers
c) Strings
d) Booleans

---

### 5. How should tool errors be handled?

a) Throw exceptions
b) Return undefined
c) Return error strings
d) Log to console and return null

---

### 6. What naming convention should tool names follow?

a) camelCase
b) PascalCase
c) snake_case
d) lowercase-kebab-case

---

### 7. What does the registry's execute() method do if a tool throws an exception?

a) Re-throws the exception
b) Returns undefined
c) Catches it and returns an error string
d) Logs it and returns null

---

### 8. Which method checks if a tool exists in the registry?

a) exists()
b) hasKey()
c) has()
d) contains()

---

### 9. What should a tool's description include?

a) Only the tool name
b) Precise information about what it does and when to use it
c) The implementation details
d) Examples of how to call it

---

### 10. What does the list() method return?

a) An array of tool names
b) An array of tool objects
c) A string of comma-separated names
d) The Map object

---

## Code Analysis Questions

### 11. What's wrong with this tool?

```typescript
const badTool: Tool = {
  name: "calculate_sum",
  description: "Adds numbers",
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
    return a + b;  // Returns number
  }
};
```

a) Nothing, it's correct
b) Name should be kebab-case, and execute should return string
c) Only the name is wrong
d) Only the return value is wrong

---

### 12. What will this code output?

```typescript
const registry = new ToolRegistry();
registry.register(addTool);
registry.register(multiplyTool);

const result = await registry.execute("divide", { a: 10, b: 2 });
console.log(result);
```

a) "5"
b) "Error: unknown tool \"divide\""
c) undefined
d) It will throw an exception

---

### 13. What's wrong with this getDefinitions implementation?

```typescript
getDefinitions(): Anthropic.Tool[] {
  return Array.from(this.tools.values());
}
```

a) Nothing, it's correct
b) It returns tools with execute functions, which shouldn't be sent to the API
c) Should use this.tools.keys()
d) Should return a Map, not an array

---

### 14. How does the registry make testing easier?

a) It doesn't, testing is the same
b) You can test tools individually using execute() without running the full agent
c) It automatically generates test cases
d) It mocks API calls

---

### 15. What's the best way to handle an unknown tool call in execute()?

a) Throw an exception
b) Return undefined
c) Return an error string like "Error: unknown tool \"name\""
d) Ignore it and return empty string

---

## Design Questions

### 16. Why should tools return strings instead of objects?

a) Strings are faster
b) Claude expects tool results as string content in the API
c) Objects can't be serialized
d) It's just a convention with no technical reason

---

### 17. What happens if you register two tools with the same name?

a) Both are kept with different IDs
b) An error is thrown
c) The second tool overwrites the first (Map behavior)
d) They are merged into one tool

---

### 18. Why wrap tool execution in try/catch in the execute() method?

a) To improve performance
b) To prevent tool errors from crashing the entire agent
c) It's required by TypeScript
d) To log errors to a file

---

### 19. When should you call getDefinitions()?

a) Before every tool execution
b) When creating the API request with tool schemas
c) After each agent turn
d) Only once at startup

---

### 20. What's the advantage of the has() method?

a) It executes tools faster
b) It allows checking if a tool exists before attempting execution
c) It's required for the registry to work
d) It validates tool schemas

---

## Solutions

1. **b** - Centralized tool management eliminates passing tool arrays and manual lookup.

2. **c** - Map<string, Tool> stores tools with name as key.

3. **b** - Returns tool schemas (name, description, input_schema) without execute functions, for sending to the API.

4. **c** - Tools always return strings, including error messages.

5. **c** - Return error strings like "Error: message". Never throw exceptions from tools.

6. **d** - Tool names use lowercase-kebab-case like "add-numbers" or "get-time".

7. **c** - Catches exceptions and returns "Error: {message}" to prevent crashes.

8. **c** - has(name) checks if a tool exists in the registry.

9. **b** - Descriptions should be precise and actionable. Claude uses them to decide when to use the tool.

10. **a** - list() returns an array of tool name strings.

11. **b** - Two problems: name should be "calculate-sum" (kebab-case), and execute should return String(a + b).

12. **b** - The "divide" tool isn't registered, so execute() returns an error string.

13. **b** - It returns complete tool objects including execute functions. Should map to only return name, description, and input_schema.

14. **b** - You can test individual tools with registry.execute() without running the full agent loop.

15. **c** - Return an error string that can be sent back to Claude as a tool result.

16. **b** - The Anthropic API expects tool_result content to be a string. This is the protocol requirement.

17. **c** - Map.set() overwrites existing keys. The second registration replaces the first (though you might want to add validation to prevent this).

18. **b** - Prevents tool implementation errors from crashing the agent. Errors become error strings sent back to Claude.

19. **b** - Call once when creating the API request. The schemas are sent to Claude so it knows what tools are available.

20. **b** - Allows checking tool existence before execution, useful for conditional logic or validation.

---

## Scoring

- **18-20 correct**: Excellent! You master the tool system.
- **15-17 correct**: Very good. Review the missed concepts.
- **12-14 correct**: Good foundation. Review the tutorial for clarity.
- **9-11 correct**: Review the tutorial and try the lab exercises.
- **Below 9**: Reread the tutorial carefully and work through the lab step-by-step.

## Key Concepts to Review

If you missed questions in these ranges:

- **1-5**: Core registry pattern and data structures
- **6-10**: Tool design rules and method behavior
- **11-15**: Implementation details and error handling
- **16-20**: Design decisions and API integration

## Common Misconceptions

- **Tools can return any type**: No, always return Promise<string>
- **Exceptions should propagate**: No, catch them and return error strings
- **getDefinitions() returns everything**: No, it strips execute functions
- **Tool names can use any format**: No, use lowercase-kebab-case
- **Registry is optional**: Technically yes, but it's a best practice for managing multiple tools
