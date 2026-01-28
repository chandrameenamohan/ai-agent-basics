# Module 1: LLM APIs — Homework

## Assignment: Build a Research Assistant Chatbot

### Overview

Create an interactive chatbot that helps users research topics by:
1. Conducting multi-turn conversations with context memory
2. Allowing users to save interesting facts as structured data
3. Streaming responses for better UX
4. Exporting saved facts to a JSON file
5. Managing conversation length to control costs

This assignment demonstrates real-world API integration: conversation management, structured data extraction, streaming, and cost optimization.

**Time estimate**: 3-4 hours

---

## Requirements

### Core Functionality (70 points)

Your program must:

1. **Multi-turn conversation** (15 points)
   - Maintain conversation history across turns
   - Claude remembers context (user's name, previous topics, etc.)
   - Exit on "quit" command

2. **Streaming responses** (15 points)
   - Display Claude's responses token-by-token as they arrive
   - Accumulate full text for conversation history
   - Show smooth, real-time output

3. **Save facts command** (20 points)
   - User types `/save` to extract and save the last fact discussed
   - Parse Claude's response into structured format: `{ topic: string, fact: string, source: string, savedAt: timestamp }`
   - Store in memory, display confirmation

4. **Export facts** (10 points)
   - User types `/export` to save all facts to `research-notes.json`
   - Pretty-print JSON with indentation
   - Display success message with filename

5. **Token monitoring** (10 points)
   - Display input/output tokens after each response
   - Show running total of conversation tokens
   - Warn when conversation exceeds 5,000 input tokens

### Bonus Features (30 points)

Choose any combination:

- **Smart conversation trimming** (15 points): Auto-summarize or trim when exceeding 5,000 tokens
- **Fact search** (10 points): `/search <keyword>` command to find saved facts
- **Categories** (10 points): Auto-categorize facts (science, history, technology, etc.)
- **Cost tracking** (10 points): Display cumulative cost in real dollars
- **Fact citations** (10 points): Claude provides source information for facts
- **Multi-session persistence** (10 points): Save conversation to disk, resume later

---

## Starter Code

### TypeScript

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import * as fs from "fs";
import { z } from "zod";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q: string): Promise<string> =>
  new Promise((resolve) => rl.question(q, resolve));

// Fact schema
const FactSchema = z.object({
  topic: z.string(),
  fact: z.string(),
  source: z.string().optional(),
  savedAt: z.string(),
});

type Fact = z.infer<typeof FactSchema>;

const savedFacts: Fact[] = [];

async function chat(userInput: string): Promise<string> {
  // TODO: Add message to history
  // TODO: Stream response
  // TODO: Accumulate text
  // TODO: Add to history
  // TODO: Return full response
  throw new Error("Not implemented");
}

async function saveFact(lastResponse: string): Promise<void> {
  // TODO: Ask Claude to extract structured fact from last response
  // TODO: Parse JSON
  // TODO: Validate with schema
  // TODO: Add to savedFacts
  throw new Error("Not implemented");
}

function exportFacts(): void {
  // TODO: Write savedFacts to research-notes.json
  throw new Error("Not implemented");
}

async function main() {
  console.log("🔬 Research Assistant Chatbot");
  console.log("Commands: /save (save last fact), /export (export to JSON), quit\n");

  while (true) {
    const input = await ask("You: ");

    if (input.toLowerCase() === "quit") break;

    if (input === "/export") {
      exportFacts();
      continue;
    }

    // TODO: Handle /save command
    // TODO: Handle regular chat
  }

  rl.close();
}

main().catch(console.error);
```

### Python

```python
from dotenv import load_dotenv
import anthropic
import json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

load_dotenv()

client = anthropic.Anthropic()
messages = []
saved_facts = []

# Fact schema
class Fact(BaseModel):
    topic: str
    fact: str
    source: Optional[str] = None
    saved_at: str

def chat(user_input: str) -> str:
    """Send message and return streaming response."""
    # TODO: Add message to history
    # TODO: Stream response
    # TODO: Accumulate text
    # TODO: Add to history
    # TODO: Return full response
    raise NotImplementedError("Not implemented")

def save_fact(last_response: str) -> None:
    """Extract and save structured fact from last response."""
    # TODO: Ask Claude to extract structured fact
    # TODO: Parse JSON
    # TODO: Validate with schema
    # TODO: Add to saved_facts
    raise NotImplementedError("Not implemented")

def export_facts() -> None:
    """Export saved facts to JSON file."""
    # TODO: Write saved_facts to research-notes.json
    raise NotImplementedError("Not implemented")

def main():
    print("🔬 Research Assistant Chatbot")
    print("Commands: /save (save last fact), /export (export to JSON), quit\n")

    last_response = ""

    while True:
        user_input = input("You: ")

        if user_input.lower() == "quit":
            break

        if user_input == "/export":
            export_facts()
            continue

        # TODO: Handle /save command
        # TODO: Handle regular chat

if __name__ == "__main__":
    main()
```

---

## Example Interaction

```
🔬 Research Assistant Chatbot
Commands: /save (save last fact), /export (export to JSON), quit

You: Tell me about the speed of light
Claude: The speed of light in a vacuum is approximately 299,792,458 meters per second, often rounded to 300,000 km/s. This is considered the universe's ultimate speed limit according to Einstein's theory of relativity.
[Tokens: 25+68, Total: 93]

You: /save
✓ Fact saved: "The speed of light in a vacuum is approximately 299,792,458 m/s"

You: What about black holes?
Claude: Black holes are regions of spacetime where gravity is so strong that nothing, not even light, can escape once it crosses the event horizon. They form when massive stars collapse at the end of their lives.
[Tokens: 118+89, Total: 300]

You: /save
✓ Fact saved: "Black holes are regions where gravity prevents even light from escaping"

You: /export
✓ Exported 2 facts to research-notes.json

You: quit

Session complete. Total tokens: 300 (approx. $0.00195)
```

**research-notes.json**:
```json
[
  {
    "topic": "Physics",
    "fact": "The speed of light in a vacuum is approximately 299,792,458 meters per second",
    "source": "Einstein's theory of relativity",
    "savedAt": "2025-01-28T10:30:00Z"
  },
  {
    "topic": "Astronomy",
    "fact": "Black holes are regions of spacetime where gravity is so strong that nothing can escape",
    "source": "General relativity",
    "savedAt": "2025-01-28T10:32:00Z"
  }
]
```

---

## Rubric

### Core Requirements (70 points)

| Criteria | Points | Description |
|----------|--------|-------------|
| Multi-turn conversation | 15 | Maintains history, remembers context |
| Streaming responses | 15 | Smooth real-time output |
| Save facts command | 20 | Extracts structured data, validates |
| Export facts | 10 | Writes to JSON file correctly |
| Token monitoring | 10 | Displays usage, warns on high usage |

### Bonus Features (30 points)

| Feature | Points | Description |
|---------|--------|-------------|
| Smart trimming | 15 | Manages conversation length |
| Fact search | 10 | Keyword search through saved facts |
| Categories | 10 | Auto-categorizes facts |
| Cost tracking | 10 | Real dollar amounts |
| Citations | 10 | Includes sources |
| Persistence | 10 | Save/load across sessions |

### Code Quality (Evaluated within core 70)

- Clean, readable code
- Proper error handling
- Type safety (TypeScript types, Python type hints)
- No hardcoded values
- Comments for complex logic

### Total: 100 points

**Grading scale**: A: 90+, B: 80-89, C: 70-79, Incomplete: <70

---

## Implementation Hints

### Hint 1: Streaming + History

```typescript
async function chat(userInput: string): Promise<string> {
  messages.push({ role: "user", content: userInput });

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

  const final = await stream.finalMessage();
  console.log(`\n[Tokens: ${final.usage.input_tokens}+${final.usage.output_tokens}]`);

  messages.push({ role: "assistant", content: fullResponse });
  return fullResponse;
}
```

### Hint 2: Extracting Facts

```typescript
async function saveFact(lastResponse: string): Promise<void> {
  const extractPrompt = `From this text, extract a structured fact: "${lastResponse}"

Respond with ONLY valid JSON:
{
  "topic": "the general topic (Physics, History, etc.)",
  "fact": "the core fact in one sentence",
  "source": "where this knowledge comes from (optional)"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: extractPrompt }],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Expected text");

  const raw = JSON.parse(text.text);
  const fact: Fact = {
    ...raw,
    savedAt: new Date().toISOString(),
  };

  const validated = FactSchema.parse(fact);
  savedFacts.push(validated);

  console.log(`✓ Fact saved: "${validated.fact}"\n`);
}
```

### Hint 3: Token Warning

```typescript
const WARN_THRESHOLD = 5000;

if (final.usage.input_tokens > WARN_THRESHOLD) {
  console.log(`⚠️  Warning: Conversation is getting long (${final.usage.input_tokens} tokens). Consider wrapping up or use /reset.`);
}
```

### Hint 4: Exporting JSON

```typescript
function exportFacts(): void {
  const filename = "research-notes.json";
  fs.writeFileSync(filename, JSON.stringify(savedFacts, null, 2));
  console.log(`✓ Exported ${savedFacts.length} facts to ${filename}\n`);
}
```

---

## Testing Checklist

Before submitting, verify:

- [ ] Conversation remembers context across multiple turns
- [ ] Responses stream smoothly in real-time
- [ ] `/save` correctly extracts and stores facts
- [ ] Saved facts include all required fields
- [ ] `/export` creates valid JSON file
- [ ] Token counts display after each response
- [ ] Warning appears when exceeding 5,000 tokens
- [ ] Error handling works (test with invalid commands)
- [ ] API key is in `.env`, not hardcoded
- [ ] Code is commented and readable

---

## Extension Ideas (Not Graded)

After completing the assignment:

1. **Quiz mode**: Claude asks you questions about saved facts
2. **Fact relationships**: Link related facts together
3. **Visual export**: Generate markdown or HTML report
4. **Multi-user**: Support multiple research sessions
5. **Source validation**: Check if facts are still current

---

## Common Mistakes

1. **Not accumulating streamed text**: You must build the full response to add to messages
2. **Forgetting to add assistant messages**: Breaks conversation continuity
3. **Parsing JSON without error handling**: Claude might return invalid JSON
4. **Not validating schemas**: Direct JSON parsing misses type errors
5. **Hardcoding timestamps**: Use `new Date().toISOString()` or `datetime.now().isoformat()`
6. **Not testing `/save` on long responses**: Ensure it works for multi-paragraph responses

---

## Evaluation Criteria

### Excellent (90-100)
- All core features work perfectly
- At least 2 bonus features implemented
- Excellent error handling and edge cases
- Clean, well-documented code
- Great user experience

### Good (80-89)
- All core features work
- 1 bonus feature implemented
- Adequate error handling
- Readable code
- Functional UX

### Satisfactory (70-79)
- Core features mostly work
- No bonus features
- Basic error handling
- Code works but could be cleaner

### Incomplete (<70)
- Missing core features
- Broken functionality
- Poor error handling
- Difficult to read/run

---

## Submission Requirements

Submit:
1. Source code (`research-assistant.ts` or `research_assistant.py`)
2. `research-notes.json` (example output from testing)
3. README with:
   - Installation instructions
   - How to run
   - Which bonus features you implemented
   - Any design decisions or trade-offs

---

## What You'll Learn

This assignment teaches:
- Managing stateful conversations with stateless APIs
- Streaming for responsive UX
- Structured data extraction and validation
- Token/cost monitoring in production
- File I/O with JSON
- Error handling for API calls
- Building user-friendly CLI tools

These skills directly translate to building production AI applications!

---

## Questions?

If stuck:
1. Review Module 1 tutorial sections on streaming and structured output
2. Complete the lab exercises first (especially streaming and structured output)
3. Test each feature independently before integrating
4. Use `console.log(JSON.stringify(data, null, 2))` to debug data structures
5. Check response structure when parsing fails

Good luck! 🚀
