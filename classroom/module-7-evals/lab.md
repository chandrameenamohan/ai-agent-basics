# Module 7: Evaluations - Lab Exercises

## Lab Overview

Build a complete evaluation framework for testing coding agents. You'll implement graders, run trials, and analyze results.

**Time estimate:** 3-4 hours

**Prerequisites:**
- Completed Module 6 (context engineering)
- Working coding agent with file tools
- Understanding of async/await and Promises

## Setup

Create lab directory:

```bash
mkdir module-7-evals
cd module-7-evals
```

Directory structure:
```
module-7-evals/
├── types.ts          # Interfaces
├── graders.ts        # Grader implementations
├── trial.ts          # Trial runner
├── stats.ts          # Statistics
├── tasks/            # Eval task definitions
│   ├── rename.ts
│   ├── add-function.ts
│   └── fix-bug.ts
├── suite.ts          # Eval suite runner
└── main.ts          # Entry point
```

## Exercise 1: Core Types (15 minutes)

### Goal
Define the evaluation framework types.

### Tasks

Create `types.ts`:

```typescript
export interface EvalTask {
  id: string;
  description: string;
  setup(): Promise<string>;
  prompt: string;
  grader: Grader;
}

export interface Grader {
  name: string;
  grade(workspace: string, transcript: Message[]): Promise<GradeResult>;
}

export interface GradeResult {
  score: number;
  passed: boolean;
  explanation: string;
}

export interface Trial {
  taskId: string;
  trialNumber: number;
  transcript: Message[];
  grade: GradeResult;
  durationMs: number;
}

export interface TrialStats {
  taskId: string;
  numTrials: number;
  passRate: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  avgDurationMs: number;
}

export interface Message {
  role: "user" | "assistant";
  content: any;
}
```

### Verification

- [ ] All interfaces defined
- [ ] Types compile without errors
- [ ] Imports work in other files

## Exercise 2: Deterministic Graders (45 minutes)

### Goal
Implement the four core deterministic graders.

### Tasks

Create `graders.ts` and implement:

**1. String Match Grader (10 min)**
```typescript
import * as fs from "fs/promises";
import * as path from "path";
import { Grader, GradeResult } from "./types";

export function stringMatchGrader(
  filePath: string,
  expectedContent: string
): Grader {
  return {
    name: "string-match",
    grade: async (workspace: string): Promise<GradeResult> => {
      // TODO: Read file
      // TODO: Check if content includes expectedContent
      // TODO: Return GradeResult
    }
  };
}
```

**2. File Exists Grader (10 min)**
```typescript
export function fileExistsGrader(filePath: string): Grader {
  return {
    name: "file-exists",
    grade: async (workspace: string): Promise<GradeResult> => {
      // TODO: Check if file exists (use fs.access)
      // TODO: Return GradeResult
    }
  };
}
```

**3. Regex Match Grader (15 min)**
```typescript
export function regexMatchGrader(
  filePath: string,
  pattern: RegExp,
  description: string
): Grader {
  return {
    name: "regex-match",
    grade: async (workspace: string): Promise<GradeResult> => {
      // TODO: Read file
      // TODO: Test pattern against content
      // TODO: Return GradeResult
    }
  };
}
```

**4. Shell Test Grader (10 min)**
```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export function shellTestGrader(
  command: string,
  description: string
): Grader {
  return {
    name: "shell-test",
    grade: async (workspace: string): Promise<GradeResult> => {
      // TODO: Execute command in workspace directory
      // TODO: Handle success/failure
      // TODO: Return GradeResult
    }
  };
}
```

### Test Each Grader

Create test files and verify:

```typescript
// Test string match
const workspace = "/tmp/test";
await fs.mkdir(workspace, { recursive: true });
await fs.writeFile(path.join(workspace, "test.txt"), "Hello, world!");

const grader = stringMatchGrader("test.txt", "Hello");
const result = await grader.grade(workspace, []);
console.log(result); // Should pass
```

### Verification

- [ ] String match grader works correctly
- [ ] File exists grader handles missing files
- [ ] Regex match grader works with patterns
- [ ] Shell test grader executes commands
- [ ] All graders return proper GradeResult format
- [ ] Errors handled gracefully

## Exercise 3: Composite Grader (20 minutes)

### Goal
Implement composite grader that combines multiple graders.

### Tasks

Add to `graders.ts`:

```typescript
export function compositeGrader(graders: Grader[]): Grader {
  return {
    name: "composite",
    grade: async (
      workspace: string,
      transcript: Message[]
    ): Promise<GradeResult> => {
      // TODO: Run all graders in parallel
      // TODO: Calculate average score
      // TODO: Check if all passed
      // TODO: Combine explanations
      // TODO: Return composite result
    }
  };
}
```

### Test Composite

```typescript
const grader = compositeGrader([
  fileExistsGrader("output.txt"),
  stringMatchGrader("output.txt", "Success"),
  regexMatchGrader("output.txt", /\d+/, "Contains number")
]);

// Should pass all three criteria
const result = await grader.grade(workspace, []);
```

### Verification

- [ ] Runs all sub-graders
- [ ] Computes average score correctly
- [ ] Passes only if ALL sub-graders pass
- [ ] Combines explanations clearly
- [ ] Handles sub-grader failures

## Exercise 4: Trial Runner (30 minutes)

### Goal
Implement isolated trial execution with workspace management.

### Tasks

Create `trial.ts`:

```typescript
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import { EvalTask, Trial } from "./types";

export async function createTrialWorkspace(): Promise<string> {
  // TODO: Create temporary directory
  // Use mkdtemp with tmpdir() and "eval-" prefix
}

export async function runTrial(
  task: EvalTask,
  trialNumber: number,
  agent: any // Your agent type
): Promise<Trial> {
  const startTime = Date.now();

  // TODO: 1. Setup workspace using task.setup()

  try {
    // TODO: 2. Run agent with task.prompt and workspace

    // TODO: 3. Grade the result

    // TODO: 4. Return Trial object

  } finally {
    // TODO: 5. Cleanup workspace
  }
}

export async function runTrials(
  task: EvalTask,
  agent: any,
  numTrials: number
): Promise<Trial[]> {
  const trials: Trial[] = [];

  // TODO: Run task numTrials times
  // TODO: Log progress
  // TODO: Collect all trials

  return trials;
}
```

### Test Trial Runner

Create a simple mock agent:

```typescript
const mockAgent = {
  run: async (prompt: string, workspace: string) => {
    // Mock agent that creates a file
    await fs.writeFile(
      path.join(workspace, "output.txt"),
      "Test output"
    );
    return [
      { role: "user", content: prompt },
      { role: "assistant", content: "Done" }
    ];
  }
};

// Test with simple task
const task: EvalTask = {
  id: "test",
  description: "Test task",
  setup: async () => await createTrialWorkspace(),
  prompt: "Create output.txt",
  grader: fileExistsGrader("output.txt")
};

const trials = await runTrials(task, mockAgent, 3);
console.log(trials);
```

### Verification

- [ ] Workspace created for each trial
- [ ] Agent executes in correct workspace
- [ ] Grader runs after agent completes
- [ ] Workspace cleaned up (check /tmp)
- [ ] Trial object has all fields
- [ ] Multiple trials run independently
- [ ] Duration tracked correctly

## Exercise 5: Statistics (20 minutes)

### Goal
Compute statistics from trial results.

### Tasks

Create `stats.ts`:

```typescript
import { Trial, TrialStats } from "./types";

export function computeStats(trials: Trial[]): TrialStats {
  // TODO: Calculate pass rate
  // TODO: Calculate avg/min/max scores
  // TODO: Calculate avg duration
  // TODO: Return TrialStats
}

export function passAtK(passRate: number, k: number): number {
  // TODO: Implement: 1 - (1 - p)^k
}

export function passAllK(passRate: number, k: number): number {
  // TODO: Implement: p^k
}

export function formatStats(stats: TrialStats): string {
  // TODO: Format stats as readable string
  // Include: pass rate, avg score, pass@3, pass@5, duration
}
```

### Test Statistics

```typescript
// Create mock trials
const trials: Trial[] = [
  {
    taskId: "test",
    trialNumber: 0,
    transcript: [],
    grade: { score: 1.0, passed: true, explanation: "" },
    durationMs: 1000
  },
  {
    taskId: "test",
    trialNumber: 1,
    transcript: [],
    grade: { score: 1.0, passed: true, explanation: "" },
    durationMs: 1200
  },
  {
    taskId: "test",
    trialNumber: 2,
    transcript: [],
    grade: { score: 0.0, passed: false, explanation: "" },
    durationMs: 800
  }
];

const stats = computeStats(trials);
console.log(formatStats(stats));

// Test pass@k
console.log(`pass@3: ${passAtK(stats.passRate, 3)}`);
```

### Verification

- [ ] Pass rate calculated correctly (2/3 = 0.667)
- [ ] Average score correct ((1 + 1 + 0) / 3 = 0.667)
- [ ] Min/max scores correct
- [ ] Average duration correct
- [ ] pass@k formula correct
- [ ] Formatted output readable

## Exercise 6: Eval Tasks (45 minutes)

### Goal
Create three complete eval tasks.

### Tasks

**Task 1: Rename Variable (15 min)**

Create `tasks/rename.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import { EvalTask } from "../types";
import { compositeGrader, stringMatchGrader, regexMatchGrader } from "../graders";
import { createTrialWorkspace } from "../trial";

export const renameVariableTask: EvalTask = {
  id: "rename-variable",
  description: "Rename a variable throughout a file",

  setup: async () => {
    const workspace = await createTrialWorkspace();

    // TODO: Create a TypeScript file with a variable used multiple times
    // Example: function with 'result' variable used 3 times

    return workspace;
  },

  prompt: "Rename the variable 'result' to 'output' in code.ts",

  grader: compositeGrader([
    // TODO: Check for new variable name
    // TODO: Check that old name is gone
    // TODO: Verify code still valid
  ])
};
```

**Task 2: Add Function (15 min)**

Create `tasks/add-function.ts`:

```typescript
export const addFunctionTask: EvalTask = {
  id: "add-function",
  description: "Add a new function to an existing file",

  setup: async () => {
    // TODO: Create file with one existing function
    // TODO: Agent should add a second function
  },

  prompt: "Add a function 'double(x: number): number' that returns x * 2 to math.ts",

  grader: compositeGrader([
    // TODO: Check function exists
    // TODO: Check function name and signature
    // TODO: Verify TypeScript compiles
  ])
};
```

**Task 3: Fix Bug (15 min)**

Create `tasks/fix-bug.ts`:

```typescript
export const fixBugTask: EvalTask = {
  id: "fix-bug",
  description: "Fix an off-by-one error",

  setup: async () => {
    const workspace = await createTrialWorkspace();

    // TODO: Create buggy.ts with off-by-one error
    // TODO: Create test.ts that verifies fix

    return workspace;
  },

  prompt: "Fix the bug in buggy.ts so that test.ts passes when run",

  grader: shellTestGrader("npx tsx test.ts", "Run test")
};
```

### Verification

- [ ] Each task has complete setup
- [ ] Setup creates necessary files
- [ ] Prompts are clear and specific
- [ ] Graders check correct criteria
- [ ] Tasks are isolated (independent)

## Exercise 7: Eval Suite (30 minutes)

### Goal
Create a suite runner that executes all tasks and reports results.

### Tasks

Create `suite.ts`:

```typescript
import { EvalTask, TrialStats } from "./types";
import { runTrials } from "./trial";
import { computeStats, formatStats, passAtK } from "./stats";

export async function runEvalSuite(
  tasks: EvalTask[],
  agent: any,
  trialsPerTask: number = 5
): Promise<TrialStats[]> {
  console.log(`Running eval suite with ${tasks.length} tasks, ${trialsPerTask} trials each\n`);

  const allStats: TrialStats[] = [];

  // TODO: For each task:
  //   1. Print task info
  //   2. Run trials
  //   3. Compute stats
  //   4. Print results
  //   5. Add to allStats

  // TODO: Print overall summary

  return allStats;
}

export function printSummary(allStats: TrialStats[]): void {
  // TODO: Calculate and print:
  //   - Overall pass rate
  //   - pass@3 and pass@5 averages
  //   - Best and worst performing tasks
  //   - Total duration
}
```

### Test Suite

Create `main.ts`:

```typescript
import { runEvalSuite } from "./suite";
import { renameVariableTask } from "./tasks/rename";
import { addFunctionTask } from "./tasks/add-function";
import { fixBugTask } from "./tasks/fix-bug";

const tasks = [
  renameVariableTask,
  addFunctionTask,
  fixBugTask
];

// Use your actual agent from Module 6
const agent = createMyAgent();

const stats = await runEvalSuite(tasks, agent, 5);
```

### Verification

- [ ] Suite runs all tasks
- [ ] Progress logged clearly
- [ ] Stats printed for each task
- [ ] Overall summary printed
- [ ] All trials complete
- [ ] Results saved (optional)

## Exercise 8: Integration Test (30 minutes)

### Goal
Run complete eval suite with real agent and analyze results.

### Tasks

1. **Use your Module 6 agent:**

Integrate your context-managed agent from Module 6.

2. **Run the suite:**

```bash
npx tsx main.ts
```

3. **Analyze results:**

For each task:
- What was the pass rate?
- Did any tasks fail completely?
- What does pass@3 tell you?
- Were failures consistent or random?

4. **Investigate failures:**

Pick one failed trial:
- Read the transcript
- Check what the agent did
- Identify why grading failed
- Was it the agent or the grader?

5. **Document findings:**

Create `FINDINGS.md`:
- Summary of results
- Analysis of failures
- Ideas for improvement
- Questions raised

### Verification

- [ ] Suite completes successfully
- [ ] At least one task has >80% pass rate
- [ ] Failures analyzed
- [ ] Findings documented

## Bonus Exercise 1: Model-Based Grader (30 minutes)

### Goal
Implement a rubric grader using an LLM.

### Tasks

Add to `graders.ts`:

```typescript
export function rubricGrader(
  filePath: string,
  criteria: string[]
): Grader {
  return {
    name: "rubric",
    grade: async (workspace: string): Promise<GradeResult> => {
      // TODO: Read file content

      // TODO: Create grading prompt with criteria

      // TODO: Call Claude to grade

      // TODO: Parse response for score

      // TODO: Return GradeResult
    }
  };
}
```

Test with code quality task:

```typescript
const task: EvalTask = {
  id: "code-quality",
  setup: async () => { /* create sample code */ },
  prompt: "Refactor this code for better readability",
  grader: rubricGrader("code.ts", [
    "Uses descriptive variable names",
    "Functions are < 20 lines",
    "Has helpful comments",
    "No code duplication"
  ])
};
```

### Verification

- [ ] Grader calls LLM
- [ ] Criteria passed to LLM clearly
- [ ] Score parsed correctly
- [ ] Results make sense
- [ ] More nuanced than deterministic graders

## Bonus Exercise 2: Regression Detection (20 minutes)

### Goal
Compare two agent versions to detect regressions.

### Tasks

Create `regression.ts`:

```typescript
export async function compareAgents(
  tasks: EvalTask[],
  agentA: any,
  agentB: any,
  trialsPerTask: number = 5
): Promise<void> {
  // TODO: Run suite with agent A

  // TODO: Run suite with agent B

  // TODO: Compare results

  // TODO: Flag regressions (B worse than A)

  // TODO: Flag improvements (B better than A)
}
```

Test by intentionally breaking your agent:

```typescript
// Reduce max turns to cause failures
const weakAgent = createAgent({ maxTurns: 5 });
const strongAgent = createAgent({ maxTurns: 30 });

await compareAgents(tasks, strongAgent, weakAgent, 5);
```

### Verification

- [ ] Both agents run on same tasks
- [ ] Results compared clearly
- [ ] Regressions flagged
- [ ] Improvements noted
- [ ] Statistical significance considered

## Lab Completion Checklist

- [ ] Core types defined
- [ ] Four deterministic graders implemented
- [ ] Composite grader working
- [ ] Trial runner with isolation
- [ ] Statistics computed correctly
- [ ] Three eval tasks created
- [ ] Eval suite runs successfully
- [ ] Integration test completed
- [ ] Findings documented
- [ ] (Bonus) Model grader implemented
- [ ] (Bonus) Regression detection working

## Troubleshooting

### "Workspace not cleaned up"
- Check try/finally in runTrial
- Verify fs.rm called with correct options
- Check for hanging promises

### "Grader always fails"
- Log file content and expected content
- Check file paths (relative to workspace)
- Verify workspace directory correct

### "Agent doesn't complete task"
- Check agent has necessary tools
- Verify prompt is clear
- Increase max turns
- Check agent logs

### "Statistics don't make sense"
- Verify pass rate calculation
- Check score averaging
- Ensure all trials included
- Print intermediate values

## Next Steps

After completing this lab:
1. Add more eval tasks (aim for 10+)
2. Run evals before making agent changes
3. Track metrics over time
4. Build a dashboard (optional)
5. Move on to Module 8: Harness
