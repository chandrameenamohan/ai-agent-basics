/**
 * Module 1.1: Raw HTTP request to Claude API
 * No SDK — understand the wire format directly.
 */
import "dotenv/config";

const API_KEY = process.env.ANTHROPIC_API_KEY!;
const API_URL = "https://api.anthropic.com/v1/messages";

async function main() {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      { role: "user", content: "What is 2+2? Reply in one sentence." },
    ],
  };

  console.log("→ POST", API_URL);
  console.log("→ Body:", JSON.stringify(body, null, 2));

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log("\n← Status:", response.status);
  console.log("← Response:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
