# Module 9 Handout: Self-Improving Agents

## Core Concept

**Eval-driven bootstrapping**: Agents that analyze their own failures, propose prompt improvements, test changes, and keep only what improves performance.

**Feedback loop**: eval → analyze failures → improve prompt → re-eval → keep or revert

## Bootstrap Loop Structure

```typescript
for (let cycle = 0; cycle < maxCycles; cycle++) {
  const snapshot = gitCommit(`cycle-${cycle}-start`);
  const report = await runEvalCycle(trialsPerTask);

  if (report.overallPassRate >= targetPassRate) break;

  const improvements = await analyzeFailures(report, currentPrompt);
  await applyImprovements(improvements, promptPath);

  const newReport = await runEvalCycle(trialsPerTask);
  if (newReport.overallPassRate > report.overallPassRate) {
    gitCommit(`cycle-${cycle}-improved`);  // Keep
  } else {
    gitRevert(snapshot);  // Revert
  }
}
```

## Key Components

### 1. Eval Report

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
  transcript: string;  // Full conversation for failures
  error?: string;
}
```

**Critical**: Save full transcripts of failed tasks for meta-agent analysis.

### 2. Meta-Agent

Analyzes failure transcripts and proposes improvements.

```typescript
const META_AGENT_PROMPT = `You are a meta-agent that improves other agents.

Input:
1. Current agent system prompt
2. Transcripts of failed tasks

Output JSON:
{
  "improvements": [
    {
      "description": "Why this helps",
      "addition": "Exact text to add to Rules section"
    }
  ]
}

Guidelines:
- Identify patterns, not one-off mistakes
- Be specific: "Always validate paths" not "Be careful"
- Be minimal: 1-3 improvements per cycle
- Append rules, don't rewrite prompt`;
```

### 3. Prompt Patching

Append improvements to Rules section:

```typescript
async function applyImprovements(
  improvements: Improvement[],
  promptPath: string
) {
  let prompt = await fs.readFile(promptPath, "utf-8");

  // Find Rules section
  const rulesMatch = prompt.match(/## Rules\n\n([\s\S]*?)(?=\n##|$)/);
  const lastRuleNum = rulesMatch[1].trim().split("\n").length;

  // Append numbered rules
  const newRules = improvements.map((imp, i) => {
    return `${lastRuleNum + i + 1}. ${imp.addition}`;
  }).join("\n");

  const updated = prompt.replace(
    /## Rules\n\n([\s\S]*?)(?=\n##|$)/,
    `## Rules\n\n$1\n${newRules}\n`
  );

  await fs.writeFile(promptPath, updated);
}
```

**Why numbered?** Easy to track which rules were added when.

### 4. Git Safety Net

```typescript
// Snapshot
function gitCommit(message: string): string {
  execSync("git add .");
  execSync(`git commit -m "${message}"`);
  return execSync("git rev-parse HEAD").toString().trim();
}

// Revert
function gitRevert(commitHash: string): void {
  execSync(`git reset --hard ${commitHash}`);
}
```

**Pattern**: Commit before changes, revert if pass rate doesn't improve.

## Improvement Format

```json
{
  "improvements": [
    {
      "description": "Agent forgets to check if directory exists",
      "addition": "Rule 47: Before writing files, ensure parent directory exists."
    },
    {
      "description": "Agent doesn't validate tool results",
      "addition": "Rule 48: After tool execution, check result for errors before proceeding."
    }
  ]
}
```

## Complete Flow

```
1. Run evals → Get baseline pass rate (e.g., 65%)
2. Git commit → Snapshot current state
3. Meta-agent analyzes failures → Proposes 2 new rules
4. Apply rules → Append to prompt
5. Re-run evals → Get new pass rate (e.g., 72%)
6. Compare → 72% > 65% → Keep (git commit)
7. Repeat until target pass rate reached
```

## Decision Logic

```typescript
if (newPassRate > oldPassRate) {
  // Improvement! Keep changes
  gitCommit(`cycle-${cycle}-improved`);
} else {
  // No improvement or regression. Revert
  gitRevert(snapshot);
}
```

**Key insight**: Objective metric (pass rate) decides, not subjective judgment.

## Best Practices

### Conservative Changes
- Append 1-3 rules per cycle, not 10
- Don't rewrite entire prompt
- Target specific failure patterns

### Multiple Trials
```typescript
trialsPerTask: 3  // Run each task 3 times, average results
```
Reduces noise from model variance.

### Target Thresholds
```typescript
targetPassRate: 0.90  // Stop when 90% of tasks pass
```
Prevents over-optimization.

### Prompt Structure
```markdown
## Rules

1. Rule from initial design
2. Rule from cycle 0
3. Rule from cycle 1
...

## Tools
...
```

Dedicated Rules section makes patching easy.

## Common Patterns

### Failure Analysis
```typescript
const failures = report.tasks.filter(t => !t.passed);
const failureContext = failures
  .map(f => `Task: ${f.description}\n\nTranscript:\n${f.transcript}`)
  .join("\n\n---\n\n");
```

### Improvement Extraction
```typescript
const response = await metaAgent.analyze(currentPrompt, failureContext);
const jsonBlock = response.content.find(b =>
  b.type === "text" && b.text.includes('"improvements"')
);
const improvements = JSON.parse(jsonBlock.text).improvements;
```

### Cycle Logging
```typescript
console.log(`Cycle ${cycle}: ${oldRate}% → ${newRate}%`);
if (newRate > oldRate) {
  console.log(`✓ Kept ${improvements.length} improvements`);
} else {
  console.log(`✗ Reverted`);
}
```

## Limitations & Solutions

| Problem | Solution |
|---------|----------|
| Local optima | Periodic prompt resets, try different starting points |
| Overfitting to evals | Use holdout eval set |
| Prompt bloat | Rule pruning, consolidation |
| Non-determinism | Multiple trials, statistical significance tests |

## Key Metrics

- **Pass rate improvement**: ΔPass = newPassRate - oldPassRate
- **Rules added**: Count of successful rule additions
- **Cycles to target**: Number of cycles to reach targetPassRate
- **Revert rate**: Percentage of cycles that were reverted

## Example Output

```
Cycle 0: 65.0% → 72.0% ✓ Kept 2 improvements
Cycle 1: 72.0% → 78.0% ✓ Kept 1 improvement
Cycle 2: 78.0% → 76.0% ✗ Reverted
Cycle 3: 78.0% → 85.0% ✓ Kept 1 improvement
Cycle 4: 85.0% → 92.0% ✓ Kept 1 improvement

Target reached! Final pass rate: 92.0%
```

## Integration with Harness

Bootstrap uses harness features:
- **Session persistence**: Save eval transcripts
- **Progress tracking**: Track improvement cycles
- **Git integration**: Safety net for experiments

## Next Module Preview

Module 10: **Fine-tuning** - Bake successful patterns from self-improvement into model weights, reducing prompt complexity while maintaining performance.
