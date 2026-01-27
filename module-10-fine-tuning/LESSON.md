# Module 10: Fine-Tuning Pipeline

## Goal
Turn your agent's eval traces into training datasets: SFT for imitation learning, DPO for preference learning, and LLM-as-classifier for intent routing.

## Concepts

### Why fine-tune?
Prompt engineering has a ceiling. You can add rules forever, but the base model has fixed behavior. Fine-tuning **changes the model itself** to behave like your best agent runs. A fine-tuned smaller model can outperform a larger model with a long prompt — and it's faster and cheaper.

### SFT (Supervised Fine-Tuning)
```
                  ┌─────────────────────────┐
Successful trace  │ system: <prompt>         │
       →          │ user: "Rename variable"  │  → Training example
                  │ assistant: <tool calls>  │
                  └─────────────────────────┘
```

SFT teaches by imitation. You take **successful** agent traces and format them as training examples: `{messages: [{role, content}]}`. The model learns to produce the same sequence of tool calls for similar tasks.

Only successful traces become SFT examples. Failed traces teach wrong behavior.

### DPO (Direct Preference Optimization)
```
Same task, two outcomes:
  ✓ Success trace → "chosen"
  ✗ Failure trace → "rejected"
```

DPO teaches by contrast. You pair a successful and failed trace for the **same task**. The model learns to prefer the successful trajectory. This requires running multiple trials per task (which you already do in evals).

### Intent classification
Use an LLM as a fast classifier to route tasks to specialized agents:
- `code_edit` → full coding agent
- `question` → simple Q&A (no tools needed)
- `code_debug` → debugging-focused agent

Constrain `max_tokens: 16` so the LLM returns a single number. This makes classification fast and consistent.

### The data pipeline
```
Eval traces → Extract → Cluster → Stratified sample → SFT dataset
                                                    → DPO dataset
```

1. **Extract**: Pull structured records from eval trials
2. **Cluster**: Group by task type (simple keyword clustering)
3. **Stratified sample**: Mix of successes and failures from each cluster
4. **Build datasets**: SFT from successes, DPO from success/failure pairs

## Build It

### Step 1: Build the data pipeline

Create `module-10-fine-tuning/data-pipeline.ts`:

```typescript
import type { Trial, Transcript } from "../module-7-evals/types.js";

export interface TraceRecord {
  id: string;
  task: string;
  success: boolean;
  turns: number;
  toolCalls: string[];
  transcript: Transcript;
}

// TODO: extractTraces(trials) — convert Trial[] to TraceRecord[]
// TODO: clusterTraces(traces) — group by first 3 words of task (simple clustering)
// TODO: stratifiedSample(clusters, samplesPerCluster) — mix success/failure from each cluster
// TODO: saveTraces(traces, outputPath) — write JSONL
```

**Python:**
```python
# TODO: extract_traces(trials) — convert to list of dicts with id, task, success, turns, tool_calls
# TODO: cluster_traces(traces) — group by first 3 words of task
# TODO: stratified_sample(clusters, samples_per_cluster) — mix success/failure
# TODO: save_traces(traces, output_path) — write JSONL
```

### Step 2: Build the SFT dataset builder

Create `module-10-fine-tuning/sft-dataset.ts`:

```typescript
export interface SFTExample {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

// TODO: buildSFTDataset(traces, systemPrompt) — filter successes, format as message arrays
//   Include tool calls as structured content in assistant messages
// TODO: saveSFTDataset(examples, outputPath) — write JSONL
```

**Python:**
```python
# TODO: build_sft_dataset(traces, system_prompt) — filter successes, format as message dicts
# TODO: save_sft_dataset(examples, output_path) — write JSONL
```

### Step 3: Build the DPO dataset builder

Create `module-10-fine-tuning/dpo-dataset.ts`:

```typescript
export interface DPOExample {
  prompt: string;
  chosen: string;    // Successful trace
  rejected: string;  // Failed trace
}

// TODO: buildDPODataset(traces) — group by task, pair each success with each failure
// TODO: formatTrace(trace) — extract assistant turns with tool calls
// TODO: saveDPODataset(pairs, outputPath) — write JSONL
```

**Python:**
```python
# TODO: build_dpo_dataset(traces) — group by task, pair success with failure
# TODO: save_dpo_dataset(pairs, output_path) — write JSONL
```

### Step 4: Build the intent classifier

Create `module-10-fine-tuning/classifier.ts`:

```typescript
// TODO: classify(text, categories, context?) — ask Claude for category number
//   max_tokens: 16 for single-token response
// TODO: routeIntent(task) — classify into code_edit/code_create/code_debug/code_refactor/question
```

**Python:**
```python
# TODO: classify(text, categories, context="") — ask Claude for category number, max_tokens=16
# TODO: route_intent(task) — classify into code_edit/code_create/code_debug/code_refactor/question
```

### Step 5: Build the orchestrator

Create `module-10-fine-tuning/train.ts`:

```typescript
// TODO: Load eval traces (or create synthetic data for demo)
// TODO: Extract, cluster, sample
// TODO: Build SFT dataset
// TODO: Build DPO dataset
// TODO: Demo the classifier
// TODO: Save all outputs to training-data/
```

Run it: `bun module-10-fine-tuning/train.ts`

## Exercises

1. **Inspect 5 SFT examples**: Open `training-data/sft-dataset.jsonl`. Read 5 examples. Are they good training data? Would a model that imitates these traces do the right thing?

2. **Inspect DPO pairs**: Open `training-data/dpo-dataset.jsonl`. For each pair, compare chosen vs. rejected. Can you see what the "chosen" trace did differently?

3. **Test the classifier**: Run the classifier on 10 different task descriptions. Does it route correctly? Find an edge case where it gets confused.

4. **Build SFT from your own evals**: Run Module 7 evals first, then run this pipeline. How many successful traces became SFT examples? How many DPO pairs?

5. **Design a reward function that causes reward hacking**: (Preview of Module 11) If you optimized purely for "number of files created," the agent would create empty files. Design a naive reward and explain how it would be gamed.

## Checkpoint

You're ready for Module 11 when you can answer:
- Why only use successful traces for SFT?
- Why does DPO need pairs from the same task?
- Why constrain `max_tokens: 16` for classification?
- What's the difference between SFT and DPO conceptually?

## Solutions
Compare your code against `solutions/` if you're stuck.
