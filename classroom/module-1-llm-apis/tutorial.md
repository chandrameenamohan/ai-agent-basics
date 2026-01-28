# Module 1: LLM APIs — Tutorial

## Learning Objectives

By the end of this module, you will be able to:

1. Understand how LLM APIs work at the HTTP level
2. Build multi-turn conversations with growing message arrays
3. Implement streaming responses for real-time output
4. Generate and validate structured output with schemas
5. Understand statelessness and its implications
6. Debug conversation context issues

---

## Introduction: Going Deeper into LLM APIs

In Module 0, we made simple single-turn API calls using the SDK. Now we'll:

- See what's happening "under the hood" with raw HTTP
- Build chatbots with conversation memory
- Stream responses token-by-token for better UX
- Get structured data instead of plain text

By the end, you'll understand how to build production-ready conversational AI applications.

---

## Part 1: Raw HTTP — Understanding the Wire Format

### Why Learn Raw HTTP?

The SDK is convenient, but understanding the underlying HTTP protocol helps you:
- Debug issues when things go wrong
- Work with languages that don't have SDKs
- Understand rate limits, headers, and error codes
- Optimize network requests

### Anatomy of an HTTP Request

When you call `client.messages.create()`, the SDK sends an HTTP POST request:

```
POST https://api.anthropic.com/v1/messages
Headers:
  Content-Type: application/json
  x-api-key: sk-ant-api03-...
  anthropic-version: 2023-06-01

Body:
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 256,
  "messages": [
    { "role": "user", "content": "What is 2+2?" }
  ]
}
```

The server responds with JSON:

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "msg_01ABC...",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "2+2 equals 4." }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 8
  }
}
```

### Making a Raw HTTP Request

**TypeScript**:
```typescript
import "dotenv/config";

const API_KEY = process.env.ANTHROPIC_API_KEY!;
const API_URL = "https://api.anthropic.com/v1/messages";

async function main() {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      { role: "user", content: "What is 2+2? Reply in one sentence." },
    ],
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log("Status:", response.status);
  console.log("Response:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
```

**Python**:
```python
import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ["ANTHROPIC_API_KEY"]
API_URL = "https://api.anthropic.com/v1/messages"

def main():
    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 256,
        "messages": [
            {"role": "user", "content": "What is 2+2? Reply in one sentence."},
        ],
    }

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f"Status: {resp.status}")
        print("Response:", json.dumps(data, indent=2))

if __name__ == "__main__":
    main()
```

### Required Headers

| Header | Purpose |
|--------|---------|
| `Content-Type: application/json` | Tell server we're sending JSON |
| `x-api-key` | Your API key for authentication |
| `anthropic-version` | API version (currently `2023-06-01`) |

Missing any of these will result in a 400 or 401 error.

---

## Part 2: Multi-Turn Conversations

### The Stateless Nature of APIs

**Critical concept**: The API is **stateless**. Each request is independent—Claude doesn't "remember" previous messages unless you send them again.

Think of it like talking to someone with amnesia. Every time you speak, you must remind them of the entire conversation so far.

```
┌─────────────────────────────────────────┐
│  Request 1:                             │
│  messages: [                            │
│    { role: "user", content: "Hi!" }     │
│  ]                                      │
│  Response: "Hello! How can I help?"     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Request 2: (Claude has forgotten!)     │
│  messages: [                            │
│    { role: "user", content: "My name?" }│
│  ]                                      │
│  Response: "I don't have your name."    │  ❌ Wrong!
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Request 2: (Correct way)               │
│  messages: [                            │
│    { role: "user", content: "Hi!" },    │
│    { role: "assistant", content: "..." },│
│    { role: "user", content: "My name?" }│
│  ]                                      │
│  Response: "You haven't told me yet."   │  ✓ Correct!
└─────────────────────────────────────────┘
```

### Building a Chatbot with Conversation Memory

The solution: maintain a **messages array** that grows with each turn.

**TypeScript**:
```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

async function main() {
  console.log("Multi-turn chatbot (type 'quit' to exit)\n");

  while (true) {
    const input = await ask("You: ");
    if (input.toLowerCase() === "quit") break;

    // Add user message to conversation
    messages.push({ role: "user", content: input });

    // Send entire conversation history
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages,  // Growing array!
    });

    const text = response.content[0];
    if (text.type === "text") {
      console.log(`\nClaude: ${text.text}\n`);
      // Add assistant response to conversation
      messages.push({ role: "assistant", content: text.text });
    }

    console.log(`[${messages.length} messages, ${response.usage.input_tokens} input tokens]`);
  }

  rl.close();
}

main().catch(console.error);
```

**Python**:
```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()
messages = []

def main():
    print("Multi-turn chatbot (type 'quit' to exit)\n")

    while True:
        user_input = input("You: ")
        if user_input.lower() == "quit":
            break

        # Add user message to conversation
        messages.append({"role": "user", "content": user_input})

        # Send entire conversation history
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=messages,  # Growing array!
        )

        block = response.content[0]
        if block.type == "text":
            print(f"\nClaude: {block.text}\n")
            # Add assistant response to conversation
            messages.append({"role": "assistant", "content": block.text})

        print(f"[{len(messages)} messages, {response.usage.input_tokens} input tokens]")

if __name__ == "__main__":
    main()
```

### Conversation Flow Diagram

```
Initial state:
messages = []

Turn 1:
messages = [
  { role: "user", content: "My name is Alice" }
]
→ API call → Claude responds "Nice to meet you, Alice!"
messages = [
  { role: "user", content: "My name is Alice" },
  { role: "assistant", content: "Nice to meet you, Alice!" }
]

Turn 2:
messages = [
  { role: "user", content: "My name is Alice" },
  { role: "assistant", content: "Nice to meet you, Alice!" },
  { role: "user", content: "What's my name?" }
]
→ API call → Claude responds "Your name is Alice."
messages = [
  { role: "user", content: "My name is Alice" },
  { role: "assistant", content: "Nice to meet you, Alice!" },
  { role: "user", content: "What's my name?" },
  { role: "assistant", content: "Your name is Alice." }
]
```

### Token Growth Problem

Every turn, you send the **entire conversation history**. This causes:

1. **Increasing costs**: Input tokens grow linearly with conversation length
2. **Slower responses**: More tokens to process
3. **Context limits**: Models have maximum context windows (e.g., 200K tokens)

Example: 10-turn conversation with 100 tokens per turn
- Turn 1: 100 input tokens
- Turn 5: 500 input tokens
- Turn 10: 1000 input tokens
- Total: 5,500 input tokens (triangular growth)

**Solutions** (covered in Module 6):
- Summarize old messages
- Drop less important turns
- Use sliding window (keep only recent N turns)

---

## Part 3: Streaming Responses

### Why Stream?

Without streaming, users see nothing until Claude finishes generating (could be 10-30 seconds). With streaming, they see output as it's generated, like typing.

**User experience comparison**:

```
Without streaming:
You: Write a poem
[... 15 seconds of silence ...]
Claude: Roses are red, violets are blue, AI is helpful, and fast too.

With streaming:
You: Write a poem
Claude: Roses
Claude: Roses are red
Claude: Roses are red, violets
Claude: Roses are red, violets are blue
Claude: Roses are red, violets are blue, AI
[... continues streaming ...]
```

### Streaming API

Instead of `client.messages.create()`, use `client.messages.stream()`:

**TypeScript**:
```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const prompt = "Write a haiku about programming.";
  console.log(`Prompt: ${prompt}\n`);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  console.log(`\n\n[${final.usage.input_tokens}+${final.usage.output_tokens} tokens]`);
}

main().catch(console.error);
```

**Python**:
```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()

def main():
    prompt = "Write a haiku about programming."
    print(f"Prompt: {prompt}\n")

    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)

    message = stream.get_final_message()
    print(f"\n\n[{message.usage.input_tokens}+{message.usage.output_tokens} tokens]")

if __name__ == "__main__":
    main()
```

### Streaming Event Types

| Event Type | When | What to Do |
|------------|------|------------|
| `message_start` | Beginning | Get message ID, metadata |
| `content_block_start` | New content block | Prepare for text/tool_use |
| `content_block_delta` | Token arrives | Print `event.delta.text` |
| `content_block_stop` | Block complete | Finalize block |
| `message_delta` | Metadata update | Check stop_reason |
| `message_stop` | End | Get final usage stats |

For most use cases, you only need to handle `content_block_delta` with `type: "text_delta"`.

### Streaming + Multi-turn Conversations

Combine streaming with conversation memory:

```typescript
const messages: Anthropic.MessageParam[] = [];

while (true) {
  const input = await ask("You: ");
  messages.push({ role: "user", content: input });

  let fullResponse = "";
  process.stdout.write("Claude: ");

  const stream = client.messages.stream({ model: "...", max_tokens: 1024, messages });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
      fullResponse += event.delta.text;
    }
  }

  console.log("\n");
  messages.push({ role: "assistant", content: fullResponse });
}
```

---

## Part 4: Structured Output

### The Problem with Plain Text

Sometimes you need data, not prose:

```
You: "What's the weather in Paris?"
Claude: "I don't have real-time weather data, but Paris typically has..."
```

You can't easily parse that. You want:

```json
{
  "city": "Paris",
  "available": false,
  "reason": "No real-time data access"
}
```

### Requesting JSON Output

Prompt Claude to respond with JSON:

```typescript
const prompt = `What is the weather in Paris? Respond with ONLY valid JSON:
{
  "city": "string",
  "available": boolean,
  "reason": "string"
}`;
```

Claude will respond:
```json
{
  "city": "Paris",
  "available": false,
  "reason": "I don't have access to real-time weather data"
}
```

### Parsing and Validating with Schemas

Use **Zod** (TypeScript) or **Pydantic** (Python) to validate structure:

**TypeScript**:
```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const MovieReview = z.object({
  title: z.string(),
  year: z.number(),
  rating: z.number().min(1).max(10),
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

type MovieReview = z.infer<typeof MovieReview>;

async function main() {
  const movie = "The Matrix";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Review the movie "${movie}". Respond with ONLY valid JSON matching this schema: { title: string, year: number, rating: number (1-10), summary: string, pros: string[], cons: string[] }`,
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Expected text response");

  const raw = JSON.parse(text.text);
  const review = MovieReview.parse(raw);  // Validates!

  console.log("Parsed review:");
  console.log(`  ${review.title} (${review.year}) — ${review.rating}/10`);
  console.log(`  ${review.summary}`);
  console.log(`  Pros: ${review.pros.join(", ")}`);
  console.log(`  Cons: ${review.cons.join(", ")}`);
}

main().catch(console.error);
```

**Python**:
```python
from dotenv import load_dotenv
import anthropic
import json
from pydantic import BaseModel, Field

load_dotenv()

client = anthropic.Anthropic()

class MovieReview(BaseModel):
    title: str
    year: int
    rating: int = Field(ge=1, le=10)
    summary: str
    pros: list[str]
    cons: list[str]

def main():
    movie = "The Matrix"

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f'Review the movie "{movie}". Respond with ONLY valid JSON matching this schema: {{ title: string, year: number, rating: number (1-10), summary: string, pros: string[], cons: string[] }}',
            },
        ],
    )

    block = response.content[0]
    if block.type != "text":
        raise ValueError("Expected text response")

    raw = json.loads(block.text)
    review = MovieReview(**raw)  # Validates!

    print("Parsed review:")
    print(f"  {review.title} ({review.year}) — {review.rating}/10")
    print(f"  {review.summary}")
    print(f"  Pros: {', '.join(review.pros)}")
    print(f"  Cons: {', '.join(review.cons)}")

if __name__ == "__main__":
    main()
```

### Why Use Schemas?

1. **Type safety**: Catch errors at parse time, not runtime
2. **Validation**: Ensure rating is 1-10, year is a number, etc.
3. **Documentation**: Schema doubles as documentation
4. **Autocomplete**: IDEs understand the structure

If Claude returns invalid JSON or wrong types, `parse()` throws an error immediately.

---

## Common Mistakes

### Mistake 1: Forgetting to Send Conversation History

```typescript
// ❌ Wrong - only sends current message
messages.push({ role: "user", content: input });
const response = await client.messages.create({
  model: "...",
  max_tokens: 1024,
  messages: [{ role: "user", content: input }],  // Missing history!
});

// ✓ Correct - sends full history
messages.push({ role: "user", content: input });
const response = await client.messages.create({
  model: "...",
  max_tokens: 1024,
  messages,  // Full conversation
});
```

### Mistake 2: Not Storing Assistant Responses

```typescript
// ❌ Wrong - only stores user messages
messages.push({ role: "user", content: input });
const response = await client.messages.create({ messages });
// Forgot to add response to messages!

// ✓ Correct
messages.push({ role: "user", content: input });
const response = await client.messages.create({ messages });
const text = response.content[0];
if (text.type === "text") {
  messages.push({ role: "assistant", content: text.text });
}
```

### Mistake 3: Parsing JSON Without Try-Catch

```typescript
// ❌ Wrong - crashes if Claude returns invalid JSON
const data = JSON.parse(response.content[0].text);

// ✓ Correct
try {
  const raw = JSON.parse(response.content[0].text);
  const validated = MySchema.parse(raw);
} catch (error) {
  console.error("Invalid JSON from Claude:", error);
}
```

---

## Key Takeaways

1. **APIs are stateless** — you must send full conversation history each time
2. **Messages array grows** — add both user and assistant messages
3. **Token costs increase** — longer conversations cost more
4. **Streaming improves UX** — users see output immediately
5. **Structured output needs validation** — use Zod or Pydantic
6. **Raw HTTP understanding helps debugging** — know what the SDK does

---

## What's Next?

In **Module 2**, we build the **agent loop**:
- Check `stop_reason`
- Handle tool calls
- Loop until done

This is where we go from chatbots to autonomous agents!

---

## Quick Reference

### Multi-turn Pattern
```typescript
const messages: Anthropic.MessageParam[] = [];

messages.push({ role: "user", content: userInput });
const response = await client.messages.create({ model, max_tokens, messages });
const text = response.content[0];
if (text.type === "text") {
  messages.push({ role: "assistant", content: text.text });
}
```

### Streaming Pattern
```typescript
const stream = client.messages.stream({ model, max_tokens, messages });
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
  }
}
```

### Structured Output Pattern
```typescript
const Schema = z.object({ field: z.string() });
const response = await client.messages.create({
  messages: [{ role: "user", content: "Respond with JSON: {...}" }],
});
const raw = JSON.parse(response.content[0].text);
const validated = Schema.parse(raw);
```
