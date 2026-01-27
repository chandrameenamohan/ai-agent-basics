/**
 * Module 7: Eval metrics
 * pass@k (≥1 success in k) vs pass^k (all k succeed)
 */
import type { Trial, TaskResult, EvalReport } from "./types.js";

export function computeTaskResult(taskId: string, trials: Trial[]): TaskResult {
  const k = trials.length;
  const passCount = trials.filter((t) => t.grade.passed).length;
  const passRate = passCount / k;

  // pass@k: probability that at least 1 of k trials passes
  // = 1 - (1 - passRate)^k
  const passAtK = k > 0 ? 1 - Math.pow(1 - passRate, k) : 0;

  // pass^k: probability that all k trials pass
  // = passRate^k
  const passExpK = k > 0 ? Math.pow(passRate, k) : 0;

  const avgScore = trials.reduce((sum, t) => sum + t.grade.score, 0) / k;
  const avgTurns = trials.reduce((sum, t) => sum + t.transcript.turns.length, 0) / k;

  return { taskId, trials, passRate, passAtK, passExpK, avgScore, avgTurns };
}

export function computeReport(taskResults: TaskResult[]): EvalReport {
  const overallPassRate =
    taskResults.reduce((sum, t) => sum + t.passRate, 0) / taskResults.length;
  const overallPassAtK =
    taskResults.reduce((sum, t) => sum + t.passAtK, 0) / taskResults.length;

  return {
    timestamp: new Date().toISOString(),
    tasks: taskResults,
    overallPassRate,
    overallPassAtK,
  };
}
