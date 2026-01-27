# Module 9: Self-Improvement

## Goal
Close the eval-improve loop: your agent reads its own eval failures and patches its system prompt to prevent them. This is the turning point — your agent starts improving itself.

## Concepts

### The bootstrap loop
The core algorithm:
```
eval → analyze failures → improve prompt → re-eval → keep or revert
```

1. Run evals, get a scorecard
2. If 100% pass rate, stop — nothing to fix
3. Feed the failures to a "meta-agent" that analyzes patterns
4. The meta-agent proposes new rules for the system prompt
5. Apply the rules, git commit
6. Re-run evals
7. If pass rate improved, keep the changes. If not, git revert.

The agent **literally cannot make itself worse**. Git is the safety net.

### The meta-agent
A separate LLM call that reads:
- The current system prompt source code
- The overall pass rate
- Every failure with its explanation and tool call trace

It responds with specific additions to the Rules section: `[{"description": "what this fixes", "addition": "text to add"}]`

### Why eval-gated changes?
Without evals, the meta-agent might add rules that sound good but actually hurt performance. "Always use verbose logging" might help debugging but waste tokens. The re-eval step catches regressions. Only measurable improvements survive.

### Prompt patching
The meta-agent doesn't rewrite the whole prompt — it appends numbered rules to the `## Rules` section. This is conservative by design. Each cycle adds 1-3 rules. Over multiple cycles, the prompt evolves to handle more failure modes.

## Build It

### Step 1: Build the meta-agent

Create `module-9-self-improve/improve.ts`:

```typescript
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { EvalReport } from "../module-7-evals/types.js";

const client = new Anthropic();

export interface Improvement {
  file: string;
  description: string;
  oldContent: string;
  newContent: string;
}

export async function analyzeAndImprove(
  report: EvalReport,
  agentSourceDir: string
): Promise<Improvement[]> {
  // TODO: Read the current system prompt from module-5-coding-agent/prompt.ts

  // TODO: Extract failure patterns from the report:
  //   For each failed trial: task id, explanation, turns used, tool calls

  // TODO: If no failures, return []

  // TODO: Send to Claude:
  //   "You are an agent improvement specialist. Analyze these failures and propose
  //    specific additions to the Rules section of the system prompt."
  //   Include: current prompt source, overall pass rate, failure details

  // TODO: Parse the JSON array response
  // TODO: For each suggestion, find the ## Rules section and append a new numbered rule
  // TODO: Return Improvement[] with old/new content for applying
}

export async function applyImprovements(
  improvements: Improvement[],
  baseDir: string
): Promise<void> {
  // TODO: For each improvement, read the file, replace oldContent with newContent, write back
}
```

### Step 2: Build the bootstrap loop

Create `module-9-self-improve/bootstrap.ts`:

```typescript
import "dotenv/config";
import { execSync } from "child_process";
import { runEvals } from "../module-7-evals/harness.js";
import { computeTaskResult, computeReport } from "../module-7-evals/metrics.js";
import { printReport } from "../module-7-evals/report.js";
import { codingTasks } from "../module-7-evals/tasks/coding-tasks.js";
import { analyzeAndImprove, applyImprovements } from "./improve.js";

// TODO: runEvalCycle(trialsPerTask) — run evals and return report

// TODO: gitSnapshot(message) — git add -A, commit, return commit hash
// TODO: gitRevert(hash) — git revert --no-commit, commit the revert

async function main() {
  const cycles = Number(process.argv[2]) || 3;
  const trialsPerTask = Number(process.argv[3]) || 2;

  for (let cycle = 1; cycle <= cycles; cycle++) {
    // TODO: 1. Run evals
    // TODO: 2. If 100% pass rate, stop
    // TODO: 3. Analyze failures, propose improvements
    // TODO: 4. Git snapshot before changes
    // TODO: 5. Apply improvements
    // TODO: 6. Git snapshot after changes
    // TODO: 7. Re-eval
    // TODO: 8. If improved, keep. If not, revert the after-commit.
  }
}

main().catch(console.error);
```

Run it: `bun module-9-self-improve/bootstrap.ts`

With custom settings: `bun module-9-self-improve/bootstrap.ts 5 3` (5 cycles, 3 trials per task)

## Exercises

1. **Run 3 bootstrap cycles**: Watch the pass rate between cycles. Did it improve? Check `module-5-coding-agent/prompt.ts` after — what rules were added?

2. **Read the git log**: `git log --oneline -10`. You should see snapshot commits and possibly revert commits. Each pair tells a story about a failed improvement attempt.

3. **Analyze the meta-agent's suggestions**: Before applying, print the suggestions. Are they specific and actionable? Or vague? What makes a good improvement suggestion?

4. **Force a revert**: After a successful cycle, manually add a terrible rule to the prompt (e.g., "Never use the read-file tool"). Run one cycle. The eval should fail worse, and the bootstrap should revert.

5. **Compare first and last prompt**: Save the prompt before running bootstrap. Run 5 cycles. Diff the before and after. How many rules were added? Are they redundant or complementary?

## Checkpoint

You're ready for Module 10 when you can answer:
- Why is git the safety net for self-improvement?
- What happens if the meta-agent proposes a bad rule?
- Why append rules instead of rewriting the entire prompt?
- What data does the meta-agent need to propose good improvements?

## Solutions
Compare your code against `solutions/` if you're stuck.
