import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [{ role: "user", content: "Say hello and confirm you're working. One sentence." }],
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
