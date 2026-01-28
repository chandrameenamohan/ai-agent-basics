# Module 1: LLM APIs — Handout

## Key Concepts

### Stateless API
The API doesn't remember previous requests. You must send the full conversation history in every request.

### Messages Array
The conversation history. Grows with each turn:
```typescript
[
  { role: "user", content: "Hi" },
  { role: "assistant", content: "Hello!" },
  { role: "user", content: "How are you?" },
  { role: "assistant", content: "I'm well!" }
]
```

### Streaming
Receive tokens as they're generated instead of waiting for the complete response. Better user experience.

### Structured Output
Request JSON responses from Claude and validate them with schemas (Zod/Pydantic).

---

## Raw HTTP Request Format

### Endpoint
```
POST https://api.anthropic.com/v1/messages
```

### Required Headers
```
Content-Type: application/json
x-api-key: YOUR_API_KEY
anthropic-version: 2023-06-01
```

### Request Body
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 256,
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

---

## Multi-Turn Conversation Pattern

### TypeScript

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

async function chat(userInput: string): Promise<string> {
  // Add user message
  messages.push({ role: "user", content: userInput });

  // Get response
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,
  });

  // Extract text
  const text = response.content[0];
  if (text.type !== "text") throw new Error("Expected text");

  // Add assistant message
  messages.push({ role: "assistant", content: text.text });

  return text.text;
}
```

### Python

```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()
messages = []

def chat(user_input: str) -> str:
    # Add user message
    messages.append({"role": "user", "content": user_input})

    # Get response
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=messages,
    )

    # Extract text
    block = response.content[0]
    if block.type != "text":
        raise ValueError("Expected text")

    # Add assistant message
    messages.append({"role": "assistant", "content": block.text})

    return block.text
```

---

## Streaming Responses

### TypeScript

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function streamChat(userInput: string): Promise<string> {
  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: userInput }],
  });

  let fullResponse = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
      fullResponse += event.delta.text;
    }
  }

  console.log("\n");
  return fullResponse;
}
```

### Python

```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()

def stream_chat(user_input: str) -> str:
    full_response = ""

    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[{"role": "user", "content": user_input}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
            full_response += text

    print("\n")
    return full_response
```

---

## Structured Output

### TypeScript with Zod

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

// Define schema
const TaskSchema = z.object({
  title: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string(),
  tags: z.array(z.string()),
});

type Task = z.infer<typeof TaskSchema>;

async function extractTask(userInput: string): Promise<Task> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Extract task info from: "${userInput}". Respond with ONLY valid JSON: { title: string, priority: "low"|"medium"|"high", dueDate: string, tags: string[] }`,
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Expected text");

  const raw = JSON.parse(text.text);
  const task = TaskSchema.parse(raw);  // Validates!

  return task;
}
```

### Python with Pydantic

```python
from dotenv import load_dotenv
import anthropic
import json
from pydantic import BaseModel
from typing import Literal

load_dotenv()

client = anthropic.Anthropic()

# Define schema
class Task(BaseModel):
    title: str
    priority: Literal["low", "medium", "high"]
    due_date: str
    tags: list[str]

def extract_task(user_input: str) -> Task:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": f'Extract task info from: "{user_input}". Respond with ONLY valid JSON: {{ title: string, priority: "low"|"medium"|"high", due_date: string, tags: string[] }}',
            },
        ],
    )

    block = response.content[0]
    if block.type != "text":
        raise ValueError("Expected text")

    raw = json.loads(block.text)
    task = Task(**raw)  # Validates!

    return task
```

---

## Token Growth in Conversations

### Example Calculation

Conversation with 5 turns, 100 tokens per message:

| Turn | Messages in Array | Approx. Input Tokens | Cost @ $3/M |
|------|-------------------|----------------------|-------------|
| 1 | 1 | 100 | $0.0003 |
| 2 | 3 | 300 | $0.0009 |
| 3 | 5 | 500 | $0.0015 |
| 4 | 7 | 700 | $0.0021 |
| 5 | 9 | 900 | $0.0027 |
| **Total** | | **2500** | **$0.0075** |

Input tokens grow linearly with conversation length!

---

## HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request | Check request format |
| 401 | Unauthorized | Check API key |
| 429 | Rate limit | Wait and retry |
| 500 | Server error | Retry later |

---

## Streaming Event Types

| Event | Type | Action |
|-------|------|--------|
| `message_start` | Metadata | Log message ID |
| `content_block_start` | New block | Prepare to collect |
| `content_block_delta` | Token | Print/accumulate text |
| `content_block_stop` | End block | Finalize |
| `message_delta` | Update | Check stop_reason |
| `message_stop` | Complete | Get usage stats |

Most common pattern: only handle `content_block_delta` with `delta.type === "text_delta"`.

---

## Troubleshooting Guide

### "Messages must alternate between user and assistant"

**Cause**: You have two consecutive messages with the same role

**Fix**: Ensure pattern is user → assistant → user → assistant

```typescript
// ❌ Wrong
messages = [
  { role: "user", content: "Hi" },
  { role: "user", content: "Hello?" },  // Two users in a row!
];

// ✓ Correct
messages = [
  { role: "user", content: "Hi" },
  { role: "assistant", content: "Hello!" },
  { role: "user", content: "How are you?" },
];
```

---

### Response is context-less

**Cause**: Not sending conversation history

**Fix**: Send the full `messages` array, not just the latest message

```typescript
// ❌ Wrong
const response = await client.messages.create({
  messages: [{ role: "user", content: latestInput }],
});

// ✓ Correct
messages.push({ role: "user", content: latestInput });
const response = await client.messages.create({
  messages,  // Full history
});
```

---

### JSON parsing fails

**Cause**: Claude didn't return valid JSON or added extra text

**Fix**: Be very explicit in prompt + validate

```typescript
const prompt = `Extract data. Respond with ONLY valid JSON, no explanations:
{
  "field": "value"
}`;

try {
  const raw = JSON.parse(responseText);
  const validated = Schema.parse(raw);
} catch (error) {
  console.error("Invalid response:", responseText);
  throw error;
}
```

---

### Streaming is slow or choppy

**Cause**: Buffering, slow network, or processing delay

**Fix**:
- Use `flush: true` in Python
- Use `process.stdout.write()` in TypeScript (not `console.log`)
- Ensure no blocking operations in event loop

---

### Token limit exceeded

**Cause**: Conversation too long

**Fix**: Implement context management
- Summarize old messages
- Drop least important turns
- Use sliding window (keep only last N messages)

---

## Best Practices

### 1. Always Validate Structured Output

```typescript
// ❌ Risky
const data = JSON.parse(response.content[0].text);
return data.someField;  // Could be undefined!

// ✓ Safe
const raw = JSON.parse(response.content[0].text);
const validated = Schema.parse(raw);  // Throws if invalid
return validated.someField;  // Type-safe
```

### 2. Monitor Token Usage

```typescript
const { input_tokens, output_tokens } = response.usage;
console.log(`Tokens: ${input_tokens}+${output_tokens}`);

if (input_tokens > 10000) {
  console.warn("Conversation getting long. Consider summarizing.");
}
```

### 3. Handle Role Alternation

```typescript
function addMessage(role: "user" | "assistant", content: string) {
  const lastRole = messages[messages.length - 1]?.role;
  if (lastRole === role) {
    throw new Error(`Cannot add two ${role} messages in a row`);
  }
  messages.push({ role, content });
}
```

### 4. Use Streaming for Long Responses

```typescript
// If max_tokens > 500, consider streaming for better UX
if (maxTokens > 500) {
  return await streamResponse(messages);
} else {
  return await normalResponse(messages);
}
```

---

## Quick Command Reference

### Raw HTTP (cURL)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Test JSON Parsing (Node)

```bash
node -e "console.log(JSON.parse(process.argv[1]))" '{"test": 123}'
```

### Test JSON Parsing (Python)

```bash
python -c "import json; print(json.loads('{\"test\": 123}'))"
```

---

## Common Patterns

### Retry on Rate Limit

```typescript
async function callWithRetry(messages: any[], retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.messages.create({ model: "...", max_tokens: 1024, messages });
    } catch (error: any) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;  // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

### Save Conversation to File

```typescript
import fs from "fs";

function saveConversation(messages: any[], filename: string) {
  fs.writeFileSync(filename, JSON.stringify(messages, null, 2));
}

function loadConversation(filename: string): any[] {
  return JSON.parse(fs.readFileSync(filename, "utf-8"));
}
```

---

## Next Steps

- Complete lab exercises
- Take the quiz
- Build the homework chatbot
- Move to **Module 2: Agent Loop**
