# Module 0: Setup (API Connection) — Tutorial

## Learning Objectives

By the end of this module, you will be able to:

1. Understand what an API is and why we use SDKs
2. Set up authentication with API keys
3. Make your first API call to Claude
4. Read and interpret API responses
5. Understand tokens and token usage
6. Debug common connection issues

---

## Introduction: Talking to AI Models

Welcome to AI agent engineering! Before we build autonomous agents, we need to understand how to communicate with AI models like Claude.

Think of Claude as a service running on Anthropic's servers. You can't just run Claude on your laptop (it requires massive computational resources). Instead, you send requests over the internet to Anthropic's API, which processes your request and sends back a response.

```
Your Computer                    Anthropic's Servers
    |                                    |
    |  "Hello, what's 2+2?"              |
    | ---------------------------------> |
    |                                    |
    |                            [Claude processes]
    |                                    |
    |  "2+2 equals 4"                   |
    | <--------------------------------- |
    |                                    |
```

This request-response pattern is called an **API** (Application Programming Interface).

---

## What is an API?

An **API** is a set of rules for how programs talk to each other. In our case:

- **You send**: A request with a message (like "What's 2+2?")
- **Claude sends back**: A response with an answer

APIs use HTTP (the same protocol your browser uses for websites). You could manually craft HTTP requests, but that's tedious. Instead, we use an **SDK**.

---

## What is an SDK?

An **SDK** (Software Development Kit) is a library that wraps the API in easy-to-use functions.

Without SDK (raw HTTP):
```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "sk-ant-...",
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: "Hello" }],
  }),
});
```

With SDK:
```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [{ role: "user", content: "Hello" }],
});
```

Much cleaner! The SDK handles headers, authentication, error handling, and more.

---

## API Keys: Your Passport to Claude

APIs need **authentication** to know who's making requests (and to bill you). Anthropic uses **API keys**.

An API key looks like this:
```
sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Think of it like a password:
- **Never commit it to Git**
- **Never share it publicly**
- **Store it in a `.env` file**

### Setting Up Your `.env` File

1. Create a file named `.env` in your project root:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
   ```

2. Add `.env` to your `.gitignore`:
   ```
   .env
   ```

3. Load it in your code:
   ```typescript
   import "dotenv/config";  // Automatically loads .env
   ```

Now `process.env.ANTHROPIC_API_KEY` contains your key!

---

## Making Your First API Call

Let's break down a complete example:

### TypeScript Version

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();  // Reads API key from env

async function main() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: "Say hello!" }],
  });

  const text = response.content[0];
  if (text.type === "text") {
    console.log("Response:", text.text);
    console.log("Usage:", response.usage);
  }
}

main().catch(console.error);
```

### Python Version

```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()  # Reads API key from env

def main():
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[{"role": "user", "content": "Say hello!"}],
    )

    block = response.content[0]
    if block.type == "text":
        print("Response:", block.text)
        print("Usage:", response.usage)

if __name__ == "__main__":
    main()
```

---

## Understanding the Request

Let's examine each parameter:

### `model`
Which version of Claude to use. Think of it like choosing between GPT-3.5 and GPT-4, or iPhone 14 vs iPhone 15.

```typescript
model: "claude-sonnet-4-20250514"
```

Common models:
- `claude-sonnet-4-20250514` — Fast, smart, good for most tasks
- `claude-opus-4-5-20251101` — Slower, more capable, expensive
- `claude-haiku-4-20250514` — Fastest, cheapest, simpler tasks

### `max_tokens`
Maximum length of the response. A **token** is roughly 0.75 words in English.

```typescript
max_tokens: 256  // ~190 words max
```

Why limit it? To save money and prevent runaway responses.

### `messages`
An array of conversation turns. Each message has:
- `role`: Either `"user"` (you) or `"assistant"` (Claude)
- `content`: The text

```typescript
messages: [
  { role: "user", content: "What's 2+2?" }
]
```

We'll expand this to multi-turn conversations in Module 1.

---

## Understanding the Response

The API returns a structured object:

```typescript
{
  id: "msg_01XYZ...",           // Unique message ID
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",              // Could also be "tool_use" later
      text: "Hello! I'm working perfectly."
    }
  ],
  model: "claude-sonnet-4-20250514",
  stop_reason: "end_turn",       // Why it stopped
  usage: {
    input_tokens: 12,            // Tokens you sent
    output_tokens: 15            // Tokens Claude sent back
  }
}
```

### Why is `content` an array?

Claude can return multiple blocks:
- Text
- Tool use (we'll cover in Module 3)
- Images (vision models)

For now, we just grab `content[0]` and check if it's text.

```typescript
const text = response.content[0];
if (text.type === "text") {
  console.log(text.text);  // The actual response
}
```

---

## What Are Tokens?

A **token** is the basic unit of text that language models process. Roughly:

- 1 token ≈ 0.75 English words
- "Hello" = 1 token
- "Hello world" = 2 tokens
- "The quick brown fox" = 4 tokens

Why do we care about tokens?

1. **Cost**: You pay per token (input + output)
2. **Limits**: Models have maximum context sizes (e.g., 200K tokens)
3. **Performance**: More tokens = slower, more expensive

### Reading Token Usage

```typescript
console.log(response.usage);
// { input_tokens: 12, output_tokens: 15 }
```

- **Input tokens**: Your message + system prompt + conversation history
- **Output tokens**: Claude's response

**Total cost** = (input tokens × input price) + (output tokens × output price)

For `claude-sonnet-4-20250514`:
- Input: $3 per million tokens
- Output: $15 per million tokens

Example: 1000 input, 500 output = $0.003 + $0.0075 = $0.0105 (about 1 cent)

---

## Common Mistakes

### 1. Forgetting to Await

```typescript
// ❌ Wrong
const response = client.messages.create({ ... });
console.log(response);  // Prints Promise { <pending> }

// ✅ Correct
const response = await client.messages.create({ ... });
console.log(response);  // Prints actual response
```

### 2. Missing API Key

```
Error: ANTHROPIC_API_KEY is not set
```

**Fix**: Make sure you have a `.env` file with your key, and you're loading it with `dotenv/config` or `load_dotenv()`.

### 3. Wrong Content Type

```typescript
const text = response.content[0];
console.log(text.text);  // ❌ Could crash if not text type

// ✅ Always check type first
if (text.type === "text") {
  console.log(text.text);
}
```

### 4. Not Handling Errors

```typescript
// ❌ Crashes on network error
const response = await client.messages.create({ ... });

// ✅ Graceful error handling
try {
  const response = await client.messages.create({ ... });
} catch (error) {
  console.error("API call failed:", error);
}
```

### 5. Hardcoding the API Key

```typescript
// ❌ NEVER DO THIS
const client = new Anthropic({ apiKey: "sk-ant-..." });

// ✅ Use environment variables
const client = new Anthropic();  // Reads from env automatically
```

---

## The `stop_reason` Field

The response includes a `stop_reason` that tells you why Claude stopped generating:

- `end_turn`: Natural completion
- `max_tokens`: Hit the `max_tokens` limit
- `stop_sequence`: Hit a custom stop sequence (advanced)
- `tool_use`: Used a tool (Module 3+)

Example:
```typescript
if (response.stop_reason === "max_tokens") {
  console.log("Warning: Response was cut off!");
}
```

---

## ASCII Diagram: Complete Flow

```
┌─────────────────┐
│  Your Code      │
│  verify.ts      │
└────────┬────────┘
         │
         │ 1. Load API key from .env
         │
         ▼
┌─────────────────┐
│  Anthropic SDK  │
│  client.create()│
└────────┬────────┘
         │
         │ 2. POST to api.anthropic.com/v1/messages
         │    Headers: x-api-key, anthropic-version
         │    Body: { model, max_tokens, messages }
         │
         ▼
┌──────────────────────┐
│  Anthropic's Servers │
│                      │
│  ┌────────────┐     │
│  │   Claude   │     │
│  │  (GPU farm)│     │
│  └────────────┘     │
└────────┬─────────────┘
         │
         │ 3. Response JSON
         │    { content: [{ type: "text", text: "..." }], usage: { ... } }
         │
         ▼
┌─────────────────┐
│  Your Code      │
│  Parses response│
│  Prints output  │
└─────────────────┘
```

---

## Key Takeaways

1. **APIs** let you communicate with remote services over HTTP
2. **SDKs** wrap APIs in convenient functions
3. **API keys** authenticate your requests (keep them secret!)
4. **Tokens** are the unit of text; you pay per token
5. Always check `content[0].type` before accessing `.text`
6. The response includes `usage` stats for monitoring costs
7. Use `.env` files for secrets, never commit them to Git

---

## What's Next?

In **Module 1**, we'll dive deeper into the API:
- Making raw HTTP requests (no SDK)
- Multi-turn conversations
- Streaming responses
- Structured output with validation

But first, complete the lab exercises to solidify your understanding!

---

## Further Reading

- [Anthropic API Documentation](https://docs.anthropic.com/en/api/)
- [Token counting explained](https://help.anthropic.com/en/articles/8325761-what-are-tokens-and-how-do-i-count-them)
- [Best practices for API keys](https://docs.anthropic.com/en/api/getting-started#api-keys)

---

## Quick Reference Card

```typescript
// Setup
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

// Basic call
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [{ role: "user", content: "Hello" }],
});

// Extract response
const text = response.content[0];
if (text.type === "text") {
  console.log(text.text);
}

// Check usage
console.log(response.usage.input_tokens);
console.log(response.usage.output_tokens);
```

```python
# Setup
from dotenv import load_dotenv
import anthropic
load_dotenv()
client = anthropic.Anthropic()

# Basic call
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=256,
    messages=[{"role": "user", "content": "Hello"}],
)

# Extract response
block = response.content[0]
if block.type == "text":
    print(block.text)

# Check usage
print(response.usage.input_tokens)
print(response.usage.output_tokens)
```
