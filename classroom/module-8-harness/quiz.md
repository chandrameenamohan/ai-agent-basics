# Module 8 Quiz: Harness Engineering

## Question 1: Session Persistence

Why should you save the session in TWO places per loop iteration (after assistant response AND after tool execution)?

A) To improve performance by parallelizing saves
B) To ensure you lose at most 1 turn on crash
C) To maintain separate backups for debugging
D) To comply with the Anthropic API requirements

**Answer**: B

**Explanation**: If you crash between the assistant response and tool execution, you want the assistant's output preserved. If you crash during tool execution, you want partial results saved. Double-save ensures you lose at most 1 turn, not the entire session.

---

## Question 2: Session Structure

Which field in the Session object is used to resume agent execution from the correct point?

A) `createdAt`
B) `messages`
C) `turn`
D) `workspace`

**Answer**: C

**Explanation**: The `turn` field tracks the current iteration. When resuming, you start the loop from `session.turn`, not from 0, to avoid repeating work.

---

## Question 3: Progress Format

What is the correct format for a progress checklist with 3 tasks, 2 completed?

A) `Progress: 2/3\n[x] Task 1\n[ ] Task 2\n[x] Task 3`
B) `Progress: 2/3\n0. [x] Task 1\n1. [ ] Task 2\n2. [x] Task 3`
C) `2 of 3 complete\n- [x] Task 1\n- [ ] Task 2\n- [x] Task 3`
D) `66% complete\n1. [x] Task 1\n2. [ ] Task 2\n3. [x] Task 3`

**Answer**: B

**Explanation**: The standard format is `Progress: X/Y` followed by 0-indexed items with `[x]` for done, `[ ]` for pending.

---

## Question 4: Progress Tools

Which tool should an agent call FIRST when starting a multi-step task?

A) `progress-show` to check if tasks exist
B) `progress-complete` to mark planning done
C) `progress-add` to create the task list
D) `progress-reset` to clear previous progress

**Answer**: C

**Explanation**: Agents typically start by calling `progress-add` multiple times to plan all steps, then call `progress-complete` as they finish each step.

---

## Question 5: CLAUDE.md Integration

Where should CLAUDE.md content be injected in the agent's configuration?

A) In the first user message
B) In the system prompt
C) As a tool description
D) In the assistant's first response

**Answer**: B

**Explanation**: CLAUDE.md provides project-specific instructions for the agent, which belong in the system prompt. This makes them authoritative and persistent across all turns.

---

## Question 6: Session Resume Logic

What should happen when you call `runAgent(existingSessionId)`?

A) Create a new session with that ID
B) Load the session and start from turn 0
C) Load the session and continue from session.turn
D) Throw an error (sessions can't be resumed)

**Answer**: C

**Explanation**: Resuming means loading the existing session and continuing the loop from `session.turn`, not starting over.

---

## Question 7: MCP Protocol

What is the purpose of the MCP `tools/list` method?

A) List all sessions that have used tools
B) Return available tools with their schemas
C) Show which tools were called in the last turn
D) List all MCP servers currently connected

**Answer**: B

**Explanation**: `tools/list` is the discovery method. It returns all tools the server provides, including their names, descriptions, and input schemas.

---

## Question 8: MCP Message Format

Which protocol does MCP use for communication?

A) REST over HTTP
B) GraphQL
C) JSON-RPC over stdin/stdout
D) WebSocket

**Answer**: C

**Explanation**: MCP uses JSON-RPC 2.0 over stdin/stdout, making it simple and language-agnostic. Each request/response is a single line of JSON.

---

## Question 9: Double-Save Pattern

In the double-save pattern, what is the state of `messages` array at Save 1 vs Save 2?

A) Save 1: empty, Save 2: has tool results
B) Save 1: has assistant response, Save 2: has assistant response + tool results
C) Both saves have identical messages
D) Save 1: has tool results, Save 2: has assistant response

**Answer**: B

**Explanation**: Save 1 happens after pushing the assistant's response. Save 2 happens after pushing the tool results. This captures both pieces of state.

---

## Question 10: Progress Tracking Use Case

Why is progress tracking especially important for agents?

A) It reduces API costs by skipping completed steps
B) It provides observability into the agent's plan and current status
C) It's required by the Anthropic API for long conversations
D) It prevents the agent from using too many tools

**Answer**: B

**Explanation**: Progress tracking gives visibility into what the agent plans to do and how far it's gotten. This is critical for debugging, monitoring, and understanding agent behavior.

---

## Question 11: Session Workspace

What is the `workspace` field in a Session used for?

A) Storing the agent's working memory
B) Specifying where the agent can read/write files
C) Tracking CPU/memory usage
D) Defining the agent's personality

**Answer**: B

**Explanation**: The workspace is the root directory for file operations. It's used to load CLAUDE.md and validate file paths for security.

---

## Question 12: MCP Initialize

What does the `initialize` method return?

A) List of available tools
B) Protocol version and capabilities
C) Current session state
D) Server configuration

**Answer**: B

**Explanation**: `initialize` is the handshake. The server returns its protocol version (e.g., "2024-11-05") and capabilities (e.g., `{ tools: {} }`).

---

## Question 13: Error Handling

What should happen if saving a session fails?

A) Ignore the error and continue
B) Retry once, then continue
C) Throw an error to stop the agent
D) Log a warning but don't stop

**Answer**: C

**Explanation**: Session save failures are critical. If you can't persist state, you risk losing all progress on crash. Better to fail fast and alert the operator.

---

## Question 14: Progress Completion

An agent has this progress state:
```
Progress: 1/3
0. [x] Write code
1. [ ] Run tests
2. [ ] Fix bugs
```

It calls `progress-complete(2)`. What happens?

A) Error: must complete tasks in order
B) Progress: 2/3 with tasks 0 and 2 marked done
C) Progress: 1/3 unchanged (2 is out of bounds)
D) Progress: 3/3 (completes all remaining tasks)

**Answer**: B

**Explanation**: Tasks can be completed in any order. The index is 0-based, so index 2 is the third task. Result is 2 of 3 completed.

---

## Question 15: Harness Design

What is the PRIMARY benefit of using a harness?

A) Faster agent execution
B) Lower API costs
C) Production reliability and observability
D) Better model performance

**Answer**: C

**Explanation**: Harnesses make agents production-ready by adding crash recovery (sessions), observability (progress), context integration (CLAUDE.md), and composability (MCP). Speed and cost are secondary.

---

## Scoring

- 13-15 correct: Excellent understanding of harness engineering
- 10-12 correct: Good grasp of core concepts
- 7-9 correct: Review session persistence and MCP protocol
- Below 7: Revisit tutorial and complete lab exercises
