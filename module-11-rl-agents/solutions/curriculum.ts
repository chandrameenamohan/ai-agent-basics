/**
 * Module 11: Curriculum learning
 * Start easy, promote to harder tasks as agent improves.
 */
import type { EvalTask } from "../../module-7-evals/solutions/types.js";

export interface CurriculumTier {
  name: string;
  difficulty: "easy" | "medium" | "hard";
  tasks: EvalTask[];
  promotionThreshold: number; // Pass rate to advance
}

export interface CurriculumState {
  currentTier: number;
  tierPassRates: number[];
  episodesCompleted: number;
  totalSuccesses: number;
}

export class Curriculum {
  private tiers: CurriculumTier[];
  private state: CurriculumState;

  constructor(tiers: CurriculumTier[]) {
    this.tiers = tiers;
    this.state = {
      currentTier: 0,
      tierPassRates: tiers.map(() => 0),
      episodesCompleted: 0,
      totalSuccesses: 0,
    };
  }

  getCurrentTier(): CurriculumTier {
    return this.tiers[this.state.currentTier];
  }

  /** Record an episode outcome and check for promotion */
  recordOutcome(success: boolean): { promoted: boolean; newTier?: string } {
    this.state.episodesCompleted++;
    if (success) this.state.totalSuccesses++;

    // Update running pass rate (exponential moving average)
    const alpha = 0.1;
    const current = this.state.tierPassRates[this.state.currentTier];
    this.state.tierPassRates[this.state.currentTier] =
      current * (1 - alpha) + (success ? 1 : 0) * alpha;

    // Check promotion
    const tier = this.tiers[this.state.currentTier];
    const passRate = this.state.tierPassRates[this.state.currentTier];

    if (passRate >= tier.promotionThreshold && this.state.currentTier < this.tiers.length - 1) {
      this.state.currentTier++;
      const newTier = this.tiers[this.state.currentTier];
      return { promoted: true, newTier: newTier.name };
    }

    return { promoted: false };
  }

  /** Pick a random task from the current tier */
  sampleTask(): EvalTask {
    const tier = this.getCurrentTier();
    return tier.tasks[Math.floor(Math.random() * tier.tasks.length)];
  }

  getState(): CurriculumState {
    return { ...this.state };
  }

  isComplete(): boolean {
    return (
      this.state.currentTier === this.tiers.length - 1 &&
      this.state.tierPassRates[this.state.currentTier] >=
        this.tiers[this.state.currentTier].promotionThreshold
    );
  }
}
