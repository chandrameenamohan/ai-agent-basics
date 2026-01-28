# Module 0: Setup (API Connection) — Lab Exercises

## Overview

In this lab, you'll go from zero to making your first API call to Claude. Each exercise builds on the previous one. Work through them in order.

**Time estimate**: 45-60 minutes

---

## Pre-Lab Setup

### 1. Get Your API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **Settings → API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-api03-`)
6. **Important**: You can only see the key once! Save it somewhere safe temporarily.

### 2. Choose Your Language

This course provides both TypeScript and Python examples. Pick one:

- **TypeScript**: Modern, type-safe, works with Node.js/Bun
- **Python**: Simpler syntax, great for data science backgrounds

You can switch later, but stick with one for now.

---

## Exercise 1: Install Dependencies

### TypeScript

Create a new directory and initialize:

```bash
mkdir module-0-practice
cd module-0-practice
npm init -y
```

Install dependencies:

```bash
npm install @anthropic-ai/sdk dotenv
npm install -D @types/node tsx
```

**Alternative (using Bun)**:
```bash
bun init
bun add @anthropic-ai/sdk dotenv
```

### Python

Create a new directory and virtual environment:

```bash
mkdir module-0-practice
cd module-0-practice
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install anthropic python-dotenv
```

**Checkpoint**: Run `npm list` (TypeScript) or `pip list` (Python) and verify the packages are installed.

---

## Exercise 2: Create Your `.env` File

1. In your project directory, create a file named `.env`:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api03-paste-your-actual-key-here
```

2. Create a `.gitignore` file:

```bash
# .gitignore
.env
node_modules/
venv/
__pycache__/
*.pyc
```

3. Verify the key is loaded:

**TypeScript** (`test-env.ts`):
```typescript
import "dotenv/config";

console.log("API Key loaded:", process.env.ANTHROPIC_API_KEY ? "✓" : "✗");
console.log("First 10 chars:", process.env.ANTHROPIC_API_KEY?.slice(0, 10));
```

Run: `npx tsx test-env.ts` or `bun test-env.ts`

**Python** (`test_env.py`):
```python
from dotenv import load_dotenv
import os

load_dotenv()

key = os.environ.get("ANTHROPIC_API_KEY")
print("API Key loaded:", "✓" if key else "✗")
print("First 10 chars:", key[:10] if key else "None")
```

Run: `python test_env.py`

**Expected output**:
```
API Key loaded: ✓
First 10 chars: sk-ant-api
```

**Troubleshooting**:
- If you see `✗`, check that `.env` exists and has the correct format
- No quotes around the key value in `.env`
- No spaces around the `=` sign

---

## Exercise 3: Your First API Call

Create a file called `verify.ts` (TypeScript) or `verify.py` (Python).

### TypeScript

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  console.log("Sending request to Claude...\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      { role: "user", content: "Say hello and confirm you're working. One sentence." }
    ],
  });

  const text = response.content[0];
  if (text.type === "text") {
    console.log("✓ API connected successfully");
    console.log("Response:", text.text);
    console.log("Model:", response.model);
    console.log("Usage:", response.usage);
  }
}

main().catch(console.error);
```

Run: `npx tsx verify.ts` or `bun verify.ts`

### Python

```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()

def main():
    print("Sending request to Claude...\n")

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[
            {"role": "user", "content": "Say hello and confirm you're working. One sentence."}
        ],
    )

    block = response.content[0]
    if block.type == "text":
        print("✓ API connected successfully")
        print("Response:", block.text)
        print("Model:", response.model)
        print("Usage:", response.usage)

if __name__ == "__main__":
    main()
```

Run: `python verify.py`

**Expected output**:
```
Sending request to Claude...

✓ API connected successfully
Response: Hello! I'm Claude, and I'm working perfectly.
Model: claude-sonnet-4-20250514
Usage: Usage(input_tokens=12, output_tokens=14)
```

**Success criteria**:
- No errors
- You see a response from Claude
- Token usage is displayed

---

## Exercise 4: Experiment with Parameters

Now that it works, let's understand each parameter. Modify your `verify` file for each experiment:

### Experiment A: Change `max_tokens`

Try these values and observe what happens:

```typescript
max_tokens: 10   // Very short
max_tokens: 50   // Short
max_tokens: 500  // Long
```

**Questions**:
1. What happens with `max_tokens: 10`?
2. Does the response get cut off?
3. Check `response.stop_reason` — what does it say?

### Experiment B: Different Models

Try each model and compare:

```typescript
model: "claude-haiku-4-20250514"   // Fastest
model: "claude-sonnet-4-20250514"  // Balanced
model: "claude-opus-4-5-20251101"  // Most capable
```

Use the same prompt for all three:
```
"Explain quantum computing in one sentence."
```

**Questions**:
1. Do you notice quality differences?
2. Which is fastest? (Time it!)
3. Compare token usage — which uses more output tokens?

### Experiment C: Complex Prompts

Try progressively harder tasks:

```typescript
// Simple
"What is 2+2?"

// Medium
"Explain the difference between a compiler and an interpreter."

// Complex
"Write a short poem about artificial intelligence that rhymes."
```

**Questions**:
1. How does `output_tokens` change?
2. Does the model always use the full `max_tokens` you give it?

---

## Exercise 5: Error Handling

Let's intentionally break things to understand error handling.

### Test 1: Invalid API Key

Temporarily change your `.env`:
```
ANTHROPIC_API_KEY=sk-ant-fake-key
```

Run your script. What error do you get?

### Test 2: Missing API Key

Remove the line from `.env` entirely. What happens?

### Test 3: Network Timeout

Add a timeout to test error handling:

**TypeScript**:
```typescript
const client = new Anthropic({
  timeout: 1, // 1ms - will definitely timeout
});
```

**Python**:
```python
client = anthropic.Anthropic(timeout=0.001)  # Will timeout
```

### Add Error Handling

Wrap your API call:

**TypeScript**:
```typescript
async function main() {
  try {
    const response = await client.messages.create({ ... });
    // ... process response
  } catch (error: any) {
    if (error.status === 401) {
      console.error("❌ Invalid API key");
    } else if (error.status === 429) {
      console.error("❌ Rate limit exceeded");
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}
```

**Python**:
```python
import anthropic

def main():
    try:
        response = client.messages.create(...)
        # ... process response
    except anthropic.AuthenticationError:
        print("❌ Invalid API key")
    except anthropic.RateLimitError:
        print("❌ Rate limit exceeded")
    except Exception as e:
        print(f"❌ Error: {e}")
```

**Task**: Test each error case and verify your error handling works.

---

## Exercise 6: Token Monitoring

Create a script that tracks token usage and estimates cost.

**TypeScript** (`monitor-tokens.ts`):
```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function askClaude(prompt: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const { input_tokens, output_tokens } = response.usage;
  const total = input_tokens + output_tokens;

  // Pricing for claude-sonnet-4-20250514
  const cost = (input_tokens * 3 + output_tokens * 15) / 1_000_000;

  console.log(`\nPrompt: ${prompt}`);
  console.log(`Tokens: ${input_tokens} in + ${output_tokens} out = ${total} total`);
  console.log(`Cost: $${cost.toFixed(6)}`);

  const text = response.content[0];
  if (text.type === "text") {
    console.log(`Response: ${text.text.slice(0, 100)}...`);
  }
}

async function main() {
  await askClaude("What is 2+2?");
  await askClaude("Explain quantum computing in detail.");
  await askClaude("Write a 500-word essay about AI ethics.");
}

main().catch(console.error);
```

**Questions**:
1. Which prompt uses the most tokens?
2. How much does each request cost?
3. If you made 1000 requests like the first one, what would it cost?

---

## Exercise 7: Build a Simple Q&A Bot

Create a script that asks Claude multiple questions in sequence (not a conversation, just separate requests).

**TypeScript** (`qa-bot.ts`):
```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const questions = [
  "What is the capital of France?",
  "Who wrote 1984?",
  "What is the speed of light?",
  "Explain photosynthesis in one sentence.",
];

async function main() {
  for (const question of questions) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: question }],
    });

    const text = response.content[0];
    if (text.type === "text") {
      console.log(`Q: ${question}`);
      console.log(`A: ${text.text}\n`);
    }
  }
}

main().catch(console.error);
```

**Python** (`qa_bot.py`):
```python
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()

questions = [
    "What is the capital of France?",
    "Who wrote 1984?",
    "What is the speed of light?",
    "Explain photosynthesis in one sentence.",
]

def main():
    for question in questions:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=256,
            messages=[{"role": "user", "content": question}],
        )

        block = response.content[0]
        if block.type == "text":
            print(f"Q: {question}")
            print(f"A: {block.text}\n")

if __name__ == "__main__":
    main()
```

**Extension**: Add error handling and token tracking to this bot.

---

## Challenge Exercise: Compare All Models

Create a script that sends the same prompt to all three Claude models and compares:
- Response quality (subjective)
- Token usage
- Speed (use timestamps)
- Estimated cost

**Starter code**:

```typescript
const models = [
  "claude-haiku-4-20250514",
  "claude-sonnet-4-20250514",
  "claude-opus-4-5-20251101",
];

for (const model of models) {
  const start = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: "user", content: "Explain machine learning." }],
  });
  const elapsed = Date.now() - start;

  // Print comparison data
}
```

---

## Lab Completion Checklist

You've completed this lab when you can:

- [ ] Successfully install dependencies
- [ ] Load API keys from `.env`
- [ ] Make a basic API call
- [ ] Extract and print the text response
- [ ] Read token usage statistics
- [ ] Handle errors gracefully
- [ ] Experiment with different models and parameters
- [ ] Calculate approximate costs
- [ ] Explain what each parameter does (`model`, `max_tokens`, `messages`)

---

## Common Issues & Solutions

### "Cannot find module @anthropic-ai/sdk"
**Solution**: Run `npm install @anthropic-ai/sdk` or `bun add @anthropic-ai/sdk`

### "ANTHROPIC_API_KEY is not set"
**Solution**: Check `.env` file exists, has correct format, and `dotenv/config` is imported

### "401 Unauthorized"
**Solution**: API key is invalid. Generate a new one from console.anthropic.com

### "429 Rate Limit"
**Solution**: You're making requests too fast. Add delays between calls or upgrade your plan.

### Response is always cut off
**Solution**: Increase `max_tokens`. Check `response.stop_reason`.

### TypeScript: "Property 'text' does not exist"
**Solution**: TypeScript knows `content[0]` could be different types. Use type guard:
```typescript
if (text.type === "text") {
  console.log(text.text);  // Now TypeScript knows it's text
}
```

---

## Next Steps

Once you've completed these exercises:

1. Review the tutorial and handout to deepen understanding
2. Take the quiz to test your knowledge
3. Start the homework assignment
4. Move on to **Module 1: LLM APIs** to learn about multi-turn conversations and streaming

Great work! You're now connected to Claude and ready to build agents.
