/**
 * Module 11: RL training loop
 * Generate trajectories → compute rewards → report.
 *
 * Full policy updates require an RL framework (e.g., TRL, OpenRLHF).
 * This module demonstrates the data collection and reward computation pipeline.
 */
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { AgentEnvironment } from "./environment.js";
import { collectTrajectory, type Trajectory } from "./trajectories.js";
import { Curriculum, type CurriculumTier } from "./curriculum.js";
import { graderAsReward, compositeRLVR } from "./rlvr.js";
import { stringMatchGrader, fileExistsGrader, compositeGrader } from "../../module-7-evals/solutions/graders/code-grader.js";
import type { EvalTask } from "../../module-7-evals/solutions/types.js";

// Define curriculum tiers
const easyTasks: EvalTask[] = [
  {
    id: "easy-create-file",
    description: "Create a simple file",
    prompt: "Create a file called hello.txt containing 'Hello, World!'",
    setup: async () => {},
    grader: compositeGrader([
      fileExistsGrader("hello.txt"),
      stringMatchGrader("hello.txt", "Hello, World!"),
    ]),
  },
  {
    id: "easy-edit-line",
    description: "Change one line in a file",
    prompt: "In greeting.ts, change the greeting from 'Hi' to 'Hello'.",
    setup: async (dir) => {
      await fs.writeFile(path.join(dir, "greeting.ts"), 'export const greeting = "Hi";\n');
    },
    grader: stringMatchGrader("greeting.ts", '"Hello"'),
  },
];

const mediumTasks: EvalTask[] = [
  {
    id: "medium-add-function",
    description: "Add a function to existing code",
    prompt: "Add an 'isEven' function to math.ts that returns true if a number is even.",
    setup: async (dir) => {
      await fs.writeFile(
        path.join(dir, "math.ts"),
        "export function add(a: number, b: number) { return a + b; }\n"
      );
    },
    grader: compositeGrader([
      stringMatchGrader("math.ts", "isEven"),
      stringMatchGrader("math.ts", "% 2"),
    ]),
  },
];

const hardTasks: EvalTask[] = [
  {
    id: "hard-fix-bug-and-test",
    description: "Fix a bug and verify the fix",
    prompt: "Fix the bug in sort.ts where the comparison is reversed, causing descending instead of ascending sort.",
    setup: async (dir) => {
      await fs.writeFile(
        path.join(dir, "sort.ts"),
        `export function sortNumbers(arr: number[]): number[] {
  return [...arr].sort((a, b) => b - a); // BUG: should be a - b
}
`
      );
    },
    grader: stringMatchGrader("sort.ts", "a - b"),
  },
];

const curriculumTiers: CurriculumTier[] = [
  { name: "Easy", difficulty: "easy", tasks: easyTasks, promotionThreshold: 0.8 },
  { name: "Medium", difficulty: "medium", tasks: mediumTasks, promotionThreshold: 0.8 },
  { name: "Hard", difficulty: "hard", tasks: hardTasks, promotionThreshold: 0.8 },
];

async function main() {
  const maxEpisodes = Number(process.argv[2]) || 6;
  console.log("=== Module 11: RL Training Loop ===\n");
  console.log(`Running ${maxEpisodes} episodes with curriculum learning\n`);

  const curriculum = new Curriculum(curriculumTiers);
  const env = new AgentEnvironment();
  const trajectories: Trajectory[] = [];

  for (let ep = 0; ep < maxEpisodes; ep++) {
    const tier = curriculum.getCurrentTier();
    const task = curriculum.sampleTask();

    console.log(`\nEpisode ${ep + 1}/${maxEpisodes} [${tier.name}] Task: ${task.id}`);

    try {
      const trajectory = await collectTrajectory(
        env,
        { files: {}, prompt: task.prompt },
        task.grader
      );

      // Note: we re-run setup inside collectTrajectory via the grader
      // In a real pipeline, environment.reset handles setup
      trajectories.push(trajectory);

      const { promoted, newTier } = curriculum.recordOutcome(trajectory.success);

      console.log(`  Result: ${trajectory.success ? "SUCCESS" : "FAIL"}`);
      console.log(`  Reward: ${trajectory.reward.total.toFixed(3)} (${trajectory.reward.breakdown})`);
      console.log(`  Steps: ${trajectory.steps.length}`);

      if (promoted) {
        console.log(`  🎉 Promoted to ${newTier}!`);
      }
    } catch (e) {
      console.error(`  Error: ${e instanceof Error ? e.message : String(e)}`);
      curriculum.recordOutcome(false);
    }
  }

  // Summary
  const state = curriculum.getState();
  console.log("\n" + "=".repeat(60));
  console.log("RL TRAINING SUMMARY");
  console.log("=".repeat(60));
  console.log(`Episodes: ${state.episodesCompleted}`);
  console.log(`Successes: ${state.totalSuccesses}`);
  console.log(`Current tier: ${curriculum.getCurrentTier().name}`);
  console.log(`Tier pass rates: ${state.tierPassRates.map((r) => (r * 100).toFixed(1) + "%").join(", ")}`);
  console.log(`Curriculum complete: ${curriculum.isComplete()}`);

  // Save trajectories
  const outputPath = path.join(process.cwd(), "rl-trajectories.jsonl");
  const lines = trajectories.map((t) => JSON.stringify({
    episodeId: t.episodeId,
    prompt: t.prompt,
    steps: t.steps.length,
    reward: t.reward.total,
    success: t.success,
  })).join("\n");
  await fs.writeFile(outputPath, lines, "utf-8");
  console.log(`\nTrajectories saved to ${outputPath}`);
}

main().catch(console.error);
