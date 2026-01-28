# Module 0: Setup (API Connection) — Handout

## Key Terms

### API (Application Programming Interface)
A set of rules for how programs communicate. In this course, we use HTTP APIs to send requests to Claude and receive responses.

### SDK (Software Development Kit)
A library that wraps an API in convenient functions. The Anthropic SDK handles authentication, request formatting, and error handling for you.

### API Key
A secret string used to authenticate requests. Format: `sk-ant-api03-...`. Store in `.env`, never commit to Git.

### Token
The basic unit of text that language models process. Roughly 0.75 English words per token. You pay per token (input + output).

### Model
The specific version of Claude you're using. Examples:
- `claude-sonnet-4-20250514` — Balanced speed/quality
- `claude-opus-4-5-20251101` — Highest capability
- `claude-haiku-4-20250514` — Fastest/cheapest

### max_tokens
The maximum number of tokens Claude can generate in a response. Prevents runaway costs and ensures responses fit your needs.

### Messages Array
The conversation history. Each message has:
- `role`: `"user"` or `"assistant"`
- `content`: The text

### Content Block
A piece of Claude's response. Can be:
- `type: "text"` — Text response
- `type: "tool_use"` — Tool call (Module 3+)

### stop_reason
Why Claude stopped generating:
- `end_turn` — Natural completion
- `max_tokens` — Hit the limit
- `tool_use` — Made a tool call

### Usage
Token statistics for cost tracking:
- `input_tokens` — Tokens in your request
- `output_tokens` — Tokens in Claude's response

---

## Code Reference

### TypeScript Setup

```typescript
// Install dependencies
// npm install @anthropic-ai/sdk dotenv

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
// Automatically reads ANTHROPIC_API_KEY from environment
```

### Python Setup

```python
# Install dependencies
# pip install anthropic python-dotenv

from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()
# Automatically reads ANTHROPIC_API_KEY from environment
```

### Environment File (`.env`)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

**Important**: Add `.env` to your `.gitignore`!

---

## Basic API Call

### TypeScript

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 256,
  messages: [
    { role: "user", content: "What is 2+2?" }
  ],
});

const text = response.content[0];
if (text.type === "text") {
  console.log(text.text);
  console.log("Tokens:", response.usage);
}
```

### Python

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=256,
    messages=[
        {"role": "user", "content": "What is 2+2?"}
    ],
)

block = response.content[0]
if block.type == "text":
    print(block.text)
    print("Tokens:", response.usage)
```

---

## Response Structure

```typescript
{
  id: "msg_01ABC...",
  type: "message",
  role: "assistant",
  content: [
    {
      type: "text",
      text: "2+2 equals 4."
    }
  ],
  model: "claude-sonnet-4-20250514",
  stop_reason: "end_turn",
  usage: {
    input_tokens: 12,
    output_tokens: 8
  }
}
```

---

## Troubleshooting Guide

### Error: "ANTHROPIC_API_KEY is not set"

**Cause**: Missing or incorrect `.env` file

**Fix**:
1. Create `.env` in project root
2. Add `ANTHROPIC_API_KEY=sk-ant-...`
3. Import `dotenv/config` (TS) or call `load_dotenv()` (Python)

---

### Error: "Invalid API key"

**Cause**: Wrong key, expired key, or key not copied correctly

**Fix**:
1. Go to https://console.anthropic.com/settings/keys
2. Generate a new key
3. Copy entire string (starts with `sk-ant-api03-`)
4. Update `.env` file

---

### Error: "Cannot read property 'text' of undefined"

**Cause**: Accessing `.text` without checking type

**Fix**:
```typescript
// ❌ Wrong
console.log(response.content[0].text);

// ✅ Correct
const text = response.content[0];
if (text.type === "text") {
  console.log(text.text);
}
```

---

### Response is cut off

**Cause**: Hit `max_tokens` limit

**Fix**:
1. Increase `max_tokens`
2. Check `response.stop_reason === "max_tokens"`

```typescript
if (response.stop_reason === "max_tokens") {
  console.warn("Response was truncated. Increase max_tokens.");
}
```

---

### TypeScript: "Cannot find module '@anthropic-ai/sdk'"

**Cause**: Package not installed

**Fix**:
```bash
npm install @anthropic-ai/sdk dotenv
# or
bun install @anthropic-ai/sdk dotenv
```

---

### Python: "No module named 'anthropic'"

**Cause**: Package not installed

**Fix**:
```bash
pip install anthropic python-dotenv
```

---

## Token Estimation

Quick reference for planning:

| Text | Approximate Tokens |
|------|-------------------|
| "Hello" | 1 |
| "Hello world" | 2 |
| 100 words | ~133 |
| 1 page (~500 words) | ~667 |
| 1 book chapter (~5000 words) | ~6667 |

**Rule of thumb**: 1 token ≈ 0.75 words

---

## Cost Estimation (claude-sonnet-4-20250514)

- **Input**: $3 per million tokens
- **Output**: $15 per million tokens

### Examples

| Input | Output | Cost |
|-------|--------|------|
| 1,000 | 500 | $0.0105 (~1¢) |
| 10,000 | 2,000 | $0.06 (6¢) |
| 100,000 | 10,000 | $0.45 (45¢) |

---

## Common Patterns

### Error Handling

```typescript
try {
  const response = await client.messages.create({ ... });
  // Process response
} catch (error) {
  if (error.status === 401) {
    console.error("Invalid API key");
  } else if (error.status === 429) {
    console.error("Rate limit hit");
  } else {
    console.error("API error:", error);
  }
}
```

### Type Checking

```typescript
const block = response.content[0];
if (block.type === "text") {
  console.log("Text:", block.text);
} else if (block.type === "tool_use") {
  console.log("Tool call:", block.name);
}
```

### Token Monitoring

```typescript
const { input_tokens, output_tokens } = response.usage;
const total = input_tokens + output_tokens;
const cost = (input_tokens * 3 + output_tokens * 15) / 1_000_000;

console.log(`Tokens: ${total} | Cost: $${cost.toFixed(6)}`);
```

---

## Model Comparison

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| Haiku | Fastest | Good | Lowest | Simple tasks, high volume |
| Sonnet | Fast | Great | Medium | Most use cases |
| Opus | Slower | Best | Highest | Complex reasoning, creative work |

---

## Quick Checklist

Before running your first API call:

- [ ] API key obtained from console.anthropic.com
- [ ] `.env` file created with `ANTHROPIC_API_KEY=...`
- [ ] `.env` added to `.gitignore`
- [ ] Dependencies installed (`@anthropic-ai/sdk` + `dotenv`)
- [ ] Import statement includes `dotenv/config` or `load_dotenv()` call
- [ ] Using `await` with `client.messages.create()`
- [ ] Checking `content[0].type === "text"` before accessing `.text`

---

## Next Steps

Once you can successfully make an API call:

1. Experiment with different prompts
2. Try different models (Haiku, Opus)
3. Adjust `max_tokens` and observe behavior
4. Monitor token usage
5. Move on to **Module 1: LLM APIs** for multi-turn conversations and streaming

---

## Resources

- [Anthropic Console](https://console.anthropic.com/) — Get API keys, view usage
- [API Reference](https://docs.anthropic.com/en/api/) — Full documentation
- [Pricing](https://www.anthropic.com/pricing) — Up-to-date token costs
- [Rate Limits](https://docs.anthropic.com/en/api/rate-limits) — Usage quotas
