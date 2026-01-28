# Module 10 Handout: Fine-Tuning Pipeline

## Core Concepts

### TraceRecord
Extracted execution trace from agent trial:
```typescript
interface TraceRecord {
  id: string;              // "task-42-trial-3"
  task: string;            // Original user request
  success: boolean;        // Did it pass grading?
  turns: Turn[];           // Full conversation
  toolCalls: ToolCall[];   // All tool invocations
}
```

### SFT (Supervised Fine-Tuning)
Learn by imitating successful behaviors. Format:
```typescript
interface SFTExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | ToolUseContent[];
  }>;
}
```

### DPO (Direct Preference Optimization)
Learn from success/failure contrasts:
```typescript
interface DPOExample {
  prompt: string;      // Task description
  chosen: string;      // Successful trace
  rejected: string;    // Failed trace
}
```

## Pipeline Stages

### 1. Extract Traces
```typescript
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

### 2. Cluster by Task Type
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

### 3. Stratified Sampling
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

### 4. Build SFT Dataset
```typescript
function buildSFTDataset(traces: TraceRecord[]): SFTExample[] {
  const successes = traces.filter(t => t.success);

  return successes.map(trace => ({
    messages: [
      { role: "system", content: "You are a helpful AI agent." },
      { role: "user", content: trace.task },
      ...trace.turns.map(turn => ({
        role: "assistant" as const,
        content: turn.toolCalls.length > 0
          ? formatToolCalls(turn.toolCalls)
          : turn.text
      }))
    ]
  }));
}
```

### 5. Build DPO Dataset
```typescript
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
```

## Intent Classification

Route tasks to specialized models:
```typescript
async function classifyIntent(
  task: string,
  categories: string[],
  context?: string
): Promise<string> {
  const prompt = `
Classify this task into one category.

Categories:
${categories.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Task: ${task}

Reply with just the category number.
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 16,  // Force concise output
    messages: [{ role: "user", content: prompt }]
  });

  const num = parseInt(response.content[0].text.trim());
  return num >= 1 && num <= categories.length
    ? categories[num - 1]
    : categories[0];
}
```

## JSONL Output

```typescript
function writeJSONL(examples: any[], filepath: string): void {
  const lines = examples.map(ex => JSON.stringify(ex)).join("\n");
  fs.writeFileSync(filepath, lines);
}
```

## Data Quality Validation

```typescript
function validateDataset(examples: SFTExample[]): ValidationReport {
  const issues: string[] = [];

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];

    if (ex.messages.length < 2) {
      issues.push(`Example ${i}: Too few messages`);
    }

    if (ex.messages[0].role !== "system") {
      issues.push(`Example ${i}: Missing system message`);
    }

    for (let j = 0; j < ex.messages.length; j++) {
      if (!ex.messages[j].content || ex.messages[j].content.length === 0) {
        issues.push(`Example ${i}, message ${j}: Empty content`);
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

## Quick Reference

### When to Use SFT
- Many successful examples available
- Clear success criteria
- Imitate expert behavior
- Bootstrap new agent

### When to Use DPO
- Have success/failure pairs for same task
- Subtle quality distinctions
- Steer away from failure modes
- Refine existing model

### Sampling Guidelines
- SFT: 10-50 examples per task cluster
- DPO: 5-20 pairs per task cluster
- Balance common and rare tasks

### Key Parameters
- Clustering: First 3 words (simple) or embeddings (production)
- max_tokens: 16 for intent classification
- Format: JSONL (one JSON per line)
