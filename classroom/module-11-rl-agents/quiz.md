# Module 11 Quiz: RL Agents

## Question 1: Environment Interface
Which method initializes a new task in the agent environment?

A) `step()`
B) `reset()`
C) `getState()`
D) `cleanup()`

**Answer**: B

**Explanation**: `reset(setup)` initializes the environment with a new task, creates initial state, and returns the starting state for the agent.

---

## Question 2: Episodic Rewards
Why do we compute rewards only at episode end, not per step?

A) To reduce computational cost
B) To prevent reward hacking where agents optimize for per-step rewards
C) To simplify the code
D) To match supervised learning patterns

**Answer**: B

**Explanation**: Per-step rewards can lead to reward hacking where agents maximize short-term signals instead of completing the task. Episodic rewards focus the agent on achieving the final goal.

---

## Question 3: Reward Components
What is the purpose of the step penalty (-0.02 per step)?

A) To prevent infinite loops
B) To encourage efficient solutions
C) To punish failed tool calls
D) To balance the outcome reward

**Answer**: B

**Explanation**: The step penalty encourages agents to find efficient solutions. More steps = lower total reward, incentivizing concise execution paths.

---

## Question 4: Tool Validity Reward
Why is the invalid tool penalty (-0.05) larger than the valid tool bonus (+0.01)?

A) To make the total reward negative
B) To asymmetrically discourage trial-and-error tool usage
C) To ensure outcome dominates
D) Random choice, doesn't matter

**Answer**: B

**Explanation**: Asymmetric penalties (larger punishment for invalid than reward for valid) discourage random tool guessing. Agents learn to use tools correctly from the start.

---

## Question 5: Trajectory Recording
What information is recorded in each Step of a trajectory?

A) Only the action taken
B) Only the observation received
C) Observation, action, result, and validity flag
D) Just the final reward

**Answer**: C

**Explanation**: Each Step records the full context: what the agent saw (observation), what it did (action), what happened (result), and whether the action was valid (wasValid).

---

## Question 6: Curriculum EMA
With α = 0.1, what does the EMA formula compute?

A) Average of all episodes
B) Weighted average favoring recent episodes
C) Pass rate of last 10 episodes only
D) Maximum pass rate achieved

**Answer**: B

**Explanation**: EMA (Exponential Moving Average) with α = 0.1 weights recent outcomes higher: `new_ema = 0.1 × current + 0.9 × old_ema`. This smooths noise while tracking recent performance.

---

## Question 7: Curriculum Advancement
When does the agent advance to the next curriculum tier?

A) After completing a fixed number of episodes
B) When EMA pass rate reaches the required threshold
C) When the agent requests it
D) After any successful episode

**Answer**: B

**Explanation**: Advancement happens when the EMA pass rate reaches the required threshold (typically 0.8 or 80%), ensuring consistent performance before increasing difficulty.

---

## Question 8: RLVR Definition
What does RLVR stand for and what does it provide?

A) Reinforcement Learning Value Regression - estimates future rewards
B) Rule-based Language Verification Rewards - deterministic grading as rewards
C) Random Learning Variable Randomization - explores action space
D) Recursive Learning Value Refinement - iterative reward improvement

**Answer**: B

**Explanation**: RLVR (Rule-based Language Verification Rewards) uses deterministic graders as reward functions, providing reliable and interpretable reward signals.

---

## Question 9: Composite RLVR
How are multiple RLVR graders combined?

A) Maximum of all grader scores
B) Average of all grader scores
C) Weighted sum of grader scores
D) Product of all grader scores

**Answer**: C

**Explanation**: Multiple graders combine through weighted sum: `total = Σ(grader.score × grader.weight)`. This allows flexible emphasis on different quality aspects.

---

## Question 10: Environment Cleanup
Why is the `cleanup()` method important?

A) To save memory
B) To prevent state leaks between episodes
C) To compute final rewards
D) To validate the trajectory

**Answer**: B

**Explanation**: `cleanup()` removes task artifacts (temporary files, state) to ensure each episode starts fresh, preventing state contamination between tasks.

---

## Question 11: Reward Calculation Example
An episode succeeds in 10 steps with 1 invalid tool call. Using standard weights (outcome: 1.0, step: -0.02, valid: +0.01, invalid: -0.05), what is the total reward?

A) 1.0
B) 0.84
C) 0.89
D) 0.95

**Answer**: C

**Explanation**:
- Outcome: 1.0 × 1.0 = 1.0
- Efficiency: 10 × -0.02 = -0.2
- Tool use: 9 × 0.01 + 1 × -0.05 = 0.09 - 0.05 = 0.04
- Total: 1.0 - 0.2 + 0.04 = 0.84

Wait, let me recalculate:
- 9 valid tools: 9 × 0.01 = 0.09
- 1 invalid tool: 1 × -0.05 = -0.05
- Tool use: 0.09 + (-0.05) = 0.04
- Total: 1.0 - 0.2 + 0.04 = 0.84

Actually the answer should be **B) 0.84**, not C. Let me correct this.

**Answer**: B (0.84)

---

## Question 12: StepResult Fields
What does the `done` field indicate in a StepResult?

A) Whether the tool succeeded
B) Whether the episode should terminate
C) Whether the tool was valid
D) Whether the task passed

**Answer**: B

**Explanation**: The `done` field signals episode termination (max steps reached or task clearly complete), telling the episode loop to stop.

---

## Bonus Question: Curriculum Tiers
Why start with easy tasks in curriculum learning?

A) To save computation time
B) To build foundational skills before tackling harder problems
C) To make the agent feel confident
D) To reduce the number of training episodes

**Answer**: B

**Explanation**: Curriculum learning starts easy to establish foundational skills (basic tool usage, task understanding) before introducing complexity. This leads to more stable and efficient learning than random difficulty.

---

## Score Interpretation
- 12-13 correct: Expert - Ready to design RL systems
- 10-11 correct: Proficient - Review reward computation details
- 8-9 correct: Developing - Revisit environment interface and RLVR
- Below 8: Review tutorial and handout, focus on reward design and curriculum concepts
