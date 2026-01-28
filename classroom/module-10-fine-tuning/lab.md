# Module 10 Lab: Fine-Tuning Pipeline

## Objective
Build a complete fine-tuning data pipeline that transforms agent trials into SFT and DPO datasets.

## Setup

```bash
mkdir module-10-fine-tuning
cd module-10-fine-tuning
```

Create a sample trials file `trials.json`:

```json
[
  {
    "taskId": "task-001",
    "trialIndex": 0,
    "transcript": {
      "task": "Read file data.txt",
      "turns": [
        {
          "text": "I'll read the file for you.",
          "toolCalls": [
            {"id": "tool-1", "name": "read_file", "input": {"path": "data.txt"}}
          ]
        },
        {
          "text": "The file contains: Hello World"
        }
      ]
    },
    "grade": {"passed": true, "score": 1.0}
  },
  {
    "taskId": "task-002",
    "trialIndex": 0,
    "transcript": {
      "task": "Read file config.json",
      "turns": [
        {
          "text": "Let me read that file.",
          "toolCalls": [
            {"id": "tool-2", "name": "read_file", "input": {"path": "wrong-path.json"}}
          ]
        },
        {
          "text": "Error: File not found"
        }
      ]
    },
    "grade": {"passed": false, "score": 0.0}
  },
  {
    "taskId": "task-003",
    "trialIndex": 0,
    "transcript": {
      "task": "Read file config.json",
      "turns": [
        {
          "text": "I'll read the configuration file.",
          "toolCalls": [
            {"id": "tool-3", "name": "read_file", "input": {"path": "config.json"}}
          ]
        },
        {
          "text": "Config loaded: {\"port\": 3000}"
        }
      ]
    },
    "grade": {"passed": true, "score": 1.0}
  }
]
```

## Part 1: Extract Traces

Create `pipeline.ts`:

```typescript
import * as fs from "fs";

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

interface Turn {
  text: string;
  toolCalls?: ToolCall[];
}

interface Trial {
  taskId: string;
  trialIndex: number;
  transcript: {
    task: string;
    turns: Turn[];
  };
  grade: {
    passed: boolean;
    score: number;
  };
}

interface TraceRecord {
  id: string;
  task: string;
  success: boolean;
  turns: Turn[];
  toolCalls: ToolCall[];
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

// Test
const trials: Trial[] = JSON.parse(fs.readFileSync("trials.json", "utf-8"));
const traces = extractTraces(trials);

console.log(`Extracted ${traces.length} traces`);
console.log(`Successes: ${traces.filter(t => t.success).length}`);
console.log(`Failures: ${traces.filter(t => !t.success).length}`);
```

Run it:
```bash
bun pipeline.ts
```

Expected output:
```
Extracted 3 traces
Successes: 2
Failures: 1
```

## Part 2: Clustering

Add clustering function:

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

// Test
const clusters = clusterByKeywords(traces);
console.log(`\nClusters: ${clusters.size}`);
for (const [key, group] of clusters) {
  console.log(`  "${key}": ${group.length} traces`);
}
```

Expected output:
```
Clusters: 1
  "read file data.txt": 1 traces
  "read file config.json": 2 traces
```

Wait, that's not right. The clustering should group by first 3 words only:

```
Clusters: 1
  "read file data.txt": 1 traces
  "read file config.json": 2 traces
```

Actually, let me reconsider. With first 3 words:
- "Read file data.txt" → "read file data.txt" (3 words)
- "Read file config.json" → "read file config.json" (3 words)

These are different. Let's update to use just first 2 words for better clustering:

```typescript
const key = trace.task.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
```

Now output:
```
Clusters: 1
  "read file": 3 traces
```

## Part 3: Build SFT Dataset

```typescript
interface SFTExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string | any[];
  }>;
}

function formatToolCalls(calls: ToolCall[]): any[] {
  return calls.map(c => ({
    type: "tool_use",
    id: c.id,
    name: c.name,
    input: c.input
  }));
}

function buildSFTDataset(traces: TraceRecord[]): SFTExample[] {
  const successes = traces.filter(t => t.success);

  return successes.map(trace => ({
    messages: [
      {
        role: "system" as const,
        content: "You are a helpful AI agent with file access tools."
      },
      {
        role: "user" as const,
        content: trace.task
      },
      ...trace.turns.map(turn => ({
        role: "assistant" as const,
        content: turn.toolCalls && turn.toolCalls.length > 0
          ? formatToolCalls(turn.toolCalls)
          : turn.text
      }))
    ]
  }));
}

// Test
const sftData = buildSFTDataset(traces);
console.log(`\nSFT dataset: ${sftData.length} examples`);
console.log(JSON.stringify(sftData[0], null, 2));
```

Expected output:
```
SFT dataset: 2 examples
{
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful AI agent with file access tools."
    },
    {
      "role": "user",
      "content": "Read file data.txt"
    },
    {
      "role": "assistant",
      "content": [
        {
          "type": "tool_use",
          "id": "tool-1",
          "name": "read_file",
          "input": {"path": "data.txt"}
        }
      ]
    },
    {
      "role": "assistant",
      "content": "The file contains: Hello World"
    }
  ]
}
```

## Part 4: Build DPO Dataset

```typescript
interface DPOExample {
  prompt: string;
  chosen: string;
  rejected: string;
}

function formatTrace(trace: TraceRecord): string {
  return trace.turns.map(turn => {
    if (turn.toolCalls && turn.toolCalls.length > 0) {
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

// Test
const dpoData = buildDPODataset(traces);
console.log(`\nDPO dataset: ${dpoData.length} pairs`);
console.log(JSON.stringify(dpoData[0], null, 2));
```

Expected output:
```
DPO dataset: 1 pairs
{
  "prompt": "Read file config.json",
  "chosen": "I'll read the configuration file.\n<tool_use>read_file({\"path\":\"config.json\"})</tool_use>\n\nConfig loaded: {\"port\": 3000}",
  "rejected": "Let me read that file.\n<tool_use>read_file({\"path\":\"wrong-path.json\"})</tool_use>\n\nError: File not found"
}
```

## Part 5: Write JSONL

```typescript
function writeJSONL(examples: any[], filepath: string): void {
  const lines = examples.map(ex => JSON.stringify(ex)).join("\n");
  fs.writeFileSync(filepath, lines);
  console.log(`Wrote ${examples.length} examples to ${filepath}`);
}

// Test
writeJSONL(sftData, "sft-dataset.jsonl");
writeJSONL(dpoData, "dpo-dataset.jsonl");
```

Verify files were created:
```bash
ls -lh *.jsonl
cat sft-dataset.jsonl | wc -l
cat dpo-dataset.jsonl | wc -l
```

## Part 6: Intent Classification

Create `classify.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    max_tokens: 16,
    messages: [{ role: "user", content: prompt }]
  });

  const text = response.content[0].text.trim();
  const num = parseInt(text);

  if (num >= 1 && num <= categories.length) {
    return categories[num - 1];
  }

  return categories[0]; // Default fallback
}

// Test
const categories = ["file_operations", "api_calls", "data_processing", "user_interaction"];

const tasks = [
  "Read file data.txt",
  "Call the getUserProfile API",
  "Parse CSV and calculate mean",
  "Ask user for confirmation"
];

(async () => {
  for (const task of tasks) {
    const intent = await classifyIntent(task, categories, "Agent task classification");
    console.log(`Task: "${task}" → ${intent}`);
  }
})();
```

Run it:
```bash
bun classify.ts
```

Expected output:
```
Task: "Read file data.txt" → file_operations
Task: "Call the getUserProfile API" → api_calls
Task: "Parse CSV and calculate mean" → data_processing
Task: "Ask user for confirmation" → user_interaction
```

## Part 7: Validation

Add validation to `pipeline.ts`:

```typescript
interface ValidationReport {
  valid: boolean;
  totalExamples: number;
  issues: string[];
}

function validateDataset(examples: SFTExample[]): ValidationReport {
  const issues: string[] = [];

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];

    if (ex.messages.length < 2) {
      issues.push(`Example ${i}: Too few messages (${ex.messages.length})`);
    }

    if (ex.messages[0].role !== "system") {
      issues.push(`Example ${i}: First message should be system role`);
    }

    for (let j = 0; j < ex.messages.length; j++) {
      const msg = ex.messages[j];
      if (!msg.content || (typeof msg.content === "string" && msg.content.length === 0)) {
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

// Test
const validation = validateDataset(sftData);
console.log(`\nValidation: ${validation.valid ? "PASSED" : "FAILED"}`);
console.log(`Total examples: ${validation.totalExamples}`);
if (validation.issues.length > 0) {
  console.log("Issues:");
  validation.issues.forEach(issue => console.log(`  - ${issue}`));
}
```

## Challenge Exercises

1. **Semantic Clustering**: Replace keyword clustering with embedding-based clustering
2. **Data Augmentation**: Generate variations of successful traces by paraphrasing tasks
3. **Quality Filters**: Remove traces with tool errors, repeated failures, or timeout issues
4. **Multi-turn DPO**: Create DPO pairs that differ at a specific turn (not just final outcome)
5. **Stratified Splits**: Create train/validation/test splits maintaining cluster distribution

## Deliverables

Submit:
1. `pipeline.ts` with all extraction, clustering, and dataset building functions
2. `classify.ts` with intent classification implementation
3. `sft-dataset.jsonl` (generated output)
4. `dpo-dataset.jsonl` (generated output)
5. Short writeup: How would you extend this for multi-agent routing?
