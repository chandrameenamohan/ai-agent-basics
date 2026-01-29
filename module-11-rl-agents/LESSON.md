# Module 11: RL Infrastructure + In-Context Learning

## Goal
Build the infrastructure for reinforcement learning — environments, rewards, trajectories, curriculum — then make the agent **demonstrably improve** across episodes using Reflexion (in-context RL). Connect trajectories to the fine-tuning pipeline from Module 10.

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

### Reward design — with worked examples
Three components:
1. **Outcome** (weight 1.0): Did the task succeed? Score from the grader (0-1).
2. **Efficiency** (-0.02 per step): Fewer steps = better. Discourages verbosity.
3. **Tool quality** (+0.01 valid, -0.05 invalid): Reward clean tool usage, penalize errors.

The outcome signal is dominant. Efficiency and tool quality are gentle shaping signals.

**Example 1: A successful 10-step episode (all valid tool calls)**
```
outcome  = 1.0 × 1.0    =  1.000
efficiency = 10 × -0.02  = -0.200
toolUse  = 10 × 0.01     =  0.100
total    = 1.0 - 0.2 + 0.1 = 0.900
```
Strong positive reward. The agent succeeded efficiently.

**Example 2: A failed 50-step episode (5 invalid tool calls)**
```
outcome  = 0.0 × 1.0       =  0.000
efficiency = 50 × -0.02    = -1.000
toolUse  = 45 × 0.01 + 5 × -0.05 = 0.45 - 0.25 = 0.200
total    = 0.0 - 1.0 + 0.2 = -0.800
```
Negative reward. The agent wasted steps and still failed.

Notice: the outcome component alone separates success from failure. Efficiency and tool quality only matter at the margins.

### Reflexion — in-context RL
Traditional RL updates model weights. That requires infrastructure (TRL, OpenRLHF) and GPU time. But there's a simpler form of learning that works today: **Reflexion**.

The idea: after each episode, summarize what went right or wrong. Inject those summaries into the system prompt for the next episode. The agent's behavior changes — it avoids past mistakes and repeats successful strategies — without any weight updates.

This is "in-context RL": the context window is the memory, and prompt engineering is the policy update. It won't generalize beyond the context window, but it demonstrably improves performance within a session.

Reflexion gives you something concrete to observe: the agent getting better across episodes. Weight-based RL (Module 10's fine-tuning pipeline) gives you permanent improvement.

### Bridge to Module 10: trajectories are training data
The trajectories you collect here are exactly the data Module 10 needs:
- **Successful trajectories** (reward > threshold) → SFT training pairs (prompt → tool calls)
- **Paired trajectories** (same task, different outcomes) → DPO preference pairs (chosen vs rejected)

This module builds the collection pipeline. Module 10 consumes the output.

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

**Python:**
```python
import tempfile, shutil
from sandbox import Sandbox
from tools import create_file_tools
from tool_registry import ToolRegistry, Tool

class AgentEnvironment:
    def __init__(self):
        self.state = None
    # TODO: reset(setup) — tempfile.mkdtemp(), write files, build registry
    # TODO: step(tool_name, inp) — increment step, execute, check max_steps
    # TODO: cleanup() — shutil.rmtree()
```

### Step 2: Build the reward function

Create `module-11-rl-agents/rewards.ts`. This one is fully implemented — type it out to understand each component:

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
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  outcomeWeight: 1.0,
  stepPenalty: -0.02,
  validToolBonus: 0.01,
  invalidToolPenalty: -0.05,
};

export interface EpisodeReward {
  total: number;
  outcome: number;
  efficiency: number;
  toolUse: number;
  breakdown: string;
}

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
    validCalls * config.validToolBonus +
    invalidCalls * config.invalidToolPenalty;

  const total = outcome + efficiency + toolUse;

  return {
    total,
    outcome,
    efficiency,
    toolUse,
    breakdown: `outcome=${outcome.toFixed(3)} efficiency=${efficiency.toFixed(3)} toolUse=${toolUse.toFixed(3)}`,
  };
}
```

**Python:**
```python
from dataclasses import dataclass

@dataclass
class RewardConfig:
    outcome_weight: float = 1.0
    step_penalty: float = -0.02
    valid_tool_bonus: float = 0.01
    invalid_tool_penalty: float = -0.05

DEFAULT_REWARD_CONFIG = RewardConfig()

def compute_reward(grade_result, steps: list[dict], config: RewardConfig = None) -> dict:
    if config is None:
        config = DEFAULT_REWARD_CONFIG

    outcome = grade_result.score * config.outcome_weight
    efficiency = len(steps) * config.step_penalty

    valid_calls = sum(1 for s in steps if s.get("was_valid", True))
    invalid_calls = sum(1 for s in steps if not s.get("was_valid", True))
    tool_use = valid_calls * config.valid_tool_bonus + invalid_calls * config.invalid_tool_penalty

    total = outcome + efficiency + tool_use

    return {
        "total": total,
        "outcome": outcome,
        "efficiency": efficiency,
        "tool_use": tool_use,
        "breakdown": f"outcome={outcome:.3f} efficiency={efficiency:.3f} toolUse={tool_use:.3f}",
    }
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

**Python:**
```python
# TODO: collect_trajectory(env, setup, grader, reward_config=None):
#   1. env.reset(setup)
#   2. Run agent loop, recording steps
#   3. grade = grader.grade(workspace_dir, transcript)
#   4. reward = compute_reward(grade, steps)
#   5. env.cleanup()
#   6. Return dict with episode_id, prompt, steps, transcript, reward, success
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

**Python:**
```python
class Curriculum:
    def __init__(self, tiers):
        # TODO: Initialize state with current_tier, tier_pass_rates, etc.
    # TODO: record_outcome(success) — update EMA, check promotion (threshold 0.8)
    # TODO: sample_task() — random.choice from current tier
    # TODO: is_complete() — highest tier at threshold
```

### Step 5: Build RLVR

Create `module-11-rl-agents/rlvr.ts`:

```typescript
// TODO: graderAsReward(grader, config?) — convert Module 7 grader to RL reward function
// TODO: compositeRLVR(graders[]) — combine multiple graders with weights
```

**Python:**
```python
# TODO: grader_as_reward(grader, config=None) — wrap grader.grade() with compute_reward()
# TODO: composite_rlvr(graders) — combine multiple graders with weights
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

### Step 7: Add Reflexion — in-context learning

This is where the agent actually improves. Create `module-11-rl-agents/reflexion.ts`:

```typescript
export interface ReflexionMemory {
  successes: string[];   // summaries of what worked
  failures: string[];    // summaries of what went wrong
  maxEntries: number;    // keep memory bounded (e.g., 5)
}

export function createReflexionMemory(maxEntries = 5): ReflexionMemory {
  return { successes: [], failures: [], maxEntries };
}

// TODO: summarizeTrajectory(trajectory) → string
//   If success: "Task: {prompt}. Solved in {N} steps by: {tool sequence}."
//   If failure: "Task: {prompt}. Failed after {N} steps. Errors: {invalid tool calls}."

// TODO: updateMemory(memory, trajectory) → ReflexionMemory
//   Summarize the trajectory, push to successes or failures.
//   If over maxEntries, drop the oldest entry.

// TODO: buildReflexionPrompt(memory) → string
//   Return a string to inject into the system prompt:
//   "## Lessons from previous attempts\n### What worked:\n{successes}\n### What to avoid:\n{failures}"
//   Return "" if memory is empty.
```

**Python:**
```python
from dataclasses import dataclass, field

@dataclass
class ReflexionMemory:
    successes: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    max_entries: int = 5

# TODO: summarize_trajectory(trajectory) → str
# TODO: update_memory(memory, trajectory) → ReflexionMemory
# TODO: build_reflexion_prompt(memory) → str
```

Now modify your training loop (Step 6) to use Reflexion:

```typescript
// In your main loop:
const memory = createReflexionMemory();

for (let ep = 0; ep < maxEpisodes; ep++) {
  const reflexionPrompt = buildReflexionPrompt(memory);
  // Pass reflexionPrompt as additional system prompt context to collectTrajectory
  const trajectory = await collectTrajectory(env, setup, grader, config, reflexionPrompt);
  updateMemory(memory, trajectory);
  // ... rest of loop
}
```

### Step 8: Bridge to Module 10 — trajectories as training data

Create `module-11-rl-agents/trajectory-export.ts`:

```typescript
import type { Trajectory } from "./trajectories.js";

// TODO: trajectoriesToSFT(trajectories, minReward?) → SFTPair[]
//   Filter to successful trajectories (reward > minReward).
//   Return { prompt, completion } pairs where completion is the
//   sequence of tool calls the agent made.

// TODO: trajectoriesToDPO(trajectories) → DPOTriplet[]
//   Group trajectories by task ID.
//   For each task with both a success and failure, return:
//   { prompt, chosen: successTrajectory, rejected: failureTrajectory }
```

**Python:**
```python
# TODO: trajectories_to_sft(trajectories, min_reward=0.5) → list[dict]
# TODO: trajectories_to_dpo(trajectories) → list[dict]
```

This connects directly to Module 10's fine-tuning pipeline. The trajectories you collect here become the training data there.

## Exercises

1. **Compute reward by hand.** An episode takes 15 steps, 13 valid and 2 invalid tool calls, and scores 1.0 from the grader. Using the default config, compute the total reward on paper. Then verify with `computeReward`. (Answer: outcome=1.0, efficiency=-0.3, toolUse=0.03, total=0.73)

2. **Break the reward function.** Set `stepPenalty = -0.5` and run 3 episodes. What happens to the reward even on successful episodes? At what step count does a perfect success go negative? (Answer: step 2 — `1.0 + 2×(-0.5) + 2×0.01 = 0.02`, step 3 goes negative.)

3. **Watch Reflexion improve.** Implement Reflexion (Step 7) and run 15 episodes on Easy tasks. Log the Reflexion prompt each episode. Does the agent avoid mistakes it made in earlier episodes? Compare average reward for episodes 1-5 vs 11-15.

4. **Disable Reflexion as control.** Run 15 episodes without Reflexion (pass empty string instead of the reflexion prompt). Compare success rate to Exercise 3. The difference is the value of in-context learning.

5. **Trace trajectories to SFT format.** Implement `trajectoriesToSFT` (Step 8). Run 6 episodes, export successful ones. Open the output and verify each SFT pair has the prompt and the exact tool call sequence the agent used.

## Checkpoint

You've completed Module 11 when you can answer:
- Walk through the reward math for a 20-step episode with score 0.5 and 3 invalid calls. (outcome=0.5, efficiency=-0.4, toolUse=17×0.01+3×(-0.05)=0.02, total=0.12)
- How does Reflexion differ from fine-tuning? (Reflexion modifies the prompt — temporary, bounded by context. Fine-tuning modifies weights — permanent, generalizes.)
- How do trajectories from this module become training data for Module 10? (Filter by reward → SFT pairs. Group by task, pair success/failure → DPO triplets.)
- Why compute rewards at episode end instead of per-step?
- How does curriculum learning prevent wasted training episodes?
- Why are deterministic graders (RLVR) better than model-based rewards for RL?

**By Module 9, you were using your agent on itself. By Module 11, you understand how to build the RL infrastructure that trains it — and you've seen in-context learning work. You're now a harness engineer.**

## Solutions
Compare your code against `solutions/` if you're stuck.
