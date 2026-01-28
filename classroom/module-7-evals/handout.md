# Module 7: Evaluations - Quick Reference

## Core Concepts

**Problem:** Agents are stochastic → single test proves nothing
**Solution:** Run multiple trials, compute statistics

## Basic Types

### EvalTask
```typescript
interface EvalTask {
  id: string;
  description: string;
  setup(): Promise<string>;  // Returns workspace path
  prompt: string;
  grader: Grader;
}
```

### Trial
```typescript
interface Trial {
  taskId: string;
  trialNumber: number;
  transcript: Message[];
  grade: GradeResult;
  durationMs: number;
}
```

### GradeResult
```typescript
interface GradeResult {
  score: number;       // 0.0 to 1.0
  passed: boolean;     // Typically score >= 0.8
  explanation: string;
}
```

### Grader
```typescript
interface Grader {
  name: string;
  grade(workspace: string, transcript: Message[]): Promise<GradeResult>;
}
```

## Deterministic Graders

### String Match
```typescript
function stringMatchGrader(filePath: string, expected: string): Grader {
  return {
    name: "string-match",
    grade: async (workspace) => {
      const content = await fs.readFile(path.join(workspace, filePath), "utf-8");
      const passed = content.includes(expected);
      return {
        score: passed ? 1.0 : 0.0,
        passed,
        explanation: passed ? "Content found" : "Content missing"
      };
    }
  };
}
```

### File Exists
```typescript
function fileExistsGrader(filePath: string): Grader {
  return {
    name: "file-exists",
    grade: async (workspace) => {
      const exists = await fs.access(path.join(workspace, filePath))
        .then(() => true)
        .catch(() => false);
      return {
        score: exists ? 1.0 : 0.0,
        passed: exists,
        explanation: exists ? "File exists" : "File not found"
      };
    }
  };
}
```

### Shell Test
```typescript
function shellTestGrader(command: string, description: string): Grader {
  return {
    name: "shell-test",
    grade: async (workspace) => {
      try {
        await execPromise(command, { cwd: workspace });
        return { score: 1.0, passed: true, explanation: `${description} succeeded` };
      } catch (error) {
        return { score: 0.0, passed: false, explanation: `${description} failed` };
      }
    }
  };
}
```

### Regex Match
```typescript
function regexMatchGrader(
  filePath: string,
  pattern: RegExp,
  description: string
): Grader {
  return {
    name: "regex-match",
    grade: async (workspace) => {
      const content = await fs.readFile(path.join(workspace, filePath), "utf-8");
      const passed = pattern.test(content);
      return {
        score: passed ? 1.0 : 0.0,
        passed,
        explanation: passed ? `Pattern matched: ${description}` : `Pattern not found`
      };
    }
  };
}
```

## Composite Grader

Combine multiple graders:

```typescript
function compositeGrader(graders: Grader[]): Grader {
  return {
    name: "composite",
    grade: async (workspace, transcript) => {
      const results = await Promise.all(
        graders.map(g => g.grade(workspace, transcript))
      );

      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const allPassed = results.every(r => r.passed);

      const explanations = results.map((r, i) =>
        `${graders[i].name}: ${r.explanation}`
      ).join("\n");

      return {
        score: avgScore,
        passed: allPassed,  // Must pass ALL sub-graders
        explanation: `Composite:\n${explanations}`
      };
    }
  };
}
```

## Model-Based Graders

### Rubric Grader
```typescript
function rubricGrader(filePath: string, criteria: string[]): Grader {
  return {
    name: "rubric",
    grade: async (workspace) => {
      const content = await fs.readFile(path.join(workspace, filePath), "utf-8");

      const prompt = `Grade this code based on:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Code:
\`\`\`
${content}
\`\`\`

For each criterion: YES or NO with explanation.
Then: SCORE: 0.X`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      });

      const text = response.content[0].text;
      const scoreMatch = text.match(/SCORE:\s*([0-9.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.0;

      return { score, passed: score >= 0.8, explanation: text };
    }
  };
}
```

## Trial Isolation

### Workspace Setup
```typescript
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";

async function createTrialWorkspace(): Promise<string> {
  return await mkdtemp(path.join(tmpdir(), "eval-"));
}
```

### Complete Trial Runner
```typescript
async function runTrial(
  task: EvalTask,
  trialNumber: number,
  agent: Agent
): Promise<Trial> {
  const startTime = Date.now();
  const workspace = await task.setup();

  try {
    const transcript = await agent.run(task.prompt, workspace);
    const grade = await task.grader.grade(workspace, transcript);

    return {
      taskId: task.id,
      trialNumber,
      transcript,
      grade,
      durationMs: Date.now() - startTime
    };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
```

## Running Multiple Trials

```typescript
async function runTrials(
  task: EvalTask,
  agent: Agent,
  numTrials: number
): Promise<Trial[]> {
  const trials: Trial[] = [];

  for (let i = 0; i < numTrials; i++) {
    console.log(`Trial ${i + 1}/${numTrials} for ${task.id}...`);
    const trial = await runTrial(task, i, agent);
    trials.push(trial);
    console.log(`  ${trial.grade.passed ? "PASS" : "FAIL"} (${trial.grade.score})`);
  }

  return trials;
}
```

## Statistics

### Computing Stats
```typescript
interface TrialStats {
  taskId: string;
  numTrials: number;
  passRate: number;
  avgScore: number;
  minScore: number;
  maxScore: number;
  avgDurationMs: number;
}

function computeStats(trials: Trial[]): TrialStats {
  const passed = trials.filter(t => t.grade.passed).length;
  const scores = trials.map(t => t.grade.score);
  const durations = trials.map(t => t.durationMs);

  return {
    taskId: trials[0].taskId,
    numTrials: trials.length,
    passRate: passed / trials.length,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length
  };
}
```

## Pass@k Metrics

### At Least One Success
```typescript
function passAtK(passRate: number, k: number): number {
  return 1 - Math.pow(1 - passRate, k);
}

// Example: 60% pass rate
passAtK(0.6, 1) // 0.60 (60%)
passAtK(0.6, 3) // 0.936 (93.6%)
passAtK(0.6, 5) // 0.990 (99%)
```

### All Must Succeed
```typescript
function passAllK(passRate: number, k: number): number {
  return Math.pow(passRate, k);
}

// Example: 60% pass rate
passAllK(0.6, 1) // 0.60 (60%)
passAllK(0.6, 3) // 0.216 (21.6%)
passAllK(0.6, 5) // 0.078 (7.8%)
```

## Example Eval Tasks

### Rename Variable
```typescript
{
  id: "rename-variable",
  setup: async () => {
    const ws = await createTrialWorkspace();
    await fs.writeFile(path.join(ws, "code.ts"), `...`);
    return ws;
  },
  prompt: "Rename 'result' to 'output' in code.ts",
  grader: compositeGrader([
    stringMatchGrader("code.ts", "const output"),
    stringMatchGrader("code.ts", "return output")
  ])
}
```

### Add Function
```typescript
{
  id: "add-function",
  setup: async () => { /* create utils.ts */ },
  prompt: "Add function 'farewell(name: string)' to utils.ts",
  grader: compositeGrader([
    regexMatchGrader("utils.ts", /function farewell/, "Function exists"),
    shellTestGrader("tsc --noEmit utils.ts", "Type check")
  ])
}
```

### Fix Bug
```typescript
{
  id: "fix-bug",
  setup: async () => { /* create buggy.ts + test.ts */ },
  prompt: "Fix the bug in buggy.ts so test.ts passes",
  grader: shellTestGrader("node test.ts", "Run tests")
}
```

### Create File
```typescript
{
  id: "create-file",
  setup: async () => await createTrialWorkspace(),
  prompt: "Create config.json with port 3000",
  grader: compositeGrader([
    fileExistsGrader("config.json"),
    stringMatchGrader("config.json", '"port": 3000')
  ])
}
```

### Multi-File Refactor
```typescript
{
  id: "multi-file-refactor",
  setup: async () => { /* create multiple files */ },
  prompt: "Refactor constant across files",
  grader: compositeGrader([
    regexMatchGrader("processor.ts", /import.*MAX_ITEMS/, "Import"),
    shellTestGrader("tsc --noEmit", "Type check")
  ])
}
```

## Eval Suite

```typescript
async function runEvalSuite(
  tasks: EvalTask[],
  agent: Agent,
  trialsPerTask: number = 5
): Promise<TrialStats[]> {
  const allStats: TrialStats[] = [];

  for (const task of tasks) {
    console.log(`\n=== ${task.id} ===`);
    const trials = await runTrials(task, agent, trialsPerTask);
    const stats = computeStats(trials);

    console.log(`Pass rate: ${(stats.passRate * 100).toFixed(1)}%`);
    console.log(`pass@3: ${(passAtK(stats.passRate, 3) * 100).toFixed(1)}%`);

    allStats.push(stats);
  }

  return allStats;
}
```

## Best Practices

### Grader Design
- Prefer deterministic graders over model graders
- Use composite graders for multi-criteria evaluation
- Always return helpful explanations
- Handle errors gracefully (return score 0.0)

### Trial Isolation
- Fresh workspace per trial (mkdtemp)
- No shared state between trials
- Always cleanup (use try/finally)
- Validate paths stay within workspace

### Number of Trials
- Minimum: 5 trials per task
- Recommended: 10 trials for reliable statistics
- More trials = more confidence, but more cost/time

### Task Design
- Start simple, add complexity gradually
- Test one thing per task (when possible)
- Clear success criteria
- Representative of real usage

## Common Pitfalls

1. **Single trial testing** → No statistical validity
2. **Shared workspaces** → Trials interfere with each other
3. **Vague grading** → Can't tell what failed
4. **Model graders for objective tasks** → Unnecessary variance
5. **Not cleaning up workspaces** → Disk fills up

## Quick Checklist

Before running evals:
- [ ] Each task has clear success criteria
- [ ] Graders are deterministic when possible
- [ ] Trials are isolated (fresh workspaces)
- [ ] Running 5+ trials per task
- [ ] Workspaces cleaned up after trials
- [ ] Stats computed (pass rate, avg score)
- [ ] pass@k metrics calculated

## Metrics to Track

- Pass rate per task
- Average score per task
- pass@3 and pass@5
- Duration per trial
- Overall suite pass rate
- Regression detection (compare to baseline)
