# Module 7: Evaluations - Homework

## Overview

Build a comprehensive evaluation suite for your coding agent from Module 6. Create at least 10 eval tasks covering different capabilities, run trials, analyze results, and improve your agent based on findings.

**Due:** End of week
**Estimated time:** 5-7 hours
**Submit:** Git repository with code, results, and analysis

---

## Assignment: Production Eval Suite

Create a production-quality eval framework that:
1. Tests your agent across diverse scenarios
2. Provides reliable metrics
3. Detects regressions
4. Guides improvements

### Requirements

Your eval suite must:

1. **Include at least 10 eval tasks** covering:
   - Simple tasks (file creation, variable rename)
   - Medium complexity (add function, fix bug)
   - Complex tasks (multi-file refactor, debugging)

2. **Implement at least 6 different grader types:**
   - String match
   - File exists
   - Regex match
   - Shell test
   - Composite
   - At least one custom grader

3. **Run multiple trials:**
   - Minimum 5 trials per task
   - Complete isolation between trials
   - Proper cleanup

4. **Compute comprehensive statistics:**
   - Pass rate per task
   - Overall pass rate
   - pass@1, pass@3, pass@5
   - Duration metrics
   - Score distributions

5. **Generate a detailed report:**
   - Results for each task
   - Analysis of failures
   - Insights and recommendations
   - Comparison with baseline (optional)

### Deliverables

1. **Code** (60 points)
   - Complete eval framework
   - 10+ eval tasks
   - All graders working
   - Suite runner
   - Clean, documented code

2. **Results** (20 points)
   - Complete eval run output
   - Saved trial data
   - Statistics summary

3. **Analysis Report** (20 points)
   - Findings from eval results
   - Failure analysis
   - Improvement recommendations
   - Insights learned

---

## Part 1: Eval Framework (30 points)

### Task 1.1: Core Infrastructure (10 points)

Implement the evaluation framework:

**Directory structure:**
```
homework/
├── src/
│   ├── types.ts
│   ├── graders/
│   │   ├── deterministic.ts
│   │   ├── composite.ts
│   │   ├── model.ts
│   │   └── custom.ts
│   ├── trial.ts
│   ├── stats.ts
│   └── suite.ts
├── tasks/
│   ├── simple/
│   │   ├── create-file.ts
│   │   ├── rename-variable.ts
│   │   └── ...
│   ├── medium/
│   │   ├── add-function.ts
│   │   ├── fix-bug.ts
│   │   └── ...
│   └── complex/
│       ├── multi-file-refactor.ts
│       ├── debug-error.ts
│       └── ...
├── results/
│   ├── trials/
│   └── stats/
├── main.ts
└── ANALYSIS.md
```

**Requirements:**
- All types properly defined
- Trial isolation with mkdtemp
- Cleanup in finally blocks
- Error handling throughout
- Progress logging

### Task 1.2: Graders Library (10 points)

Implement comprehensive grader library:

**Required graders:**
```typescript
// Deterministic
export function stringMatchGrader(filePath: string, expected: string): Grader;
export function fileExistsGrader(filePath: string): Grader;
export function regexMatchGrader(filePath: string, pattern: RegExp, desc: string): Grader;
export function shellTestGrader(command: string, desc: string): Grader;

// Composite
export function compositeGrader(graders: Grader[]): Grader;
export function anyOfGrader(graders: Grader[]): Grader; // Pass if any sub-grader passes

// Custom (at least one)
export function multiFileGrader(checks: FileCheck[]): Grader;
// Or other custom grader of your choice
```

**Requirements:**
- All graders return proper GradeResult
- Clear explanations in results
- Graceful error handling
- Tests for each grader

### Task 1.3: Statistics Engine (10 points)

Implement comprehensive statistics:

```typescript
export interface DetailedStats extends TrialStats {
  passAt1: number;
  passAt3: number;
  passAt5: number;
  scoreDistribution: { min: number; q1: number; median: number; q3: number; max: number };
  successfulTrials: number[];
  failedTrials: number[];
}

export function computeDetailedStats(trials: Trial[]): DetailedStats;
export function compareStats(baseline: DetailedStats, current: DetailedStats): Comparison;
export function generateReport(allStats: DetailedStats[]): string;
```

**Requirements:**
- All metrics computed correctly
- Score distribution (quartiles)
- Comparison with baseline
- Clear, formatted reports

---

## Part 2: Eval Tasks (30 points)

Create 10+ diverse eval tasks. Below are requirements for each category.

### Category 1: Simple Tasks (10 points, 3 tasks minimum)

**Example tasks:**
1. Create a file with specific content
2. Rename a variable throughout a file
3. Add an import statement
4. Delete a function
5. Change a constant value

**Requirements:**
- Clear, single-step tasks
- Deterministic grading only
- Should have 90%+ pass rate
- Fast execution (< 30s per trial)

**Example implementation:**

```typescript
export const createFileTask: EvalTask = {
  id: "simple-create-file",
  description: "Create a JSON config file",

  setup: async () => {
    return await createTrialWorkspace();
  },

  prompt: 'Create a file named "config.json" with: {"port": 3000, "host": "localhost"}',

  grader: compositeGrader([
    fileExistsGrader("config.json"),
    stringMatchGrader("config.json", '"port": 3000'),
    stringMatchGrader("config.json", '"host": "localhost"')
  ])
};
```

### Category 2: Medium Tasks (10 points, 4 tasks minimum)

**Example tasks:**
1. Add a function with specific signature
2. Fix a specific bug (off-by-one, null check, etc.)
3. Refactor a long function into smaller ones
4. Add error handling to existing code
5. Update function to use a different API

**Requirements:**
- Multi-step but focused tasks
- Mix of deterministic and composite grading
- Should have 60-80% pass rate
- Medium execution time (30-60s per trial)

**Example implementation:**

```typescript
export const fixBugTask: EvalTask = {
  id: "medium-fix-off-by-one",
  description: "Fix off-by-one error in array slicing",

  setup: async () => {
    const workspace = await createTrialWorkspace();

    await fs.writeFile(
      path.join(workspace, "buggy.ts"),
      `export function getLastN(arr: number[], n: number): number[] {
  return arr.slice(arr.length - n - 1); // BUG: should be -n
}`,
      "utf-8"
    );

    await fs.writeFile(
      path.join(workspace, "test.ts"),
      `import { getLastN } from './buggy';
const result = getLastN([1, 2, 3, 4, 5], 3);
console.assert(result.length === 3, 'Wrong length');
console.assert(result[0] === 3, 'Wrong start');
console.log('PASS');`,
      "utf-8"
    );

    return workspace;
  },

  prompt: "Fix the bug in buggy.ts so test.ts passes",

  grader: compositeGrader([
    shellTestGrader("npx tsx test.ts", "Test passes"),
    regexMatchGrader("buggy.ts", /arr\.length\s*-\s*n\)/, "Correct fix")
  ])
};
```

### Category 3: Complex Tasks (10 points, 3 tasks minimum)

**Example tasks:**
1. Multi-file refactoring (extract constant used in 3 files)
2. Debug a failing test suite (multiple issues)
3. Implement a feature across multiple files
4. Migrate code to new API pattern
5. Optimize performance issue

**Requirements:**
- Multi-step, multi-file tasks
- Requires reasoning and planning
- Should have 30-60% pass rate
- Longer execution (60-120s per trial)

**Example implementation:**

```typescript
export const multiFileRefactorTask: EvalTask = {
  id: "complex-extract-constant",
  description: "Extract magic number to shared constant across 3 files",

  setup: async () => {
    const workspace = await createTrialWorkspace();

    // Create constants.ts (where constant should go)
    await fs.writeFile(
      path.join(workspace, "constants.ts"),
      `// Put shared constants here\n`,
      "utf-8"
    );

    // Create file1.ts with magic number
    await fs.writeFile(
      path.join(workspace, "file1.ts"),
      `export function process() {
  const maxItems = 100; // Magic number
  return maxItems;
}`,
      "utf-8"
    );

    // Create file2.ts with same magic number
    await fs.writeFile(
      path.join(workspace, "file2.ts"),
      `export function validate(items: any[]) {
  return items.length <= 100; // Magic number
}`,
      "utf-8"
    );

    // Create file3.ts with same magic number
    await fs.writeFile(
      path.join(workspace, "file3.ts"),
      `export const config = {
  limit: 100 // Magic number
};`,
      "utf-8"
    );

    return workspace;
  },

  prompt: `The number 100 appears in file1.ts, file2.ts, and file3.ts.
Extract it to a constant MAX_ITEMS in constants.ts and update all three files to import and use it.`,

  grader: compositeGrader([
    // Constant defined
    regexMatchGrader("constants.ts", /export\s+const\s+MAX_ITEMS\s*=\s*100/, "Constant defined"),

    // File1 imports and uses it
    regexMatchGrader("file1.ts", /import.*MAX_ITEMS.*from.*constants/, "File1 imports"),
    regexMatchGrader("file1.ts", /maxItems\s*=\s*MAX_ITEMS/, "File1 uses constant"),

    // File2 imports and uses it
    regexMatchGrader("file2.ts", /import.*MAX_ITEMS.*from.*constants/, "File2 imports"),
    regexMatchGrader("file2.ts", /<=\s*MAX_ITEMS/, "File2 uses constant"),

    // File3 imports and uses it
    regexMatchGrader("file3.ts", /import.*MAX_ITEMS.*from.*constants/, "File3 imports"),
    regexMatchGrader("file3.ts", /limit:\s*MAX_ITEMS/, "File3 uses constant"),

    // TypeScript compiles
    shellTestGrader("npx tsc --noEmit", "TypeScript check")
  ])
};
```

---

## Part 3: Execution and Analysis (40 points)

### Task 3.1: Run Complete Suite (10 points)

Run your eval suite and collect results:

```typescript
// main.ts
const allTasks = [
  ...simpleTasks,
  ...mediumTasks,
  ...complexTasks
];

const stats = await runEvalSuite(allTasks, myAgent, 5);

// Save results
await saveResults(stats, "results/stats/run-1.json");
await saveTrials(trials, "results/trials/");
```

**Requirements:**
- Run at least 5 trials per task
- Save all trial data
- Save statistics
- Generate timestamped reports

### Task 3.2: Failure Analysis (10 points)

For each failing task, analyze why:

**Create ANALYSIS.md with:**

For each task:
- Pass rate achieved
- What agents did wrong in failures
- Was failure pattern consistent or random?
- What would fix the failures?

**Example:**
```markdown
### Task: complex-extract-constant

**Pass rate:** 2/5 (40%)

**Failure patterns:**
- 2 trials: Agent updated only 2 files, missed file3.ts
- 1 trial: Agent created constant but used wrong name

**Root cause:** Agent doesn't systematically search all files for the magic number

**Recommended fix:** Improve system prompt to emphasize "search all files first"
```

### Task 3.3: Insights and Recommendations (10 points)

Analyze overall results:

**In ANALYSIS.md, include:**

1. **Overall Performance:**
   - Suite-wide pass rate
   - pass@3 for entire suite
   - Which categories performed best/worst?

2. **Patterns Observed:**
   - What types of tasks does your agent handle well?
   - What types of tasks does it struggle with?
   - Any surprising failures or successes?

3. **Agent Weaknesses Identified:**
   - What capabilities are missing?
   - What prompts are confusing?
   - What tools are needed?

4. **Improvement Plan:**
   - Top 3 changes to improve pass rate
   - Expected impact of each change
   - Implementation difficulty

### Task 3.4: Implement One Improvement (10 points)

Based on your analysis:

1. Pick one improvement from your plan
2. Implement it in your agent
3. Re-run the eval suite
4. Compare results

**Document in ANALYSIS.md:**
```markdown
## Improvement Experiment

**Change made:** [Describe the change]

**Hypothesis:** [What you expected to improve]

**Results:**

Before:
- Overall pass rate: X%
- Task Y pass rate: Z%

After:
- Overall pass rate: X2%
- Task Y pass rate: Z2%

**Analysis:** [Did it work? Why or why not?]
```

**Requirements:**
- Clear hypothesis
- Measurable change
- Before/after comparison
- Honest analysis (even if it didn't help)

---

## Grading Rubric

### Code Quality (60 points)

**Eval Framework (30 points):**
- Core types and interfaces (5 pts)
- Trial isolation and cleanup (5 pts)
- Graders library (10 pts)
- Statistics engine (5 pts)
- Suite runner (5 pts)

**Eval Tasks (30 points):**
- Simple tasks (3+, 10 pts)
- Medium tasks (4+, 10 pts)
- Complex tasks (3+, 10 pts)

### Execution and Results (20 points)
- Complete suite run (5 pts)
- Results properly saved (5 pts)
- Statistics computed (5 pts)
- Clean output/logs (5 pts)

### Analysis Report (20 points)
- Failure analysis (5 pts)
- Overall insights (5 pts)
- Improvement plan (5 pts)
- Improvement experiment (5 pts)

**Total: 100 points**

---

## Extra Credit (Up to 20 points)

### EC1: Advanced Graders (5 points)
Implement model-based rubric grader and use it for a code quality task.

### EC2: Regression Detection (5 points)
Implement baseline comparison and automatically flag regressions.

### EC3: Visualization (5 points)
Generate charts/graphs of results (pass rates, score distributions, duration).

### EC4: More Tasks (5 points)
Create 15+ total eval tasks instead of 10.

---

## Submission

Submit a Git repository containing:

```
homework/
├── src/              # Framework code
├── tasks/           # Eval task definitions
├── results/         # Trial data and statistics
│   ├── trials/
│   ├── stats/
│   └── before-after/  # If you did improvement experiment
├── ANALYSIS.md      # Your analysis report
├── package.json
├── tsconfig.json
└── README.md        # How to run your suite
```

**README.md should include:**
- Setup instructions
- How to run the eval suite
- How to interpret results
- Any dependencies or requirements

---

## Tips

1. **Start with simple tasks:** Get the framework working before tackling complex tasks

2. **Test graders independently:** Make sure each grader works before using in tasks

3. **Save trial data:** You'll want to inspect failures manually

4. **Use descriptive explanations:** Future you will thank present you

5. **Don't over-engineer:** Simple, working evals > complex, broken evals

6. **Expect failures:** 100% pass rate means tasks are too easy

7. **Learn from failures:** Failures are data, not disappointments

8. **Iterate:** First run will reveal issues with tasks themselves

---

## Common Pitfalls

1. **Tasks too easy:** All passing means you're not testing real capabilities

2. **Tasks too hard:** <10% pass rate means task is poorly specified

3. **Graders too strict:** Reject valid solutions (test manually)

4. **Graders too loose:** Accept invalid solutions

5. **No cleanup:** Fills up /tmp directory

6. **Hardcoded paths:** Break when running elsewhere

7. **No error handling:** One error crashes entire suite

8. **Not saving data:** Can't analyze failures later

---

## Success Criteria

Your submission should demonstrate:

1. **Working eval framework** that runs reliably
2. **Diverse task coverage** testing different capabilities
3. **Proper isolation** with no trial interference
4. **Meaningful metrics** that guide improvement
5. **Thoughtful analysis** showing understanding of results
6. **Action on insights** via improvement experiment

**The goal isn't a perfect pass rate.** The goal is a system that helps you understand and improve your agent.

Good luck!
