/**
 * Module 10: Training orchestrator
 * Orchestrates fine-tuning jobs (SFT, DPO).
 *
 * This module demonstrates the pipeline. Actual training requires
 * a Fireworks/OpenAI-compatible API endpoint.
 */
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { extractTraces, clusterTraces, stratifiedSample, saveTraces } from "./data-pipeline.js";
import { buildSFTDataset, saveSFTDataset } from "./sft-dataset.js";
import { buildDPODataset, saveDPODataset } from "./dpo-dataset.js";
import { routeIntent } from "./classifier.js";
import { CODING_AGENT_PROMPT } from "../../module-5-coding-agent/solutions/prompt.js";
import type { Trial } from "../../module-7-evals/solutions/types.js";

const OUTPUT_DIR = path.join(process.cwd(), "training-data");

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // In a real pipeline, load trials from eval results
  // For demonstration, we create synthetic trial data
  console.log("=== Module 10: Fine-Tuning Pipeline ===\n");

  console.log("Step 1: Loading eval traces...");
  // Load from eval report if available
  let trials: Trial[] = [];
  try {
    const reportPath = path.join(process.cwd(), "eval-report-cycle-1.json");
    const reportData = await fs.readFile(reportPath, "utf-8");
    const report = JSON.parse(reportData);
    trials = report.tasks.flatMap((t: { trials: Trial[] }) => t.trials);
    console.log(`  Loaded ${trials.length} trials from eval report`);
  } catch {
    console.log("  No eval report found. Run module-7 evals first to generate training data.");
    console.log("  Demonstrating pipeline with synthetic data...\n");

    // Create minimal synthetic data for demonstration
    trials = createSyntheticTrials();
  }

  // Step 2: Extract and cluster traces
  console.log("\nStep 2: Extracting and clustering traces...");
  const traces = extractTraces(trials);
  await saveTraces(traces, path.join(OUTPUT_DIR, "traces.jsonl"));

  const clusters = clusterTraces(traces);
  console.log(`  Found ${clusters.size} clusters`);

  const sampled = stratifiedSample(clusters);
  console.log(`  Sampled ${sampled.length} representative traces`);

  // Step 3: Build SFT dataset
  console.log("\nStep 3: Building SFT dataset...");
  const sftExamples = buildSFTDataset(traces, CODING_AGENT_PROMPT);
  await saveSFTDataset(sftExamples, path.join(OUTPUT_DIR, "sft-dataset.jsonl"));

  // Step 4: Build DPO dataset
  console.log("\nStep 4: Building DPO dataset...");
  const dpoPairs = buildDPODataset(traces);
  await saveDPODataset(dpoPairs, path.join(OUTPUT_DIR, "dpo-dataset.jsonl"));

  // Step 5: Demonstrate classifier
  console.log("\nStep 5: Intent classification demo...");
  const testTasks = [
    "Fix the null pointer bug in auth.ts",
    "Create a new config file for the database",
    "What does the login function do?",
  ];
  for (const task of testTasks) {
    const result = await routeIntent(task);
    console.log(`  "${task.slice(0, 50)}" → ${result.label} (${(result.confidence * 100).toFixed(0)}%)`);
  }

  console.log(`\n✓ Training data saved to ${OUTPUT_DIR}/`);
  console.log("  - traces.jsonl: Raw trace records");
  console.log("  - sft-dataset.jsonl: SFT training examples");
  console.log("  - dpo-dataset.jsonl: DPO preference pairs");
  console.log("\nTo fine-tune, upload these datasets to Fireworks AI or OpenAI.");
}

function createSyntheticTrials(): Trial[] {
  // Minimal synthetic data for pipeline demonstration
  return [
    {
      taskId: "rename-variable",
      trialIndex: 0,
      transcript: {
        task: "Rename variable x to count",
        turns: [
          { role: "user", content: "Rename variable x to count" },
          {
            role: "assistant",
            content: "I'll rename the variable.",
            toolCalls: [
              { name: "read-file", input: { path: "app.ts" }, result: "const x = 0;" },
              { name: "edit-file", input: { path: "app.ts", old_string: "x", new_string: "count" }, result: "Edited" },
            ],
          },
        ],
        totalTokens: 500,
        durationMs: 3000,
      },
      grade: { score: 1, passed: true, explanation: "Variable renamed correctly" },
    },
    {
      taskId: "rename-variable",
      trialIndex: 1,
      transcript: {
        task: "Rename variable x to count",
        turns: [
          { role: "user", content: "Rename variable x to count" },
          { role: "assistant", content: "Done.", toolCalls: [] },
        ],
        totalTokens: 200,
        durationMs: 1000,
      },
      grade: { score: 0, passed: false, explanation: "Did not actually edit the file" },
    },
  ];
}

main().catch(console.error);
