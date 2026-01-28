# Module 0: Setup (API Connection) — Homework

## Assignment: Build a Language Learning Assistant

### Overview

Create a command-line tool that helps users practice a foreign language by:
1. Accepting a sentence in English
2. Translating it to a target language
3. Providing pronunciation hints
4. Tracking token usage and costs

This assignment tests your ability to make API calls, handle responses, process user input, and monitor usage.

**Time estimate**: 2-3 hours

---

## Requirements

### Core Functionality (70 points)

Your program must:

1. **Accept user input** (10 points)
   - Prompt for target language (e.g., "Spanish", "French", "Japanese")
   - Prompt for English sentence to translate
   - Continue until user types "quit"

2. **Call Claude API** (20 points)
   - Use `claude-sonnet-4-20250514` model
   - Send appropriate prompt for translation
   - Handle errors gracefully (invalid API key, network issues, rate limits)

3. **Display translation** (15 points)
   - Show original English sentence
   - Show translated text
   - Show pronunciation guide (romanization for non-Latin scripts)

4. **Track usage** (15 points)
   - Display tokens used per request
   - Display running total of tokens
   - Calculate and display total cost at end of session

5. **Code quality** (10 points)
   - Proper error handling
   - Type safety (TypeScript) or type hints (Python)
   - Clean, readable code with comments
   - Environment variable for API key (no hardcoding)

### Bonus Features (30 points)

Choose any combination:

- **Multi-model comparison** (10 points): Try the same translation with Haiku and Sonnet, show differences
- **Conversation mode** (10 points): Let user have a conversation in the target language
- **Save session** (10 points): Save all translations to a JSON file for later review
- **Grammar explanation** (10 points): Ask Claude to explain grammar points in the translation
- **Difficulty levels** (10 points): Offer simple/intermediate/advanced vocabulary

---

## Starter Code

### TypeScript

```typescript
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

interface UsageStats {
  totalInput: number;
  totalOutput: number;
  requestCount: number;
}

async function translate(
  text: string,
  targetLanguage: string
): Promise<{ translation: string; pronunciation: string; tokens: { input: number; output: number } }> {
  // TODO: Implement API call
  // Hint: Your prompt should ask for both translation and pronunciation
  throw new Error("Not implemented");
}

async function main() {
  console.log("🌍 Language Learning Assistant\n");

  const targetLanguage = await ask("Target language: ");
  const stats: UsageStats = { totalInput: 0, totalOutput: 0, requestCount: 0 };

  while (true) {
    const input = await ask("\nEnglish sentence (or 'quit'): ");
    if (input.toLowerCase() === "quit") break;

    try {
      // TODO: Call translate() and display results
      // TODO: Update stats
    } catch (error) {
      console.error("Error:", error);
    }
  }

  // TODO: Display final statistics and cost
  rl.close();
}

main().catch(console.error);
```

### Python

```python
from dotenv import load_dotenv
import anthropic
from typing import TypedDict

load_dotenv()

client = anthropic.Anthropic()


class UsageStats(TypedDict):
    total_input: int
    total_output: int
    request_count: int


def translate(text: str, target_language: str) -> dict:
    """Translate text to target language with pronunciation guide.

    Returns:
        {
            "translation": str,
            "pronunciation": str,
            "tokens": {"input": int, "output": int}
        }
    """
    # TODO: Implement API call
    # Hint: Your prompt should ask for both translation and pronunciation
    raise NotImplementedError("Not implemented")


def main():
    print("🌍 Language Learning Assistant\n")

    target_language = input("Target language: ")
    stats: UsageStats = {"total_input": 0, "total_output": 0, "request_count": 0}

    while True:
        text = input("\nEnglish sentence (or 'quit'): ")
        if text.lower() == "quit":
            break

        try:
            # TODO: Call translate() and display results
            # TODO: Update stats
            pass
        except Exception as e:
            print(f"Error: {e}")

    # TODO: Display final statistics and cost


if __name__ == "__main__":
    main()
```

---

## Example Interaction

```
🌍 Language Learning Assistant

Target language: Spanish

English sentence (or 'quit'): Hello, how are you?

Translation: Hola, ¿cómo estás?
Pronunciation: OH-lah, KOH-moh es-TAHS
Tokens: 15 input + 12 output = 27 total

English sentence (or 'quit'): I would like a coffee.

Translation: Me gustaría un café.
Pronunciation: meh goo-stah-REE-ah oon kah-FEH
Tokens: 18 input + 14 output = 32 total

English sentence (or 'quit'): quit

Session Summary:
- Requests: 2
- Total tokens: 59 (33 input + 26 output)
- Estimated cost: $0.000489

Thank you for practicing!
```

---

## Rubric

### Core Requirements (70 points)

| Criteria | Points | Description |
|----------|--------|-------------|
| User input handling | 10 | Prompts for language and sentences, exits on "quit" |
| API integration | 20 | Correct API calls, proper model usage |
| Response display | 15 | Shows translation and pronunciation clearly |
| Usage tracking | 15 | Tracks and displays tokens, calculates cost |
| Code quality | 10 | Error handling, no hardcoded keys, readable |

### Bonus Features (30 points)

| Feature | Points | Description |
|---------|--------|-------------|
| Multi-model comparison | 10 | Compares Haiku vs Sonnet |
| Conversation mode | 10 | Back-and-forth in target language |
| Session saving | 10 | Exports to JSON |
| Grammar explanation | 10 | Explains grammar points |
| Difficulty levels | 10 | Adjusts vocabulary complexity |

### Total: 100 points

**Grading scale**: A: 90+, B: 80-89, C: 70-79, Incomplete: <70

---

## Hints

### Hint 1: Crafting the Prompt

For good results, be specific:

```typescript
const prompt = `Translate the following English sentence to ${targetLanguage}:

"${text}"

Provide:
1. The translation
2. A pronunciation guide using English letters (romanization for non-Latin scripts)

Format your response as:
Translation: [the translation]
Pronunciation: [the pronunciation guide]`;
```

### Hint 2: Parsing the Response

You can parse structured text:

```typescript
const responseText = response.content[0].text;
const translationMatch = responseText.match(/Translation: (.+)/);
const pronunciationMatch = responseText.match(/Pronunciation: (.+)/);

const translation = translationMatch?.[1] || "Error parsing";
const pronunciation = pronunciationMatch?.[1] || "Error parsing";
```

Or use structured output (Module 1 preview):

```typescript
const prompt = `Translate "${text}" to ${targetLanguage}. Respond with ONLY valid JSON:
{
  "translation": "...",
  "pronunciation": "..."
}`;
```

Then `JSON.parse(response.content[0].text)`.

### Hint 3: Cost Calculation

For `claude-sonnet-4-20250514`:
```typescript
const inputCost = (inputTokens * 3) / 1_000_000;
const outputCost = (outputTokens * 15) / 1_000_000;
const totalCost = inputCost + outputCost;
```

### Hint 4: Error Handling Structure

```typescript
try {
  const response = await client.messages.create({ ... });
  // ... process
} catch (error: any) {
  if (error.status === 429) {
    console.error("Rate limit hit. Wait a moment and try again.");
  } else if (error.status === 401) {
    console.error("Invalid API key. Check your .env file.");
  } else {
    console.error("API error:", error.message);
  }
}
```

---

## Submission Checklist

Before submitting, verify:

- [ ] Code runs without errors
- [ ] API key is in `.env`, not hardcoded
- [ ] `.env` is in `.gitignore`
- [ ] All core requirements implemented
- [ ] At least one bonus feature (for full credit)
- [ ] Error handling works (test with invalid API key)
- [ ] Token tracking displays correctly
- [ ] Cost calculation is accurate
- [ ] Code is commented and readable
- [ ] README included with:
  - How to install dependencies
  - How to run the program
  - Which bonus features you implemented

---

## Extension Ideas (Not Graded)

After completing the assignment, try:

1. **Quiz mode**: Claude asks questions in target language, grades your answers
2. **Vocabulary builder**: Saves new words to a file, quizzes you later
3. **Speech integration**: Use text-to-speech for pronunciation
4. **Context awareness**: Remember previous translations in the session
5. **Multiple languages**: Practice two languages at once

---

## Common Mistakes to Avoid

1. **Not checking content type**: Always verify `content[0].type === "text"`
2. **Forgetting async/await**: API calls are asynchronous
3. **No error handling**: Network can fail, keys can be invalid
4. **Hardcoding the API key**: Use `.env` files
5. **Ignoring token limits**: Monitor usage to avoid surprises
6. **Not testing edge cases**: What if user enters empty string? Very long sentence?

---

## What You'll Learn

This assignment reinforces:

- Making API calls with proper authentication
- Handling asynchronous operations
- Processing structured and unstructured text responses
- Tracking usage and calculating costs
- Building interactive CLI applications
- Error handling and edge cases

These skills are foundational for the agent-building work in later modules.

---

## Questions?

If you're stuck:

1. Review the Module 0 tutorial and lab
2. Check the troubleshooting section in the handout
3. Test your API connection with the simple `verify.ts` example first
4. Use `console.log()` or `print()` liberally to debug
5. Check the response structure — `console.log(JSON.stringify(response, null, 2))`

Good luck! 🚀
