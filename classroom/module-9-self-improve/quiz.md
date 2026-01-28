# Module 9 Quiz: Self-Improving Agents

## Question 1: Bootstrap Loop Purpose

What is the PRIMARY purpose of the bootstrap loop?

A) To reduce API costs by caching responses
B) To automatically improve agent performance via eval-driven prompt changes
C) To train a new model from scratch
D) To generate more evaluation tasks

**Answer**: B

**Explanation**: The bootstrap loop runs evals, analyzes failures, proposes prompt improvements, tests them, and keeps only changes that improve pass rate. It's an automated improvement cycle.

---

## Question 2: Git Safety Net

Why is Git used in the bootstrap process?

A) To track changes for debugging
B) To collaborate with other developers
C) To snapshot state before changes and revert if performance degrades
D) To deploy the agent to production

**Answer**: C

**Explanation**: Git provides a safety net. Commit before applying improvements; if the new pass rate is worse, revert to the snapshot. This prevents degradation.

---

## Question 3: Meta-Agent Role

What does the meta-agent do?

A) Run the evaluation tasks
B) Execute tool calls for the main agent
C) Analyze failure transcripts and propose prompt improvements
D) Manage session persistence

**Answer**: C

**Explanation**: The meta-agent is a separate agent that reads failure transcripts, identifies patterns, and proposes specific rules to add to the main agent's system prompt.

---

## Question 4: Improvement Format

What should the meta-agent's improvements include?

A) Complete rewrite of the system prompt
B) Description of the pattern and exact text to append as a rule
C) List of tasks to remove from the eval suite
D) New tool definitions

**Answer**: B

**Explanation**: Improvements are conservative: a description (why it helps) and the exact text to append as a numbered rule. No rewrites, just additions.

---

## Question 5: Keep or Revert Decision

When should you KEEP improvements in the bootstrap loop?

A) Always keep them to maintain progress
B) Only if the meta-agent is confident
C) If new pass rate > old pass rate
D) If fewer than 3 rules were added

**Answer**: C

**Explanation**: The decision is objective: compare new pass rate to old pass rate. Keep if improved, revert otherwise. This is the core of eval-driven development.

---

## Question 6: Transcript Collection

Why must you save full transcripts for FAILED tasks?

A) To show the user what went wrong
B) To give the meta-agent context for identifying patterns
C) To comply with API logging requirements
D) For debugging the evaluation harness

**Answer**: B

**Explanation**: The meta-agent needs to see what the agent actually did to identify failure patterns. Without transcripts, it can't propose meaningful improvements.

---

## Question 7: Conservative Changes

Why should the meta-agent propose only 1-3 improvements per cycle?

A) To reduce API costs
B) To make each cycle faster
C) To test changes incrementally and isolate which rules help
D) Because the prompt has limited space

**Answer**: C

**Explanation**: Small, incremental changes make it easier to identify which rules actually help. Adding 10 rules at once makes it unclear which ones matter.

---

## Question 8: Prompt Structure

Why should the system prompt have a dedicated "## Rules" section?

A) To make it look more professional
B) To make it easy to parse and append new rules programmatically
C) Because Claude requires it
D) To separate rules from tool definitions

**Answer**: B

**Explanation**: A clearly marked Rules section with consistent formatting makes it easy to programmatically find and append new numbered rules.

---

## Question 9: Target Pass Rate

What happens when the bootstrap loop reaches the target pass rate?

A) It continues until maxCycles
B) It stops immediately
C) It runs one more cycle to confirm
D) It reverts all changes

**Answer**: B

**Explanation**: Once the target pass rate is reached, the goal is achieved. Stop to avoid over-optimization and prompt bloat.

---

## Question 10: Multiple Trials

Why might you run each eval task multiple times (trialsPerTask > 1)?

A) To increase the total number of tasks
B) To reduce noise from model non-determinism
C) To test different prompts
D) To fill time

**Answer**: B

**Explanation**: Model outputs vary between runs. Averaging results over 3 trials gives a more stable pass rate estimate, reducing false positives/negatives.

---

## Question 11: Failure Patterns vs One-offs

The meta-agent should propose rules for patterns, not one-off failures. Why?

A) One-off failures are too rare to matter
B) Patterns indicate systematic issues that will recur
C) One-offs are always user error
D) The API doesn't support one-off rules

**Answer**: B

**Explanation**: Patterns indicate systematic gaps in the agent's reasoning. One-off failures might be random variance. Focus on patterns that will recur across multiple tasks.

---

## Question 12: Eval Report Contents

An EvalReport must include which of the following for failed tasks?

A) Only the task description
B) Only the pass/fail status
C) Full conversation transcript
D) Video recording of the agent

**Answer**: C

**Explanation**: Failed tasks need full transcripts so the meta-agent can analyze what went wrong. Pass/fail alone doesn't give enough context.

---

## Question 13: Prompt Bloat

What is the risk of running too many bootstrap cycles?

A) API costs become too high
B) The prompt becomes bloated with too many rules
C) The agent becomes too good
D) Git history becomes unreadable

**Answer**: B

**Explanation**: Each cycle adds rules. After 20 cycles you might have 60 rules, making the prompt unwieldy. Solutions: rule consolidation, pruning, or stopping at a reasonable target.

---

## Question 14: Revert Scenario

In Cycle 5, the pass rate goes from 78% to 76%. What should happen?

A) Keep the changes anyway (long-term improvement)
B) Revert to the snapshot from before Cycle 5
C) Try different improvements
D) Reduce the target pass rate

**Answer**: B

**Explanation**: The pass rate got worse. Revert to the snapshot before applying improvements. This maintains the 78% baseline for the next cycle.

---

## Question 15: Integration with Module 8

How does bootstrap leverage the harness from Module 8?

A) It doesn't; bootstrap is independent
B) Session persistence saves eval transcripts; Git safety net uses commit/revert
C) Only for progress tracking
D) Only for MCP integration

**Answer**: B

**Explanation**: Bootstrap uses session persistence to save full transcripts of agent runs, and Git integration (from harness concepts) for the safety net. The harness makes bootstrap reliable.

---

## Scoring

- 13-15 correct: Excellent grasp of self-improvement concepts
- 10-12 correct: Good understanding, review meta-agent design
- 7-9 correct: Revisit bootstrap loop structure and decision logic
- Below 7: Review tutorial and complete lab before moving on
