/**
 * Module 10: SFT dataset builder
 * Build (prompt, ideal_completion) pairs from successful agent traces.
 */
import * as fs from "fs/promises";
import type { TraceRecord } from "./data-pipeline.js";

export interface SFTExample {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

/** Convert successful traces to SFT training examples */
export function buildSFTDataset(traces: TraceRecord[], systemPrompt: string): SFTExample[] {
  const successes = traces.filter((t) => t.success);
  console.log(`Building SFT dataset from ${successes.length}/${traces.length} successful traces`);

  return successes.map((trace) => {
    // Build the conversation as it happened
    const messages: SFTExample["messages"] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: trace.task },
    ];

    // Add assistant turns with tool calls as structured content
    for (const turn of trace.transcript.turns) {
      if (turn.role === "assistant") {
        let content = turn.content;
        if (turn.toolCalls && turn.toolCalls.length > 0) {
          content +=
            "\n\n[Tool calls]\n" +
            turn.toolCalls
              .map((tc) => `${tc.name}(${JSON.stringify(tc.input).slice(0, 200)}) → ${tc.result.slice(0, 200)}`)
              .join("\n");
        }
        messages.push({ role: "assistant", content });
      }
    }

    return { messages };
  });
}

/** Save SFT dataset as JSONL (OpenAI/Fireworks format) */
export async function saveSFTDataset(examples: SFTExample[], outputPath: string): Promise<void> {
  const lines = examples.map((ex) => JSON.stringify(ex)).join("\n");
  await fs.writeFile(outputPath, lines, "utf-8");
  console.log(`Saved ${examples.length} SFT examples to ${outputPath}`);
}
