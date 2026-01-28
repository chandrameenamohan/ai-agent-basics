# Module 9 Lab: Build a Self-Improving Agent

## Objective

Build a complete eval-driven bootstrap system that automatically improves an agent by analyzing failures and testing prompt changes.

## Setup

Create a new directory:

```bash
mkdir module-9-self-improve/my-bootstrap
cd module-9-self-improve/my-bootstrap
git init  # Git is required for safety net
```

You'll build:
1. `eval-harness.ts` - Run tasks and collect results
2. `meta-agent.ts` - Analyze failures and propose improvements
3. `prompt-patcher.ts` - Apply improvements to prompt
4. `bootstrap.ts` - Main loop
5. `agent-prompt.md` - The prompt being improved

## Part 1: Eval Harness (40 min)

### Task 1.1: Define Eval Types

Create `eval-harness.ts`:

```typescript
export interface EvalReport {
  cycleId: string;
  timestamp: string;
  tasks: TaskResult[];
  overallPassRate: number;
  passedTasks: number;
  totalTasks: number;
}

export interface TaskResult {
  taskId: string;
  description: string;
  passed: boolean;
  transcript: string;  // Only for failures
  error?: string;
}

export interface EvalTask {
  id: string;
  description: string;
  grader: (output: string) => boolean;
}
```

### Task 1.2: Create Test Tasks

```typescript
const EVAL_TASKS: EvalTask[] = [
  {
    id: "create-file",
    description: "Create a file named 'test.txt' with content 'Hello, world!'",
    grader: (output) => output.includes("test.txt") && output.includes("Hello")
  },
  {
    id: "list-files",
    description: "List all .ts files in the current directory",
    grader: (output) => output.includes(".ts")
  },
  {
    id: "validate-path",
    description: "Check if the path '/etc/passwd' exists and report the result",
    grader: (output) => output.toLowerCase().includes("exists") || output.toLowerCase().includes("found")
  },
  // Add 2-3 more tasks
];
```

**Grader note**: These are simple string-check graders. In production, use more sophisticated validation.

### Task 1.3: Run Eval Cycle

```typescript
import { randomUUID } from "crypto";

export async function runEvalCycle(
  agent: (task: string) => Promise<string>,
  trialsPerTask = 1
): Promise<EvalReport> {
  // TODO:
  // 1. For each task, run it trialsPerTask times
  // 2. For each run, call agent(task.description)
  // 3. Grade the output with task.grader
  // 4. If failed, save full transcript
  // 5. Calculate overall pass rate
  // 6. Return EvalReport
}
```

**Hint**: You'll need to modify your agent to return a summary string and save the full session.

### Task 1.4: Format Transcript

```typescript
function formatTranscript(messages: MessageParam[]): string {
  // TODO:
  // 1. Map each message to "Role: content"
  // 2. Join with double newlines
  // 3. Return formatted string
}
```

**Test**: Run eval cycle with a simple agent. Verify report structure.

## Part 2: Meta-Agent (40 min)

Create `meta-agent.ts`:

### Task 2.1: Define Meta Prompt

```typescript
const META_AGENT_PROMPT = `You are a meta-agent that improves other agents.

You will receive:
1. The current agent's system prompt
2. Transcripts of tasks the agent failed

Your job:
- Identify PATTERNS in failures (not one-off mistakes)
- Propose specific, actionable rules to add to the system prompt
- Each rule should address a clear failure pattern

Output JSON in this exact format:
{
  "improvements": [
    {
      "description": "Clear explanation of the pattern and why this rule helps",
      "addition": "The exact text to add as a numbered rule"
    }
  ]
}

Guidelines:
- Be conservative: only suggest rules for clear patterns (2+ similar failures)
- Be specific: "Always validate file paths exist before reading" not "Be more careful"
- Be minimal: Suggest 1-3 improvements per cycle, not 10
- Don't rewrite the entire prompt, just append new rules
- Rules should be actionable and testable`;

export { META_AGENT_PROMPT };
```

### Task 2.2: Analyze Failures

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Improvement {
  description: string;
  addition: string;
}

export async function analyzeFailures(
  report: EvalReport,
  currentPrompt: string
): Promise<Improvement[]> {
  // TODO:
  // 1. Filter report.tasks for failures
  // 2. If no failures, return []
  // 3. Build failure context string (task + transcript for each)
  // 4. Call Claude with META_AGENT_PROMPT
  // 5. Extract JSON from response
  // 6. Parse and return improvements array
}
```

**Test**: Create a mock report with 2 failures. Verify meta-agent returns JSON with improvements.

## Part 3: Prompt Patcher (30 min)

Create `prompt-patcher.ts`:

### Task 3.1: Create Base Prompt

Create `agent-prompt.md`:

```markdown
# Coding Agent System Prompt

You are a coding agent with access to file tools.

## Rules

1. Always check tool results for errors before proceeding
2. Validate all file paths before operations
3. Use read-file before modifying existing files

## Tools

You have access to:
- read-file: Read file contents
- write-file: Write content to file
- list-files: List directory contents

Complete the user's task efficiently and accurately.
```

### Task 3.2: Apply Improvements

```typescript
import * as fs from "fs/promises";

export async function applyImprovements(
  improvements: Improvement[],
  promptPath: string
): Promise<void> {
  // TODO:
  // 1. Read current prompt
  // 2. Find "## Rules" section with regex
  // 3. Count existing rules to get next rule number
  // 4. Format new rules with consecutive numbers
  // 5. Insert after last existing rule
  // 6. Write updated prompt back to file
}
```

**Regex hint**:
```typescript
const rulesMatch = prompt.match(/## Rules\n\n([\s\S]*?)(?=\n##|$)/);
```

**Test**: Apply 2 mock improvements. Verify they appear as numbered rules.

## Part 4: Git Integration (20 min)

In `bootstrap.ts`:

### Task 4.1: Git Helpers

```typescript
import { execSync } from "child_process";

function gitCommit(message: string): string {
  // TODO:
  // 1. Stage all changes (git add .)
  // 2. Commit with message
  // 3. Return commit hash (git rev-parse HEAD)
}

function gitRevert(commitHash: string): void {
  // TODO: Hard reset to commit hash
}
```

**Safety check**: Initialize git repo before running bootstrap.

## Part 5: Bootstrap Loop (50 min)

### Task 5.1: Main Loop

```typescript
export interface BootstrapOptions {
  maxCycles: number;
  targetPassRate: number;
  trialsPerTask: number;
  promptPath: string;
}

export async function bootstrap(options: BootstrapOptions) {
  console.log("Starting bootstrap...\n");

  // TODO: Implement full bootstrap loop

  for (let cycle = 0; cycle < options.maxCycles; cycle++) {
    console.log(`=== Cycle ${cycle} ===`);

    // 1. Git snapshot
    const snapshot = gitCommit(`cycle-${cycle}-start`);

    // 2. Run eval cycle
    console.log("Running evals...");
    const report = await runEvalCycle(agent, options.trialsPerTask);
    const passRate = (report.overallPassRate * 100).toFixed(1);
    console.log(`Pass rate: ${passRate}%`);

    // 3. Check if target reached
    if (report.overallPassRate >= options.targetPassRate) {
      console.log("Target achieved!");
      break;
    }

    // 4. Analyze failures
    console.log("Analyzing failures...");
    const prompt = await fs.readFile(options.promptPath, "utf-8");
    const improvements = await analyzeFailures(report, prompt);

    if (improvements.length === 0) {
      console.log("No improvements suggested.");
      break;
    }

    console.log(`Applying ${improvements.length} improvements:`);
    improvements.forEach(imp => console.log(`  - ${imp.description}`));

    // 5. Apply improvements
    await applyImprovements(improvements, options.promptPath);

    // 6. Re-eval
    console.log("Re-evaluating...");
    const newReport = await runEvalCycle(agent, options.trialsPerTask);
    const newPassRate = (newReport.overallPassRate * 100).toFixed(1);
    console.log(`New pass rate: ${newPassRate}%`);

    // 7. Decide: keep or revert
    if (newReport.overallPassRate > report.overallPassRate) {
      console.log("✓ Improvement! Keeping changes.\n");
      gitCommit(`cycle-${cycle}-improved`);
    } else {
      console.log("✗ No improvement. Reverting.\n");
      gitRevert(snapshot);
    }
  }

  console.log("Bootstrap complete!");
}
```

### Task 5.2: Agent Function

```typescript
async function agent(task: string): Promise<string> {
  // TODO: Implement simple agent that:
  // 1. Loads current prompt from agent-prompt.md
  // 2. Calls Claude with task
  // 3. Executes any tool calls
  // 4. Returns summary of what was done

  // This can be simplified version of your Module 8 harness
}
```

### Task 5.3: Run Bootstrap

```typescript
// Main entry point
await bootstrap({
  maxCycles: 5,
  targetPassRate: 0.80,
  trialsPerTask: 1,
  promptPath: "./agent-prompt.md"
});
```

## Verification Checklist

- [ ] Eval harness runs tasks and returns structured report
- [ ] Failed tasks include full transcripts
- [ ] Meta-agent analyzes failures and returns JSON improvements
- [ ] Prompt patcher appends numbered rules to agent-prompt.md
- [ ] Git commits before applying improvements
- [ ] Git reverts if pass rate doesn't improve
- [ ] Bootstrap loop runs multiple cycles
- [ ] Loop stops when target pass rate reached
- [ ] Final prompt contains rules from successful cycles only

## Expected Output

```
Starting bootstrap...

=== Cycle 0 ===
Running evals...
Pass rate: 60.0%
Analyzing failures...
Applying 2 improvements:
  - Agent not checking if directory exists before writing
  - Agent not validating tool results for errors
Re-evaluating...
New pass rate: 70.0%
✓ Improvement! Keeping changes.

=== Cycle 1 ===
Running evals...
Pass rate: 70.0%
Analyzing failures...
Applying 1 improvement:
  - Agent should handle file not found errors gracefully
Re-evaluating...
New pass rate: 75.0%
✓ Improvement! Keeping changes.

=== Cycle 2 ===
Running evals...
Pass rate: 75.0%
Analyzing failures...
Applying 2 improvements:
  - Agent should verify paths are within workspace
  - Agent should use absolute paths consistently
Re-evaluating...
New pass rate: 73.0%
✗ No improvement. Reverting.

=== Cycle 3 ===
Running evals...
Pass rate: 75.0%
Analyzing failures...
Applying 1 improvement:
  - Agent should check if file exists before reading
Re-evaluating...
New pass rate: 85.0%
✓ Improvement! Keeping changes.

Target achieved!
Bootstrap complete!
```

Check `agent-prompt.md` - it should have 4-5 new rules added.

## Common Issues

**No improvements suggested**: Meta-agent needs at least 2 similar failures to identify patterns. Add more eval tasks or run multiple trials.

**Pass rate fluctuates wildly**: Model variance. Increase trialsPerTask to 3.

**Rules not appending**: Check regex for Rules section. Ensure there's a blank line after "## Rules".

**Git errors**: Ensure git repo is initialized and clean working directory at start.

**JSON parsing fails**: Meta-agent sometimes wraps JSON in markdown. Extract JSON block with regex.

## Extension Ideas

1. **Failure clustering**: Group similar failures before analysis
2. **Multiple trials**: Average results over 3 runs per cycle
3. **Rule categories**: Tag rules as validation/error-handling/edge-cases
4. **Improvement scoring**: Track which improvements help most
5. **Holdout set**: Separate train/test tasks to check for overfitting

## Debugging Tips

- Log full meta-agent responses to see raw output
- Save eval reports to JSON files for later analysis
- Use git log to see all cycles and reverts
- Add verbose logging to track which rules triggered behavior changes
- Test each component independently before running full bootstrap

## Success Criteria

Your bootstrap is successful if:
1. Pass rate improves over multiple cycles
2. Improvements are specific and actionable
3. Failed improvements are reverted
4. Final prompt has 3-5 new rules that address real patterns
5. Git history shows clean progression

You're ready for Module 10 when you can run a bootstrap that takes an agent from 60% to 85%+ pass rate automatically.
