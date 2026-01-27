# Module 7: Evaluations

## Goal
Build an eval harness that systematically tests your agent with isolated trials, deterministic graders, and statistical metrics.

## Concepts

### Why evals?
Unit tests check deterministic code: same input, same output. Agents are stochastic: the same prompt may produce different tool call sequences each run. You can't write a unit test that says "the agent should call read-file then edit-file." Instead, you run the same task **multiple times**, grade each attempt, and compute statistics.

Without evals, you're guessing whether your prompt changes help or hurt.

### Core vocabulary

- **EvalTask**: A test case — setup function (creates test files), prompt (what to tell the agent), and grader (how to judge the result)
- **Trial**: One attempt at one task — includes the full transcript and grade
- **Grader**: A function that scores a trial — returns 0.0 (fail) to 1.0 (pass) with an explanation
- **Transcript**: Everything the agent did — every turn, tool call, result, token count, duration
- **TaskResult**: Statistics across multiple trials — pass rate, pass@k, pass^k

### Deterministic vs. model graders
**Deterministic graders** check concrete outcomes with code:
- `stringMatchGrader("app.ts", "const count")` — Does the file contain this string?
- `fileExistsGrader("config.json")` — Does the file exist?
- `shellTestGrader("bun test")` — Does this command succeed?
- `compositeGrader([...])` — All sub-graders must pass (partial credit)

**Model graders** use another LLM as judge:
- `rubricGrader("Was the code clean and well-structured?")` — Scores 0-10
- `pairwiseGrader("Did the agent explain its reasoning?")` — YES/NO

**Prefer deterministic graders.** They're reproducible, fast, and don't cost API calls. Use model graders only for subjective quality.

### pass@k and pass^k
If your agent passes 2 out of 3 trials (67% pass rate):
- **pass@k** = 1 - (1 - 0.67)^3 = **96.3%** — probability at least one of k trials passes. Use when you can retry.
- **pass^k** = 0.67^3 = **29.6%** — probability all k trials pass. Use when you need reliability.

### Isolation
Each trial gets its own temporary workspace. No leftover files from previous attempts. The agent can't cheat by reading results from earlier trials. Cleanup happens after grading.

## Build It

### Step 1: Define the types

Create `module-7-evals/types.ts`:

```typescript
export interface EvalTask {
  id: string;
  description: string;
  setup: (workspaceDir: string) => Promise<void>;  // Create test files
  prompt: string;                                     // What to tell the agent
  grader: Grader;                                     // How to judge
}

export interface Grader {
  name: string;
  grade: (workspaceDir: string, transcript: Transcript) => Promise<GradeResult>;
}

export interface GradeResult {
  score: number;   // 0.0 to 1.0
  passed: boolean;
  explanation: string;
}

// TODO: Define Transcript, TranscriptTurn, Trial, TaskResult, EvalReport
// See solutions/ for the complete types
```

### Step 2: Build deterministic graders

Create `module-7-evals/graders/code-grader.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import type { Grader, GradeResult, Transcript } from "../types.js";

// TODO: stringMatchGrader(filePath, expected) — read file, check includes()
// TODO: fileExistsGrader(filePath) — check fs.access()
// TODO: shellTestGrader(command) — run execSync, check exit code
// TODO: compositeGrader(graders[]) — run all, compute average score, pass only if ALL pass
```

### Step 3: Build the model grader

Create `module-7-evals/graders/model-grader.ts`:

```typescript
// TODO: rubricGrader(rubric) — ask Claude to score 0-10, normalize to 0-1, pass if >= 0.7
// TODO: pairwiseGrader(criteria) — ask Claude YES/NO, return 1 or 0
```

### Step 4: Build the harness

Create `module-7-evals/harness.ts`:

```typescript
// For each trial:
//   1. Create temp directory (fs.mkdtemp)
//   2. Run task.setup(workspaceDir)
//   3. Run the agent with task.prompt
//   4. Grade with task.grader.grade(workspaceDir, transcript)
//   5. Clean up (fs.rm recursive)
//   6. Return the Trial
```

### Step 5: Build metrics

Create `module-7-evals/metrics.ts`:

```typescript
// pass@k = 1 - (1 - passRate)^k
// pass^k = passRate^k
// Also compute avgScore and avgTurns
```

### Step 6: Build the report printer and runner

Create `module-7-evals/report.ts` and `module-7-evals/run-evals.ts`.

### Step 7: Write eval tasks

Create `module-7-evals/tasks/coding-tasks.ts`:

```typescript
// 5 tasks of increasing difficulty:
// 1. rename-variable — rename x to count everywhere
// 2. add-function — add a greet function
// 3. fix-bug — fix an off-by-one error
// 4. create-file — create a config.json from a description
// 5. multi-file-refactor — move a function between files and update imports
```

Run it: `bun module-7-evals/run-evals.ts`

## Exercises

1. **Write 3 eval tasks for YOUR agent**: Think about what your agent should be able to do. Write tasks with setup, prompt, and compositeGrader. Run them. Read the failing transcripts — what went wrong?

2. **Compare grader types**: Write both a stringMatchGrader and a rubricGrader for the same task. Do they agree? When do they disagree?

3. **Measure reliability**: Run the same task 10 times. What's the pass rate? What's pass@3 vs pass^3? Is your agent reliable or just lucky?

4. **Read a failing transcript**: When a task fails, print the full transcript. Trace through the agent's tool calls. At what point did it go wrong? What would you add to the system prompt to fix it?

5. **Test the hardest task**: The multi-file-refactor task requires reading two files, creating a new file, and updating imports. Run it 5 times. What's the most common failure mode?

## Checkpoint

You're ready for Module 8 when you can answer:
- What's the difference between pass@k and pass^k? When do you use each?
- Why do trials need isolated workspaces?
- When should you use a deterministic grader vs. a model grader?
- What can you learn from a failing transcript that a pass/fail result alone doesn't tell you?

## Solutions
Compare your code against `solutions/` if you're stuck.
