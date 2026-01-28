# Module 10 Tutorial: Fine-Tuning Pipeline

## Introduction

Fine-tuning allows you to create specialized AI agents by teaching models from real execution traces. This module covers building production-ready training datasets from agent session logs.

You've already built an agent harness that collects trials and grades them. Now you'll transform those trials into training data for two major fine-tuning approaches:

1. **SFT (Supervised Fine-Tuning)**: Learn by imitating successful behaviors
2. **DPO (Direct Preference Optimization)**: Learn by contrasting success vs failure

## Why Fine-Tuning Matters

A general-purpose model like Claude is powerful but generic. Fine-tuning creates specialists:

- **Banking agent**: Knows account APIs, compliance rules, transaction patterns
- **Code review agent**: Understands your team's style guide, common bugs, review standards
- **Customer support agent**: Handles your product's FAQs, escalation protocols, tool workflows

Fine-tuning is cheaper and faster than prompting at scale. A 70B fine-tuned model often outperforms a 400B base model on domain tasks.

## The Data Pipeline

The pipeline has five stages:

```
Agent Trials → Extract Traces → Cluster by Task → Sample → Build Datasets → JSONL Output
```

### Stage 1: Extract Traces

Your evaluation harness produces `Trial` objects with grades. Extract the essential data:

```typescript
interface TraceRecord {
  id: string;              // "task-42-trial-3"
  task: string;            // Original user request
  success: boolean;        // Did it pass grading?
  turns: Turn[];           // Full conversation history
  toolCalls: ToolCall[];   // Flattened tool invocations
}

function extractTraces(trials: Trial[]): TraceRecord[] {
  return trials.map(t => ({
    id: `${t.taskId}-${t.trialIndex}`,
    task: t.transcript.task,
    success: t.grade.passed,
    turns: t.transcript.turns,
    toolCalls: t.transcript.turns.flatMap(turn => turn.toolCalls || []),
  }));
}
```

**Why flatten tool calls?** Easier to analyze tool usage patterns (frequency, error rates, sequences).

### Stage 2: Cluster by Task Type

Group similar tasks together. This enables:
- Stratified sampling (balanced representation)
- Task-specific metrics
- Specialized model routing

Simple keyword clustering (first 3 words):

```typescript
function clusterByKeywords(traces: TraceRecord[]): Map<string, TraceRecord[]> {
  const clusters = new Map<string, TraceRecord[]>();

  for (const trace of traces) {
    const key = trace.task.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(trace);
  }

  return clusters;
}
```

For production, use semantic clustering:
- Embed tasks with a small embedding model
- K-means or HDBSCAN on embeddings
- Label clusters with LLM summarization

### Stage 3: Stratified Sampling

Don't let common tasks dominate. Sample proportionally:

```typescript
function stratifiedSample(
  clusters: Map<string, TraceRecord[]>,
  samplesPerCluster: number
): TraceRecord[] {
  const sampled: TraceRecord[] = [];

  for (const [key, traces] of clusters) {
    const n = Math.min(samplesPerCluster, traces.length);
    const shuffled = traces.sort(() => Math.random() - 0.5);
    sampled.push(...shuffled.slice(0, n));
  }

  return sampled;
}
```

**Rule of thumb**: 10-50 samples per cluster for SFT, 5-20 pairs per cluster for DPO.

### Stage 4: Build SFT Dataset

SFT learns by imitation. Format: array of messages (system, user, assistant with tool calls).

```typescript
interface SFTExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | ToolUseContent[];
  }>;
}

function buildSFTDataset(traces: TraceRecord[]): SFTExample[] {
  const successes = traces.filter(t => t.success);

  return successes.map(trace => ({
    messages: [
      {
        role: "system",
        content: "You are a helpful AI agent with tool access. Use tools when needed."
      },
      {
        role: "user",
        content: trace.task
      },
      ...trace.turns.map(turn => ({
        role: "assistant" as const,
        content: turn.toolCalls.length > 0
          ? formatToolCalls(turn.toolCalls)
          : turn.text
      }))
    ]
  }));
}

function formatToolCalls(calls: ToolCall[]): ToolUseContent[] {
  return calls.map(c => ({
    type: "tool_use",
    id: c.id,
    name: c.name,
    input: c.input
  }));
}
```

**Key insight**: Include tool calls inline with assistant messages. The model learns when and how to use tools.

### Stage 5: Build DPO Dataset

DPO learns from preferences. Format: prompt + chosen (success) + rejected (failure).

```typescript
interface DPOExample {
  prompt: string;
  chosen: string;    // Full successful trace
  rejected: string;  // Full failed trace
}

function buildDPODataset(traces: TraceRecord[]): DPOExample[] {
  const byTask = groupBy(traces, t => t.task);
  const pairs: DPOExample[] = [];

  for (const [task, group] of byTask.entries()) {
    const successes = group.filter(t => t.success);
    const failures = group.filter(t => !t.success);

    for (const success of successes) {
      for (const failure of failures) {
        pairs.push({
          prompt: task,
          chosen: formatTrace(success),
          rejected: formatTrace(failure)
        });
      }
    }
  }

  return pairs;
}

function formatTrace(trace: TraceRecord): string {
  return trace.turns.map(turn => {
    if (turn.toolCalls.length > 0) {
      const tools = turn.toolCalls.map(c =>
        `<tool_use>${c.name}(${JSON.stringify(c.input)})</tool_use>`
      ).join("\n");
      return `${turn.text}\n${tools}`;
    }
    return turn.text;
  }).join("\n\n");
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}
```

**DPO requires exact task matches**. If task text varies, normalize it first (lowercase, trim, remove punctuation).

## Output Format: JSONL

Both datasets export as JSON Lines (one JSON object per line):

```typescript
function writeJSONL(examples: any[], filepath: string): void {
  const lines = examples.map(ex => JSON.stringify(ex)).join("\n");
  fs.writeFileSync(filepath, lines);
}

// Usage
const sftData = buildSFTDataset(traces);
writeJSONL(sftData, "sft-dataset.jsonl");

const dpoData = buildDPODataset(traces);
writeJSONL(dpoData, "dpo-dataset.jsonl");
```

JSONL benefits:
- Stream processing (no need to load entire file)
- Line-level deduplication
- Standard format for fine-tuning APIs

## Intent Classification for Routing

After fine-tuning multiple specialists, route tasks to the right model:

```typescript
async function classifyIntent(
  task: string,
  categories: string[],
  context?: string
): Promise<string> {
  const prompt = `
Classify this task into one category.

${context ? `Context: ${context}\n` : ""}
Categories:
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Task: ${task}

Reply with just the category number (1-${categories.length}).
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 16,  // Force concise output
    messages: [{ role: "user", content: prompt }]
  });

  const text = response.content[0].text.trim();
  const num = parseInt(text);

  if (num >= 1 && num <= categories.length) {
    return categories[num - 1];
  }

  return categories[0]; // Default fallback
}

// Usage
const categories = [
  "account_management",
  "payment_processing",
  "customer_support",
  "fraud_detection"
];

const intent = await classifyIntent(
  "Transfer $500 from checking to savings",
  categories,
  "Banking domain"
);

console.log(intent); // "payment_processing"
```

**Why max_tokens: 16?** Prevents the model from elaborating. You want "2", not "Based on the task description, this clearly falls into category 2 because...".

## Data Quality Checks

Before fine-tuning, validate your dataset:

```typescript
function validateDataset(examples: SFTExample[]): ValidationReport {
  const issues: string[] = [];

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];

    // Check message structure
    if (ex.messages.length < 2) {
      issues.push(`Example ${i}: Too few messages`);
    }

    if (ex.messages[0].role !== "system") {
      issues.push(`Example ${i}: Missing system message`);
    }

    // Check for empty content
    for (let j = 0; j < ex.messages.length; j++) {
      const msg = ex.messages[j];
      if (!msg.content || msg.content.length === 0) {
        issues.push(`Example ${i}, message ${j}: Empty content`);
      }
    }

    // Check tool call format
    const assistantMsgs = ex.messages.filter(m => m.role === "assistant");
    for (const msg of assistantMsgs) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use" && !block.name) {
            issues.push(`Example ${i}: Tool use missing name`);
          }
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    totalExamples: examples.length,
    issues
  };
}
```

## Complete Pipeline Example

```typescript
async function buildTrainingDatasets(trialsPath: string): Promise<void> {
  // 1. Load trials from harness
  const trials: Trial[] = JSON.parse(fs.readFileSync(trialsPath, "utf-8"));
  console.log(`Loaded ${trials.length} trials`);

  // 2. Extract traces
  const traces = extractTraces(trials);
  console.log(`Extracted ${traces.length} traces`);
  console.log(`Success rate: ${traces.filter(t => t.success).length / traces.length * 100}%`);

  // 3. Cluster by task type
  const clusters = clusterByKeywords(traces);
  console.log(`Found ${clusters.size} task clusters`);

  // 4. Stratified sampling
  const sampled = stratifiedSample(clusters, 20);
  console.log(`Sampled ${sampled.length} traces`);

  // 5. Build SFT dataset
  const sftData = buildSFTDataset(sampled);
  const sftValidation = validateDataset(sftData);
  console.log(`SFT dataset: ${sftData.length} examples, valid: ${sftValidation.valid}`);
  if (!sftValidation.valid) {
    console.log("Issues:", sftValidation.issues);
  }
  writeJSONL(sftData, "sft-dataset.jsonl");

  // 6. Build DPO dataset
  const dpoData = buildDPODataset(sampled);
  console.log(`DPO dataset: ${dpoData.length} pairs`);
  writeJSONL(dpoData, "dpo-dataset.jsonl");

  console.log("Datasets written successfully!");
}

// Run it
buildTrainingDatasets("eval-results/trials-2024-01-15.json");
```

## When to Use SFT vs DPO

**Use SFT when**:
- You have many successful examples
- Task is well-defined with clear success criteria
- You want the model to imitate expert behavior
- Bootstrap a new agent from scratch

**Use DPO when**:
- You have success/failure pairs for the same task
- Success criteria are subtle (style, tone, efficiency)
- You want to steer away from failure modes
- Refining an already-capable model

**Use both**:
- SFT first (initialize from good examples)
- DPO second (refine by learning preferences)

## Summary

The fine-tuning pipeline transforms raw agent trials into training data:

1. **Extract**: Convert trials to TraceRecords
2. **Cluster**: Group by task type (keyword or semantic)
3. **Sample**: Stratified sampling for balanced data
4. **Build**: SFT from successes, DPO from success/failure pairs
5. **Validate**: Check format and quality
6. **Export**: JSONL for fine-tuning APIs

Intent classification routes tasks to specialized models using `max_tokens: 16` for concise responses.

This pipeline is deterministic and reproducible. Run it daily on new trials to continuously improve your agents.
