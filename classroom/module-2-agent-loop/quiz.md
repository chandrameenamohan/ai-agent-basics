# Module 2: Agent Loop - Quiz

## Instructions

Answer all 10 questions. Check your answers against the solutions at the end.

---

## Questions

### 1. What is the core pattern that turns an LLM into an agent?

a) A recursive function that calls itself
b) A while loop that checks the stop_reason
c) A promise chain with multiple API calls
d) A state machine with transitions

---

### 2. What are the two main values for stop_reason?

a) "success" and "failure"
b) "complete" and "incomplete"
c) "end_turn" and "tool_use"
d) "done" and "continue"

---

### 3. When stop_reason is "tool_use", what should your agent do?

a) Return the response immediately
b) Execute the requested tools, add results as user messages, and loop again
c) Throw an error because tools aren't supported
d) Ask the user for permission to use tools

---

### 4. What role should tool results be sent as?

a) "assistant"
b) "system"
c) "tool"
d) "user"

---

### 5. In the response.content array, what types of blocks can appear?

a) Only "text"
b) Only "tool_use"
c) "text", "tool_use", and "tool_result"
d) "text" and "tool_use"

---

### 6. What must every tool_result block include?

a) A timestamp
b) The tool_use_id linking it to the original tool call
c) An error message
d) The user's original question

---

### 7. What is the purpose of maxTurns in an agent config?

a) To limit how many words Claude can output
b) To prevent infinite loops when a task can't be completed
c) To set the maximum number of tools that can be called
d) To control the conversation history length

---

### 8. When must you add the assistant's response to the messages array?

a) Only if stop_reason is "end_turn"
b) Only if stop_reason is "tool_use"
c) Every time, before checking stop_reason
d) Never, the API does this automatically

---

### 9. What should the execute function in a Tool interface return?

a) A Promise<boolean>
b) A Promise<string>
c) A Promise<object>
d) void

---

### 10. Which parts of a Tool definition are sent to Claude?

a) Only name
b) Only name and description
c) name, description, and input_schema
d) All fields including execute

---

## Code Analysis Questions

### 11. What's wrong with this code?

```typescript
const response = await client.messages.create({ model, max_tokens, messages, tools });

if (response.stop_reason === "end_turn") {
  const text = response.content[0];
  return text.type === "text" ? text.text : "";
}

messages.push({ role: "assistant", content: response.content });
```

a) Nothing, it's correct
b) It doesn't add the assistant response before checking stop_reason
c) It should check response.content.length before accessing [0]
d) Both b and c

---

### 12. What's wrong with this tool result?

```typescript
toolResults.push({
  type: "tool_result",
  content: "42"
});
```

a) Nothing, it's correct
b) Missing the tool_use_id field
c) content should be a number, not a string
d) type should be "tool_response"

---

### 13. What happens if you run this agent?

```typescript
while (true) {
  const response = await client.messages.create({ model, max_tokens, messages });
  if (response.stop_reason === "end_turn") {
    return extractText(response);
  }
  // Execute tools and add results
  messages.push({ role: "user", content: toolResults });
}
```

a) It works perfectly
b) It will miss the assistant response in message history
c) It will crash immediately
d) It will always return on the first turn

---

### 14. How should you extract all tool_use blocks from a response?

a) `const toolUse = response.content[0]`
b) `const toolUse = response.content.find(b => b.type === "tool_use")`
c) `const toolUses = response.content.filter(b => b.type === "tool_use")`
d) `const toolUses = response.tool_calls`

---

### 15. What's the correct message alternation pattern?

a) user, user, assistant, assistant
b) system, user, assistant, user, assistant
c) user, assistant, user, assistant
d) assistant, user, assistant, user

---

## Solutions

1. **b** - A while loop that checks the stop_reason. This is the fundamental agent pattern.

2. **c** - "end_turn" (task complete) and "tool_use" (needs to use tools).

3. **b** - Execute tools, add results as user messages, loop again. This is the core agent loop behavior.

4. **d** - Tool results are sent as "user" role messages. Claude asks for tools (assistant), you provide results (user).

5. **d** - Response content can have "text" and "tool_use" blocks. "tool_result" appears in messages you send, not in Claude's responses.

6. **b** - Every tool_result must include tool_use_id to link it to the original tool call.

7. **b** - maxTurns prevents infinite loops when tasks can't be completed or bugs cause repeated tool calls.

8. **c** - Always add the assistant response to messages before checking stop_reason. This maintains conversation history.

9. **b** - Tool execute functions return Promise<string>. Always strings, even for errors.

10. **c** - Claude sees name, description, and input_schema. The execute function stays local to your code.

11. **d** - Two problems: doesn't add assistant response before checking stop_reason, and doesn't safely access array index.

12. **b** - Missing tool_use_id. Every tool_result must reference its tool_use block.

13. **b** - It executes tools but never adds the assistant response that contains the tool_use blocks to message history.

14. **c** - Use filter() to get all tool_use blocks. There can be multiple in one response.

15. **c** - Messages must alternate between user and assistant roles.

---

## Scoring

- **13-15 correct**: Excellent! You understand the agent loop.
- **10-12 correct**: Good. Review the missed topics.
- **7-9 correct**: Review the tutorial and try the lab exercises.
- **Below 7**: Reread the tutorial carefully and work through the lab step-by-step.

## Key Concepts to Review

If you missed questions:

- **1-3**: Core agent loop concept
- **4-6**: Message structure and tool results
- **7-8**: Safety and message handling
- **9-10**: Tool interface design
- **11-15**: Practical implementation details
