/**
 * Module 11: RLVR — Rule-based Verification RL
 * Use programmatic graders (from Module 7) as reward functions.
 * This closes the loop between evals and RL training.
 */
import type { Grader, GradeResult, Transcript } from "../../module-7-evals/solutions/types.js";
import type { EpisodeReward, TrajectoryStep, RewardConfig } from "./rewards.js";
import { computeReward } from "./rewards.js";

/**
 * Convert a Module 7 grader into an RL reward function.
 * The grader's score (0-1) becomes the outcome component of the reward.
 */
export function graderAsReward(
  grader: Grader,
  config?: Partial<RewardConfig>
): (workspaceDir: string, transcript: Transcript, steps: TrajectoryStep[]) => Promise<EpisodeReward> {
  const rewardConfig: RewardConfig = {
    outcomeWeight: 1.0,
    stepPenalty: -0.02,
    validToolBonus: 0.01,
    invalidToolPenalty: -0.05,
    progressShaping: 0.1,
    ...config,
  };

  return async (workspaceDir, transcript, steps) => {
    const grade = await grader.grade(workspaceDir, transcript);
    return computeReward(grade, steps, rewardConfig);
  };
}

/**
 * Composite RLVR reward: combine multiple graders with weights.
 */
export function compositeRLVR(
  graders: { grader: Grader; weight: number }[]
): Grader {
  return {
    name: `rlvr-composite(${graders.map((g) => g.grader.name).join(", ")})`,
    grade: async (workspaceDir, transcript): Promise<GradeResult> => {
      const results = await Promise.all(
        graders.map(async ({ grader, weight }) => {
          const result = await grader.grade(workspaceDir, transcript);
          return { ...result, weight };
        })
      );

      const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
      const weightedScore = results.reduce((sum, r) => sum + r.score * r.weight, 0) / totalWeight;
      const explanations = results.map(
        (r) => `[${r.weight}x] ${r.passed ? "✓" : "✗"} ${r.explanation}`
      );

      return {
        score: weightedScore,
        passed: weightedScore >= 0.7,
        explanation: explanations.join("\n"),
      };
    },
  };
}
