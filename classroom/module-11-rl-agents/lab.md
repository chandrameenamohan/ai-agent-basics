# Module 11 Lab: RL Agents

## Objective
Build a reinforcement learning environment for file management tasks with reward computation, trajectory collection, and curriculum learning.

## Setup

```bash
mkdir module-11-rl-agents
cd module-11-rl-agents
mkdir tasks
```

## Part 1: Agent Environment

Create `environment.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";

interface TaskSetup {
  task: string;
  workingDir: string;
  initialFiles?: Record<string, string>;
}

interface State {
  task: string;
  workingDir: string;
  stepCount: number;
}

interface StepResult {
  success: boolean;
  observation: string;
  wasValid: boolean;
  done: boolean;
}

interface Tool {
  name: string;
  execute(input: any): Promise<string>;
}

class FileSystemEnvironment {
  private workingDir: string = "";
  private taskDescription: string = "";
  private stepCount: number = 0;
  private maxSteps: number = 20;
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
    this.registerTools();
  }

  private registerTools(): void {
    this.tools.set("read_file", {
      name: "read_file",
      execute: async (input: { path: string }) => {
        const fullPath = path.join(this.workingDir, input.path);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`File not found: ${input.path}`);
        }
        return fs.readFileSync(fullPath, "utf-8");
      }
    });

    this.tools.set("write_file", {
      name: "write_file",
      execute: async (input: { path: string, content: string }) => {
        const fullPath = path.join(this.workingDir, input.path);
        fs.writeFileSync(fullPath, input.content);
        return `Wrote ${input.content.length} bytes to ${input.path}`;
      }
    });

    this.tools.set("list_files", {
      name: "list_files",
      execute: async (input: {}) => {
        const files = fs.readdirSync(this.workingDir);
        return files.join("\n");
      }
    });
  }

  async reset(setup: TaskSetup): Promise<State> {
    this.workingDir = setup.workingDir;
    this.taskDescription = setup.task;
    this.stepCount = 0;

    // Create working directory
    if (!fs.existsSync(this.workingDir)) {
      fs.mkdirSync(this.workingDir, { recursive: true });
    }

    // Create initial files
    if (setup.initialFiles) {
      for (const [filename, content] of Object.entries(setup.initialFiles)) {
        fs.writeFileSync(path.join(this.workingDir, filename), content);
      }
    }

    return {
      task: this.taskDescription,
      workingDir: this.workingDir,
      stepCount: 0
    };
  }

  async step(toolName: string, input: any): Promise<StepResult> {
    this.stepCount++;

    const tool = this.tools.get(toolName);
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
      const done = this.stepCount >= this.maxSteps;

      return {
        success: true,
        observation: result,
        wasValid: true,
        done
      };
    } catch (error) {
      return {
        success: false,
        observation: (error as Error).message,
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
    // Remove working directory
    if (fs.existsSync(this.workingDir)) {
      fs.rmSync(this.workingDir, { recursive: true, force: true });
    }
  }
}

// Test
const env = new FileSystemEnvironment();

(async () => {
  const state = await env.reset({
    task: "Read file data.txt",
    workingDir: "./tasks/test1",
    initialFiles: { "data.txt": "Hello World" }
  });

  console.log("Initial state:", state);

  const step1 = await env.step("list_files", {});
  console.log("Step 1:", step1);

  const step2 = await env.step("read_file", { path: "data.txt" });
  console.log("Step 2:", step2);

  const step3 = await env.step("invalid_tool", {});
  console.log("Step 3:", step3);

  await env.cleanup();
})();
```

Run it:
```bash
bun environment.ts
```

Expected output:
```
Initial state: { task: 'Read file data.txt', workingDir: './tasks/test1', stepCount: 0 }
Step 1: { success: true, observation: 'data.txt', wasValid: true, done: false }
Step 2: { success: true, observation: 'Hello World', wasValid: true, done: false }
Step 3: { success: false, observation: 'Unknown tool: invalid_tool', wasValid: false, done: false }
```

## Part 2: Reward Computation

Create `rewards.ts`:

```typescript
interface GradeResult {
  passed: boolean;
  score: number;
}

interface RewardConfig {
  outcomeWeight: number;
  stepPenalty: number;
  validToolBonus: number;
  invalidToolPenalty: number;
}

interface EpisodeReward {
  total: number;
  outcome: number;
  efficiency: number;
  toolUse: number;
}

interface Step {
  observation: string;
  action: { name: string; input: any };
  result: string;
  wasValid: boolean;
}

function computeReward(
  gradeResult: GradeResult,
  steps: Step[],
  config: RewardConfig
): EpisodeReward {
  const outcome = gradeResult.score * config.outcomeWeight;
  const efficiency = steps.length * config.stepPenalty;
  const toolUse = steps.reduce((sum, step) => {
    return sum + (step.wasValid ? config.validToolBonus : config.invalidToolPenalty);
  }, 0);

  return {
    total: outcome + efficiency + toolUse,
    outcome,
    efficiency,
    toolUse
  };
}

// Test cases
const config: RewardConfig = {
  outcomeWeight: 1.0,
  stepPenalty: -0.02,
  validToolBonus: 0.01,
  invalidToolPenalty: -0.05
};

// Case 1: Success in 5 steps, all valid
const reward1 = computeReward(
  { passed: true, score: 1.0 },
  Array(5).fill({ wasValid: true }),
  config
);
console.log("Success in 5 steps:", reward1);
console.log("Expected total: ~0.95");

// Case 2: Success in 20 steps, 2 invalid
const steps2 = [
  ...Array(18).fill({ wasValid: true }),
  ...Array(2).fill({ wasValid: false })
];
const reward2 = computeReward(
  { passed: true, score: 1.0 },
  steps2,
  config
);
console.log("\nSuccess in 20 steps (2 invalid):", reward2);
console.log("Expected total: ~0.68");

// Case 3: Failure in 10 steps
const reward3 = computeReward(
  { passed: false, score: 0.0 },
  Array(10).fill({ wasValid: true }),
  config
);
console.log("\nFailure in 10 steps:", reward3);
console.log("Expected total: ~-0.1");
```

Run it:
```bash
bun rewards.ts
```

## Part 3: Trajectory Collection

Create `trajectory.ts`:

```typescript
interface Trajectory {
  episodeId: string;
  task: string;
  steps: Step[];
  finalReward: number;
  outcome: "success" | "failure" | "timeout";
}

class TrajectoryCollector {
  private currentEpisode: Trajectory | null = null;

  startEpisode(task: string): void {
    this.currentEpisode = {
      episodeId: `episode-${Date.now()}-${Math.random()}`,
      task,
      steps: [],
      finalReward: 0,
      outcome: "success"
    };
  }

  recordStep(step: Step): void {
    if (!this.currentEpisode) {
      throw new Error("No episode in progress");
    }
    this.currentEpisode.steps.push(step);
  }

  endEpisode(reward: EpisodeReward, outcome: "success" | "failure" | "timeout"): Trajectory {
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

// Test
const collector = new TrajectoryCollector();

collector.startEpisode("Read file data.txt");
collector.recordStep({
  observation: "data.txt",
  action: { name: "list_files", input: {} },
  result: "data.txt",
  wasValid: true
});
collector.recordStep({
  observation: "Hello World",
  action: { name: "read_file", input: { path: "data.txt" } },
  result: "Hello World",
  wasValid: true
});

const trajectory = collector.endEpisode(
  { total: 0.96, outcome: 1.0, efficiency: -0.04, toolUse: 0.02 },
  "success"
);

console.log("Trajectory:", JSON.stringify(trajectory, null, 2));
```

## Part 4: Curriculum Learning

Create `curriculum.ts`:

```typescript
interface CurriculumTier {
  name: string;
  tasks: TaskSetup[];
  requiredPassRate: number;
}

interface CurriculumProgress {
  currentTier: string;
  emaPassRate: number;
  tierIndex: number;
  totalTiers: number;
}

class Curriculum {
  private tiers: CurriculumTier[];
  private currentTier: number;
  private emaPassRate: number;
  private alpha: number;

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
    // Update EMA
    this.emaPassRate = this.alpha * (success ? 1.0 : 0.0)
                     + (1 - this.alpha) * this.emaPassRate;

    // Check for advancement
    if (this.emaPassRate >= this.getCurrentTier().requiredPassRate) {
      if (this.currentTier < this.tiers.length - 1) {
        console.log(`\nAdvancing from ${this.getCurrentTier().name} to ${this.tiers[this.currentTier + 1].name}`);
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

// Test
const curriculum = new Curriculum([
  {
    name: "Easy",
    requiredPassRate: 0.8,
    tasks: [
      { task: "Read file data.txt", workingDir: "./tasks/easy1", initialFiles: { "data.txt": "test" } },
      { task: "List files", workingDir: "./tasks/easy2" }
    ]
  },
  {
    name: "Medium",
    requiredPassRate: 0.8,
    tasks: [
      { task: "Copy file to backup", workingDir: "./tasks/med1" }
    ]
  },
  {
    name: "Hard",
    requiredPassRate: 0.8,
    tasks: [
      { task: "Parse and filter CSV", workingDir: "./tasks/hard1" }
    ]
  }
]);

// Simulate training
console.log("Simulating curriculum progression:\n");
const outcomes = [
  true, true, false, true, true, true, true, true, true, true,  // 80% pass → advance
  false, true, false, true, true, true, true, true, true, true  // 70% pass → advance
];

for (let i = 0; i < outcomes.length; i++) {
  curriculum.recordOutcome(outcomes[i]);
  const progress = curriculum.getProgress();
  console.log(`Episode ${i + 1}: ${progress.currentTier} (EMA: ${progress.emaPassRate.toFixed(3)})`);
}
```

Run it:
```bash
bun curriculum.ts
```

## Part 5: RLVR Graders

Create `rlvr.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";

interface RLVRGrader {
  name: string;
  grade(state: State): Promise<GradeResult>;
  weight: number;
}

// File exists grader
function fileExistsGrader(filename: string, weight: number = 0.5): RLVRGrader {
  return {
    name: `file_exists_${filename}`,
    grade: async (state: State) => {
      const exists = fs.existsSync(path.join(state.workingDir, filename));
      return { passed: exists, score: exists ? 1.0 : 0.0 };
    },
    weight
  };
}

// Content matches grader
function contentMatchesGrader(
  filename: string,
  pattern: RegExp,
  weight: number = 0.3
): RLVRGrader {
  return {
    name: `content_matches_${filename}`,
    grade: async (state: State) => {
      const filepath = path.join(state.workingDir, filename);
      if (!fs.existsSync(filepath)) {
        return { passed: false, score: 0.0 };
      }
      const content = fs.readFileSync(filepath, "utf-8");
      const matches = pattern.test(content);
      return { passed: matches, score: matches ? 1.0 : 0.0 };
    },
    weight
  };
}

// No error files grader
function noErrorFilesGrader(weight: number = 0.2): RLVRGrader {
  return {
    name: "no_error_files",
    grade: async (state: State) => {
      const files = fs.readdirSync(state.workingDir);
      const errorFiles = files.filter(f => f.includes("error") || f.includes("err"));
      const passed = errorFiles.length === 0;
      return { passed, score: passed ? 1.0 : 0.0 };
    },
    weight
  };
}

// Composite RLVR
async function rlvrReward(state: State, graders: RLVRGrader[]): Promise<number> {
  let totalReward = 0;
  for (const grader of graders) {
    const result = await grader.grade(state);
    totalReward += result.score * grader.weight;
  }
  return totalReward;
}

// Test
const testState: State = {
  task: "Write hello to output.txt",
  workingDir: "./tasks/rlvr-test",
  stepCount: 2
};

// Setup test directory
fs.mkdirSync(testState.workingDir, { recursive: true });
fs.writeFileSync(path.join(testState.workingDir, "output.txt"), "hello world");

const graders: RLVRGrader[] = [
  fileExistsGrader("output.txt", 0.5),
  contentMatchesGrader("output.txt", /hello/, 0.3),
  noErrorFilesGrader(0.2)
];

(async () => {
  const reward = await rlvrReward(testState, graders);
  console.log("RLVR Reward:", reward);
  console.log("Expected: 1.0 (all graders pass)");

  // Cleanup
  fs.rmSync(testState.workingDir, { recursive: true, force: true });
})();
```

Run it:
```bash
bun rlvr.ts
```

## Part 6: Complete Episode Loop

Create `episode.ts` that combines all components:

```typescript
// Combine all previous imports and implementations

async function runEpisode(
  env: FileSystemEnvironment,
  task: TaskSetup,
  graders: RLVRGrader[],
  collector: TrajectoryCollector,
  config: RewardConfig
): Promise<Trajectory> {
  const state = await env.reset(task);
  collector.startEpisode(task.task);

  let done = false;
  const actions = [
    { name: "list_files", input: {} },
    { name: "read_file", input: { path: "data.txt" } }
  ];
  let actionIndex = 0;

  while (!done && actionIndex < actions.length) {
    const action = actions[actionIndex++];
    const stepResult = await env.step(action.name, action.input);

    collector.recordStep({
      observation: stepResult.observation,
      action,
      result: stepResult.observation,
      wasValid: stepResult.wasValid
    });

    done = stepResult.done;
  }

  // Grade with RLVR
  const outcomeScore = await rlvrReward(env.getState(), graders);
  const gradeResult: GradeResult = { passed: outcomeScore >= 0.8, score: outcomeScore };

  // Compute full reward
  const steps = collector.currentEpisode!.steps;
  const reward = computeReward(gradeResult, steps, config);

  // Finalize
  const outcome = gradeResult.passed ? "success" : "failure";
  const trajectory = collector.endEpisode(reward, outcome);

  await env.cleanup();
  return trajectory;
}

// Run test episode
(async () => {
  const env = new FileSystemEnvironment();
  const collector = new TrajectoryCollector();
  const config: RewardConfig = {
    outcomeWeight: 1.0,
    stepPenalty: -0.02,
    validToolBonus: 0.01,
    invalidToolPenalty: -0.05
  };

  const task: TaskSetup = {
    task: "Read file data.txt",
    workingDir: "./tasks/episode1",
    initialFiles: { "data.txt": "Hello World" }
  };

  const graders = [
    fileExistsGrader("data.txt", 1.0)
  ];

  const trajectory = await runEpisode(env, task, graders, collector, config);
  console.log("Trajectory:", JSON.stringify(trajectory, null, 2));
})();
```

## Challenge Exercises

1. **Adaptive Step Penalty**: Adjust step penalty based on task difficulty
2. **Tool Sequence Rewards**: Bonus for optimal tool sequences (e.g., list before read)
3. **Error Recovery Bonus**: Reward agents that recover from tool errors
4. **Multi-Objective RLVR**: Handle conflicting grader objectives (e.g., speed vs correctness)
5. **Curriculum Auto-Tuning**: Dynamically adjust required pass rates based on learning curve

## Deliverables

Submit:
1. All TypeScript files (`environment.ts`, `rewards.ts`, `trajectory.ts`, `curriculum.ts`, `rlvr.ts`, `episode.ts`)
2. `test-results.txt` showing output from running each file
3. Short writeup explaining one creative reward component you'd add for a specific task type
