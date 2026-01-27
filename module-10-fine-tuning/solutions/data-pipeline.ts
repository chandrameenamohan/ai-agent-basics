/**
 * Module 10: Data pipeline
 * Turn production logs/eval traces into training datasets.
 */
import * as fs from "fs/promises";
import type { Trial, Transcript } from "../../module-7-evals/solutions/types.js";

export interface TraceRecord {
  id: string;
  task: string;
  success: boolean;
  turns: number;
  toolCalls: string[];
  transcript: Transcript;
}

/** Extract structured trace records from eval trials */
export function extractTraces(trials: Trial[]): TraceRecord[] {
  return trials.map((trial, i) => ({
    id: `trace-${i}`,
    task: trial.transcript.task,
    success: trial.grade.passed,
    turns: trial.transcript.turns.length,
    toolCalls: trial.transcript.turns
      .flatMap((t) => t.toolCalls || [])
      .map((tc) => tc.name),
    transcript: trial.transcript,
  }));
}

/** Simple embedding-free clustering by task similarity (keyword overlap) */
export function clusterTraces(traces: TraceRecord[]): Map<string, TraceRecord[]> {
  const clusters = new Map<string, TraceRecord[]>();
  for (const trace of traces) {
    // Simple clustering by task keywords
    const key = trace.task.split(" ").slice(0, 3).join(" ").toLowerCase();
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(trace);
  }
  return clusters;
}

/** Stratified sampling: pick representative traces from each cluster */
export function stratifiedSample(
  clusters: Map<string, TraceRecord[]>,
  samplesPerCluster: number = 5
): TraceRecord[] {
  const samples: TraceRecord[] = [];
  for (const [, traces] of clusters) {
    // Prioritize diverse outcomes (mix of success/failure)
    const successes = traces.filter((t) => t.success);
    const failures = traces.filter((t) => !t.success);
    const half = Math.ceil(samplesPerCluster / 2);
    samples.push(
      ...successes.slice(0, half),
      ...failures.slice(0, samplesPerCluster - Math.min(half, successes.length))
    );
  }
  return samples;
}

/** Save traces to JSONL file */
export async function saveTraces(traces: TraceRecord[], outputPath: string): Promise<void> {
  const lines = traces.map((t) => JSON.stringify(t)).join("\n");
  await fs.writeFile(outputPath, lines, "utf-8");
  console.log(`Saved ${traces.length} traces to ${outputPath}`);
}
