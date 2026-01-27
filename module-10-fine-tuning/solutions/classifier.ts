/**
 * Module 10: LLM-as-classifier
 * Map classes to single tokens, use logprobs for confidence.
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface ClassificationResult {
  label: string;
  confidence: number;
}

/**
 * Classify text into one of the given categories.
 * Uses constrained generation (single token) for fast, consistent classification.
 */
export async function classify(
  text: string,
  categories: string[],
  context?: string
): Promise<ClassificationResult> {
  const categoryList = categories.map((c, i) => `${i}: ${c}`).join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16,
    messages: [
      {
        role: "user",
        content: `Classify the following text into exactly one category. Reply with ONLY the category number.

${context ? `Context: ${context}\n` : ""}Categories:
${categoryList}

Text: ${text}

Category number:`,
      },
    ],
  });

  const responseText = response.content[0];
  if (responseText.type !== "text") {
    return { label: categories[0], confidence: 0 };
  }

  const num = parseInt(responseText.text.trim());
  if (isNaN(num) || num < 0 || num >= categories.length) {
    return { label: categories[0], confidence: 0.5 };
  }

  // Confidence is approximated since Claude API doesn't expose logprobs directly
  // In a real pipeline with Fireworks/OpenAI, you'd use logprobs
  return { label: categories[num], confidence: 0.9 };
}

/**
 * Intent router: classify agent task into action categories
 */
export async function routeIntent(
  task: string
): Promise<ClassificationResult> {
  return classify(task, [
    "code_edit",      // Modify existing code
    "code_create",    // Create new files
    "code_debug",     // Find and fix bugs
    "code_refactor",  // Restructure without changing behavior
    "question",       // Answer a question (no code changes)
  ]);
}
