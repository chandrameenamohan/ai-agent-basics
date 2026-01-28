# Module 11 Handout: RL Agents

## Core Concepts

### RL Fundamentals

**Environment**: Task execution interface
```typescript
interface AgentEnvironment {
  reset(setup: TaskSetup): Promise<State>;
  step(toolName: string, input: any): Promise<StepResult>;
  getState(): State;
  cleanup(): Promise<void>;
}
```

**Episode**: One complete task from start to finish

**Trajectory**: Full sequence of steps in an episode
```typescript
interface Trajectory {
  episodeId: string;
  task: string;
  steps: Step[];
  finalReward: number;
  outcome: "success" | "failure" | "timeout";
}
```

**Step**: Single action and its result
```typescript
interface Step {
  observation: string;
  action: ToolCall;
  result: string;
  wasValid: boolean;
}
```

## Reward Design

### Three-Component Reward
```typescript
interface RewardConfig {
  outcomeWeight: number;         // 1.0
  stepPenalty: number;           // -0.02
  validToolBonus: number;        // +0.01
  invalidToolPenalty: number;    // -0.05
}

function computeReward(
  gradeResult: GradeResult,
  steps: Step[],
  config: RewardConfig
): EpisodeReward {
  const outcome = gradeResult.score * config.outcomeWeight;
  const efficiency = steps.length * config.stepPenalty;
  const toolUse = steps.reduce((sum, step) =>
    sum + (step.wasValid ? config.validToolBonus : config.invalidToolPenalty), 0
  );

  return {
    total: outcome + efficiency + toolUse,
    outcome,
    efficiency,
    toolUse
  };
}
```

### Design Principles
1. Outcome-dominant (success matters most)
2. Episodic only (no per-step rewards)
3. Smooth gradients
4. Avoid reward hacking
5. Interpretable components

## Agent Environment

```typescript
class FileSystemEnvironment implements AgentEnvironment {
  async reset(setup: TaskSetup): Promise<State> {
    // Initialize task state
    this.workingDir = setup.workingDir;
    this.taskDescription = setup.task;
    this.stepCount = 0;
    this.stepHistory = [];
    await this.setupTask(setup);
    return { task: setup.task, workingDir: setup.workingDir, stepCount: 0 };
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

      return { success: true, observation: result, wasValid: true, done };
    } catch (error) {
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
    // Clean up task artifacts
  }
}
```

## Trajectory Collection

```typescript
class TrajectoryCollector {
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
    this.currentEpisode!.steps.push(step);
  }

  endEpisode(reward: EpisodeReward, outcome: string): Trajectory {
    this.currentEpisode!.finalReward = reward.total;
    this.currentEpisode!.outcome = outcome;
    const trajectory = this.currentEpisode!;
    this.currentEpisode = null;
    return trajectory;
  }
}
```

### Episode Loop
```typescript
async function runEpisode(
  env: AgentEnvironment,
  agent: Agent,
  task: TaskSetup,
  collector: TrajectoryCollector
): Promise<Trajectory> {
  const state = await env.reset(task);
  collector.startEpisode(task.task);

  let done = false;
  while (!done) {
    const action = await agent.selectAction(state);
    const stepResult = await env.step(action.name, action.input);

    collector.recordStep({
      observation: stepResult.observation,
      action,
      result: stepResult.observation,
      wasValid: stepResult.wasValid
    });

    done = stepResult.done;
  }

  const grade = await gradeTask(task, env.getState());
  const reward = computeReward(grade, collector.currentEpisode.steps, config);
  const trajectory = collector.endEpisode(reward, grade.passed ? "success" : "failure");

  await env.cleanup();
  return trajectory;
}
```

## Curriculum Learning

```typescript
interface CurriculumTier {
  name: string;
  tasks: TaskSetup[];
  requiredPassRate: number;
}

class Curriculum {
  private tiers: CurriculumTier[];
  private currentTier: number = 0;
  private emaPassRate: number = 0.0;
  private alpha: number = 0.1;

  getCurrentTier(): CurriculumTier {
    return this.tiers[this.currentTier];
  }

  sampleTask(): TaskSetup {
    const tier = this.getCurrentTier();
    return tier.tasks[Math.floor(Math.random() * tier.tasks.length)];
  }

  recordOutcome(success: boolean): void {
    // Update EMA
    this.emaPassRate = this.alpha * (success ? 1.0 : 0.0)
                     + (1 - this.alpha) * this.emaPassRate;

    // Check advancement
    if (this.emaPassRate >= this.getCurrentTier().requiredPassRate) {
      if (this.currentTier < this.tiers.length - 1) {
        this.currentTier++;
        this.emaPassRate = 0.0;
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

### EMA Update Formula
```
new_ema = α × current_value + (1 - α) × old_ema
```
With α = 0.1, ~10 episodes to reach 63% of true value

### Advancement Logic
- Advance when EMA ≥ required pass rate (typically 0.8)
- Reset EMA to 0.0 for new tier
- Track progress per tier

## RLVR: Rule-Based Verification Rewards

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

### Composite RLVR Example
```typescript
const graders: RLVRGrader[] = [
  { grade: fileExistsGrader, weight: 0.5 },
  { grade: contentMatchesGrader, weight: 0.3 },
  { grade: noErrorsGrader, weight: 0.2 }
];

const outcomeScore = await rlvrReward(state, graders);
```

### Full Reward with RLVR
```typescript
async function computeFullReward(
  graders: RLVRGrader[],
  steps: Step[],
  state: State,
  config: RewardConfig
): Promise<EpisodeReward> {
  const outcomeScore = await rlvrReward(state, graders);
  const efficiency = steps.length * config.stepPenalty;
  const toolUse = steps.reduce((sum, s) =>
    sum + (s.wasValid ? config.validToolBonus : config.invalidToolPenalty), 0
  );

  return {
    total: outcomeScore + efficiency + toolUse,
    outcome: outcomeScore,
    efficiency,
    toolUse
  };
}
```

## Quick Reference

### Reward Weights
- Outcome: 1.0 (dominant)
- Step penalty: -0.02 (efficiency)
- Valid tool: +0.01 (encourage proper use)
- Invalid tool: -0.05 (discourage trial-and-error)

### Curriculum Parameters
- EMA alpha: 0.1 (smoothing factor)
- Required pass rate: 0.8 (80% to advance)
- Tiers: Easy → Medium → Hard

### Episode Flow
1. `env.reset(task)` - Initialize
2. Loop: `agent.selectAction()` → `env.step()` → record
3. Grade final state
4. Compute reward
5. `env.cleanup()`

### RLVR Benefits
- Deterministic (no LLM variance)
- Fast (rule-based)
- Interpretable (clear reward source)
- Composable (weighted combination)
