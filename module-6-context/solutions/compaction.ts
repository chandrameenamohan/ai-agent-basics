/**
 * Module 6: Context compaction
 * Summarize old turns when approaching token limit.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

// Rough token estimate: ~4 chars per token
function estimateTokens(messages: Message[]): number {
  return Math.ceil(JSON.stringify(messages).length / 4);
}

export async function compactHistory(
  messages: Message[],
  tokenLimit: number = 80000
): Promise<Message[]> {
  const estimated = estimateTokens(messages);
  if (estimated < tokenLimit) return messages;

  // Keep the first user message and the last 6 messages
  const first = messages[0];
  const recent = messages.slice(-6);
  const middle = messages.slice(1, -6);

  if (middle.length === 0) return messages;

  console.log(`[Compaction] ${estimated} estimated tokens > ${tokenLimit} limit`);
  console.log(`[Compaction] Summarizing ${middle.length} middle messages...`);

  const summaryResponse = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Summarize the following agent conversation history concisely. Focus on: what was accomplished, key decisions made, files modified, and current state.\n\n${JSON.stringify(middle)}`,
      },
    ],
  });

  const summaryText =
    summaryResponse.content[0].type === "text"
      ? summaryResponse.content[0].text
      : "(summary failed)";

  console.log(`[Compaction] Reduced to summary (${summaryText.length} chars)`);

  return [
    first,
    { role: "assistant", content: `[Previous conversation summary]\n${summaryText}` },
    ...recent,
  ];
}

export { estimateTokens };
