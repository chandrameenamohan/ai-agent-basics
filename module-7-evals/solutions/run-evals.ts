/**
 * Module 7: Run evaluations
 * npx tsx module-7-evals/run-evals.ts
 */
import "dotenv/config";
import { runEvals } from "./harness.js";
import { computeTaskResult, computeReport } from "./metrics.js";
import { printReport } from "./report.js";
import { codingTasks } from "./tasks/coding-tasks.js";

async function main() {
  const trialsPerTask = Number(process.argv[2]) || 3;
  console.log(`Running ${codingTasks.length} tasks × ${trialsPerTask} trials each\n`);

  const trials = await runEvals(codingTasks, trialsPerTask);

  // Compute results per task
  const taskResults = codingTasks.map((task) => {
    const taskTrials = trials.filter((t) => t.taskId === task.id);
    return computeTaskResult(task.id, taskTrials);
  });

  const report = computeReport(taskResults);
  printReport(report);
}

main().catch(console.error);
