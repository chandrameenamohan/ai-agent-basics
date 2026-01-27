/**
 * Module 10: DPO dataset builder
 * Build (prompt, preferred, dispreferred) pairs from eval results.
 */
import * as fs from "fs/promises";
import type { TraceRecord } from "./data-pipeline.js";

export interface DPOExample {
  prompt: string;
  chosen: string; // preferred (successful) completion
  rejected: string; // dispreferred (failed) completion
}

/** Build DPO pairs by matching successful vs failed trials for same task type */
export function buildDPODataset(traces: TraceRecord[]): DPOExample[] {
  // Group by task
  const byTask = new Map<string, TraceRecord[]>();
  for (const trace of traces) {
    const key = trace.task;
    if (!byTask.has(key)) byTask.set(key, []);
    byTask.get(key)!.push(trace);
  }

  const pairs: DPOExample[] = [];

  for (const [task, taskTraces] of byTask) {
    const successes = taskTraces.filter((t) => t.success);
    const failures = taskTraces.filter((t) => !t.success);

    // Pair each success with each failure
    for (const success of successes) {
      for (const failure of failures) {
        pairs.push({
          prompt: task,
          chosen: formatTrace(success),
          rejected: formatTrace(failure),
        });
      }
    }
  }

  console.log(`Built ${pairs.length} DPO pairs from ${traces.length} traces`);
  return pairs;
}

function formatTrace(trace: TraceRecord): string {
  return trace.transcript.turns
    .filter((t) => t.role === "assistant")
    .map((t) => {
      let content = t.content;
      if (t.toolCalls?.length) {
        content += "\n" + t.toolCalls.map((tc) => `[${tc.name}] ${tc.result.slice(0, 100)}`).join("\n");
      }
      return content;
    })
    .join("\n---\n");
}

export async function saveDPODataset(pairs: DPOExample[], outputPath: string): Promise<void> {
  const lines = pairs.map((p) => JSON.stringify(p)).join("\n");
  await fs.writeFile(outputPath, lines, "utf-8");
  console.log(`Saved ${pairs.length} DPO pairs to ${outputPath}`);
}
