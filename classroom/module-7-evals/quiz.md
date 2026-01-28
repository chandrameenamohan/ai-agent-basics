# Module 7: Evaluations - Quiz

## Instructions

Answer all questions. For coding questions, write the code by hand (no IDE).

**Time limit:** 45 minutes

---

## Part 1: Conceptual Understanding (40 points)

### Question 1 (10 points)
Why can't you reliably test agent systems with single-run tests like traditional software? Explain what "stochastic" means in this context and what testing approach solves this problem.

**Your answer:**

---

### Question 2 (10 points)
Explain the difference between pass@k and pass^k metrics. Give a concrete example where each would be the appropriate metric to track.

**Your answer:**

---

### Question 3 (10 points)
Why is trial isolation critical for eval systems? What are three things that could go wrong if trials share workspace directories?

**Your answer:**

---

### Question 4 (10 points)
When should you use deterministic graders vs. model-based graders? Give one advantage and one disadvantage of each approach.

**Your answer:**

---

## Part 2: Code Analysis (30 points)

### Question 5 (15 points)
This composite grader has a logic bug. Identify the bug, explain why it's wrong, and provide the corrected version.

```typescript
function compositeGrader(graders: Grader[]): Grader {
  return {
    name: "composite",
    grade: async (workspace: string, transcript: Message[]) => {
      const results = await Promise.all(
        graders.map(g => g.grade(workspace, transcript))
      );

      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const anyPassed = results.some(r => r.passed);

      return {
        score: avgScore,
        passed: anyPassed,
        explanation: "Composite grade"
      };
    }
  };
}
```

**Bug:**

**Why it's wrong:**

**Correct version:**

---

### Question 6 (15 points)
This trial runner doesn't properly isolate trials. Identify all the problems and fix them.

```typescript
const sharedWorkspace = "/tmp/eval-workspace";

async function runTrial(task: EvalTask, agent: Agent): Promise<Trial> {
  await fs.mkdir(sharedWorkspace);
  await task.setup();

  const transcript = await agent.run(task.prompt, sharedWorkspace);
  const grade = await task.grader.grade(sharedWorkspace, transcript);

  return { taskId: task.id, trialNumber: 0, transcript, grade, durationMs: 0 };
}
```

**Problems:**

**Fixed version:**

---

## Part 3: Implementation (30 points)

### Question 7 (15 points)
Implement a grader that checks if a file contains a specific function with a specific signature. The grader should pass if the function exists with the exact signature, and fail otherwise.

```typescript
function functionSignatureGrader(
  filePath: string,
  functionName: string,
  expectedSignature: string
): Grader {
  // Your implementation
  // Example: functionSignatureGrader("utils.ts", "add", "function add(a: number, b: number): number")
}
```

**Your implementation:**

---

### Question 8 (15 points)
Implement a function that determines the minimum number of trials needed to achieve 95% confidence that pass@3 is above 90%, given an observed pass rate.

Use this formula: pass@3 = 1 - (1 - p)^3

```typescript
function calculateMinTrials(observedPassRate: number): number {
  // Your implementation
  // Should return minimum trials needed for statistical significance
  // Assume we need at least observedPassRate * numTrials >= 10 successes
  // And want pass@3 >= 0.90
}

// Test case:
// If observedPassRate = 0.7, pass@3 = 0.973
// Need enough trials to be confident in this 0.7 estimate
```

**Your implementation:**

---

## Bonus Question (10 points)

### Question 9
Design an eval task that tests whether an agent can perform multi-step reasoning. Describe:

a) What the setup() function creates
b) What the prompt asks the agent to do
c) What grader(s) you'd use and why
d) What pass rate you'd expect and why

**Your answer:**

---

## Answer Key (For Instructor)

### Question 1 (10 points)
**Expected answer:**
- Agents use LLMs which are stochastic (non-deterministic)
- Same prompt can produce different results
- Single test doesn't tell you reliability
- Solution: Run multiple trials, compute statistics (pass rate)
- Need 5-10 trials minimum for meaningful data

**Grading:**
- 3 pts: Explains stochastic nature
- 3 pts: Explains why single test insufficient
- 2 pts: Mentions multiple trials
- 2 pts: Mentions statistics/pass rate

### Question 2 (10 points)
**Expected answer:**
- pass@k: Probability of at least one success in k attempts = 1 - (1-p)^k
- pass^k: Probability of all k attempts succeeding = p^k
- pass@k example: Code generation where user can retry until success
- pass^k example: Critical operation that must succeed every time (e.g., safety check)

**Grading:**
- 2 pts: Correct pass@k formula/explanation
- 2 pts: Correct pass^k formula/explanation
- 3 pts: Good pass@k use case
- 3 pts: Good pass^k use case

### Question 3 (10 points)
**Expected answer:**
- Isolation prevents trials from interfering with each other
- Problems without isolation:
  1. File conflicts (trial 2 overwrites trial 1's files)
  2. State leakage (trial 2 sees trial 1's output)
  3. Race conditions (parallel trials conflict)
  4. Can't determine which trial caused which files
- Solution: Fresh workspace per trial (mkdtemp)

**Grading:**
- 4 pts: Explains why isolation needed
- 6 pts: Three valid problems (2 pts each)

### Question 4 (10 points)
**Expected answer:**
- Deterministic: Use when success criteria are objective
  - Advantage: No variance, faster, cheaper
  - Disadvantage: Can't judge subjective quality
- Model-based: Use when criteria are subjective
  - Advantage: Can judge quality, style, etc.
  - Disadvantage: Slower, more expensive, adds variance

**Grading:**
- 2 pts: When to use deterministic
- 2 pts: Deterministic advantage
- 2 pts: Deterministic disadvantage
- 2 pts: When to use model-based
- 1 pt: Model-based advantage
- 1 pt: Model-based disadvantage

### Question 5 (15 points)
**Bug:** Uses `anyPassed` (some) instead of `allPassed` (every)

**Why wrong:** Composite should pass only if ALL sub-graders pass, not just one

**Correct:**
```typescript
const allPassed = results.every(r => r.passed);

return {
  score: avgScore,
  passed: allPassed,  // Changed from anyPassed
  explanation: results.map((r, i) =>
    `${graders[i].name}: ${r.explanation}`
  ).join("\n")
};
```

**Grading:**
- 5 pts: Identifies anyPassed bug
- 5 pts: Explains should be allPassed
- 5 pts: Correct implementation (including better explanation)

### Question 6 (15 points)
**Problems:**
1. Shared workspace across all trials
2. No cleanup of workspace
3. No duration tracking
4. Setup doesn't return workspace path
5. No try/finally for cleanup
6. Workspace not passed to task.setup()

**Fixed:**
```typescript
async function runTrial(
  task: EvalTask,
  trialNumber: number,
  agent: Agent
): Promise<Trial> {
  const startTime = Date.now();
  const workspace = await task.setup(); // Returns workspace path

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

**Grading:**
- 6 pts: Identifies problems (1 pt each for 6 problems)
- 9 pts: Correct implementation
  - 2 pts: setup() returns workspace
  - 2 pts: Duration tracking
  - 2 pts: try/finally
  - 2 pts: Cleanup in finally
  - 1 pt: Trial number parameter

### Question 7 (15 points)
**Sample solution:**
```typescript
function functionSignatureGrader(
  filePath: string,
  functionName: string,
  expectedSignature: string
): Grader {
  return {
    name: "function-signature",
    grade: async (workspace: string): Promise<GradeResult> => {
      try {
        const fullPath = path.join(workspace, filePath);
        const content = await fs.readFile(fullPath, "utf-8");

        // Normalize whitespace for comparison
        const normalizedContent = content.replace(/\s+/g, " ");
        const normalizedSignature = expectedSignature.replace(/\s+/g, " ");

        const passed = normalizedContent.includes(normalizedSignature);

        return {
          score: passed ? 1.0 : 0.0,
          passed,
          explanation: passed
            ? `Found function: ${expectedSignature}`
            : `Function signature not found: ${expectedSignature}`
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

**Grading:**
- 3 pts: Grader interface correct
- 3 pts: Reads file correctly
- 3 pts: Checks for signature (handles whitespace)
- 3 pts: Returns proper GradeResult
- 3 pts: Error handling

### Question 8 (15 points)
**Sample solution:**
```typescript
function calculateMinTrials(observedPassRate: number): number {
  // Need enough successes for statistical confidence
  // Rule of thumb: at least 10 successes
  const minSuccesses = 10;
  const minTrialsForConfidence = Math.ceil(minSuccesses / observedPassRate);

  // Also check if pass@3 meets threshold
  const passAt3 = 1 - Math.pow(1 - observedPassRate, 3);

  // If pass@3 < 0.90, we need better pass rate or more info
  if (passAt3 < 0.90) {
    // Pass rate too low, can't achieve 90% pass@3
    return Infinity;
  }

  // Return minimum trials needed for confidence
  return Math.max(minTrialsForConfidence, 5); // At least 5 trials
}
```

Alternative simpler answer:
```typescript
function calculateMinTrials(observedPassRate: number): number {
  // We need at least 10 successes for statistical significance
  // numTrials * passRate >= 10
  // numTrials >= 10 / passRate
  return Math.ceil(10 / observedPassRate);
}
```

**Grading:**
- 5 pts: Considers statistical significance
- 5 pts: Considers pass@3 threshold
- 5 pts: Returns reasonable number

### Question 9 (10 points - Bonus)
**Sample answer:**
a) Setup creates: Multiple related files (e.g., main.ts, utils.ts, config.json) with intentional issues
b) Prompt: "Analyze all files, identify the issue causing tests to fail, and fix it across all relevant files"
c) Graders:
   - Shell test grader to run tests (deterministic, objective)
   - Composite of file existence checks
   - Maybe model grader for code quality
d) Expected pass rate: 40-60% because multi-step reasoning is harder; agents often miss some files or incomplete fixes

**Grading:**
- 2 pts: Reasonable setup
- 3 pts: Multi-step prompt
- 3 pts: Appropriate graders with reasoning
- 2 pts: Realistic pass rate expectation with reasoning

---

## Scoring

- **90-100:** Excellent understanding
- **80-89:** Good understanding, minor gaps
- **70-79:** Adequate understanding, some confusion
- **Below 70:** Needs review

**Total possible:** 100 points (110 with bonus)
