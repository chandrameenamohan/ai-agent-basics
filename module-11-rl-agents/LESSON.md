# Module 11: RL Infrastructure + In-Context Learning

## Goal
Build the infrastructure for reinforcement learning — environments, rewards, trajectories, curriculum — then make the agent **demonstrably improve** across episodes using Reflexion. Connect trajectories to the fine-tuning pipeline from Module 10.

## Concepts

### RL for agents — the 30-second version
```
┌─────────────┐    action     ┌─────────────────┐
│    Agent     │──────────────►│   Environment   │
│  (policy)    │◄──────────────│  (workspace +   │
│              │  observation  │   tools)         │
└─────────────┘    + reward    └─────────────────┘
```

- **Environment**: A sandboxed workspace with tools. `reset()` creates a fresh episode. `step()` executes one tool call.
- **Episode**: One attempt at one task, from start to completion. An episode ends when: the agent produces a final text response (no tool calls), or `maxSteps` is reached.
- **Trajectory**: The full recording of an episode: every step, the grade, and the reward.
- **Reward**: A number that tells the training algorithm how good the episode was.
- **Policy**: The agent's behavior (the LLM + system prompt). RL changes this to maximize reward.
- **Tool validity**: A tool call is *valid* if the tool exists in the registry, the input passes schema validation, and execution completes without throwing. Invalid calls return an error string (never throw into the loop — see Module 3 convention).

### Why episodic rewards, not per-step
If you reward each tool call individually, the agent learns to game individual steps (e.g., calling read-file repeatedly for the per-call reward). Episodic rewards — computed at the **end** of the episode based on the final outcome — prevent this. The outcome signal dominates; step-level signals are minor shaping.

### Reward design — with worked examples
Three components:
1. **Outcome** (weight 1.0): Did the task succeed? Score from the grader (0-1).
2. **Efficiency** (-0.02 per step): Fewer steps = better. Discourages verbosity.
3. **Tool quality** (+0.01 valid, -0.05 invalid): Reward clean tool usage, penalize errors.

The outcome signal is dominant. Efficiency and tool quality are gentle shaping signals.

**Example 1: A successful 10-step episode (all valid tool calls)**
```
outcome  = 1.0 × 1.0    =  1.000
efficiency = 10 × -0.02  = -0.200
toolUse  = 10 × 0.01     =  0.100
total    = 1.0 - 0.2 + 0.1 = 0.900
```
Strong positive reward. The agent succeeded efficiently.

**Example 2: A failed 50-step episode (5 invalid tool calls out of 50 total)**
```
outcome  = 0.0 × 1.0       =  0.000
efficiency = 50 × -0.02    = -1.000
toolUse  = 45 × 0.01 + 5 × -0.05 = 0.45 - 0.25 = 0.200
total    = 0.0 - 1.0 + 0.2 = -0.800
```
Negative reward. The agent wasted steps and still failed.

Notice: the outcome component alone separates success from failure. Efficiency and tool quality only matter at the margins. These weights are tunable — if `stepPenalty` is too aggressive (e.g., -0.5), even successful episodes yield negative rewards. Exercise 2 explores this.

### Reflexion — episodic self-critique
Traditional RL updates model weights. That requires infrastructure (TRL, OpenRLHF) and GPU time. But there's a simpler form of improvement that works today: **Reflexion**.

The idea: after each episode, use the LLM to analyze what went right or wrong and produce a short summary. Inject those summaries into the system prompt for the next episode. The agent's behavior changes — it avoids past mistakes and repeats successful strategies — without any weight updates.

Strictly speaking, Reflexion is not reinforcement learning in the formal sense — there's no policy gradient, no credit assignment, no learned value function. It's better described as *episodic self-critique with prompt adaptation*. We use RL-adjacent terminology here because the control loop (episode → evaluation → prompt update) is structurally similar, and this module builds the infrastructure that supports both approaches.

Reflexion gives you something concrete to observe: the agent getting better across episodes. Weight-based RL (Module 10's fine-tuning pipeline) gives you permanent improvement.

### Forward reference: trajectories are training data for Module 10
The trajectories you collect here are exactly the data Module 10's fine-tuning pipeline needs. You don't need to have completed Module 10 yet — just know where this is heading:
- **Successful trajectories** (reward > threshold) → SFT training pairs (prompt → tool calls)
- **Paired trajectories** (same task, different outcomes) → DPO preference pairs (chosen vs rejected)

This module builds the collection pipeline. Module 10 consumes the output.

### Curriculum learning
Start with easy tasks. When the agent consistently passes (≥80% pass rate), promote to harder tasks. This prevents wasting episodes on tasks the agent can't handle yet. Exponential moving average smooths noise — one lucky pass doesn't trigger promotion.

### RLVR (Rule-based Language Verification Rewards)
Your Module 7 graders **are** your reward functions. `stringMatchGrader` → deterministic, reproducible reward signal. `compositeGrader` → multi-objective reward. No model judge needed — just code that checks concrete outcomes.

## Shared types

These interfaces are used across multiple steps. Define them first so everything type-checks.

**GradeResult** (from Module 7 — repeated here for reference):
```typescript
export interface GradeResult {
  score: number;    // 0.0 to 1.0
  passed: boolean;
  explanation: string;
}
```

**Trajectory** (the output of one complete episode):
```typescript
export interface Trajectory {
  episodeId: string;
  prompt: string;
  steps: TrajectoryStep[];
  transcript: Transcript;   // from Module 7
  reward: EpisodeReward;
  success: boolean;
}
```

**Python equivalents:**
```python
from dataclasses import dataclass

@dataclass
class GradeResult:
    score: float       # 0.0 to 1.0
    passed: bool
    explanation: str

@dataclass
class Trajectory:
    episode_id: str
    prompt: str
    steps: list[dict]       # list of TrajectoryStep dicts
    transcript: dict
    reward: dict            # EpisodeReward dict
    success: bool
```

## Build It

Keep in mind: all of this infrastructure exists so that in Step 7, you can watch the agent *actually get better* without training.

### Step 1: Build the environment

Create `module-11-rl-agents/environment.ts`:

```typescript
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Sandbox } from "../module-4-filesystem/sandbox.js";
import { createFileTools } from "../module-4-filesystem/tools.js";
import { createEditFileTool } from "../module-5-coding-agent/edit-file.js";
import { ToolRegistry } from "../module-3-tools/tool-registry.js";

export interface EnvironmentState {
  workspaceDir: string;
  sandbox: Sandbox;
  registry: ToolRegistry;
  step: number;
  maxSteps: number;
  done: boolean;
}

export interface StepResult {
  result: string;     // tool output (or error message)
  wasValid: boolean;  // true if tool existed, input validated, and execution didn't throw
}

export interface EpisodeSetup {
  files: Record<string, string>;  // filename → content
  prompt: string;
}

export class AgentEnvironment {
  private state: EnvironmentState | null = null;

  // TODO: async reset(setup: EpisodeSetup): Promise<EnvironmentState>
  //   1. const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rl-ep-"));
  //   2. Write setup.files: for (const [name, content] of Object.entries(setup.files))
  //        await fs.writeFile(path.join(workspaceDir, name), content);
  //   3. const sandbox = new Sandbox(workspaceDir);
  //   4. const registry = new ToolRegistry();
  //      registry.register(...createFileTools(sandbox));
  //      registry.register(createEditFileTool(sandbox));
  //   5. this.state = { workspaceDir, sandbox, registry, step: 0, maxSteps: 50, done: false };
  //   Must work after cleanup() — each reset() creates a fresh workspace.

  // TODO: async step(toolName: string, input: Record<string, unknown>): Promise<StepResult>
  //   this.state.step++;
  //   try { const result = await this.state.registry.execute(toolName, input);
  //         return { result, wasValid: true };
  //   } catch (e) { return { result: `Error: ${e.message}`, wasValid: false }; }
  //   finally { if (this.state.step >= this.state.maxSteps) this.state.done = true; }
  //   One step = one tool execution, not one LLM turn.

  // TODO: async cleanup(): Promise<void>
  //   await fs.rm(this.state.workspaceDir, { recursive: true, force: true });
  //   this.state = null;

  // TODO: getState(): EnvironmentState — return this.state (throw if null)
}
```

**Python:**
```python
import tempfile, shutil
from dataclasses import dataclass
from sandbox import Sandbox
from tools import create_file_tools
from tool_registry import ToolRegistry, Tool

@dataclass
class StepResult:
    result: str
    was_valid: bool

class AgentEnvironment:
    def __init__(self):
        self.state = None
    # TODO: reset(setup) → EnvironmentState — tempfile.mkdtemp(), write files, build registry
    #   Must work after cleanup() — each reset() creates a fresh workspace.
    # TODO: step(tool_name, inp) → StepResult — increment step, execute, check max_steps
    # TODO: cleanup() — shutil.rmtree(), set state to None
    # TODO: get_state() → dict
```

### Step 2: Build the reward function

Create `module-11-rl-agents/rewards.ts`. This one is fully implemented — type it out to understand each component:

```typescript
import type { GradeResult } from "../module-7-evals/types.js";

export interface TrajectoryStep {
  toolName: string;
  input: Record<string, unknown>;
  result: string;
  wasValid: boolean;  // Did the tool exist, validate, and execute without throwing?
}

export interface RewardConfig {
  outcomeWeight: number;      // 1.0
  stepPenalty: number;         // -0.02
  validToolBonus: number;      // 0.01
  invalidToolPenalty: number;  // -0.05
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  outcomeWeight: 1.0,
  stepPenalty: -0.02,
  validToolBonus: 0.01,
  invalidToolPenalty: -0.05,
};

export interface EpisodeReward {
  total: number;
  outcome: number;
  efficiency: number;
  toolUse: number;
  breakdown: string;
}

export function computeReward(
  gradeResult: GradeResult,
  steps: TrajectoryStep[],
  config: RewardConfig = DEFAULT_REWARD_CONFIG
): EpisodeReward {
  // 1. Outcome reward (dominant signal)
  const outcome = gradeResult.score * config.outcomeWeight;

  // 2. Efficiency: penalty per step
  const efficiency = steps.length * config.stepPenalty;

  // 3. Tool use quality
  const validCalls = steps.filter((s) => s.wasValid).length;
  const invalidCalls = steps.filter((s) => !s.wasValid).length;
  const toolUse =
    validCalls * config.validToolBonus +
    invalidCalls * config.invalidToolPenalty;

  const total = outcome + efficiency + toolUse;

  return {
    total,
    outcome,
    efficiency,
    toolUse,
    breakdown: `outcome=${outcome.toFixed(3)} efficiency=${efficiency.toFixed(3)} toolUse=${toolUse.toFixed(3)}`,
  };
}
```

**Python:**
```python
from dataclasses import dataclass

@dataclass
class RewardConfig:
    outcome_weight: float = 1.0
    step_penalty: float = -0.02
    valid_tool_bonus: float = 0.01
    invalid_tool_penalty: float = -0.05

DEFAULT_REWARD_CONFIG = RewardConfig()

def compute_reward(grade_result, steps: list[dict], config: RewardConfig = None) -> dict:
    if config is None:
        config = DEFAULT_REWARD_CONFIG

    outcome = grade_result.score * config.outcome_weight
    efficiency = len(steps) * config.step_penalty

    valid_calls = sum(1 for s in steps if s["was_valid"])
    invalid_calls = sum(1 for s in steps if not s["was_valid"])
    tool_use = valid_calls * config.valid_tool_bonus + invalid_calls * config.invalid_tool_penalty

    total = outcome + efficiency + tool_use

    return {
        "total": total,
        "outcome": outcome,
        "efficiency": efficiency,
        "tool_use": tool_use,
        "breakdown": f"outcome={outcome:.3f} efficiency={efficiency:.3f} toolUse={tool_use:.3f}",
    }
```

### Step 3: Build trajectory collection

Create `module-11-rl-agents/trajectories.ts`.

Here's how the agent loop integrates with the environment. This is the core pattern — the LLM generates tool calls, the environment executes them, and every step is recorded:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { AgentEnvironment, type EpisodeSetup, type StepResult } from "./environment.js";
import { computeReward, type TrajectoryStep, type RewardConfig } from "./rewards.js";
import { CODING_AGENT_PROMPT } from "../module-5-coding-agent/prompt.js";
import type { Grader, Transcript, TranscriptTurn } from "../module-7-evals/types.js";

const client = new Anthropic();

// Full signature — note the optional systemPromptExtra for Reflexion (Step 7):

export async function collectTrajectory(
  env: AgentEnvironment,
  setup: EpisodeSetup,
  grader: Grader,
  rewardConfig?: RewardConfig,
  systemPromptExtra?: string         // Reflexion prompt injected here
): Promise<Trajectory> {
  const state = await env.reset(setup);
  const steps: TrajectoryStep[] = [];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: setup.prompt }];
  const transcriptTurns: TranscriptTurn[] = [{ role: "user", content: setup.prompt }];
  const startTime = Date.now();
  let totalTokens = 0;

  // The agent loop: send → check stop_reason → execute tools → loop
  for (let turn = 0; turn < state.maxSteps; turn++) {
    const systemPrompt = CODING_AGENT_PROMPT + `\nWorkspace: ${state.workspaceDir}`
      + (systemPromptExtra ?? "");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: state.registry.getDefinitions(),
      messages,
    });

    totalTokens += response.usage.input_tokens + response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    // Episode ends when the response contains no tool calls.
    // Don't rely on stop_reason alone — check content blocks directly.
    const hasToolUse = response.content.some((b) => b.type === "tool_use");
    if (!hasToolUse) {
      const text = response.content.find((b) => b.type === "text");
      transcriptTurns.push({ role: "assistant", content: text?.text ?? "" });
      break;
    }

    // Execute each tool call and record it (one step = one tool execution)
    const toolCalls: TranscriptTurn["toolCalls"] = [];
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const input = block.input as Record<string, unknown>;
        const { result, wasValid }: StepResult = await env.step(block.name, input);
        steps.push({ toolName: block.name, input, result, wasValid });
        toolCalls.push({ name: block.name, input, result });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    transcriptTurns.push({ role: "assistant", content: "", toolCalls });
    messages.push({ role: "user", content: toolResults });
  }

  // Build transcript for the grader (matches Module 7's Transcript type)
  const transcript: Transcript = {
    task: setup.prompt,
    turns: transcriptTurns,
    totalTokens,
    durationMs: Date.now() - startTime,
  };

  // Grade and compute reward
  const grade = await grader.grade(state.workspaceDir, transcript);
  const reward = computeReward(grade, steps, rewardConfig);
  await env.cleanup();

  return {
    episodeId: `ep-${Date.now()}`,
    prompt: setup.prompt,
    steps,
    transcript,
    reward,
    success: grade.passed,
  };
}
```

**Python:**
```python
import time
import anthropic
from prompt import CODING_AGENT_PROMPT  # from module-5

client = anthropic.Anthropic()

def collect_trajectory(env, setup, grader, reward_config=None, system_prompt_extra=""):
    state = env.reset(setup)
    steps = []
    messages = [{"role": "user", "content": setup["prompt"]}]
    transcript_turns = [{"role": "user", "content": setup["prompt"]}]
    start_time = time.time()
    total_tokens = 0

    for turn in range(state["max_steps"]):
        system_prompt = (CODING_AGENT_PROMPT
            + f"\nWorkspace: {state['workspace_dir']}"
            + system_prompt_extra)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            tools=state["registry"].get_definitions(),
            messages=messages,
        )
        total_tokens += response.usage.input_tokens + response.usage.output_tokens
        messages.append({"role": "assistant", "content": response.content})

        # Episode ends when the response contains no tool calls
        has_tool_use = any(b.type == "tool_use" for b in response.content)
        if not has_tool_use:
            text = next((b.text for b in response.content if b.type == "text"), "")
            transcript_turns.append({"role": "assistant", "content": text})
            break

        tool_calls = []
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                step_result = env.step(block.name, block.input)
                steps.append({
                    "tool_name": block.name,
                    "input": block.input,
                    "result": step_result.result,
                    "was_valid": step_result.was_valid,
                })
                tool_calls.append({"name": block.name, "input": block.input, "result": step_result.result})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": step_result.result,
                })
        transcript_turns.append({"role": "assistant", "content": "", "tool_calls": tool_calls})
        messages.append({"role": "user", "content": tool_results})

    transcript = {
        "task": setup["prompt"],
        "turns": transcript_turns,
        "total_tokens": total_tokens,
        "duration_ms": int((time.time() - start_time) * 1000),
    }

    grade = grader.grade(state["workspace_dir"], transcript)
    reward = compute_reward(grade, steps, reward_config)
    env.cleanup()

    return Trajectory(
        episode_id=f"ep-{int(time.time())}",
        prompt=setup["prompt"],
        steps=steps,
        transcript=transcript,
        reward=reward,
        success=grade.passed,
    )
```

### Step 4: Build curriculum learning

Create `module-11-rl-agents/curriculum.ts`:

```typescript
import type { EvalTask } from "../module-7-evals/types.js";

export interface CurriculumTier {
  name: string;
  difficulty: string;
  tasks: EvalTask[];
  promotionThreshold: number;  // e.g. 0.8
}

export class Curriculum {
  // TODO: recordOutcome(success: boolean)
  //   Update EMA pass rate: this.passRate = 0.2 * (success ? 1 : 0) + 0.8 * this.passRate
  //   If passRate >= tier.promotionThreshold, advance to next tier.
  //   Return { promoted: boolean, newTier?: string }

  // TODO: sampleTask() — random task from current tier

  // TODO: getCurrentTier() — return current CurriculumTier

  // TODO: isComplete() — highest tier at promotion threshold

  // TODO: getState() — return { episodesCompleted, totalSuccesses, tierPassRates[] }
}
```

Here are concrete task definitions for each tier:

```typescript
import { stringMatchGrader, fileExistsGrader, compositeGrader } from "../module-7-evals/graders.js";

const easyTasks: EvalTask[] = [
  {
    id: "easy-create-file",
    description: "Create a simple file",
    prompt: "Create a file called hello.txt containing 'Hello, World!'",
    grader: compositeGrader([
      fileExistsGrader("hello.txt"),
      stringMatchGrader("hello.txt", "Hello, World!"),
    ]),
  },
  {
    id: "easy-edit-line",
    description: "Change one line in a file",
    prompt: "In greeting.ts, change the greeting from 'Hi' to 'Hello'.",
    grader: stringMatchGrader("greeting.ts", '"Hello"'),
  },
];

const mediumTasks: EvalTask[] = [
  {
    id: "medium-add-function",
    description: "Add a function to existing code",
    prompt: "Add an 'isEven' function to math.ts that returns true if a number is even.",
    grader: compositeGrader([
      stringMatchGrader("math.ts", "isEven"),
      stringMatchGrader("math.ts", "% 2"),
    ]),
  },
];

const hardTasks: EvalTask[] = [
  {
    id: "hard-fix-bug",
    description: "Fix a bug in sorting code",
    prompt: "Fix the bug in sort.ts where the comparison is reversed (descending instead of ascending).",
    grader: stringMatchGrader("sort.ts", "a - b"),
  },
];

const tiers: CurriculumTier[] = [
  { name: "Easy", difficulty: "easy", tasks: easyTasks, promotionThreshold: 0.8 },
  { name: "Medium", difficulty: "medium", tasks: mediumTasks, promotionThreshold: 0.8 },
  { name: "Hard", difficulty: "hard", tasks: hardTasks, promotionThreshold: 0.8 },
];
```

**Python:**
```python
class Curriculum:
    def __init__(self, tiers):
        # TODO: Initialize current_tier=0, pass_rate=0.0, episodes=0, successes=0

    def record_outcome(self, success: bool):
        # self.pass_rate = 0.2 * (1 if success else 0) + 0.8 * self.pass_rate
        # if self.pass_rate >= tier.promotion_threshold: advance tier
        pass

    # TODO: sample_task() — random.choice from current tier
    # TODO: is_complete() — highest tier at threshold
```

### Step 5: RLVR — graders as reward functions

This isn't a separate abstraction to build — it's the recognition that you already have everything you need. Your Module 7 graders (`stringMatchGrader`, `compositeGrader`) are passed directly to `collectTrajectory` as the `grader` parameter. The grader produces a `GradeResult` with a score, and `computeReward` turns that score into a shaped reward.

That's RLVR: **rule-based, deterministic reward signals derived from verifiable graders**. No model judge, no learned reward model — just code that checks concrete outcomes.

If you want to combine multiple graders with different weights, use Module 7's `compositeGrader`:

```typescript
// Combining graders for multi-objective rewards
const grader = compositeGrader([
  { grader: fileExistsGrader("output.txt"), weight: 0.3 },
  { grader: stringMatchGrader("output.txt", "expected"), weight: 0.7 },
]);

// Pass directly to collectTrajectory — no wrapper needed
const trajectory = await collectTrajectory(env, setup, grader, rewardConfig);
```

```python
# Python equivalent
grader = composite_grader([
    {"grader": file_exists_grader("output.txt"), "weight": 0.3},
    {"grader": string_match_grader("output.txt", "expected"), "weight": 0.7},
])
trajectory = collect_trajectory(env, setup, grader, reward_config)
```

### Step 6: Build the training loop

Create `module-11-rl-agents/rl-training.ts`:

```typescript
import { AgentEnvironment } from "./environment.js";
import { collectTrajectory, type Trajectory } from "./trajectories.js";
import { Curriculum } from "./curriculum.js";

async function main() {
  const maxEpisodes = Number(process.argv[2]) || 6;
  const curriculum = new Curriculum(tiers);  // tiers from Step 4
  const env = new AgentEnvironment();
  const trajectories: Trajectory[] = [];

  for (let ep = 0; ep < maxEpisodes; ep++) {
    const task = curriculum.sampleTask();
    console.log(`Episode ${ep + 1}/${maxEpisodes} [${curriculum.getCurrentTier().name}] Task: ${task.id}`);

    // TODO: collectTrajectory, record outcome, log reward breakdown
    // TODO: push trajectory to trajectories array
  }

  // Save trajectories as JSONL (one JSON object per line)
  const lines = trajectories.map((t) => JSON.stringify({
    episodeId: t.episodeId,
    prompt: t.prompt,
    steps: t.steps.length,
    reward: t.reward.total,
    success: t.success,
  })).join("\n");
  await fs.writeFile("rl-trajectories.jsonl", lines, "utf-8");
}

main().catch(console.error);
```

Run it: `bun module-11-rl-agents/rl-training.ts`

With custom episode count: `bun module-11-rl-agents/rl-training.ts 10`

### Step 7: Add Reflexion — episodic self-critique

This is where the agent actually improves. Create `module-11-rl-agents/reflexion.ts`:

```typescript
export interface ReflexionMemory {
  successes: string[];   // LLM-generated summaries of what worked
  failures: string[];    // LLM-generated summaries of what went wrong
  maxEntries: number;    // keep memory bounded (e.g., 5)
}

export function createReflexionMemory(maxEntries = 5): ReflexionMemory {
  return { successes: [], failures: [], maxEntries };
}

// The meta-prompt for trajectory analysis. This is the core of Reflexion —
// a simple template won't produce actionable lessons; the LLM must reason about *why*.
export const REFLEXION_META_PROMPT = `You are an expert AI agent supervisor.
Analyze this agent trajectory and produce a concise lesson (2-3 sentences).

If the agent SUCCEEDED:
- Identify the strategy that worked (e.g., which tool sequence, what order).
- Note what made it efficient or inefficient.

If the agent FAILED:
- Identify the root cause (e.g., wrong tool, missing step, bad input).
- State what the agent should do differently next time.

Trajectory:
{trajectory_json}

Respond with only the lesson, no preamble.`;

// TODO: summarizeTrajectory(trajectory) → Promise<string>
//   Call the LLM with REFLEXION_META_PROMPT, replacing {trajectory_json}
//   with a JSON summary of the trajectory (prompt, steps, success, reward).
//   Return the LLM's response as a string.

// TODO: updateMemory(memory, trajectory) → Promise<ReflexionMemory>
//   Call summarizeTrajectory, push summary to successes or failures.
//   If over maxEntries, drop the oldest entry.

// TODO: buildReflexionPrompt(memory) → string
//   Return a string to inject into the system prompt:
//   "## Lessons from previous attempts\n### What worked:\n{successes}\n### What to avoid:\n{failures}"
//   Return "" if memory is empty.
```

**Python:**
```python
from dataclasses import dataclass, field

REFLEXION_META_PROMPT = """You are an expert AI agent supervisor.
Analyze this agent trajectory and produce a concise lesson (2-3 sentences).

If the agent SUCCEEDED:
- Identify the strategy that worked (e.g., which tool sequence, what order).
- Note what made it efficient or inefficient.

If the agent FAILED:
- Identify the root cause (e.g., wrong tool, missing step, bad input).
- State what the agent should do differently next time.

Trajectory:
{trajectory_json}

Respond with only the lesson, no preamble."""

@dataclass
class ReflexionMemory:
    successes: list[str] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    max_entries: int = 5

# TODO: async summarize_trajectory(trajectory) → str
#   Call the LLM with REFLEXION_META_PROMPT, replacing {trajectory_json}.
# TODO: update_memory(memory, trajectory) → ReflexionMemory
# TODO: build_reflexion_prompt(memory) → str
```

Now modify your training loop (Step 6) to use Reflexion. The reflexion prompt is injected into the system prompt via `collectTrajectory`'s `systemPromptExtra` parameter:

```typescript
// In your main loop:
const memory = createReflexionMemory();

for (let ep = 0; ep < maxEpisodes; ep++) {
  const reflexionPrompt = buildReflexionPrompt(memory);

  // reflexionPrompt goes into the system prompt via the 5th parameter
  const trajectory = await collectTrajectory(
    env, setup, grader, rewardConfig, reflexionPrompt
  );

  await updateMemory(memory, trajectory);
  // ... rest of loop
}
```

This is where the system prompt for episode 5 looks different from episode 1:
```
## Lessons from previous attempts
### What worked:
- Reading the file before editing avoids blind overwrites. Using read_file then edit_file succeeded in 4 steps.
### What to avoid:
- Writing the entire file from memory without reading it first caused content loss in episode 2.
```

### Step 8: Bridge to Module 10 — trajectories as training data

Create `module-11-rl-agents/trajectory-export.ts`:

```typescript
import type { Trajectory } from "./trajectories.js";

// TODO: trajectoriesToSFT(trajectories, minReward?) → SFTPair[]
//   Filter to successful trajectories (reward > minReward).
//   Return { prompt, completion } pairs where completion is the
//   sequence of tool calls the agent made.

// TODO: trajectoriesToDPO(trajectories) → DPOTriplet[]
//   Group trajectories by task ID.
//   For each task with both a success and failure, return:
//   { prompt, chosen: successTrajectory, rejected: failureTrajectory }
```

**Python:**
```python
# TODO: trajectories_to_sft(trajectories, min_reward=0.5) → list[dict]
# TODO: trajectories_to_dpo(trajectories) → list[dict]
```

This connects directly to Module 10's fine-tuning pipeline. The trajectories you collect here become the training data there.

## Exercises

1. **Compute reward by hand.** An episode takes 15 steps, 13 valid and 2 invalid tool calls, and scores 1.0 from the grader. Using the default config, compute the total reward on paper. Then verify with `computeReward`. (Answer: outcome=1.0, efficiency=-0.3, toolUse=0.03, total=0.73)

2. **Break the reward function.** Set `stepPenalty = -0.5` and run 3 episodes. What happens to the reward even on successful episodes? At what step count does a perfect success go negative? (Answer: at 2 steps the reward is barely positive — `1.0 + 2×(-0.5) + 2×0.01 = 0.02`. At 3 steps it goes negative: `1.0 + 3×(-0.5) + 3×0.01 = -0.47`.)

3. **Watch Reflexion improve.** Implement Reflexion (Step 7) and run 15 episodes on Easy tasks. Log the Reflexion prompt each episode. Does the agent avoid mistakes it made in earlier episodes? Compare average reward for episodes 1-5 vs 11-15.

4. **Disable Reflexion as control.** Run 15 episodes without Reflexion (pass empty string instead of the reflexion prompt). Compare success rate to Exercise 3. The difference is the value of in-context learning.

5. **Trace trajectories to SFT format.** Implement `trajectoriesToSFT` (Step 8). Run 6 episodes, export successful ones. Open the output and verify each SFT pair has the prompt and the exact tool call sequence the agent used.

## Checkpoint

You've completed Module 11 when you can answer:
- Walk through the reward math for a 20-step episode with score 0.5 and 3 invalid calls (17 valid, 3 invalid). (outcome=0.5, efficiency=-0.4, toolUse=17×0.01+3×(-0.05)=0.02, total=0.12)
- How does Reflexion differ from fine-tuning? (Reflexion modifies the prompt — temporary, bounded by context window. Fine-tuning modifies weights — permanent, generalizes beyond the training context.)
- How do trajectories from this module become training data for Module 10? (Filter by reward → SFT pairs. Group by task, pair success/failure → DPO triplets.)
- Why compute rewards at episode end instead of per-step?
- How does curriculum learning prevent wasted training episodes?
- Why are deterministic graders (RLVR) better than model-based rewards for RL?

**By Module 9, you were using your agent on itself. By Module 11, you understand how to build the RL infrastructure that trains it — and you've seen in-context learning work. You're now a harness engineer.**

## Solutions
Compare your code against `solutions/` if you're stuck.
