# Module 7: Evaluations Tutorial

## Introduction

Agents are stochastic. The same prompt can produce different results across runs. This makes testing challenging: how do you know if your agent reliably solves problems?

The answer is **systematic evaluation**: running multiple trials on well-defined tasks and measuring success rates.

This tutorial teaches you how to build a production eval framework for agent systems.

## Why Evals Matter

### The Testing Problem

Traditional software testing:
```typescript
function add(a: number, b: number): number {
  return a + b;
}

// Deterministic test
assert(add(2, 3) === 5); // Always passes or always fails
```

Agent testing:
```typescript
async function fixBug(code: string): Promise<string> {
  // Uses LLM → different results each time
  return await agent.run(`Fix the bug in: ${code}`);
}

// Stochastic test
const fixed = await fixBug(buggyCode);
// Might work 80% of the time, fail 20%
// Single test tells you nothing about reliability
```

### What Evals Provide

1. **Reliability metrics:** Pass rate across multiple trials
2. **Regression detection:** Catch when changes hurt performance
3. **Comparison:** Which prompt/model/strategy works better?
4. **Confidence:** Quantify how often your agent succeeds

**Key insight:** Run multiple trials, compute statistics.

## Eval Framework Architecture

### Core Components

```
EvalTask
  ↓ setup()
  → Agent with prompt
  → Agent transcript
  ↓ grade()
  → Trial (grade + explanation)

EvalSuite
  → Multiple EvalTasks
  → Statistics across tasks
```

### The EvalTask Interface

```typescript
interface EvalTask {
  id: string;
  description: string;

  // Prepare workspace for trial
  setup(): Promise<string>;  // Returns workspace path

  // What to ask the agent
  prompt: string;

  // How to grade the result
  grader: Grader;
}
```

### The Trial Type

```typescript
interface Trial {
  taskId: string;
  trialNumber: number;
  transcript: Message[];  // Full conversation
  grade: GradeResult;
  durationMs: number;
}

interface GradeResult {
  score: number;       // 0.0 to 1.0
  passed: boolean;     // Typically: score >= 0.8
  explanation: string;
}
```

### The Grader Interface

```typescript
interface Grader {
  name: string;
  grade(workspace: string, transcript: Message[]): Promise<GradeResult>;
}
```

## Deterministic Graders

The simplest and most reliable graders check objective criteria.

### String Match Grader

Check if file contains expected content:

```typescript
function stringMatchGrader(
  filePath: string,
  expectedContent: string
): Grader {
  return {
    name: "string-match",
    grade: async (workspace: string) => {
      try {
        const fullPath = path.join(workspace, filePath);
        const content = await fs.readFile(fullPath, "utf-8");
        const passed = content.includes(expectedContent);

        return {
          score: passed ? 1.0 : 0.0,
          passed,
          explanation: passed
            ? `File contains expected content: "${expectedContent}"`
            : `File missing expected content: "${expectedContent}"`
        };
      } catch (error) {
        return {
          score: 0.0,
          passed: false,
          explanation: `Error reading file: ${error.message}`
        };
      }
    }
  };
}
```

**Use cases:**
- Check function was added
- Verify variable renamed
- Confirm import statement added

### File Exists Grader

Check if file was created:

```typescript
function fileExistsGrader(filePath: string): Grader {
  return {
    name: "file-exists",
    grade: async (workspace: string) => {
      const fullPath = path.join(workspace, filePath);
      const exists = await fs.access(fullPath)
        .then(() => true)
        .catch(() => false);

      return {
        score: exists ? 1.0 : 0.0,
        passed: exists,
        explanation: exists
          ? `File exists: ${filePath}`
          : `File not found: ${filePath}`
      };
    }
  };
}
```

**Use cases:**
- Verify file creation
- Check if output was generated

### Shell Test Grader

Run shell command to verify:

```typescript
function shellTestGrader(
  command: string,
  description: string
): Grader {
  return {
    name: "shell-test",
    grade: async (workspace: string) => {
      try {
        const result = await execPromise(command, { cwd: workspace });
        return {
          score: 1.0,
          passed: true,
          explanation: `${description} succeeded: ${result.stdout.trim()}`
        };
      } catch (error) {
        return {
          score: 0.0,
          passed: false,
          explanation: `${description} failed: ${error.stderr || error.message}`
        };
      }
    }
  };
}
```

**Use cases:**
- Run tests: `npm test`
- Check syntax: `tsc --noEmit`
- Verify builds: `npm run build`

### Regex Match Grader

More flexible than string matching:

```typescript
function regexMatchGrader(
  filePath: string,
  pattern: RegExp,
  description: string
): Grader {
  return {
    name: "regex-match",
    grade: async (workspace: string) => {
      try {
        const fullPath = path.join(workspace, filePath);
        const content = await fs.readFile(fullPath, "utf-8");
        const passed = pattern.test(content);

        return {
          score: passed ? 1.0 : 0.0,
          passed,
          explanation: passed
            ? `Pattern matched: ${description}`
            : `Pattern not found: ${description}`
        };
      } catch (error) {
        return {
          score: 0.0,
          passed: false,
          explanation: `Error: ${error.message}`
        };
      }
    }
  };
}
```

**Use cases:**
- Check function signature: `/function\s+\w+\(/`
- Verify error handling: `/try\s*\{[\s\S]*\}\s*catch/`
- Confirm patterns: `/export\s+(default\s+)?class/`

## Composite Graders

Combine multiple graders for complex criteria.

### Average Composite

Average scores, pass only if all sub-graders pass:

```typescript
function compositeGrader(graders: Grader[]): Grader {
  return {
    name: "composite",
    grade: async (workspace: string, transcript: Message[]) => {
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
        passed: allPassed,
        explanation: `Composite grader:\n${explanations}`
      };
    }
  };
}
```

**Example:**
```typescript
const grader = compositeGrader([
  fileExistsGrader("output.txt"),
  stringMatchGrader("output.txt", "Hello, world!"),
  shellTestGrader("node output.txt", "Run output")
]);
```

This requires:
1. File exists
2. Contains correct content
3. Executes without error

## Model-Based Graders

When deterministic grading isn't sufficient, use an LLM.

### Rubric Grader

Grade based on rubric criteria:

```typescript
function rubricGrader(
  filePath: string,
  criteria: string[]
): Grader {
  return {
    name: "rubric",
    grade: async (workspace: string) => {
      const fullPath = path.join(workspace, filePath);
      const content = await fs.readFile(fullPath, "utf-8");

      const prompt = `Grade this code based on the following criteria:
${criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Code:
\`\`\`
${content}
\`\`\`

For each criterion, respond with YES or NO and explain briefly.
Then give an overall score from 0.0 to 1.0.

Format:
1. [YES/NO] explanation
2. [YES/NO] explanation
...
SCORE: 0.X
`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      });

      const text = response.content[0].text;

      // Parse score from response
      const scoreMatch = text.match(/SCORE:\s*([0-9.]+)/);
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0.0;

      return {
        score,
        passed: score >= 0.8,
        explanation: text
      };
    }
  };
}
```

**Use cases:**
- Code quality assessment
- Documentation completeness
- Design pattern adherence

### Pairwise Comparison Grader

Compare two approaches:

```typescript
async function compareResults(
  resultA: string,
  resultB: string,
  criteria: string
): Promise<"A" | "B" | "TIE"> {
  const prompt = `Compare these two results based on: ${criteria}

Result A:
${resultA}

Result B:
${resultB}

Which is better? Respond with only: A, B, or TIE`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 10,
    messages: [{ role: "user", content: prompt }]
  });

  const answer = response.content[0].text.trim().toUpperCase();
  return answer as "A" | "B" | "TIE";
}
```

**Use cases:**
- A/B testing prompt variants
- Comparing model versions
- Testing strategy changes

## Trial Isolation

Each trial must be isolated to prevent interference.

### Workspace Setup

```typescript
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

async function createTrialWorkspace(): Promise<string> {
  const tmpDir = tmpdir();
  const workspace = await mkdtemp(path.join(tmpDir, "eval-"));
  return workspace;
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

  // 1. Setup isolated workspace
  const workspace = await task.setup();

  try {
    // 2. Run agent
    const transcript = await agent.run(task.prompt, workspace);

    // 3. Grade result
    const grade = await task.grader.grade(workspace, transcript);

    const durationMs = Date.now() - startTime;

    return {
      taskId: task.id,
      trialNumber,
      transcript,
      grade,
      durationMs
    };
  } finally {
    // 4. Cleanup workspace
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
```

**Key points:**
- Fresh workspace per trial
- No shared state between trials
- Always cleanup (even on error)

## Running Multiple Trials

### Trial Runner

```typescript
async function runTrials(
  task: EvalTask,
  agent: Agent,
  numTrials: number
): Promise<Trial[]> {
  const trials: Trial[] = [];

  for (let i = 0; i < numTrials; i++) {
    console.log(`Running trial ${i + 1}/${numTrials} for ${task.id}...`);
    const trial = await runTrial(task, i, agent);
    trials.push(trial);

    console.log(`  Result: ${trial.grade.passed ? "PASS" : "FAIL"} (score: ${trial.grade.score})`);
  }

  return trials;
}
```

### Computing Statistics

```typescript
interface TrialStats {
  taskId: string;
  numTrials: number;
  passRate: number;      // Fraction that passed
  avgScore: number;       // Average score
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

### Understanding pass@k

**pass@k:** Probability of getting at least one success in k attempts.

**Formula:** `pass@k = 1 - (1 - p)^k`

where `p` is the single-trial pass rate.

### Implementation

```typescript
function passAtK(passRate: number, k: number): number {
  return 1 - Math.pow(1 - passRate, k);
}

// Example:
// If agent succeeds 60% of the time (p = 0.6):
console.log(passAtK(0.6, 1)); // 0.60 (60%)
console.log(passAtK(0.6, 3)); // 0.936 (93.6%)
console.log(passAtK(0.6, 5)); // 0.990 (99%)
```

**Interpretation:**
- pass@1: Success rate on first try
- pass@3: Success rate if you try 3 times
- pass@5: Success rate if you try 5 times

### pass^k (All Success)

**pass^k:** Probability of success on all k attempts.

**Formula:** `pass^k = p^k`

```typescript
function passAllK(passRate: number, k: number): number {
  return Math.pow(passRate, k);
}

// Example with p = 0.6:
console.log(passAllK(0.6, 1)); // 0.60 (60%)
console.log(passAllK(0.6, 3)); // 0.216 (21.6%)
console.log(passAllK(0.6, 5)); // 0.078 (7.8%)
```

### When to Use Each

- **pass@k:** User can retry on failure (e.g., code generation)
- **pass^k:** All attempts must succeed (e.g., critical operations)

## Example Eval Tasks

### Task 1: Rename Variable

```typescript
const renameVariableTask: EvalTask = {
  id: "rename-variable",
  description: "Rename a variable across a file",

  setup: async () => {
    const workspace = await createTrialWorkspace();
    await fs.writeFile(
      path.join(workspace, "code.ts"),
      `function process(data: string) {
  const result = data.toUpperCase();
  console.log(result);
  return result;
}`,
      "utf-8"
    );
    return workspace;
  },

  prompt: "Rename the variable 'result' to 'output' in code.ts",

  grader: compositeGrader([
    stringMatchGrader("code.ts", "const output"),
    stringMatchGrader("code.ts", "console.log(output)"),
    stringMatchGrader("code.ts", "return output"),
    regexMatchGrader("code.ts", /\bresult\b/, "Should not contain 'result' anymore")
      // Invert this grader for "should NOT contain"
  ])
};
```

### Task 2: Add Function

```typescript
const addFunctionTask: EvalTask = {
  id: "add-function",
  description: "Add a new function to existing file",

  setup: async () => {
    const workspace = await createTrialWorkspace();
    await fs.writeFile(
      path.join(workspace, "utils.ts"),
      `export function greet(name: string) {
  return \`Hello, \${name}!\`;
}`,
      "utf-8"
    );
    return workspace;
  },

  prompt: "Add a function 'farewell(name: string)' that returns 'Goodbye, {name}!' to utils.ts",

  grader: compositeGrader([
    regexMatchGrader("utils.ts", /function farewell/, "Function declaration"),
    regexMatchGrader("utils.ts", /Goodbye,/, "Correct message"),
    shellTestGrader("tsc --noEmit utils.ts", "TypeScript compile check")
  ])
};
```

### Task 3: Fix Bug

```typescript
const fixBugTask: EvalTask = {
  id: "fix-bug",
  description: "Fix an off-by-one error",

  setup: async () => {
    const workspace = await createTrialWorkspace();
    await fs.writeFile(
      path.join(workspace, "buggy.ts"),
      `export function getLastThree(arr: number[]): number[] {
  return arr.slice(arr.length - 4); // Bug: should be -3
}`,
      "utf-8"
    );
    await fs.writeFile(
      path.join(workspace, "test.ts"),
      `import { getLastThree } from './buggy';
const result = getLastThree([1, 2, 3, 4, 5]);
console.assert(result.length === 3, 'Should return 3 elements');
console.assert(result[0] === 3, 'Should start with 3');
console.log('Tests passed');`,
      "utf-8"
    );
    return workspace;
  },

  prompt: "Fix the bug in buggy.ts so that test.ts passes",

  grader: shellTestGrader("node test.ts", "Run tests")
};
```

### Task 4: Create File

```typescript
const createFileTask: EvalTask = {
  id: "create-file",
  description: "Create a new file with specified content",

  setup: async () => {
    return await createTrialWorkspace();
  },

  prompt: "Create a file config.json with: {\"port\": 3000, \"host\": \"localhost\"}",

  grader: compositeGrader([
    fileExistsGrader("config.json"),
    stringMatchGrader("config.json", '"port": 3000'),
    stringMatchGrader("config.json", '"host": "localhost"')
  ])
};
```

### Task 5: Multi-File Refactor

```typescript
const multiFileTask: EvalTask = {
  id: "multi-file-refactor",
  description: "Refactor constant across multiple files",

  setup: async () => {
    const workspace = await createTrialWorkspace();
    await fs.writeFile(
      path.join(workspace, "constants.ts"),
      `export const MAX_ITEMS = 10;`,
      "utf-8"
    );
    await fs.writeFile(
      path.join(workspace, "processor.ts"),
      `const MAX = 10; // Should use imported constant
export function process(items: any[]) {
  return items.slice(0, MAX);
}`,
      "utf-8"
    );
    return workspace;
  },

  prompt: "In processor.ts, import MAX_ITEMS from constants.ts and use it instead of the local MAX constant",

  grader: compositeGrader([
    regexMatchGrader("processor.ts", /import.*MAX_ITEMS.*from.*constants/, "Import statement"),
    regexMatchGrader("processor.ts", /slice\(0,\s*MAX_ITEMS\)/, "Uses imported constant"),
    shellTestGrader("tsc --noEmit processor.ts", "TypeScript check")
  ])
};
```

## Putting It All Together

### Complete Eval Suite

```typescript
async function runEvalSuite(
  tasks: EvalTask[],
  agent: Agent,
  trialsPerTask: number = 5
): Promise<TrialStats[]> {
  const allStats: TrialStats[] = [];

  for (const task of tasks) {
    console.log(`\n=== Running ${task.id} ===`);
    console.log(task.description);

    const trials = await runTrials(task, agent, trialsPerTask);
    const stats = computeStats(trials);

    console.log(`\nResults:`);
    console.log(`  Pass rate: ${(stats.passRate * 100).toFixed(1)}%`);
    console.log(`  Avg score: ${stats.avgScore.toFixed(2)}`);
    console.log(`  pass@3: ${(passAtK(stats.passRate, 3) * 100).toFixed(1)}%`);
    console.log(`  Avg duration: ${stats.avgDurationMs}ms`);

    allStats.push(stats);
  }

  return allStats;
}
```

### Usage

```typescript
const evalTasks = [
  renameVariableTask,
  addFunctionTask,
  fixBugTask,
  createFileTask,
  multiFileTask
];

const stats = await runEvalSuite(evalTasks, myAgent, 5);

// Overall summary
const avgPassRate = stats.reduce((sum, s) => sum + s.passRate, 0) / stats.length;
console.log(`\nOverall pass rate: ${(avgPassRate * 100).toFixed(1)}%`);
```

## Summary

Eval frameworks enable systematic agent testing:

1. **EvalTask:** Defines setup, prompt, and grading
2. **Graders:** Deterministic (preferred) or model-based
3. **Isolation:** Each trial in fresh workspace
4. **Multiple trials:** Run 5-10 times per task
5. **Statistics:** Pass rate, avg score, pass@k
6. **Regression testing:** Catch when changes hurt performance

**Key principles:**
- Prefer deterministic graders
- Use composite graders for complex criteria
- Isolate trials completely
- Run enough trials for statistics (5-10)
- Track metrics over time

**Next steps:**
- Build eval suite for your agent
- Start with 5 simple tasks
- Run before making changes
- Expand task set over time

In Module 8, we'll build a harness that runs evals automatically on every code change.
