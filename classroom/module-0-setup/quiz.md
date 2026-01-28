# Module 0: Setup (API Connection) — Quiz

## Instructions

- Answer all questions
- For multiple choice, select the best answer
- For short answer, write 2-4 sentences
- For code reading, explain what the code does and identify any issues

**Time limit**: 30 minutes

---

## Part 1: Multiple Choice (5 questions)

### Question 1

What is an SDK?

A) A secret key for API authentication
B) A library that wraps an API in convenient functions
C) A type of database for storing tokens
D) A server that hosts AI models

<details>
<summary>Answer</summary>

**B) A library that wraps an API in convenient functions**

An SDK (Software Development Kit) provides a developer-friendly interface to an API. The Anthropic SDK handles HTTP requests, authentication, error handling, and response parsing so you don't have to manually craft HTTP requests.
</details>

---

### Question 2

Why should you never commit API keys to Git?

A) Git doesn't support long strings
B) It increases repository size
C) Anyone with access to the repository can use (and abuse) your API key
D) API keys expire when committed to version control

<details>
<summary>Answer</summary>

**C) Anyone with access to the repository can use (and abuse) your API key**

API keys are like passwords. If someone gets your key, they can make requests that are billed to your account. Public repositories are scanned by bots that harvest exposed keys within minutes. Always store keys in `.env` files and add `.env` to `.gitignore`.
</details>

---

### Question 3

Approximately how many tokens is a 100-word English paragraph?

A) 10 tokens
B) 75 tokens
C) 133 tokens
D) 1000 tokens

<details>
<summary>Answer</summary>

**C) 133 tokens**

The rule of thumb is 1 token ≈ 0.75 words, so 100 words ≈ 133 tokens. This varies by language and content (code is often more tokens per word).
</details>

---

### Question 4

What does `response.stop_reason === "max_tokens"` indicate?

A) The model finished its response naturally
B) The response was cut off because it hit the token limit
C) An error occurred during generation
D) The model refused to answer

<details>
<summary>Answer</summary>

**B) The response was cut off because it hit the token limit**

When `stop_reason` is `"max_tokens"`, it means Claude had more to say but couldn't because it reached the `max_tokens` limit you set. The response is incomplete. If `stop_reason` is `"end_turn"`, the model finished naturally.
</details>

---

### Question 5

Which model is fastest and cheapest?

A) claude-opus-4-5-20251101
B) claude-sonnet-4-20250514
C) claude-haiku-4-20250514
D) All models cost the same

<details>
<summary>Answer</summary>

**C) claude-haiku-4-20250514**

Haiku is optimized for speed and cost, making it ideal for simple tasks and high-volume applications. Sonnet is balanced (most common choice), and Opus is the most capable but slowest and most expensive.
</details>

---

## Part 2: Short Answer (3 questions)

### Question 6

Explain the difference between `input_tokens` and `output_tokens` in the usage statistics. Why do they have different prices?

<details>
<summary>Sample Answer</summary>

`input_tokens` represents the number of tokens in your request (your message, system prompt, conversation history). `output_tokens` is the number of tokens Claude generated in the response. Output tokens cost more (e.g., 5x for Sonnet) because they require more computation—the model must generate each token sequentially, considering all previous context, while input tokens are processed in parallel.
</details>

---

### Question 7

Why is `response.content` an array instead of just a single text string? What other types of content blocks might it contain?

<details>
<summary>Sample Answer</summary>

`response.content` is an array because Claude's response can contain multiple blocks of different types. Currently it can include:
- `type: "text"` — Text responses
- `type: "tool_use"` — Tool/function calls (covered in Module 3)

Future models might support images or other content types. The array structure makes the API extensible without breaking changes.
</details>

---

### Question 8

What is the purpose of the `.env` file, and what are two important rules about it?

<details>
<summary>Sample Answer</summary>

The `.env` file stores environment variables like API keys in a simple `KEY=value` format. Two important rules:
1. **Never commit it to Git** — Add `.env` to `.gitignore` to prevent exposing secrets
2. **Keep it in your project root** — Most dotenv libraries automatically load from the project root, and it should never be nested or checked into version control

The file keeps secrets out of your code, making it safer to share your codebase.
</details>

---

## Part 3: Code Reading (2 questions)

### Question 9

What will this code print? Are there any issues?

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 5,
    messages: [{ role: "user", content: "Write a long essay about AI." }],
  });

  console.log(response.content[0].text);
}

main();
```

<details>
<summary>Answer</summary>

**Issues:**

1. **Missing `.catch()`**: The `main()` call should be `main().catch(console.error)` to handle async errors

2. **No type check**: Accessing `.text` directly without checking `content[0].type === "text"` is unsafe. TypeScript will complain; Python will crash if it's not text.

3. **`max_tokens: 5` is too low**: The prompt asks for a "long essay" but only allows ~4 words. The response will be cut off immediately, and `stop_reason` will be `"max_tokens"`.

**What it will print**: A fragment like "Artificial intelligence is" (depending on exact tokenization), then crash with a type error or print incomplete text.

**Fixed version:**
```typescript
async function main() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,  // More reasonable
    messages: [{ role: "user", content: "Write a short essay about AI." }],
  });

  const text = response.content[0];
  if (text.type === "text") {
    console.log(text.text);
  }
}

main().catch(console.error);
```
</details>

---

### Question 10

What's wrong with this code? How would you fix it?

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-ant-api03-mykey12345")

def main():
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[{"role": "user", "content": "Hello"}],
    )

    print(response.content[0].text)

main()
```

<details>
<summary>Answer</summary>

**Issues:**

1. **Hardcoded API key**: Never hardcode API keys in your source code. They'll be committed to Git and exposed. Use environment variables instead.

2. **No type check**: Accessing `.text` without checking `block.type == "text"` will crash if the response isn't text.

3. **No error handling**: Network errors, invalid keys, or rate limits will crash the program.

4. **Missing dotenv**: No attempt to load environment variables.

**Fixed version:**
```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()  # Reads from environment

def main():
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=256,
            messages=[{"role": "user", "content": "Hello"}],
        )

        block = response.content[0]
        if block.type == "text":
            print(block.text)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
```

And create a `.env` file:
```
ANTHROPIC_API_KEY=sk-ant-api03-mykey12345
```
</details>

---

## Bonus Question (Optional)

If you make 10,000 API calls with an average of 500 input tokens and 200 output tokens each, using `claude-sonnet-4-20250514` (input: $3/million tokens, output: $15/million tokens), what is the total cost?

<details>
<summary>Answer</summary>

**Calculation:**

Total input tokens: 10,000 × 500 = 5,000,000 tokens
Total output tokens: 10,000 × 200 = 2,000,000 tokens

Input cost: 5,000,000 × ($3 / 1,000,000) = $15
Output cost: 2,000,000 × ($15 / 1,000,000) = $30

**Total cost: $45**

This demonstrates why monitoring token usage is important for production applications!
</details>

---

## Answer Key Summary

### Multiple Choice
1. B — SDK is a library wrapper
2. C — API keys can be abused if exposed
3. C — 100 words ≈ 133 tokens
4. B — max_tokens means response was cut off
5. C — Haiku is fastest/cheapest

### Short Answer
6. Input = your request, output = Claude's response; output costs more due to sequential generation
7. Array allows multiple content blocks (text, tool_use, future types)
8. Stores secrets; never commit to Git, keep in project root

### Code Reading
9. Multiple issues: no error handling, no type check, max_tokens too low
10. Hardcoded API key, no type check, no error handling, missing dotenv

---

## Grading Rubric

| Section | Points | Criteria |
|---------|--------|----------|
| Multiple Choice | 20 | 4 points each (all or nothing) |
| Short Answer | 30 | 10 points each (understanding of concepts) |
| Code Reading | 50 | 25 points each (identifying issues + fixes) |
| **Total** | **100** | Pass: 70+, Excellent: 90+ |

---

## What to Study if You Struggled

- **Questions 1-2**: Review SDK and API key sections in tutorial
- **Question 3-4**: Review token section and stop_reason in handout
- **Question 5**: Review model comparison table
- **Questions 6-8**: Re-read tutorial sections on tokens, content blocks, and environment variables
- **Questions 9-10**: Practice writing code and review common mistakes section

After reviewing, retake the quiz. You should score 90+ before moving to Module 1.
