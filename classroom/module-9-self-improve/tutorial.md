# Module 9 Tutorial: Self-Improving Agents

## Introduction

You've built agents that can code, pass evaluations, and run in production harnesses. But what if an agent could **improve itself**?

This module teaches **eval-driven bootstrapping**: agents that analyze their own failures, propose improvements to their prompts, test the changes, and keep only the improvements that work.

It's a complete feedback loop: eval → analyze → improve → re-eval → keep or revert.

## The Problem: Manual Tuning

Without self-improvement, you tune agents manually:

```typescript
// Manual improvement cycle
const results = await runEvalSuite(agent);
console.log("Pass rate: 65%");

// You read failures, figure out what's wrong
// You edit the system prompt
// You re-run evals
// You hope it improved

const newResults = await runEvalSuite(agent);
console.log("Pass rate: 72%"); // Better? Keep it. Worse? Revert.
```

This is slow, subjective, and doesn't scale. What if the agent did this itself?

## The Solution: Bootstrap Loop

A **bootstrap loop** automates improvement:

```typescript
for (let cycle = 0; cycle < maxCycles; cycle++) {
  const snapshot = gitCommit(`cycle-${cycle}-start`);
  const report = await runEvalCycle();

  if (report.passRate >= targetPassRate) break; // Good enough

  const improvements = await analyzeFailures(report);
  applyImprovements(improvements);

  const newReport = await runEvalCycle();
  if (newReport.passRate > report.passRate) {
    gitCommit(`cycle-${cycle}-improved`); // Keep
  } else {
    gitRevert(snapshot); // Revert
  }
}
```

Key insights:
1. **Git as safety net**: Commit before changes, revert if worse
2. **Meta-agent**: An agent analyzes failures and proposes fixes
3. **Conservative changes**: Append rules, don't rewrite prompts
4. **Objective metric**: Pass rate decides keep vs. revert

## Part 1: The Bootstrap Architecture

### Components

1. **Eval harness** (from Module 7): Runs tasks, grades results
2. **Meta-agent**: Reads failures, proposes prompt improvements
3. **Prompt patcher**: Applies improvements to system prompt
4. **Git integration**: Snapshots and reverts

### Data Flow

```
┌─────────────┐
│   Eval      │  Run tasks, collect pass/fail + transcripts
│   Harness   │
└──────┬──────┘
       │ Failure transcripts
       v
┌─────────────┐
│    Meta-    │  Analyze patterns, propose rules
│    Agent    │
└──────┬──────┘
       │ Improvements: [{ description, addition }]
       v
┌─────────────┐
│   Prompt    │  Append rules to system prompt
│   Patcher   │
└──────┬──────┘
       │ Updated prompt
       v
┌─────────────┐
│   Re-eval   │  Test new pass rate
└──────┬──────┘
       │
       v
   Keep or revert?
```

## Part 2: Eval Cycle

First, you need an eval cycle that returns structured results.

### Eval Report Format

```typescript
interface EvalReport {
  cycleId: string;
  timestamp: string;
  tasks: TaskResult[];
  overallPassRate: number;
  passedTasks: number;
  totalTasks: number;
}

interface TaskResult {
  taskId: string;
  description: string;
  passed: boolean;
  transcript: string; // Full conversation for failed tasks
  error?: string;
}
```

### Running Evals

```typescript
async function runEvalCycle(trialsPerTask = 1): Promise<EvalReport> {
  const tasks = await loadTasks(); // From Module 7
  const results: TaskResult[] = [];

  for (const task of tasks) {
    for (let trial = 0; trial < trialsPerTask; trial++) {
      const session = await runAgent(task.description);
      const grade = await gradeTask(task, session);

      if (!grade.passed) {
        results.push({
          taskId: task.id,
          description: task.description,
          passed: false,
          transcript: formatTranscript(session.messages)
        });
      } else {
        results.push({
          taskId: task.id,
          description: task.description,
          passed: true,
          transcript: ""
        });
      }
    }
  }

  const passedTasks = results.filter(r => r.passed).length;

  return {
    cycleId: randomUUID(),
    timestamp: new Date().toISOString(),
    tasks: results,
    overallPassRate: passedTasks / results.length,
    passedTasks,
    totalTasks: results.length
  };
}
```

**Key**: Save full transcripts for failed tasks. The meta-agent needs these to understand what went wrong.

### Transcript Format

```typescript
function formatTranscript(messages: MessageParam[]): string {
  return messages.map(msg => {
    if (msg.role === "user") {
      return `User: ${typeof msg.content === "string" ? msg.content : "[tools]"}`;
    } else {
      return `Assistant: ${formatContent(msg.content)}`;
    }
  }).join("\n\n");
}
```

## Part 3: Meta-Agent

The meta-agent reads failure transcripts and proposes specific improvements.

### Prompt Design

```typescript
const META_AGENT_PROMPT = `You are a meta-agent that improves other agents.

You will receive:
1. The current agent's system prompt
2. Transcripts of tasks the agent failed

Your job:
- Identify patterns in the failures (not one-off mistakes)
- Propose specific, actionable rules to add to the system prompt
- Each rule should address a failure pattern

Output JSON:
{
  "improvements": [
    {
      "description": "Why this improvement helps",
      "addition": "The exact text to add to the Rules section"
    }
  ]
}

Guidelines:
- Be conservative: only suggest rules that address clear patterns
- Be specific: "Always validate file paths" not "Be more careful"
- Be minimal: 1-3 improvements per cycle, not 10
- Don't rewrite the prompt, just add rules`;
```

### Implementation

```typescript
async function analyzeFailures(
  report: EvalReport,
  currentPrompt: string
): Promise<Improvement[]> {
  const failures = report.tasks.filter(t => !t.passed);

  if (failures.length === 0) return [];

  const failureContext = failures.map(f =>
    `Task: ${f.description}\n\nTranscript:\n${f.transcript}`
  ).join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Current system prompt:\n${currentPrompt}\n\n` +
               `Failed tasks:\n${failureContext}\n\n` +
               `Analyze these failures and propose improvements.`
    }],
    system: META_AGENT_PROMPT
  });

  const jsonBlock = response.content.find(
    block => block.type === "text" && block.text.includes('"improvements"')
  );

  if (!jsonBlock || jsonBlock.type !== "text") return [];

  const data = JSON.parse(jsonBlock.text);
  return data.improvements;
}
```

### Example Output

```json
{
  "improvements": [
    {
      "description": "Agent is writing to files without checking if directory exists first",
      "addition": "Rule 47: Before writing to a file, ensure the parent directory exists (create it if needed)."
    },
    {
      "description": "Agent is not validating tool results before using them",
      "addition": "Rule 48: After executing a tool, check the result for errors before proceeding. If a tool fails, try an alternative approach."
    }
  ]
}
```

## Part 4: Prompt Patching

Apply improvements by appending rules to the system prompt.

### Prompt Structure

Your system prompt should have a dedicated Rules section:

```typescript
const BASE_PROMPT = `You are a coding agent.

## Rules

1. Always validate paths before file operations
2. Check tool results for errors
...

## Tools

You have access to:
- write-file
- read-file
...
`;
```

### Patching Logic

```typescript
async function applyImprovements(
  improvements: Improvement[],
  promptPath: string
): Promise<void> {
  let prompt = await fs.readFile(promptPath, "utf-8");

  // Find the Rules section
  const rulesMatch = prompt.match(/## Rules\n\n([\s\S]*?)(?=\n##|$)/);
  if (!rulesMatch) {
    throw new Error("No Rules section found in prompt");
  }

  // Parse existing rules to get the next number
  const existingRules = rulesMatch[1].trim().split("\n");
  const lastRuleNum = existingRules.length;

  // Append new rules
  const newRules = improvements.map((imp, i) => {
    const ruleNum = lastRuleNum + i + 1;
    return `${ruleNum}. ${imp.addition}`;
  }).join("\n");

  // Insert after last rule
  const updatedPrompt = prompt.replace(
    /## Rules\n\n([\s\S]*?)(?=\n##|$)/,
    `## Rules\n\n$1\n${newRules}\n`
  );

  await fs.writeFile(promptPath, updatedPrompt);
}
```

**Why numbered rules?** Makes it easy to track which rules were added in which cycle.

## Part 5: Git Integration

Use Git to snapshot before changes and revert if performance degrades.

### Snapshot

```typescript
import { execSync } from "child_process";

function gitCommit(message: string): string {
  execSync("git add .");
  execSync(`git commit -m "${message}"`);
  const hash = execSync("git rev-parse HEAD").toString().trim();
  return hash;
}
```

### Revert

```typescript
function gitRevert(commitHash: string): void {
  execSync(`git reset --hard ${commitHash}`);
}
```

### Safe Wrapper

```typescript
async function withGitSafety<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const snapshot = gitCommit(`${label}-start`);
  try {
    const result = await fn();
    gitCommit(`${label}-complete`);
    return result;
  } catch (error) {
    console.error(`Reverting to ${snapshot} due to error`);
    gitRevert(snapshot);
    throw error;
  }
}
```

## Part 6: The Complete Bootstrap Loop

Putting it all together:

```typescript
async function bootstrap(options: {
  maxCycles: number;
  targetPassRate: number;
  trialsPerTask: number;
  promptPath: string;
}) {
  console.log("Starting bootstrap...");

  for (let cycle = 0; cycle < options.maxCycles; cycle++) {
    console.log(`\n=== Cycle ${cycle} ===`);

    // Snapshot before changes
    const snapshot = gitCommit(`cycle-${cycle}-start`);

    // Run eval cycle
    console.log("Running evals...");
    const report = await runEvalCycle(options.trialsPerTask);
    console.log(`Pass rate: ${(report.overallPassRate * 100).toFixed(1)}%`);

    // Check if we're done
    if (report.overallPassRate >= options.targetPassRate) {
      console.log("Target pass rate achieved!");
      break;
    }

    // Analyze failures
    console.log("Analyzing failures...");
    const prompt = await fs.readFile(options.promptPath, "utf-8");
    const improvements = await analyzeFailures(report, prompt);

    if (improvements.length === 0) {
      console.log("No improvements suggested. Stopping.");
      break;
    }

    console.log(`Applying ${improvements.length} improvements:`);
    improvements.forEach(imp => console.log(`- ${imp.description}`));

    // Apply improvements
    await applyImprovements(improvements, options.promptPath);

    // Re-eval
    console.log("Re-running evals...");
    const newReport = await runEvalCycle(options.trialsPerTask);
    console.log(`New pass rate: ${(newReport.overallPassRate * 100).toFixed(1)}%`);

    // Decide: keep or revert
    if (newReport.overallPassRate > report.overallPassRate) {
      console.log("Improvement! Keeping changes.");
      gitCommit(`cycle-${cycle}-improved`);
    } else {
      console.log("No improvement. Reverting.");
      gitRevert(snapshot);
    }
  }

  console.log("\nBootstrap complete!");
}
```

### Running It

```typescript
await bootstrap({
  maxCycles: 10,
  targetPassRate: 0.90,
  trialsPerTask: 1,
  promptPath: "./agent-prompt.md"
});
```

### Example Output

```
Starting bootstrap...

=== Cycle 0 ===
Running evals...
Pass rate: 65.0%
Analyzing failures...
Applying 2 improvements:
- Agent is not checking if directories exist before writing
- Agent is not validating tool results
Re-running evals...
New pass rate: 72.0%
Improvement! Keeping changes.

=== Cycle 1 ===
Running evals...
Pass rate: 72.0%
Analyzing failures...
Applying 1 improvement:
- Agent is forgetting to handle edge cases in validation logic
Re-running evals...
New pass rate: 78.0%
Improvement! Keeping changes.

=== Cycle 2 ===
Running evals...
Pass rate: 78.0%
Analyzing failures...
Applying 2 improvements:
- Agent should retry failed operations once before giving up
- Agent should provide more informative error messages
Re-running evals...
New pass rate: 76.0%
No improvement. Reverting.

=== Cycle 3 ===
Running evals...
Pass rate: 78.0%
Analyzing failures...
Applying 1 improvement:
- Agent should validate regex patterns before using them
Re-running evals...
New pass rate: 85.0%
Improvement! Keeping changes.

=== Cycle 4 ===
Running evals...
Pass rate: 85.0%
Analyzing failures...
Applying 1 improvement:
- Agent should check array bounds before accessing elements
Re-running evals...
New pass rate: 92.0%
Improvement! Keeping changes.

Target pass rate achieved!
Bootstrap complete!
```

## Part 7: Advanced Techniques

### 7.1 Multiple Trials

Run each task multiple times to reduce noise:

```typescript
trialsPerTask: 3  // Average pass rate across 3 runs
```

This prevents one-off failures from triggering unnecessary changes.

### 7.2 Progressive Thresholds

Start with low bar, raise it gradually:

```typescript
const thresholds = [0.70, 0.80, 0.90];
for (const target of thresholds) {
  await bootstrap({ targetPassRate: target, ... });
}
```

### 7.3 Improvement Categories

Categorize improvements by type:

```typescript
interface Improvement {
  description: string;
  addition: string;
  category: "validation" | "error-handling" | "edge-cases" | "other";
}
```

Track which categories help most.

### 7.4 Failure Clustering

Group similar failures before analysis:

```typescript
function clusterFailures(failures: TaskResult[]): Map<string, TaskResult[]> {
  // Use embeddings or simple keyword matching to cluster similar errors
  // Feed each cluster separately to meta-agent
}
```

## Key Takeaways

1. **Eval-driven**: Objective metrics (pass rate) decide what to keep
2. **Git safety**: Always commit before changes, revert if worse
3. **Conservative**: Append rules, don't rewrite prompts
4. **Meta-agent**: Another agent does the analysis and proposes changes
5. **Iterative**: Multiple cycles, each building on the last

This creates a feedback loop where agents get better over time, automatically.

## Limitations

- **Local optima**: Can get stuck at a certain pass rate
- **Overfitting**: May optimize for eval tasks, not general ability
- **Prompt bloat**: Adding rules indefinitely makes prompts unwieldy
- **Non-determinism**: Model variance means pass rates fluctuate

Solutions:
- Periodic prompt compression (consolidate rules)
- Holdout eval sets
- Rule pruning (remove rules that don't help)
- Multiple trials to smooth variance

## Next Steps

In Module 10, you'll use **fine-tuning** to bake successful patterns from self-improvement into the model's weights, creating a base model that needs fewer rules to achieve the same performance.

Self-improvement gets you to 90%. Fine-tuning gets you to 95% without the prompt bloat.
