# Module 1: LLM APIs — Lab Exercises

## Overview

This lab explores the LLM API at a deeper level: raw HTTP requests, multi-turn conversations, streaming, and structured output. Work through exercises sequentially.

**Time estimate**: 90 minutes

---

## Exercise 1: Raw HTTP Request

Understand what the SDK does under the hood by making a raw HTTP request.

### Task

Create `raw-http.ts` (or `raw_http.py`) that sends a POST request to the Claude API **without using the SDK**.

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

  console.log("→ Sending request...");
  console.log("→ Body:", JSON.stringify(body, null, 2));

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
  console.log("\n← Status:", response.status);
  console.log("← Response:", JSON.stringify(data, null, 2));
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

    print("→ Sending request...")
    print("→ Body:", json.dumps(body, indent=2))

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
        print(f"\n← Status: {resp.status}")
        print("← Response:", json.dumps(data, indent=2))

if __name__ == "__main__":
    main()
```

### Questions

1. What HTTP status code do you get on success?
2. What happens if you omit the `x-api-key` header?
3. What happens if you set `anthropic-version` to `"invalid"`?
4. Compare the response structure to Module 0. Is it identical?

---

## Exercise 2: Build a Multi-Turn Chatbot

Create a chatbot that remembers conversation context.

### Task

Create `chatbot.ts` (or `chatbot.py`) with these features:
- Prompt user for input in a loop
- Send full conversation history with each request
- Display Claude's response
- Show token count and message array length after each turn
- Exit on "quit"

**TypeScript Starter**:
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

    // TODO: Add user message to messages array
    // TODO: Call API with full messages array
    // TODO: Extract and display response
    // TODO: Add assistant message to messages array
    // TODO: Display token usage and message count
  }

  rl.close();
}

main().catch(console.error);
```

**Python Starter**:
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

        # TODO: Add user message to messages list
        # TODO: Call API with full messages list
        # TODO: Extract and display response
        # TODO: Add assistant message to messages list
        # TODO: Display token usage and message count

if __name__ == "__main__":
    main()
```

### Test Cases

Test your chatbot with these conversation flows:

**Test 1: Memory**
```
You: My name is Alice
Claude: Nice to meet you, Alice!
You: What's my name?
Claude: Your name is Alice.
```

**Test 2: Context**
```
You: I have 3 apples
Claude: That's nice.
You: I buy 2 more. How many do I have?
Claude: You have 5 apples.
```

**Test 3: Token Growth**
- Have a 10-turn conversation
- Note how input tokens increase each turn
- Calculate total cost

### Questions

1. Does Claude remember your name across turns?
2. How many input tokens do you have on turn 5? Turn 10?
3. What happens if you modify the `messages` array incorrectly (e.g., two user messages in a row)?

---

## Exercise 3: Implement Streaming

Modify your chatbot to stream responses token-by-token.

### Task

Create `streaming-chatbot.ts` (or `streaming_chatbot.py`) that:
- Accepts user input
- Streams Claude's response (displays tokens as they arrive)
- Accumulates the full response for the messages array
- Shows token usage at the end

**TypeScript Hint**:
```typescript
let fullResponse = "";
process.stdout.write("Claude: ");

const stream = client.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages,
});

for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);
    fullResponse += event.delta.text;
  }
}

console.log("\n");
messages.push({ role: "assistant", content: fullResponse });

const final = await stream.finalMessage();
console.log(`[Tokens: ${final.usage.input_tokens}+${final.usage.output_tokens}]`);
```

**Python Hint**:
```python
full_response = ""
print("Claude: ", end="", flush=True)

with client.messages.stream(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=messages,
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
        full_response += text

print("\n")
messages.append({"role": "assistant", "content": full_response})

message = stream.get_final_message()
print(f"[Tokens: {message.usage.input_tokens}+{message.usage.output_tokens}]")
```

### Questions

1. What's the user experience difference between streaming and non-streaming?
2. Does streaming change token usage or cost?
3. Try asking for a long response (e.g., "Write a 500-word essay"). Is streaming more useful?

---

## Exercise 4: Structured Output with Validation

Parse JSON responses and validate them with schemas.

### Task A: Movie Review Extractor

Create `movie-review.ts` (or `movie_review.py`) that:
1. Asks user for a movie name
2. Requests a structured review from Claude (JSON format)
3. Parses and validates the JSON
4. Displays the review in a formatted way

**Required fields**:
- `title` (string)
- `year` (number)
- `rating` (number, 1-10)
- `summary` (string)
- `pros` (array of strings)
- `cons` (array of strings)

**TypeScript with Zod**:
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

async function reviewMovie(movie: string): Promise<MovieReview> {
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
  if (text.type !== "text") throw new Error("Expected text");

  const raw = JSON.parse(text.text);
  const review = MovieReview.parse(raw);

  return review;
}

async function main() {
  const movie = process.argv[2] || "The Matrix";
  const review = await reviewMovie(movie);

  console.log(`\n${review.title} (${review.year}) — ${review.rating}/10`);
  console.log(`\n${review.summary}`);
  console.log(`\nPros:`);
  review.pros.forEach((pro) => console.log(`  • ${pro}`));
  console.log(`\nCons:`);
  review.cons.forEach((con) => console.log(`  • ${con}`));
}

main().catch(console.error);
```

**Python with Pydantic**:
```python
from dotenv import load_dotenv
import anthropic
import json
import sys
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

def review_movie(movie: str) -> MovieReview:
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
        raise ValueError("Expected text")

    raw = json.loads(block.text)
    review = MovieReview(**raw)

    return review

def main():
    movie = sys.argv[1] if len(sys.argv) > 1 else "The Matrix"
    review = review_movie(movie)

    print(f"\n{review.title} ({review.year}) — {review.rating}/10")
    print(f"\n{review.summary}")
    print("\nPros:")
    for pro in review.pros:
        print(f"  • {pro}")
    print("\nCons:")
    for con in review.cons:
        print(f"  • {con}")

if __name__ == "__main__":
    main()
```

### Task B: Create Your Own Schema

Pick a domain and create a schema for it. Ideas:
- Recipe extractor (`{ name, ingredients, steps, cookTime }`)
- Contact info parser (`{ name, email, phone, company }`)
- News summary (`{ headline, summary, sentiment, topics }`)

### Questions

1. What happens if Claude returns a rating of 15 (outside 1-10 range)?
2. What if Claude adds extra text before/after the JSON?
3. How would you handle parsing errors gracefully?

---

## Exercise 5: Token Usage Analyzer

Build a tool to analyze token growth in conversations.

### Task

Create `token-analyzer.ts` (or `token_analyzer.py`) that:
1. Runs a conversation for N turns
2. Tracks input/output tokens per turn
3. Calculates cumulative cost
4. Displays a summary table

**Example Output**:
```
Turn | Input | Output | Turn Cost | Cumulative Cost
-----|-------|--------|-----------|----------------
  1  |  100  |   50   | $0.00105  | $0.00105
  2  |  200  |   60   | $0.00150  | $0.00255
  3  |  300  |   55   | $0.00182  | $0.00437
  4  |  400  |   48   | $0.00192  | $0.00629
  5  |  500  |   52   | $0.00228  | $0.00857

Total: 1500 input + 265 output = 1765 tokens
Cost: $0.00857
```

**Hint**: Track data in an array:
```typescript
interface Turn {
  input: number;
  output: number;
  cost: number;
}

const turns: Turn[] = [];
```

### Questions

1. How does input token count grow? Linear? Exponential?
2. At what conversation length does cost become significant?
3. If you ran 1000 conversations of 20 turns each, what would it cost?

---

## Exercise 6: Conversation Persistence

Save conversations to disk and reload them later.

### Task

Create `persistent-chatbot.ts` (or `persistent_chatbot.py`) that:
- Saves the messages array to `conversation.json` after each turn
- Loads from `conversation.json` on startup (if exists)
- Continues the conversation from where it left off

**TypeScript Hint**:
```typescript
import fs from "fs";

const SAVE_FILE = "conversation.json";

function loadMessages(): Anthropic.MessageParam[] {
  if (fs.existsSync(SAVE_FILE)) {
    return JSON.parse(fs.readFileSync(SAVE_FILE, "utf-8"));
  }
  return [];
}

function saveMessages(messages: Anthropic.MessageParam[]) {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(messages, null, 2));
}

const messages = loadMessages();
// ... after each turn:
saveMessages(messages);
```

**Python Hint**:
```python
import json
import os

SAVE_FILE = "conversation.json"

def load_messages() -> list:
    if os.path.exists(SAVE_FILE):
        with open(SAVE_FILE, "r") as f:
            return json.load(f)
    return []

def save_messages(messages: list):
    with open(SAVE_FILE, "w") as f:
        json.dump(messages, f, indent=2)

messages = load_messages()
# ... after each turn:
save_messages(messages)
```

### Test

1. Start a conversation, chat for 3 turns
2. Exit the program
3. Run it again — does it remember the conversation?
4. Add a `/reset` command that clears the conversation

---

## Challenge Exercise: Smart Conversation Trimmer

Implement a strategy to prevent token growth from becoming expensive.

### Task

Modify your chatbot to automatically trim the conversation when it gets too long. Strategies:

**Strategy 1: Sliding Window**
Keep only the last N messages:
```typescript
if (messages.length > 10) {
  messages = messages.slice(-10);
}
```

**Strategy 2: Summarize**
When messages exceed a threshold, ask Claude to summarize and replace old messages with the summary:
```typescript
if (messages.length > 15) {
  const summary = await getSummary(messages.slice(0, -5));
  messages = [
    { role: "user", content: `[Previous conversation summary: ${summary}]` },
    ...messages.slice(-5),
  ];
}
```

**Strategy 3: Token-Based**
Track actual token count and trim when exceeding a budget:
```typescript
if (currentTokenCount > 5000) {
  // Trim oldest messages
}
```

### Questions

1. Which strategy preserves context best?
2. Which is most cost-effective?
3. How would you test if context is being lost?

---

## Lab Completion Checklist

You've completed this lab when you can:

- [ ] Make raw HTTP requests without the SDK
- [ ] Build multi-turn conversations with message history
- [ ] Implement streaming responses
- [ ] Parse and validate structured JSON output
- [ ] Track token usage across conversations
- [ ] Save/load conversations from disk
- [ ] Explain statelessness and its implications
- [ ] Debug conversation context issues

---

## Common Issues

### "Messages must alternate between user and assistant"

Fix: Ensure you're adding both user and assistant messages:
```typescript
messages.push({ role: "user", content: input });
const response = await client.messages.create({ messages });
messages.push({ role: "assistant", content: response.content[0].text });
```

### Streaming doesn't work

Fix: Use `process.stdout.write()` (TypeScript) or `print(..., end="", flush=True)` (Python), not regular `console.log()` or `print()`.

### JSON parsing fails

Fix: Make prompt more explicit and add error handling:
```typescript
try {
  const raw = JSON.parse(text);
  const validated = Schema.parse(raw);
} catch (error) {
  console.error("Invalid JSON:", text);
  throw error;
}
```

---

## Next Steps

1. Complete the quiz
2. Start the homework assignment
3. Move to **Module 2: Agent Loop** to learn about tool use

Great work! You now understand how to build conversational AI applications.
