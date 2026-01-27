# Module 11: RL Agents

## Goal
Frame agent training as reinforcement learning: build environments, rewards, trajectory collection, curriculum learning, and rule-based verification rewards.

## Concepts

### RL for agents — the 30-second version
```
┌─────────────┐    action     ┌─────────────────┐
│    Agent     │──────────────►│   Environment   │
│  (policy)    │◄──────────────│  (workspace +   │
│              │  observation  │   tools)         │
└─────────────┘    + reward    └─────────────────┘
```

- **Environment**: A sandboxed workspace with tools. `reset()` creates a fresh episode. `step()` executes one tool call.
- **Episode**: One attempt at one task, from start to completion.
- **Trajectory**: The full recording of an episode: every step, the grade, and the reward.
- **Reward**: A number that tells the training algorithm how good the episode was.
- **Policy**: The agent's behavior (the LLM + system prompt). RL changes this to maximize reward.

### Why episodic rewards, not per-step
If you reward each tool call individually, the agent learns to game individual steps (e.g., calling read-file repeatedly for the per-call reward). Episodic rewards — computed at the **end** of the episode based on the final outcome — prevent this. The outcome signal dominates; step-level signals are minor shaping.

### Reward design
Three components:
1. **Outcome** (weight 1.0): Did the task succeed? Score from the grader (0-1).
2. **Efficiency** (-0.02 per step): Fewer steps = better. Discourages verbosity.
3. **Tool quality** (+0.01 valid, -0.05 invalid): Reward clean tool usage, penalize errors.

The outcome signal is dominant. Efficiency and tool quality are gentle shaping signals.

### Curriculum learning
Start with easy tasks. When the agent consistently passes (≥80% pass rate), promote to harder tasks. This prevents wasting episodes on tasks the agent can't handle yet. Exponential moving average smooths noise — one lucky pass doesn't trigger promotion.

### RLVR (Rule-based Language Verification Rewards)
Your Module 7 graders **are** your reward functions. `stringMatchGrader` → deterministic, reproducible reward signal. `compositeGrader` → multi-objective reward. No model judge needed — just code that checks concrete outcomes.

## Build It

### Step 1: Build the environment

Create `module-11-rl-agents/environment.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Sandbox } from "../module-4-filesystem/sandbox.js";
import { createFileTools } from "../module-4-filesystem/tools.js";
import { createEditFileTool } from "../module-5-coding-agent/edit-file.js";
import { ToolRegistry } from "../module-3-tools/tool-registry.js";

export interface EnvironmentState {
  workspaceDir: string;
  sandbox: Sandbox;
  registry: ToolRegistry;
  step: number;
  maxSteps: number;
  done: boolean;
}

export interface EpisodeSetup {
  files: Record<string, string>;  // filename → content
  prompt: string;
}

export class AgentEnvironment {
  private state: EnvironmentState | null = null;

  // TODO: reset(setup) — create temp dir, write setup files, build tool registry, return state
  // TODO: step(toolName, input) — increment step, execute tool, check maxSteps, return result
  // TODO: cleanup() — rm -rf workspace, set state to null
  // TODO: getState() — return current state
}
```

### Step 2: Build the reward function

Create `module-11-rl-agents/rewards.ts`:

```typescript
import type { GradeResult } from "../module-7-evals/types.js";

export interface TrajectoryStep {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
  wasValid: boolean;
}

export interface RewardConfig {
  outcomeWeight: number;      // 1.0
  stepPenalty: number;         // -0.02
  validToolBonus: number;      // 0.01
  invalidToolPenalty: number;  // -0.05
  progressShaping: number;     // 0.1
}

// TODO: computeReward(gradeResult, steps, config) → EpisodeReward
//   outcome = score * outcomeWeight
//   efficiency = steps.length * stepPenalty
//   toolUse = validCalls * bonus + invalidCalls * penalty
//   total = outcome + efficiency + toolUse
```

### Step 3: Build trajectory collection

Create `module-11-rl-agents/trajectories.ts`:

```typescript
// TODO: collectTrajectory(env, setup, grader, rewardConfig?) → Trajectory
//   1. env.reset(setup)
//   2. Run agent loop, recording every step as TrajectoryStep
//   3. Grade the final workspace
//   4. Compute reward from grade + steps
//   5. env.cleanup()
//   6. Return { episodeId, prompt, steps, transcript, reward, success }
```

### Step 4: Build curriculum learning

Create `module-11-rl-agents/curriculum.ts`:

```typescript
export class Curriculum {
  // TODO: recordOutcome(success) — update EMA pass rate, check promotion threshold (0.8)
  // TODO: sampleTask() — random task from current tier
  // TODO: isComplete() — highest tier at promotion threshold
}
```

### Step 5: Build RLVR

Create `module-11-rl-agents/rlvr.ts`:

```typescript
// TODO: graderAsReward(grader, config?) — convert Module 7 grader to RL reward function
// TODO: compositeRLVR(graders[]) — combine multiple graders with weights
```

### Step 6: Build the training loop

Create `module-11-rl-agents/rl-training.ts`:

```typescript
// Define 3 curriculum tiers: Easy, Medium, Hard
// Each with EvalTask[] and promotionThreshold: 0.8

// TODO: Main loop:
//   for each episode:
//     sample task from curriculum
//     collect trajectory
//     record outcome for curriculum promotion
//     log reward breakdown
//   Save trajectories to rl-trajectories.jsonl
```

Run it: `bun module-11-rl-agents/rl-training.ts`

With custom episode count: `bun module-11-rl-agents/rl-training.ts 10`

## Exercises

1. **Design a bad reward function**: Create a reward that only measures "number of tool calls made" (more = better). Run 3 episodes. What does the agent learn to do? This is reward hacking.

2. **Fix the bad reward**: Now add the outcome signal (task success). Run 3 more episodes. How does behavior change?

3. **Watch curriculum promotion**: Set the promotion threshold to 0.5 (lower). Run 10 episodes. Does the agent promote faster? Is it ready for harder tasks?

4. **Compare reward breakdowns**: Run 5 episodes. For successful episodes, look at efficiency and tool quality scores. Which successful agent was most efficient? What did it do differently?

5. **Build your own curriculum tier**: Add a "Very Hard" tier with tasks that require multiple files and imports. Set promotionThreshold to 0.9. Can the agent ever reach it?

## Checkpoint

You've completed the course when you can answer:
- Why compute rewards at episode end instead of per-step?
- What are the three components of the reward function and why?
- How does curriculum learning prevent wasted training episodes?
- Why are deterministic graders (RLVR) better than model-based rewards for RL?
- How does the entire pipeline connect: agent → evals → self-improvement → fine-tuning → RL?

**By Module 9, you were using your agent on itself. By Module 11, you understand how to train it to be better. You're now a harness engineer.**

## Solutions
Compare your code against `solutions/` if you're stuck.
