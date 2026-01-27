/**
 * Module 9: Bootstrap loop
 * eval → analyze → improve → re-eval → commit or revert
 */
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import { runEvals } from "../../module-7-evals/solutions/harness.js";
import { computeTaskResult, computeReport } from "../../module-7-evals/solutions/metrics.js";
import { printReport } from "../../module-7-evals/solutions/report.js";
import { codingTasks } from "../../module-7-evals/solutions/tasks/coding-tasks.js";
import { analyzeAndImprove, applyImprovements } from "./improve.js";
import type { EvalReport } from "../../module-7-evals/solutions/types.js";

const BASE_DIR = path.resolve(process.cwd());

async function runEvalCycle(trialsPerTask: number): Promise<EvalReport> {
  console.log("\n📊 Running evals...");
  const trials = await runEvals(codingTasks, trialsPerTask);
  const taskResults = codingTasks.map((task) =>
    computeTaskResult(task.id, trials.filter((t) => t.taskId === task.id))
  );
  return computeReport(taskResults);
}

function gitSnapshot(message: string): string | null {
  try {
    execSync("git add -A", { cwd: BASE_DIR });
    execSync(`git commit -m "${message}" --allow-empty`, { cwd: BASE_DIR });
    return execSync("git rev-parse HEAD", { cwd: BASE_DIR, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function gitRevert(commitHash: string): void {
  try {
    execSync(`git revert --no-commit ${commitHash}`, { cwd: BASE_DIR });
    execSync('git commit -m "Revert failed improvement"', { cwd: BASE_DIR });
  } catch {
    console.error("Failed to revert — manual cleanup may be needed");
  }
}

async function main() {
  const cycles = Number(process.argv[2]) || 3;
  const trialsPerTask = Number(process.argv[3]) || 2;

  console.log(`Bootstrap: ${cycles} cycles, ${trialsPerTask} trials per task`);
  console.log(`Base dir: ${BASE_DIR}\n`);

  let bestReport: EvalReport | null = null;
  let bestPassRate = 0;

  for (let cycle = 1; cycle <= cycles; cycle++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`CYCLE ${cycle}/${cycles}`);
    console.log("=".repeat(60));

    // 1. Run evals
    const report = await runEvalCycle(trialsPerTask);
    printReport(report);

    // Save report
    await fs.writeFile(
      path.join(BASE_DIR, `eval-report-cycle-${cycle}.json`),
      JSON.stringify(report, null, 2)
    );

    // 2. Check if improvement is needed
    if (report.overallPassRate >= 1.0) {
      console.log("\n🎉 100% pass rate — no improvement needed!");
      break;
    }

    if (report.overallPassRate > bestPassRate) {
      bestPassRate = report.overallPassRate;
      bestReport = report;
    }

    // 3. Analyze failures and propose improvements
    console.log("\n🔍 Analyzing failures...");
    const improvements = await analyzeAndImprove(report, BASE_DIR);

    if (improvements.length === 0) {
      console.log("No improvements proposed this cycle.");
      continue;
    }

    console.log(`\n📝 Proposed ${improvements.length} improvements:`);
    for (const imp of improvements) {
      console.log(`  - ${imp.description}`);
    }

    // 4. Apply improvements
    const beforeCommit = gitSnapshot(`Before cycle ${cycle} improvements`);
    await applyImprovements(improvements, BASE_DIR);
    const afterCommit = gitSnapshot(`Cycle ${cycle}: ${improvements.map((i) => i.description).join("; ")}`);

    // 5. Re-eval to check if improvements helped
    console.log("\n📊 Re-evaluating after improvements...");
    const newReport = await runEvalCycle(trialsPerTask);
    printReport(newReport);

    if (newReport.overallPassRate > report.overallPassRate) {
      console.log(`\n✅ Improvement! ${(report.overallPassRate * 100).toFixed(1)}% → ${(newReport.overallPassRate * 100).toFixed(1)}%`);
    } else {
      console.log(`\n❌ No improvement (${(newReport.overallPassRate * 100).toFixed(1)}% vs ${(report.overallPassRate * 100).toFixed(1)}%). Reverting...`);
      if (afterCommit) gitRevert(afterCommit);
    }
  }

  console.log("\n🏁 Bootstrap complete.");
  if (bestReport) {
    console.log(`Best pass rate achieved: ${(bestPassRate * 100).toFixed(1)}%`);
  }
}

main().catch(console.error);
