# Module 10 Homework: Fine-Tuning Pipeline

## Overview
Build a production-ready fine-tuning pipeline that processes real agent trials from Module 9 and generates training datasets with quality metrics and analysis.

## Prerequisites
- Completed Module 9 (Eval-Driven Bootstrap)
- Agent trials JSON from eval harness
- Node.js/TypeScript or Python environment

## Assignment

### Part 1: Enhanced Trace Extraction (25 points)

Extend the basic TraceRecord with metadata:

```typescript
interface EnhancedTraceRecord extends TraceRecord {
  duration: number;          // Execution time in ms
  tokenCount: number;        // Total tokens used
  toolErrors: number;        // Count of failed tool calls
  retries: number;           // Number of retry attempts
  gradeDetails: GradeResult; // Full grading breakdown
}
```

Implement:
1. `extractEnhancedTraces(trials: Trial[]): EnhancedTraceRecord[]`
2. Calculate statistics: mean duration, token efficiency, error rate
3. Filter out low-quality traces (>3 tool errors, >5 retries)

**Deliverable**: `extract.ts` with implementation and summary statistics printed to console.

### Part 2: Semantic Clustering (25 points)

Replace keyword clustering with embedding-based clustering:

1. Use a small embedding model (e.g., `nomic-embed-text` or `text-embedding-3-small`)
2. Embed all task descriptions
3. Apply K-means clustering (k=5 to 10, tune based on data)
4. Label each cluster using LLM summarization of representative tasks

```typescript
interface SemanticCluster {
  id: number;
  label: string;              // LLM-generated label
  centroid: number[];         // Embedding centroid
  traces: TraceRecord[];
  avgSuccessRate: number;
}

async function semanticClustering(
  traces: TraceRecord[],
  k: number
): Promise<SemanticCluster[]> {
  // Your implementation
}
```

**Deliverable**: `cluster.ts` with implementation. Print cluster labels, sizes, and success rates.

### Part 3: Multi-Tier Sampling (20 points)

Implement stratified sampling with quality tiers:

```typescript
type QualityTier = "excellent" | "good" | "acceptable";

interface SamplingStrategy {
  excellent: { successRate: 1.0, minTokens: 0, maxToolErrors: 0 };
  good: { successRate: 1.0, minTokens: 0, maxToolErrors: 1 };
  acceptable: { successRate: 1.0, minTokens: 0, maxToolErrors: 2 };
}

function tieredSample(
  clusters: SemanticCluster[],
  samplesPerTier: { excellent: number, good: number, acceptable: number }
): TraceRecord[] {
  // Your implementation
}
```

Sample:
- 10 excellent examples per cluster
- 15 good examples per cluster
- 20 acceptable examples per cluster

**Deliverable**: `sample.ts` with tier distribution printed for each cluster.

### Part 4: Advanced SFT Dataset (15 points)

Build an SFT dataset with:
1. Dynamic system prompts based on task cluster
2. Include tool result messages (not just tool calls)
3. Add chain-of-thought reasoning if available in traces

```typescript
interface AdvancedSFTExample extends SFTExample {
  metadata: {
    clusterId: number;
    clusterLabel: string;
    qualityTier: QualityTier;
    tokenCount: number;
  };
}

function buildAdvancedSFTDataset(
  traces: TraceRecord[],
  clusters: SemanticCluster[]
): AdvancedSFTExample[] {
  // Your implementation
}
```

**Deliverable**: `sft-dataset.jsonl` with at least 50 examples. Include `sft-stats.json` with distribution breakdown.

### Part 5: DPO with Trajectory Divergence (15 points)

Build DPO pairs that diverge at specific turns (not just final outcomes):

```typescript
interface DivergencePoint {
  turnIndex: number;
  successAction: string;
  failureAction: string;
}

interface AdvancedDPOExample extends DPOExample {
  divergence: DivergencePoint;
  metadata: {
    clusterId: number;
    successTokens: number;
    failureTokens: number;
  };
}

function buildDivergenceDPODataset(
  traces: TraceRecord[],
  clusters: SemanticCluster[]
): AdvancedDPOExample[] {
  // Your implementation
}
```

Find the earliest turn where success and failure traces differ (e.g., one calls the right tool, the other calls the wrong tool).

**Deliverable**: `dpo-dataset.jsonl` with at least 20 pairs. Include `dpo-analysis.json` showing common divergence patterns.

## Bonus Challenges (Extra Credit)

### Bonus 1: Data Augmentation (+10 points)
Generate synthetic variations of successful traces by:
- Paraphrasing task descriptions (use LLM)
- Changing parameter values while keeping tool sequence
- Adding plausible but unnecessary exploration steps

Target: 2x original dataset size through augmentation.

### Bonus 2: Multi-Agent Routing (+10 points)
Design a routing system that:
1. Classifies tasks into clusters
2. Tracks per-cluster success rates over time
3. Routes to specialized fine-tuned models (simulated)
4. Implements fallback to general model if confidence < threshold

```typescript
interface Router {
  classify(task: string): Promise<string>;           // Cluster label
  route(task: string): Promise<string>;              // Model ID
  recordOutcome(clusterId: string, success: boolean): void;
  getMetrics(): RouterMetrics;
}
```

### Bonus 3: Incremental Dataset Updates (+10 points)
Implement a system that:
- Loads existing datasets
- Processes new trials incrementally
- Deduplicates by task + trace similarity
- Maintains cluster balance over time
- Exports only the new examples as delta files

## Submission Requirements

Submit a ZIP file containing:

### Required Files
1. `extract.ts` - Enhanced trace extraction
2. `cluster.ts` - Semantic clustering
3. `sample.ts` - Tiered sampling
4. `build-datasets.ts` - SFT and DPO dataset builders
5. `sft-dataset.jsonl` - SFT training data
6. `dpo-dataset.jsonl` - DPO training data
7. `sft-stats.json` - SFT dataset statistics
8. `dpo-analysis.json` - DPO divergence analysis
9. `README.md` - Instructions and design decisions

### README Content
Include:
- How to run each script
- Dependencies and setup
- Dataset statistics summary (sizes, distributions, quality metrics)
- Design decisions (clustering k value, sampling ratios, filters)
- Challenges encountered and solutions
- Ideas for production deployment

### Evaluation Criteria

**Correctness (40%)**
- Trace extraction properly calculates metadata
- Clustering groups similar tasks effectively
- Sampling maintains balance across tiers and clusters
- Datasets validate against format specs

**Code Quality (20%)**
- Clean, readable TypeScript/Python
- Proper error handling
- Type safety (TypeScript) or type hints (Python)
- Modular functions with clear responsibilities

**Dataset Quality (25%)**
- Sufficient size (50+ SFT, 20+ DPO minimum)
- Balanced distribution across clusters
- Proper formatting (JSONL, valid JSON per line)
- Meaningful examples that teach desired behaviors

**Analysis (15%)**
- Statistics accurately reflect dataset characteristics
- Divergence analysis identifies actionable patterns
- README demonstrates understanding of trade-offs
- Thoughtful design decisions with justification

## Tips

1. **Start small**: Test on 10-20 trials first, then scale up
2. **Validate early**: Run format checks after each stage
3. **Visualize clusters**: Print sample tasks from each cluster to verify grouping
4. **Quality over quantity**: Better to have 30 excellent examples than 100 mediocre ones
5. **Document assumptions**: If data is missing or ambiguous, explain your handling approach

## Due Date
Submit within 1 week of module completion.

## Questions?
Post in course forum with tag `[module-10-homework]`.
