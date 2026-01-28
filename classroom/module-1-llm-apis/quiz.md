# Module 1: LLM APIs — Quiz

## Instructions

- Answer all questions
- For multiple choice, select the best answer
- For short answer, write 2-4 sentences
- For code reading, explain what happens and identify issues

**Time limit**: 35 minutes

---

## Part 1: Multiple Choice (5 questions)

### Question 1

What does it mean that the Claude API is "stateless"?

A) The API only accepts static data
B) Each request is independent; Claude doesn't remember previous requests unless you send the history
C) You can't have multi-turn conversations
D) The API doesn't maintain any state between different users

<details>
<summary>Answer</summary>

**B) Each request is independent; Claude doesn't remember previous requests unless you send the history**

Stateless means the API has no memory between requests. Every API call is treated as a fresh start. To have a conversation, you must send the full message history in every request. This is different from traditional chat applications where the server maintains session state.
</details>

---

### Question 2

In a 10-turn conversation where each turn adds 100 tokens, approximately how many input tokens will you send on the 10th request?

A) 100 tokens
B) 1000 tokens
C) 1900 tokens (10 messages × 2 roles - 1)
D) 10,000 tokens

<details>
<summary>Answer</summary>

**C) 1900 tokens (approximately)**

Each turn adds 2 messages (user + assistant). By turn 10, you have 19 messages (10 user, 9 assistant). At ~100 tokens per message, that's approximately 1900 tokens. This demonstrates linear growth in conversation length.
</details>

---

### Question 3

What is the primary benefit of streaming API responses?

A) Streaming reduces token costs
B) Streaming improves user experience by showing output as it's generated
C) Streaming allows you to edit responses mid-generation
D) Streaming is faster than regular API calls

<details>
<summary>Answer</summary>

**B) Streaming improves user experience by showing output as it's generated**

Streaming doesn't reduce costs or total generation time, but it dramatically improves perceived performance. Users see tokens appear immediately instead of waiting 10-30 seconds for the complete response. This is especially important for longer responses.
</details>

---

### Question 4

Which HTTP header is specific to the Anthropic API and required for authentication?

A) `Authorization: Bearer <token>`
B) `x-api-key: <key>`
C) `API-Key: <key>`
D) `anthropic-key: <key>`

<details>
<summary>Answer</summary>

**B) `x-api-key: <key>`**

Anthropic uses the custom `x-api-key` header for authentication. This is different from many APIs that use the standard `Authorization: Bearer <token>` format. You also need `anthropic-version: 2023-06-01` and `Content-Type: application/json`.
</details>

---

### Question 5

Why use schema validation (Zod/Pydantic) for structured output?

A) It makes Claude generate better JSON
B) It reduces token usage
C) It catches type errors and validates data at parse time
D) It's required by the API

<details>
<summary>Answer</summary>

**C) It catches type errors and validates data at parse time**

Schema validation ensures Claude's JSON response matches your expected structure. If Claude returns a rating of "high" instead of a number, or forgets a required field, the schema parser will throw an error immediately instead of causing bugs later in your code. It provides type safety and runtime validation.
</details>

---

## Part 2: Short Answer (3 questions)

### Question 6

Explain why input token count grows linearly in multi-turn conversations, and describe one strategy to prevent this from becoming too expensive.

<details>
<summary>Sample Answer</summary>

Input tokens grow linearly because you must send the entire conversation history with each request. Each turn adds 2 messages (user + assistant), so by turn N you're sending 2N messages. This means costs increase significantly over long conversations.

One strategy is a **sliding window**: keep only the last 10-15 messages and discard older ones. This caps token usage at a fixed maximum. The tradeoff is Claude loses context from early in the conversation. Another strategy is to periodically **summarize** old messages and replace them with a condensed version.
</details>

---

### Question 7

When implementing streaming, why must you accumulate the full response text in a variable? What would happen if you didn't?

<details>
<summary>Sample Answer</summary>

You must accumulate the full response because you need to add it to the messages array for conversation continuity. Streaming events give you text fragments, not the complete message. If you don't accumulate, you can't add Claude's response to the conversation history, so future turns would have no memory of what Claude said.

Without accumulation, your messages array would only contain user messages, breaking the alternating user/assistant pattern and causing API errors.
</details>

---

### Question 8

What are the three required HTTP headers for making a raw request to the Claude API, and what is the purpose of each?

<details>
<summary>Sample Answer</summary>

1. **`Content-Type: application/json`** — Tells the server we're sending JSON in the request body
2. **`x-api-key: <your-key>`** — Authenticates the request so Anthropic knows who to bill
3. **`anthropic-version: 2023-06-01`** — Specifies which version of the API we're using, allowing Anthropic to maintain backward compatibility

Missing any of these will result in 400 (bad request) or 401 (unauthorized) errors.
</details>

---

## Part 3: Code Reading (2 questions)

### Question 9

What's wrong with this conversation bot? Identify all issues.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

async function chat(userInput: string) {
  messages.push({ role: "user", content: userInput });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: userInput }],
  });

  const text = response.content[0].text;
  console.log("Claude:", text);
}

// Usage
await chat("My name is Alice");
await chat("What's my name?");
```

<details>
<summary>Answer</summary>

**Issues:**

1. **Not sending conversation history**: Line 11 creates a new messages array with only the current input instead of using the accumulated `messages` array. Should be `messages` not `[{ role: "user", content: userInput }]`.

2. **Not storing assistant responses**: After getting Claude's response, it's never added to the `messages` array. This breaks conversation continuity.

3. **No type check**: Directly accessing `.text` without checking `content[0].type === "text"` is unsafe. Will crash if the content type changes.

4. **Missing error handling**: No try-catch for API errors.

5. **Missing dotenv import**: No `import "dotenv/config"` to load API key.

**Fixed version:**
```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [];

async function chat(userInput: string) {
  messages.push({ role: "user", content: userInput });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages,  // Send full history
  });

  const block = response.content[0];
  if (block.type === "text") {
    console.log("Claude:", block.text);
    messages.push({ role: "assistant", content: block.text });  // Store response
  }
}
```

**Result of original code**: Claude would not remember Alice's name because (1) the history isn't sent and (2) Claude's response isn't stored.
</details>

---

### Question 10

What does this code do? Will it work correctly?

```python
import anthropic
import json

client = anthropic.Anthropic()

def get_recipe(dish: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": f"Give me a recipe for {dish} in JSON format",
            },
        ],
    )

    return json.loads(response.content[0].text)

recipe = get_recipe("pasta")
print(f"Ingredients: {recipe['ingredients']}")
```

<details>
<summary>Answer</summary>

**What it does**: Asks Claude for a recipe in JSON format and attempts to parse it.

**Issues:**

1. **Prompt is too vague**: Doesn't specify the exact JSON structure expected. Claude might return JSON with different field names (`ingredients` vs `ingredient_list`) or add extra text around the JSON.

2. **No type checking**: Doesn't verify `content[0].type == "text"` before accessing `.text`.

3. **No JSON error handling**: If Claude returns invalid JSON or adds explanatory text, `json.loads()` will crash.

4. **No schema validation**: Even if JSON parses, there's no guarantee it has an `ingredients` field. Accessing `recipe['ingredients']` could raise `KeyError`.

5. **Missing dotenv**: No `load_dotenv()` call.

**Fixed version:**
```python
from dotenv import load_dotenv
import anthropic
import json
from pydantic import BaseModel

load_dotenv()

client = anthropic.Anthropic()

class Recipe(BaseModel):
    name: str
    ingredients: list[str]
    steps: list[str]

def get_recipe(dish: str) -> Recipe:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[
            {
                "role": "user",
                "content": f'Give me a recipe for {dish}. Respond with ONLY valid JSON: {{ "name": "string", "ingredients": ["..."], "steps": ["..."] }}',
            },
        ],
    )

    block = response.content[0]
    if block.type != "text":
        raise ValueError("Expected text response")

    try:
        raw = json.loads(block.text)
        return Recipe(**raw)  # Validates structure
    except json.JSONDecodeError:
        raise ValueError(f"Invalid JSON from Claude: {block.text}")

recipe = get_recipe("pasta")
print(f"Ingredients: {', '.join(recipe.ingredients)}")
```

**Will it work?**: Maybe, if Claude happens to return valid JSON with an `ingredients` key. But it's fragile and will crash often in production.
</details>

---

## Bonus Question (Optional)

You have a 50-turn conversation averaging 150 tokens per message (user + assistant). Using `claude-sonnet-4-20250514` (input: $3/M, output: $15/M), what is the approximate total cost for all 50 turns?

Assume output tokens are also 150 per turn on average.

<details>
<summary>Answer</summary>

**Calculation:**

Each turn adds 2 messages (user + assistant) = 300 tokens per turn

Input tokens by turn:
- Turn 1: 300 tokens
- Turn 2: 600 tokens
- Turn 3: 900 tokens
- ...
- Turn 50: 15,000 tokens

Total input tokens = 300 + 600 + 900 + ... + 15,000
This is an arithmetic series: sum = n(first + last)/2 = 50(300 + 15,000)/2 = **382,500 input tokens**

Output tokens: 150 per turn × 50 turns = **7,500 output tokens**

**Cost:**
- Input: 382,500 × ($3 / 1,000,000) = $1.15
- Output: 7,500 × ($15 / 1,000,000) = $0.11
- **Total: $1.26**

This demonstrates why long conversations need context management!
</details>

---

## Answer Key Summary

### Multiple Choice
1. B — API is stateless, no memory between requests
2. C — ~1900 tokens (19 messages × ~100 each)
3. B — Streaming improves UX with immediate output
4. B — `x-api-key` header for authentication
5. C — Schema validation catches errors at parse time

### Short Answer
6. Linear growth because full history is sent; strategies include sliding window or summarization
7. Must accumulate to add to messages array for conversation continuity
8. Content-Type (JSON format), x-api-key (auth), anthropic-version (API version)

### Code Reading
9. Multiple issues: not sending history, not storing responses, no type checks, no error handling
10. Fragile recipe parser with vague prompts, no validation, missing error handling

---

## Grading Rubric

| Section | Points | Criteria |
|---------|--------|----------|
| Multiple Choice | 20 | 4 points each (all or nothing) |
| Short Answer | 30 | 10 points each (conceptual understanding) |
| Code Reading | 50 | 25 points each (identifying issues + understanding fixes) |
| **Total** | **100** | Pass: 70+, Excellent: 90+ |

---

## Study Guide

If you struggled with:

- **Questions 1-2**: Review statelessness and message array growth in tutorial
- **Question 3**: Review streaming section and UX benefits
- **Question 4**: Review raw HTTP section and required headers
- **Question 5**: Review structured output and schema validation
- **Questions 6-8**: Practice with multi-turn chatbot lab exercise
- **Questions 9-10**: Write more code, review common mistakes

Retake the quiz after reviewing. Aim for 90+ before Module 2.
