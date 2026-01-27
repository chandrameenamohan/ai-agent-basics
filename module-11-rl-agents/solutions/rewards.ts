/**
 * Module 11: Reward design
 * Structured rewards: outcome + step penalty + tool validity + progress shaping.
 */
import type { GradeResult } from "../../module-7-evals/solutions/types.js";

export interface TrajectoryStep {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
  wasValid: boolean; // Did the tool call succeed?
}

export interface RewardConfig {
  outcomeWeight: number;   // Weight for final task outcome (dominant)
  stepPenalty: number;      // Per-step cost (encourages efficiency)
  validToolBonus: number;   // Bonus for valid tool usage
  invalidToolPenalty: number; // Penalty for errors
  progressShaping: number;  // Intermediate progress signal
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  outcomeWeight: 1.0,
  stepPenalty: -0.02,
  validToolBonus: 0.01,
  invalidToolPenalty: -0.05,
  progressShaping: 0.1,
};

export interface EpisodeReward {
  total: number;
  outcome: number;
  efficiency: number;
  toolUse: number;
  breakdown: string;
}

/**
 * Compute trajectory-level (episodic) reward.
 * This is computed at the END of the episode to prevent reward hacking.
 */
export function computeReward(
  gradeResult: GradeResult,
  steps: TrajectoryStep[],
  config: RewardConfig = DEFAULT_REWARD_CONFIG
): EpisodeReward {
  // 1. Outcome reward (dominant signal)
  const outcome = gradeResult.score * config.outcomeWeight;

  // 2. Efficiency: penalty per step
  const efficiency = steps.length * config.stepPenalty;

  // 3. Tool use quality
  const validCalls = steps.filter((s) => s.wasValid).length;
  const invalidCalls = steps.filter((s) => !s.wasValid).length;
  const toolUse =
    validCalls * config.validToolBonus + invalidCalls * config.invalidToolPenalty;

  const total = outcome + efficiency + toolUse;

  return {
    total,
    outcome,
    efficiency,
    toolUse,
    breakdown: `outcome=${outcome.toFixed(3)} efficiency=${efficiency.toFixed(3)} toolUse=${toolUse.toFixed(3)}`,
  };
}
