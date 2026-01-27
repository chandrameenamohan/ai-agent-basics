/**
 * Module 7: Scorecard report
 */
import type { EvalReport } from "./types.js";

export function printReport(report: EvalReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("EVAL SCORECARD");
  console.log(`Timestamp: ${report.timestamp}`);
  console.log("=".repeat(60));

  for (const task of report.tasks) {
    const passCount = task.trials.filter((t) => t.grade.passed).length;
    const k = task.trials.length;
    console.log(`\n  ${task.taskId}`);
    console.log(`    Pass rate:  ${passCount}/${k} (${(task.passRate * 100).toFixed(0)}%)`);
    console.log(`    pass@${k}:    ${(task.passAtK * 100).toFixed(1)}%`);
    console.log(`    pass^${k}:    ${(task.passExpK * 100).toFixed(1)}%`);
    console.log(`    Avg score:  ${task.avgScore.toFixed(2)}`);
    console.log(`    Avg turns:  ${task.avgTurns.toFixed(1)}`);

    // Failure analysis
    const failures = task.trials.filter((t) => !t.grade.passed);
    if (failures.length > 0) {
      console.log(`    Failures:`);
      for (const f of failures) {
        console.log(`      Trial ${f.trialIndex + 1}: ${f.grade.explanation.slice(0, 80)}`);
      }
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`  OVERALL pass rate: ${(report.overallPassRate * 100).toFixed(1)}%`);
  console.log(`  OVERALL pass@k:    ${(report.overallPassAtK * 100).toFixed(1)}%`);
  console.log("=".repeat(60));
}
