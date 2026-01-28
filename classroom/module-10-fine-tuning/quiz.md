# Module 10 Quiz: Fine-Tuning Pipeline

## Question 1: Trace Extraction
What is the purpose of flattening tool calls in a TraceRecord?

A) To reduce memory usage
B) To make tool usage analysis easier
C) To comply with JSONL format
D) To enable parallel processing

**Answer**: B

**Explanation**: Flattening tool calls (extracting them from nested turn structures into a single array) makes it easier to analyze patterns like tool frequency, error rates, and common sequences.

---

## Question 2: SFT Dataset Format
Which messages are included in an SFT training example?

A) Only successful assistant responses
B) System, user, and all assistant turns
C) User message and final assistant response only
D) All messages except system prompts

**Answer**: B

**Explanation**: SFT examples include the full conversation: system message (agent instructions), user message (task), and all assistant turns (including tool calls and responses).

---

## Question 3: DPO Requirements
What is required to create a DPO training pair?

A) Two successful traces for the same task
B) A successful trace and a failed trace for the same task
C) Any two traces from the same task cluster
D) A trace and its manually corrected version

**Answer**: B

**Explanation**: DPO learns from preferences by contrasting a successful trace (chosen) with a failed trace (rejected) for the exact same task/prompt.

---

## Question 4: Clustering Strategy
Why use keyword clustering (first N words) instead of exact task matching?

A) It's faster to compute
B) It groups similar tasks together for stratified sampling
C) It's required for JSONL format
D) It reduces dataset size

**Answer**: B

**Explanation**: Keyword clustering groups similar tasks (e.g., "Read file X" and "Read file Y" both start with "read file"), enabling stratified sampling and balanced representation across task types.

---

## Question 5: Intent Classification
Why does intent classification use `max_tokens: 16`?

A) To save API costs
B) To force concise output (just the category number)
C) To prevent hallucinations
D) To enable parallel requests

**Answer**: B

**Explanation**: Setting `max_tokens: 16` prevents the model from elaborating. You want "2" as output, not "Based on careful analysis, this task falls into category 2 because...".

---

## Question 6: Stratified Sampling
What problem does stratified sampling solve?

A) Prevents rare tasks from being over-represented
B) Prevents common tasks from dominating the dataset
C) Ensures all clusters have exactly the same size
D) Guarantees 50/50 success/failure ratio

**Answer**: B

**Explanation**: Stratified sampling takes proportional samples from each cluster, preventing common task types from dominating and ensuring rare but important tasks are represented.

---

## Question 7: JSONL Format
What is the advantage of JSONL (JSON Lines) over standard JSON?

A) Smaller file size
B) Human-readable format
C) Stream processing and line-level operations
D) Better compression ratio

**Answer**: C

**Explanation**: JSONL (one JSON object per line) enables stream processing without loading the entire file, line-level deduplication, and is the standard format for fine-tuning APIs.

---

## Question 8: Data Validation
Which validation check is most critical before fine-tuning?

A) All examples have exactly 3 messages
B) All tool calls succeeded
C) No empty content in messages
D) All examples use the same tools

**Answer**: C

**Explanation**: Empty content in messages will cause fine-tuning to fail or produce poor results. The model needs actual text or tool calls to learn from.

---

## Question 9: SFT vs DPO
When should you use SFT instead of DPO?

A) When you have many successful examples but few failures
B) When you have equal success and failure counts
C) When tasks have subjective quality criteria
D) When refining an already-capable model

**Answer**: A

**Explanation**: SFT works well when you have many successful examples to imitate. DPO requires success/failure pairs, so it's better when you have contrasting outcomes for the same tasks.

---

## Question 10: Pipeline Order
What is the correct order of pipeline stages?

A) Cluster → Extract → Sample → Build → Export
B) Extract → Build → Cluster → Sample → Export
C) Extract → Cluster → Sample → Build → Export
D) Sample → Extract → Cluster → Build → Export

**Answer**: C

**Explanation**: The pipeline flows: Extract traces from trials → Cluster by task type → Stratified sample → Build datasets (SFT/DPO) → Export as JSONL.

---

## Bonus Question: Tool Call Formatting
How are tool calls represented in SFT assistant messages?

A) As plain text descriptions
B) As structured objects with type, id, name, input
C) As JSON strings
D) As separate messages

**Answer**: B

**Explanation**: Tool calls use structured format:
```typescript
{
  type: "tool_use",
  id: "tool-1",
  name: "read_file",
  input: {"path": "data.txt"}
}
```
This teaches the model the proper tool invocation syntax.

---

## Score Interpretation
- 10-11 correct: Expert - Ready to build production pipelines
- 8-9 correct: Proficient - Review edge cases and validation
- 6-7 correct: Developing - Revisit SFT vs DPO and pipeline stages
- Below 6: Review tutorial and handout, then retake quiz
