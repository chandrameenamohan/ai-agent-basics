/**
 * Module 1.2: SDK multi-turn chatbot
 * Conversation = ever-growing messages array.
 */
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

    messages.push({ role: "user", content: input });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages,
    });

    const text = response.content[0];
    if (text.type === "text") {
      console.log(`\nClaude: ${text.text}\n`);
      messages.push({ role: "assistant", content: text.text });
    }

    console.log(`[${messages.length} messages, ${response.usage.input_tokens}+${response.usage.output_tokens} tokens]`);
  }

  rl.close();
}

main().catch(console.error);
