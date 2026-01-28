# Module 11 Homework: RL Agents

## Overview
Build a complete RL training system for code editing agents with custom reward functions, trajectory analysis, and adaptive curriculum learning.

## Prerequisites
- Completed Module 11 Lab
- TypeScript or Python environment
- Module 9 eval harness (optional, for integration)

## Assignment

### Part 1: Code Editing Environment (25 points)

Build an environment for code editing tasks with real file operations:

```typescript
interface CodeEditTask extends TaskSetup {
  targetFile: string;         // File to edit
  requirements: string[];     // List of required changes
  forbiddenPatterns?: RegExp[]; // Patterns that should NOT appear
  testCommand?: string;       // Optional: command to verify changes
}

class CodeEditEnvironment extends FileSystemEnvironment {
  // Extend with code-specific tools:
  // - search_in_file(path, pattern)
  // - replace_in_file(path, old_string, new_string)
  // - run_test(command)
  // - get_syntax_errors(path)
}
```

Implement:
1. At least 4 code editing tools
2. Syntax validation after edits
3. Test execution with timeout
4. Detailed error messages for debugging

**Deliverable**: `code-environment.ts` with comprehensive tool implementations.

### Part 2: Multi-Objective Reward Design (25 points)

Design a reward function balancing multiple objectives:

```typescript
interface MultiObjectiveReward extends EpisodeReward {
  correctness: number;    // Did tests pass?
  codeQuality: number;    // No forbidden patterns, clean syntax
  efficiency: number;     // Minimal steps
  safety: number;         // No dangerous operations
  breakdown: Record<string, number>; // Per-component scores
}

interface RewardWeights {
  correctness: number;    // Suggested: 0.5
  codeQuality: number;    // Suggested: 0.2
  efficiency: number;     // Suggested: 0.15
  safety: number;         // Suggested: 0.15
}

function computeMultiObjectiveReward(
  state: State,
  steps: Step[],
  task: CodeEditTask,
  weights: RewardWeights
): MultiObjectiveReward {
  // Your implementation
}
```

**Reward components**:
- **Correctness**: Tests pass (binary 1.0/0.0)
- **Code Quality**: No forbidden patterns, valid syntax, readable edits
- **Efficiency**: Penalize excessive steps, reward minimal edits
- **Safety**: Penalize risky operations (delete without backup, no validation)

**Deliverable**: `multi-objective-rewards.ts` with detailed component computation and example calculations.

### Part 3: Advanced RLVR Graders (20 points)

Implement domain-specific RLVR graders:

```typescript
// 1. Syntax validity grader
function syntaxValidGrader(filepath: string, language: string): RLVRGrader {
  // Use simple parsing (count braces, quotes, etc.)
}

// 2. Pattern presence grader
function patternPresenceGrader(
  filepath: string,
  requiredPatterns: RegExp[],
  forbiddenPatterns: RegExp[]
): RLVRGrader {
  // Check all required present, no forbidden present
}

// 3. Test pass grader
function testPassGrader(testCommand: string, timeout: number): RLVRGrader {
  // Run test, check exit code
}

// 4. Edit minimality grader
function editMinimalityGrader(
  originalContent: string,
  editedContent: string
): RLVRGrader {
  // Reward minimal changes (Levenshtein distance)
}

// 5. Code coverage grader
function coverageGrader(
  testCommand: string,
  minCoverage: number
): RLVRGrader {
  // Run tests with coverage, check percentage
}
```

Implement at least 4 graders with varying weights (sum to 1.0).

**Deliverable**: `advanced-rlvr.ts` with all grader implementations and a composite grader example.

### Part 4: Adaptive Curriculum (15 points)

Extend curriculum with adaptive difficulty:

```typescript
interface AdaptiveTier extends CurriculumTier {
  difficultyScore: number;    // 1-10 scale
  avgAttempts: number;        // Track difficulty
  avgReward: number;          // Track agent performance
}

class AdaptiveCurriculum extends Curriculum {
  // Override recordOutcome to track metrics
  recordOutcome(success: boolean, reward: number, attempts: number): void {
    // Update tier statistics
    // Adjust requiredPassRate based on recent performance
    // Consider skipping tiers if agent excels
  }

  // Add task difficulty estimation
  estimateDifficulty(task: TaskSetup): number {
    // Heuristic based on: number of requirements, file size, etc.
  }

  // Dynamic tier promotion/demotion
  shouldPromote(): boolean {
    // More sophisticated than fixed threshold
  }

  shouldDemote(): boolean {
    // Demote if performance drops significantly
  }
}
```

Features to implement:
1. Track per-tier average reward and attempts
2. Adjust required pass rate if tier is too easy/hard
3. Allow tier skipping if agent excels (3+ consecutive excellent episodes)
4. Implement demotion if EMA drops below 0.5

**Deliverable**: `adaptive-curriculum.ts` with metrics tracking and dynamic adjustment logic.

### Part 5: Trajectory Analysis Dashboard (15 points)

Build analysis tools for collected trajectories:

```typescript
interface TrajectoryAnalysis {
  totalEpisodes: number;
  successRate: number;
  avgReward: number;
  avgSteps: number;
  toolUsageFrequency: Record<string, number>;
  commonFailurePatterns: string[];
  rewardDistribution: { min: number; max: number; median: number; q1: number; q3: number };
  learningCurve: Array<{ episode: number; emaReward: number }>;
}

function analyzeTrajectories(trajectories: Trajectory[]): TrajectoryAnalysis {
  // Your implementation
}

function visualizeLearningCurve(analysis: TrajectoryAnalysis): string {
  // ASCII chart of reward over time
}

function identifyFailurePatterns(trajectories: Trajectory[]): string[] {
  // Common tool sequences or states in failed episodes
}

function compareAgents(
  trajectories1: Trajectory[],
  trajectories2: Trajectory[],
  labels: [string, string]
): string {
  // Side-by-side comparison table
}
```

**Deliverable**: `trajectory-analysis.ts` with all analysis functions. Include sample output analyzing at least 50 trajectories.

## Bonus Challenges (Extra Credit)

### Bonus 1: Reward Shaping Experiments (+10 points)
Run experiments comparing different reward weight configurations:
- Correctness-only (1.0, 0, 0, 0)
- Balanced (0.5, 0.2, 0.15, 0.15)
- Efficiency-focused (0.4, 0.1, 0.4, 0.1)

Collect 50+ episodes per configuration. Compare:
- Success rate
- Average steps
- Average reward
- Time to convergence

**Deliverable**: `reward-experiments.ts` and `experiment-results.md` with analysis.

### Bonus 2: Hierarchical Curriculum (+10 points)
Implement a two-level curriculum:
- **Skill-based**: Learn individual skills (file reading, pattern matching, syntax checking)
- **Task-based**: Combine skills for complex tasks

Track skill mastery separately. Only introduce complex tasks when prerequisite skills are mastered.

```typescript
interface Skill {
  name: string;
  masteryThreshold: number; // EMA pass rate to consider mastered
  isMastered: boolean;
}

interface HierarchicalTask extends CodeEditTask {
  requiredSkills: string[]; // Skill names
}
```

**Deliverable**: `hierarchical-curriculum.ts` with skill tracking and gating logic.

### Bonus 3: Live Trajectory Visualization (+10 points)
Build a real-time dashboard that displays:
- Current episode progress
- Reward components bar chart
- Tool usage over time
- Success/failure count
- EMA curves per tier

Use a simple terminal UI library (e.g., `blessed` for Node.js) or web interface.

**Deliverable**: `visualization.ts` and demo video/screenshots.

## Submission Requirements

Submit a ZIP file containing:

### Required Files
1. `code-environment.ts` - Code editing environment
2. `multi-objective-rewards.ts` - Multi-objective reward function
3. `advanced-rlvr.ts` - Domain-specific graders
4. `adaptive-curriculum.ts` - Adaptive curriculum system
5. `trajectory-analysis.ts` - Analysis and visualization tools
6. `trajectories.jsonl` - At least 50 collected trajectories
7. `analysis-results.json` - Output from trajectory analysis
8. `README.md` - Setup, usage, and design discussion

### README Content
Include:
- **Setup Instructions**: Dependencies, environment setup
- **Usage Examples**: How to run training, analyze results
- **Reward Design Rationale**: Why you chose specific weights
- **RLVR Grader Descriptions**: What each grader checks and why
- **Curriculum Strategy**: Easy→Medium→Hard task progression
- **Key Findings**: Insights from trajectory analysis
- **Challenges & Solutions**: Problems encountered and fixes
- **Future Work**: Ideas for improvement

### Evaluation Criteria

**Implementation Quality (35%)**
- Code is clean, well-documented, and type-safe
- Environment handles edge cases gracefully
- Reward computation is correct and efficient
- Graders are deterministic and reliable

**Reward Design (25%)**
- Multi-objective reward balances concerns appropriately
- Component weights are justified
- Breakdown provides actionable insights
- Examples demonstrate expected behavior

**Curriculum Design (20%)**
- Tasks progress logically in difficulty
- Adaptive features improve learning stability
- Metrics accurately track progress
- Tier transitions are smooth

**Analysis Quality (20%)**
- Trajectory analysis extracts meaningful patterns
- Visualizations are clear and informative
- Failure pattern identification is useful
- Comparisons highlight key differences

## Grading Rubric

| Component | Points | Criteria |
|-----------|--------|----------|
| Code Environment | 25 | 4+ tools, error handling, validation |
| Multi-Objective Rewards | 25 | 4 components, justified weights, examples |
| RLVR Graders | 20 | 4+ graders, deterministic, composable |
| Adaptive Curriculum | 15 | Metrics tracking, dynamic adjustment |
| Trajectory Analysis | 15 | All functions implemented, sample output |
| **Bonus** | **+30** | Extra credit challenges |
| **Total** | **130** | (100 base + 30 bonus) |

## Tips

1. **Start with simple tasks**: Test environment with trivial edits first
2. **Validate rewards immediately**: Print component breakdown after each episode
3. **Collect diverse trajectories**: Mix successes and failures for analysis
4. **Debug with logging**: Add verbose logging to understand agent behavior
5. **Tune gradually**: Start with default weights, adjust based on observations
6. **Test graders independently**: Verify each RLVR grader in isolation
7. **Visualize early**: Create simple charts to understand trends

## Due Date
Submit within 1.5 weeks of module completion.

## Questions?
Post in course forum with tag `[module-11-homework]`.
