# Module 9 Homework: Advanced Bootstrap System

## Overview

Extend your basic bootstrap system with advanced features: failure clustering, rule pruning, holdout validation, and multi-phase optimization.

**Time estimate**: 3-4 hours
**Difficulty**: Advanced

## Setup

Use your Module 9 lab code as the starting point. You'll add four sophisticated enhancements.

---

## Part 1: Failure Clustering (60 min)

Group similar failures before sending to the meta-agent, allowing it to identify patterns more effectively.

### Requirements

#### 1.1 Failure Similarity

Implement a similarity metric for failure transcripts:

```typescript
function computeSimilarity(transcript1: string, transcript2: string): number {
  // TODO: Implement similarity metric
  // Options:
  // - Keyword overlap (simple)
  // - Edit distance on error messages
  // - Embeddings (advanced)

  // Return 0.0 (completely different) to 1.0 (identical)
}
```

**Simple approach**: Extract error messages and compare keyword overlap.

**Advanced approach**: Use Claude to generate embeddings and compute cosine similarity.

#### 1.2 Clustering Algorithm

```typescript
interface FailureCluster {
  representative: TaskResult;  // One example from cluster
  members: TaskResult[];       // All failures in cluster
  pattern: string;             // Shared characteristic
}

function clusterFailures(
  failures: TaskResult[],
  threshold: number = 0.7
): FailureCluster[] {
  // TODO: Implement clustering
  // 1. Start with each failure as its own cluster
  // 2. Merge clusters with similarity > threshold
  // 3. For each cluster, identify common pattern
  // 4. Return clusters sorted by size (largest first)
}
```

#### 1.3 Cluster-Aware Meta-Agent

Modify the meta-agent to process each cluster separately:

```typescript
async function analyzeFailureClusters(
  clusters: FailureCluster[],
  currentPrompt: string
): Promise<Improvement[]> {
  // TODO:
  // 1. Process top 3 largest clusters
  // 2. For each cluster, call meta-agent with:
  //    - Cluster pattern description
  //    - Representative example(s)
  // 3. Aggregate improvements from all clusters
  // 4. Deduplicate similar improvements
}
```

### Deliverable

Bootstrap that groups failures before analysis, leading to more targeted improvements.

---

## Part 2: Rule Pruning (60 min)

After several cycles, the prompt may have 20+ rules. Identify and remove rules that don't help.

### Requirements

#### 2.1 Rule Impact Tracking

Track which rules were added in which cycle and their impact:

```typescript
interface RuleMetadata {
  ruleNumber: number;
  addition: string;
  addedInCycle: number;
  passRateBefore: number;
  passRateAfter: number;
  impact: number;  // passRateAfter - passRateBefore
}

// Store in metadata.json
const ruleHistory: RuleMetadata[] = [];
```

Update this every cycle to track impact.

#### 2.2 Pruning Strategy

After every N cycles (e.g., 5), prune low-impact rules:

```typescript
async function pruneRules(
  promptPath: string,
  ruleHistory: RuleMetadata[],
  minImpact: number = 0.02  // Must improve pass rate by 2%+
): Promise<void> {
  // TODO:
  // 1. Identify rules with impact < minImpact
  // 2. Remove those rules from prompt
  // 3. Re-number remaining rules
  // 4. Test that pass rate doesn't drop
  // 5. If drop > 5%, restore rules and increase minImpact
}
```

#### 2.3 Consolidation

Merge related rules:

```typescript
async function consolidateRules(
  prompt: string,
  ruleHistory: RuleMetadata[]
): Promise<string> {
  // TODO: Use meta-agent to:
  // 1. Identify groups of related rules
  // 2. Propose consolidated versions
  // 3. Replace groups with single consolidated rule
  // 4. Test impact
}
```

Example:
```
Before:
12. Always check if directory exists before writing
15. Create parent directory if it doesn't exist
19. Use mkdir -p for recursive directory creation

After:
12. Before writing files, ensure parent directory exists (create recursively with mkdir -p if needed)
```

### Deliverable

A pruning system that removes low-impact rules and consolidates related rules, keeping the prompt concise.

---

## Part 3: Holdout Validation (45 min)

Split eval tasks into train/test sets to detect overfitting.

### Requirements

#### 3.1 Train/Test Split

```typescript
interface EvalSplit {
  train: EvalTask[];
  test: EvalTask[];
}

function splitTasks(tasks: EvalTask[], testRatio = 0.3): EvalSplit {
  // TODO:
  // 1. Shuffle tasks randomly
  // 2. Allocate testRatio to test set
  // 3. Return split
}
```

#### 3.2 Separate Evaluation

```typescript
async function runSplitEvaluation(
  agent: Agent,
  split: EvalSplit
): Promise<{ train: EvalReport; test: EvalReport }> {
  // TODO:
  // 1. Run eval on train set (used for improvements)
  // 2. Run eval on test set (used for validation)
  // 3. Return both reports
}
```

#### 3.3 Overfitting Detection

```typescript
function detectOverfitting(
  trainPassRate: number,
  testPassRate: number,
  threshold = 0.10  // 10% gap
): boolean {
  // If train pass rate is >10% higher than test, we're overfitting
  return trainPassRate - testPassRate > threshold;
}
```

Modify bootstrap to:
- Use train set for meta-agent analysis
- Report both train and test pass rates
- Stop if overfitting detected

### Deliverable

Bootstrap that splits tasks into train/test and monitors for overfitting.

---

## Part 4: Multi-Phase Optimization (90 min)

Instead of a single target, optimize in phases with increasing difficulty.

### Requirements

#### 4.1 Phase Definition

```typescript
interface OptimizationPhase {
  name: string;
  targetPassRate: number;
  maxCycles: number;
  focus?: string;  // Optional focus area
}

const PHASES: OptimizationPhase[] = [
  {
    name: "Foundation",
    targetPassRate: 0.70,
    maxCycles: 5,
    focus: "Basic error handling and validation"
  },
  {
    name: "Robustness",
    targetPassRate: 0.85,
    maxCycles: 5,
    focus: "Edge cases and defensive programming"
  },
  {
    name: "Excellence",
    targetPassRate: 0.95,
    maxCycles: 10,
    focus: "Perfect execution and comprehensive testing"
  }
];
```

#### 4.2 Phase-Aware Meta-Agent

Include phase focus in meta-agent prompt:

```typescript
async function analyzeWithPhaseContext(
  failures: TaskResult[],
  currentPrompt: string,
  phase: OptimizationPhase
): Promise<Improvement[]> {
  // TODO: Add phase.focus to meta-agent prompt
  // Example: "Current focus: Basic error handling and validation"
  // This guides the meta-agent to prioritize relevant improvements
}
```

#### 4.3 Progressive Bootstrap

```typescript
async function multiPhaseBootstrap(phases: OptimizationPhase[]) {
  for (const phase of phases) {
    console.log(`\n==== Phase: ${phase.name} ====`);
    console.log(`Target: ${(phase.targetPassRate * 100).toFixed(0)}%`);
    console.log(`Focus: ${phase.focus}\n`);

    await bootstrap({
      maxCycles: phase.maxCycles,
      targetPassRate: phase.targetPassRate,
      trialsPerTask: 2,  // Increase trials as quality improves
      promptPath: "./agent-prompt.md",
      phaseFocus: phase.focus
    });

    // Checkpoint after each phase
    gitCommit(`phase-${phase.name}-complete`);

    // Optional: prune rules between phases
    await pruneRules("./agent-prompt.md", ruleHistory);
  }
}
```

#### 4.4 Phase Transition Report

After each phase, generate a report:

```typescript
interface PhaseReport {
  phaseName: string;
  startPassRate: number;
  endPassRate: number;
  cyclesUsed: number;
  rulesAdded: number;
  rulesPruned: number;
  targetAchieved: boolean;
}

function generatePhaseReport(phase: OptimizationPhase, history: CycleData[]): PhaseReport {
  // TODO: Aggregate stats from all cycles in the phase
}
```

### Deliverable

A multi-phase bootstrap that progressively improves the agent through structured stages, with phase-specific focus areas.

---

## Verification Checklist

### Part 1: Failure Clustering
- [ ] Failures grouped by similarity metric
- [ ] Clusters sorted by size
- [ ] Meta-agent processes clusters separately
- [ ] Improvements target specific patterns

### Part 2: Rule Pruning
- [ ] Rule impact tracked in metadata
- [ ] Low-impact rules removed
- [ ] Related rules consolidated
- [ ] Pass rate maintained after pruning

### Part 3: Holdout Validation
- [ ] Tasks split into train/test
- [ ] Both pass rates reported
- [ ] Overfitting detected if gap > 10%
- [ ] Bootstrap stops on overfitting

### Part 4: Multi-Phase
- [ ] Multiple phases executed sequentially
- [ ] Phase focus guides meta-agent
- [ ] Progress saved between phases
- [ ] Phase reports generated

---

## Bonus Challenges

### B1: A/B Testing (60 min)

Test multiple improvement strategies in parallel:

```typescript
async function abTestImprovements(
  candidates: Improvement[][]
): Promise<Improvement[]> {
  // Test each candidate set separately
  // Return the set with highest pass rate improvement
}
```

### B2: Prompt Compression (60 min)

Use Claude to compress the prompt without losing effectiveness:

```typescript
async function compressPrompt(currentPrompt: string): Promise<string> {
  // Use meta-agent to:
  // 1. Identify redundant rules
  // 2. Merge similar concepts
  // 3. Rewrite more concisely
  // 4. Verify pass rate maintained
}
```

### B3: Failure Prediction (90 min)

Predict which tasks will fail before running them:

```typescript
async function predictFailures(
  tasks: EvalTask[],
  currentPrompt: string
): Promise<{ taskId: string; failureProbability: number }[]> {
  // Use Claude to analyze task + prompt
  // Predict likelihood of failure
  // Prioritize analysis on high-risk tasks
}
```

---

## Submission

Submit:
1. Updated `bootstrap.ts` with all four enhancements
2. `failure-clustering.ts` - Clustering implementation
3. `rule-pruning.ts` - Pruning and consolidation
4. `holdout-validation.ts` - Train/test split logic
5. `multi-phase.ts` - Phase definitions and execution
6. `RESULTS.md` - Full run output showing all phases

---

## Grading Rubric

| Component | Points |
|-----------|--------|
| Failure clustering (similarity + grouping) | 25 |
| Rule pruning (tracking + removal) | 25 |
| Holdout validation (split + overfitting detection) | 20 |
| Multi-phase optimization (3 phases) | 25 |
| Documentation and testing | 5 |
| **Total** | **100** |

**Bonus**: Up to 20 points for bonus challenges.

---

## Expected Output

```
==== Phase: Foundation ====
Target: 70%
Focus: Basic error handling and validation

Cycle 0: Clustering 5 failures into 2 groups
  - Cluster 1 (3 failures): File path validation issues
  - Cluster 2 (2 failures): Missing error checks
Pass rate: 55.0% → 65.0% ✓
Train: 65.0%, Test: 62.0% (no overfitting)

Cycle 1: Clustering 4 failures into 2 groups
Pass rate: 65.0% → 72.0% ✓
Train: 72.0%, Test: 70.0% (no overfitting)

Phase Foundation complete!
Rules added: 3, Pass rate: 72.0%

==== Phase: Robustness ====
Target: 85%
Focus: Edge cases and defensive programming

Pruning low-impact rules... Removed 1 rule, pass rate: 72.0% → 71.0%

Cycle 0: Clustering 3 failures into 1 group
Pass rate: 71.0% → 78.0% ✓
Train: 78.0%, Test: 76.0% (no overfitting)

Cycle 1: Clustering 2 failures into 1 group
Pass rate: 78.0% → 82.0% ✓
Train: 82.0%, Test: 80.0% (no overfitting)

Cycle 2: Clustering 2 failures into 1 group
Pass rate: 82.0% → 87.0% ✓
Train: 87.0%, Test: 85.0% (no overfitting)

Phase Robustness complete!
Rules added: 4, Pass rate: 87.0%

==== Phase: Excellence ====
Target: 95%
Focus: Perfect execution

Consolidating rules... 8 rules → 5 consolidated rules

Cycle 0: No failures to cluster
Pass rate: 87.0% → 92.0% ✓

Cycle 1: Clustering 1 failure
Pass rate: 92.0% → 96.0% ✓
Train: 96.0%, Test: 94.0% (no overfitting)

Target achieved!

Final Results:
- Pass rate: 96.0% (train), 94.0% (test)
- Total rules: 6 (started with 3)
- Total cycles: 7
```

---

## Learning Objectives

By completing this homework, you will:
- Build production-grade failure analysis with clustering
- Implement prompt hygiene via rule pruning and consolidation
- Detect and prevent overfitting with holdout validation
- Design multi-phase optimization strategies
- Create self-improving systems that scale to high performance

This prepares you for Module 10 (fine-tuning), where you'll convert prompt improvements into model weights.
