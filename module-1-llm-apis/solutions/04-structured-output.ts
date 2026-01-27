/**
 * Module 1.4: Structured output with Zod parsing
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic();

const MovieReview = z.object({
  title: z.string(),
  year: z.number(),
  rating: z.number().min(1).max(10),
  summary: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
});

type MovieReview = z.infer<typeof MovieReview>;

async function main() {
  const movie = process.argv[2] || "The Matrix";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Review the movie "${movie}". Respond with ONLY valid JSON matching this schema: { title: string, year: number, rating: number (1-10), summary: string, pros: string[], cons: string[] }`,
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Expected text response");

  const raw = JSON.parse(text.text);
  const review = MovieReview.parse(raw);

  console.log("Parsed review:");
  console.log(`  ${review.title} (${review.year}) — ${review.rating}/10`);
  console.log(`  ${review.summary}`);
  console.log(`  Pros: ${review.pros.join(", ")}`);
  console.log(`  Cons: ${review.cons.join(", ")}`);
}

main().catch(console.error);
