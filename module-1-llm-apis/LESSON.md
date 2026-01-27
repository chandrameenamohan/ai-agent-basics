# Module 1: LLM APIs

## Goal
Understand how the Claude API actually works — raw HTTP, multi-turn conversations, streaming, and structured output.

## Concepts

### HTTP: It's just POST with JSON
The Claude API is a single endpoint: `POST https://api.anthropic.com/v1/messages`. You send JSON, you get JSON. The SDK is a convenience wrapper around `fetch()`.

Three headers are required:
- `Content-Type: application/json`
- `x-api-key: your-key`
- `anthropic-version: 2023-06-01`

### Conversations are arrays
There is no session on the server. Every API call sends the **entire** conversation history as an array of `{role, content}` objects that alternates between `"user"` and `"assistant"`. On the 10th turn, you're sending all 20 messages. This is why token counts grow over time — and why context limits matter (Module 6).

### Streaming
Without streaming, you wait for the entire response. With streaming, tokens arrive one at a time via an async iterator. The SDK provides `client.messages.stream()` which emits events: `message_start`, `content_block_start`, `content_block_delta` (the actual text), `message_stop`.

### JSON Schema
When you need structured data from an LLM, you ask it to return JSON and validate the result. **Zod** is a TypeScript library for runtime type validation. You define a schema, parse the LLM's JSON output through it, and get either a typed object or an error. This catches malformed responses before they corrupt your program.

## Build It

### Part 1: Raw HTTP (no SDK)

Create `module-1-llm-apis/01-raw-http.ts`.

```typescript
import "dotenv/config";

const API_KEY = process.env.ANTHROPIC_API_KEY!;
const API_URL = "https://api.anthropic.com/v1/messages";

async function main() {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      // TODO: Add a user message asking a simple question
    ],
  };

  // TODO: Use fetch() to POST to API_URL
  // - Set the three required headers (Content-Type, x-api-key, anthropic-version)
  // - Stringify the body
  // - Parse the JSON response
  // - Print the status code and full response
}

main().catch(console.error);
```

Run it: `bun module-1-llm-apis/01-raw-http.ts`

Look at the response structure. Notice `content` is an array of blocks, and `usage` shows token counts.

### Part 2: Multi-turn chatbot

Create `module-1-llm-apis/02-sdk-basic.ts`.

Build a chatbot loop:

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

// TODO: Create a readline interface for stdin/stdout
// TODO: Write a while loop that:
//   1. Reads user input
//   2. Pushes { role: "user", content: input } to messages
//   3. Calls client.messages.create() with the full messages array
//   4. Extracts the text from response.content[0]
//   5. Pushes { role: "assistant", content: text } to messages
//   6. Prints the response and token count
//   7. Exits on "quit"
```

Run it: `bun module-1-llm-apis/02-sdk-basic.ts`

Watch the token count grow with each turn. That's the entire conversation being re-sent.

### Part 3: Streaming

Create `module-1-llm-apis/03-streaming.ts`.

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const prompt = process.argv[2] || "Write a haiku about programming.";

  // TODO: Use client.messages.stream() instead of .create()
  // TODO: Iterate with `for await (const event of stream)`
  // TODO: Check for event.type === "content_block_delta" && event.delta.type === "text_delta"
  // TODO: Use process.stdout.write(event.delta.text) to print without newlines
  // TODO: Get final usage with stream.finalMessage()
}

main().catch(console.error);
```

Run it: `bun module-1-llm-apis/03-streaming.ts`

Try: `bun module-1-llm-apis/03-streaming.ts "Explain recursion in 3 sentences"`

### Part 4: Structured output with Zod

Create `module-1-llm-apis/04-structured-output.ts`.

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

// TODO: Define a Zod schema for a movie review:
//   title: string, year: number, rating: number (1-10),
//   summary: string, pros: string[], cons: string[]
const MovieReview = z.object({
  // TODO: Fill in the schema
});

type MovieReview = z.infer<typeof MovieReview>;

async function main() {
  const movie = process.argv[2] || "The Matrix";

  // TODO: Ask Claude to review the movie, responding with ONLY valid JSON
  //       matching your schema
  // TODO: Parse the response text with JSON.parse()
  // TODO: Validate with MovieReview.parse(raw)
  // TODO: Print the typed review object
}

main().catch(console.error);
```

Run it: `bun module-1-llm-apis/04-structured-output.ts "Inception"`

## Exercises

1. **Observe token growth**: In the chatbot (Part 2), have a 5-turn conversation. Note the token count each turn. Calculate: how much did tokens grow per turn? This is the fundamental cost of stateless APIs.

2. **Break JSON parsing**: In Part 4, change the prompt so Claude returns markdown instead of JSON. What error do you get from `JSON.parse`? What error from `Zod.parse`? Understanding these failure modes matters when you build tools that rely on structured output.

3. **Add a system prompt**: Modify the chatbot to accept a `system` parameter in the API call. Try: `system: "You are a pirate. Respond in pirate speak."` How does this change the behavior?

4. **Stream events**: In Part 3, print `event.type` for every event (not just text deltas). What's the full sequence of events? Understanding the stream protocol helps when debugging streaming issues.

5. **Rate limits**: Run Part 1 in a tight loop (10 calls). Do you hit a rate limit? What does the error look like?

## Checkpoint

You're ready for Module 2 when you can answer:
- What happens on the server between API calls? (Nothing — it's stateless)
- Why does the messages array grow with every turn?
- What's the difference between `client.messages.create()` and `client.messages.stream()`?
- Why validate LLM JSON output with Zod instead of just `JSON.parse`?

## Solutions
Compare your code against `solutions/` if you're stuck.
