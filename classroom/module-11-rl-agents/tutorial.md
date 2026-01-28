# Module 11 Tutorial: RL Agents

## Introduction

Reinforcement Learning (RL) trains agents through trial and error with reward signals. Unlike supervised fine-tuning where you teach "do this", RL teaches "achieve this goal, however you can".

This module covers:
1. RL fundamentals adapted for LLM agents
2. Reward design for agent behaviors
3. Trajectory collection and replay
4. Curriculum learning for progressive difficulty
5. RLVR: Rule-based verification as rewards

## RL Fundamentals

### Core Concepts

**Environment**: The world the agent interacts with.
```typescript
interface AgentEnvironment {
  reset(setup: TaskSetup): Promise<State>;
  step(toolName: string, input: any): Promise<StepResult>;
  getState(): State;
  cleanup(): Promise<void>;
}
```

**Episode**: One complete task execution from start to finish.

**Trajectory**: Full sequence of observations, actions, and rewards in an episode.
```typescript
interface Trajectory {
  episodeId: string;
  task: string;
  steps: Step[];
  finalReward: number;
  outcome: "success" | "failure" | "timeout";
}

interface Step {
  observation: string;    // What the agent saw
  action: ToolCall;       // What the agent did
  result: string;         // What happened
  wasValid: boolean;      // Was the tool call valid?
}
```

**Policy**: The agent's strategy for choosing actions. For LLM agents, the policy is the model + prompt + tool schemas.

**Reward**: Numeric signal indicating how good an action/episode was.

### Key Differences from Traditional RL

1. **Sparse, episodic rewards**: No per-step rewards (prevents reward hacking). Reward only at episode end.
2. **Large action space**: Tools with arbitrary parameters, not discrete actions.
3. **Natural language observations**: Not numeric state vectors.
4. **Pre-trained policy**: Start with capable LLM, not random initialization.

## Reward Design

The reward function shapes agent behavior. Design carefully.

### Three-Component Reward

```typescript
interface RewardConfig {
  outcomeWeight: number;         // 1.0 - Task success/failure
  stepPenalty: number;           // -0.02 - Efficiency incentive
  validToolBonus: number;        // +0.01 - Correct tool usage
  invalidToolPenalty: number;    // -0.05 - Invalid tool attempts
}

interface EpisodeReward {
  total: number;
  outcome: number;      // Binary success × weight
  efficiency: number;   // Step count × penalty
  toolUse: number;      // Sum of tool bonuses/penalties
}

function computeReward(
  gradeResult: GradeResult,
  steps: Step[],
  config: RewardConfig
): EpisodeReward {
  const outcome = gradeResult.score * config.outcomeWeight;
  const efficiency = steps.length * config.stepPenalty;
  const toolUse = steps.reduce((sum, step) => {
    return sum + (step.wasValid
      ? config.validToolBonus
      : config.invalidToolPenalty);
  }, 0);

  return {
    total: outcome + efficiency + toolUse,
    outcome,
    efficiency,
    toolUse
  };
}
```

**Why these weights?**
- **Outcome (1.0)**: Dominant signal. Success matters most.
- **Step penalty (-0.02)**: Encourages efficient solutions. 50 steps = -1.0 total.
- **Tool bonus/penalty (+0.01/-0.05)**: Teaches proper tool usage. Asymmetric to discourage trial-and-error.

### Example Calculations

**Success in 5 steps, all valid tools:**
```
outcome = 1.0 × 1.0 = 1.0
efficiency = 5 × -0.02 = -0.1
toolUse = 5 × 0.01 = 0.05
total = 1.0 - 0.1 + 0.05 = 0.95
```

**Success in 20 steps, 2 invalid tools:**
```
outcome = 1.0 × 1.0 = 1.0
efficiency = 20 × -0.02 = -0.4
toolUse = 18 × 0.01 + 2 × -0.05 = 0.18 - 0.1 = 0.08
total = 1.0 - 0.4 + 0.08 = 0.68
```

**Failure in 10 steps:**
```
outcome = 0.0 × 1.0 = 0.0
efficiency = 10 × -0.02 = -0.2
toolUse = varies
total ≈ -0.2 (negative reward)
```

### Reward Design Principles

1. **Outcome-dominant**: Success/failure should matter most
2. **Smooth gradients**: Small improvements = small reward increases
3. **Avoid reward hacking**: Don't reward per-step, only episode-level
4. **Interpretable components**: Debug by examining breakdown
5. **Aligned with goals**: If you want efficiency, penalize steps

## Agent Environment

The environment provides a consistent interface for task execution:

```typescript
class FileSystemEnvironment implements AgentEnvironment {
  private workingDir: string;
  private taskDescription: string;
  private stepCount: number;
  private stepHistory: Step[];

  async reset(setup: TaskSetup): Promise<State> {
    this.workingDir = setup.workingDir;
    this.taskDescription = setup.task;
    this.stepCount = 0;
    this.stepHistory = [];

    // Setup initial state (create files, etc.)
    await this.setupTask(setup);

    return {
      task: this.taskDescription,
      workingDir: this.workingDir,
      stepCount: 0
    };
  }

  async step(toolName: string, input: any): Promise<StepResult> {
    this.stepCount++;

    const tool = this.getTool(toolName);
    if (!tool) {
      return {
        success: false,
        observation: `Unknown tool: ${toolName}`,
        wasValid: false,
        done: false
      };
    }

    try {
      const result = await tool.execute(input);
      const done = await this.checkTermination();

      this.stepHistory.push({
        observation: result,
        action: { name: toolName, input },
        result,
        wasValid: true
      });

      return {
        success: true,
        observation: result,
        wasValid: true,
        done
      };
    } catch (error) {
      this.stepHistory.push({
        observation: error.message,
        action: { name: toolName, input },
        result: error.message,
        wasValid: false
      });

      return {
        success: false,
        observation: error.message,
        wasValid: false,
        done: false
      };
    }
  }

  getState(): State {
    return {
      task: this.taskDescription,
      workingDir: this.workingDir,
      stepCount: this.stepCount
    };
  }

  async cleanup(): Promise<void> {
    // Remove temporary files, reset state
  }

  private async checkTermination(): Promise<boolean> {
    // Check if max steps reached or task clearly complete
    return this.stepCount >= 50;
  }
}
```

**Key design choices:**
- `reset()` sets up fresh task state (idempotent)
- `step()` executes one tool call, returns observation
- Invalid tools return `wasValid: false` (for reward calculation)
- `done` flag signals episode termination
- `cleanup()` ensures no state leaks between episodes

## Trajectory Collection

Collect full episode traces for analysis and training:

```typescript
interface TrajectoryCollector {
  startEpisode(task: string): void;
  recordStep(step: Step): void;
  endEpisode(reward: EpisodeReward, outcome: string): Trajectory;
}

class SimpleCollector implements TrajectoryCollector {
  private currentEpisode: Trajectory | null = null;

  startEpisode(task: string): void {
    this.currentEpisode = {
      episodeId: `episode-${Date.now()}`,
      task,
      steps: [],
      finalReward: 0,
      outcome: "in_progress"
    };
  }

  recordStep(step: Step): void {
    if (!this.currentEpisode) {
      throw new Error("No episode in progress");
    }
    this.currentEpisode.steps.push(step);
  }

  endEpisode(reward: EpisodeReward, outcome: string): Trajectory {
    if (!this.currentEpisode) {
      throw new Error("No episode in progress");
    }

    this.currentEpisode.finalReward = reward.total;
    this.currentEpisode.outcome = outcome;

    const trajectory = this.currentEpisode;
    this.currentEpisode = null;
    return trajectory;
  }
}
```

### Complete Episode Loop

```typescript
async function runEpisode(
  env: AgentEnvironment,
  agent: Agent,
  task: TaskSetup,
  collector: TrajectoryCollector
): Promise<Trajectory> {
  // Reset environment
  const state = await env.reset(task);
  collector.startEpisode(task.task);

  let done = false;
  while (!done) {
    // Agent selects action
    const action = await agent.selectAction(state);

    // Execute in environment
    const stepResult = await env.step(action.name, action.input);

    // Record step
    collector.recordStep({
      observation: stepResult.observation,
      action,
      result: stepResult.observation,
      wasValid: stepResult.wasValid
    });

    done = stepResult.done;
  }

  // Grade outcome
  const grade = await gradeTask(task, env.getState());

  // Compute reward
  const reward = computeReward(
    grade,
    collector.currentEpisode.steps,
    {
      outcomeWeight: 1.0,
      stepPenalty: -0.02,
      validToolBonus: 0.01,
      invalidToolPenalty: -0.05
    }
  );

  // Finalize trajectory
  const trajectory = collector.endEpisode(
    reward,
    grade.passed ? "success" : "failure"
  );

  await env.cleanup();
  return trajectory;
}
```

## Curriculum Learning

Start easy, gradually increase difficulty. Promotes stable learning.

### Three-Tier Curriculum

```typescript
interface CurriculumTier {
  name: string;
  tasks: TaskSetup[];
  requiredPassRate: number;  // To advance to next tier
}

class Curriculum {
  private tiers: CurriculumTier[];
  private currentTier: number;
  private emaPassRate: number;  // Exponential moving average
  private alpha: number;         // EMA smoothing (0.1)

  constructor(tiers: CurriculumTier[]) {
    this.tiers = tiers;
    this.currentTier = 0;
    this.emaPassRate = 0.0;
    this.alpha = 0.1;
  }

  getCurrentTier(): CurriculumTier {
    return this.tiers[this.currentTier];
  }

  sampleTask(): TaskSetup {
    const tier = this.getCurrentTier();
    const idx = Math.floor(Math.random() * tier.tasks.length);
    return tier.tasks[idx];
  }

  recordOutcome(success: boolean): void {
    // Update EMA: new = α × current + (1-α) × old
    this.emaPassRate = this.alpha * (success ? 1.0 : 0.0)
                     + (1 - this.alpha) * this.emaPassRate;

    // Check for tier advancement
    if (this.emaPassRate >= this.getCurrentTier().requiredPassRate) {
      if (this.currentTier < this.tiers.length - 1) {
        console.log(`Advancing from ${this.getCurrentTier().name} to ${this.tiers[this.currentTier + 1].name}`);
        this.currentTier++;
        this.emaPassRate = 0.0; // Reset for new tier
      }
    }
  }

  getProgress(): CurriculumProgress {
    return {
      currentTier: this.getCurrentTier().name,
      emaPassRate: this.emaPassRate,
      tierIndex: this.currentTier,
      totalTiers: this.tiers.length
    };
  }
}
```

### Example Curriculum Setup

```typescript
const curriculum = new Curriculum([
  {
    name: "Easy",
    requiredPassRate: 0.8,
    tasks: [
      { task: "Read file data.txt", workingDir: "/tmp/easy1" },
      { task: "List files in current directory", workingDir: "/tmp/easy2" },
      { task: "Write 'hello' to output.txt", workingDir: "/tmp/easy3" }
    ]
  },
  {
    name: "Medium",
    requiredPassRate: 0.8,
    tasks: [
      { task: "Find all .txt files and count lines", workingDir: "/tmp/med1" },
      { task: "Read config.json and extract 'port' field", workingDir: "/tmp/med2" },
      { task: "Copy all .csv files to backup/", workingDir: "/tmp/med3" }
    ]
  },
  {
    name: "Hard",
    requiredPassRate: 0.8,
    tasks: [
      { task: "Parse CSV, filter rows where amount > 1000, write results", workingDir: "/tmp/hard1" },
      { task: "Find broken symlinks and report their targets", workingDir: "/tmp/hard2" },
      { task: "Merge JSON files by 'id' field, resolve conflicts", workingDir: "/tmp/hard3" }
    ]
  }
]);

// Training loop
for (let episode = 0; episode < 1000; episode++) {
  const task = curriculum.sampleTask();
  const trajectory = await runEpisode(env, agent, task, collector);

  curriculum.recordOutcome(trajectory.outcome === "success");

  const progress = curriculum.getProgress();
  console.log(`Episode ${episode}: ${progress.currentTier} tier, EMA: ${progress.emaPassRate.toFixed(3)}`);
}
```

**Why EMA with α=0.1?**
- Smooths out noise from individual episodes
- Recent performance weighted higher than distant past
- α=0.1 means ~10 episodes to reach 63% of true value

## RLVR: Rule-Based Language Verification Rewards

Use deterministic graders as reward functions. More reliable than model-based rewards.

### Single Grader as Reward

```typescript
interface RLVRGrader {
  grade(state: State): Promise<GradeResult>;
  weight: number;
}

async function rlvrReward(
  state: State,
  graders: RLVRGrader[]
): Promise<number> {
  let totalReward = 0;

  for (const grader of graders) {
    const result = await grader.grade(state);
    totalReward += result.score * grader.weight;
  }

  return totalReward;
}
```

### Composite RLVR

Combine multiple graders for nuanced rewards:

```typescript
const compositeGraders: RLVRGrader[] = [
  {
    grade: async (state) => fileExistsGrader(state, "output.txt"),
    weight: 0.5
  },
  {
    grade: async (state) => contentMatchesGrader(state, "output.txt", /hello/),
    weight: 0.3
  },
  {
    grade: async (state) => noErrorFilesGrader(state),
    weight: 0.2
  }
];

const reward = await rlvrReward(state, compositeGraders);
```

**Benefits of RLVR:**
- Deterministic (no LLM variance)
- Fast to compute
- Interpretable (know exactly what's rewarded)
- Composable (mix multiple verification rules)

### Full Reward Computation with RLVR

```typescript
async function computeFullReward(
  graders: RLVRGrader[],
  steps: Step[],
  state: State,
  config: RewardConfig
): Promise<EpisodeReward> {
  // RLVR outcome score
  const outcomeScore = await rlvrReward(state, graders);

  // Efficiency and tool use
  const efficiency = steps.length * config.stepPenalty;
  const toolUse = steps.reduce((sum, step) =>
    sum + (step.wasValid ? config.validToolBonus : config.invalidToolPenalty), 0
  );

  return {
    total: outcomeScore + efficiency + toolUse,
    outcome: outcomeScore,
    efficiency,
    toolUse
  };
}
```

## Putting It All Together

```typescript
async function trainRLAgent(): Promise<void> {
  // Setup
  const env = new FileSystemEnvironment();
  const agent = new Agent(/* model, tools */);
  const collector = new SimpleCollector();
  const curriculum = new Curriculum(/* tiers */);

  const trajectories: Trajectory[] = [];

  // Training loop
  for (let episode = 0; episode < 1000; episode++) {
    const task = curriculum.sampleTask();
    const trajectory = await runEpisode(env, agent, task, collector);

    trajectories.push(trajectory);
    curriculum.recordOutcome(trajectory.outcome === "success");

    if (episode % 10 === 0) {
      const progress = curriculum.getProgress();
      const avgReward = trajectories.slice(-10).reduce((sum, t) => sum + t.finalReward, 0) / 10;
      console.log(`Episode ${episode}: ${progress.currentTier}, EMA: ${progress.emaPassRate.toFixed(3)}, Avg Reward: ${avgReward.toFixed(3)}`);
    }
  }

  // Save trajectories for analysis
  fs.writeFileSync("trajectories.jsonl", trajectories.map(t => JSON.stringify(t)).join("\n"));
}
```

## Summary

RL for LLM agents involves:
1. **Environment**: Structured task execution with reset/step/cleanup
2. **Rewards**: Outcome + efficiency + tool quality, computed at episode end
3. **Trajectories**: Full episode recordings for analysis
4. **Curriculum**: Progressive difficulty with EMA-based advancement
5. **RLVR**: Deterministic graders as reliable reward signals

This approach doesn't require policy gradient math. You collect trajectories with rewards, then use them for:
- Dataset filtering (keep high-reward episodes for SFT)
- Preference pairs (high-reward vs low-reward for DPO)
- Analysis (what behaviors lead to higher rewards?)

The real power is in reward design and curriculum structure. Get those right, and the data collection is straightforward.
