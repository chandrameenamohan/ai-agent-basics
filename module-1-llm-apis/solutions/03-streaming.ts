/**
 * Module 1.3: Streaming responses
 * Print tokens as they arrive.
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const prompt = process.argv[2] || "Write a haiku about programming.";
  console.log(`Prompt: ${prompt}\n`);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }

  const final = await stream.finalMessage();
  console.log(`\n\n[${final.usage.input_tokens}+${final.usage.output_tokens} tokens]`);
}

main().catch(console.error);
