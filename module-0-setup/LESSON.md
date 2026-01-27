# Module 0: Setup

## Goal
Connect to the Claude API and verify everything works — your first API call.

## Concepts

### What is an API?
An **API** (Application Programming Interface) is a way for programs to talk to each other. The Claude API is an HTTP endpoint: you send a JSON request, you get a JSON response. There's no persistent connection, no session, no state on the server. Every request is independent.

### What is a token?
LLMs don't read characters — they read **tokens**. A token is roughly 4 characters or ¾ of a word. "Hello, world!" is about 4 tokens. You pay per token: input tokens (what you send) + output tokens (what Claude generates) = your bill.

### What is an API key?
An API key is a secret string that identifies you and authorizes your requests. You get one from https://console.anthropic.com. It goes in a `.env` file as `ANTHROPIC_API_KEY`. The `dotenv` package loads it into `process.env`. **Never commit this file to git.**

### The SDK
The `@anthropic-ai/sdk` package wraps the raw HTTP API. It handles authentication, retries, TypeScript types, and error handling. You create a client, and the client picks up `ANTHROPIC_API_KEY` from the environment automatically.

## Build It

### Step 1: Set up the project

If you haven't already:
```bash
npm install
```

Create a `.env` file in the project root:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 2: Write `verify.ts`

Create `module-0-setup/verify.ts`. Start with imports:

```typescript
import "dotenv/config";           // Loads .env into process.env
import Anthropic from "@anthropic-ai/sdk";

// TODO: Create an Anthropic client
// (Hint: the constructor takes no arguments — it reads the API key from process.env)
```

**Python:**
```python
from dotenv import load_dotenv
import anthropic

load_dotenv()
client = anthropic.Anthropic()

# TODO: Call client.messages.create() with model, max_tokens, messages
# TODO: Extract text from response.content[0] (check .type == "text")
# TODO: Print response text, response.model, and response.usage
```

Now write a `main()` function that:
1. Calls `client.messages.create()` with three required fields:
   - `model`: `"claude-sonnet-4-20250514"` (which model to use)
   - `max_tokens`: `256` (maximum response length in tokens)
   - `messages`: An array with one user message asking Claude to confirm it's working
2. Extracts the text from `response.content[0]` (check that `.type === "text"`)
3. Prints the response text, the model name (`response.model`), and usage stats (`response.usage`)

```typescript
async function main() {
  // TODO: Make the API call
  // TODO: Print the response, model, and usage
}

main().catch(console.error);
```

**Python:**
```python
def main():
    # TODO: Make the API call
    # TODO: Print the response, model, and usage
    pass

if __name__ == "__main__":
    main()
```

### Step 3: Run it

```bash
bun module-0-setup/verify.ts
```

Or for Python:
```bash
python module-0-setup/verify.py
```

You should see Claude's response and token usage stats. If you get an authentication error, check your `.env` file.

## Exercises

1. **Change the model**: Try `"claude-haiku-3-5-20241022"` instead of Sonnet. How does the response differ? Check the token usage — is it different?

2. **Change max_tokens**: Set `max_tokens: 10`. What happens to the response? Does it get cut off?

3. **Break it on purpose**: Remove or misspell the API key. What error do you get? Understanding error messages saves debugging time later.

4. **Inspect the response object**: Add `console.log(JSON.stringify(response, null, 2))` to see the full response structure. Notice that `content` is an array of blocks, not a plain string. This matters in Module 2 when tools are involved.

## Checkpoint

You're ready for Module 1 when you can answer:
- What three fields are required in every `messages.create()` call?
- What does `response.usage` tell you?
- Why is `content` an array instead of a string?

## Solutions
Compare your code against `solutions/verify.ts` if you're stuck.
