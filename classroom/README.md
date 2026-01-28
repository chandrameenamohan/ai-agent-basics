# AI Agent Engineering from First Principles — Classroom Materials

## Course Syllabus

This directory contains teaching materials for all 12 modules of the AI Agent Engineering course. Each module includes 5 files designed for classroom instruction.

### Material Types

| File | Purpose | Format |
|------|---------|--------|
| `tutorial.md` | Lecture notes with conversational teaching | ~250-300 lines |
| `handout.md` | 1-2 page cheat sheet for reference | ~120-150 lines |
| `lab.md` | Step-by-step guided coding exercises | ~200-250 lines |
| `quiz.md` | Assessment with answer key | ~120-150 lines |
| `homework.md` | Take-home assignment with rubric | ~150-200 lines |

### Suggested Workflow

1. **Before class**: Read the corresponding `LESSON.md` in the module directory
2. **Lecture**: Use `tutorial.md` as lecture notes
3. **In class**: Work through `lab.md` exercises together
4. **Reference**: Distribute `handout.md` as a cheat sheet
5. **Assessment**: Use `quiz.md` for in-class or take-home quiz
6. **Homework**: Assign `homework.md` for deeper practice

---

## Module Overview

### Part 1: Fundamentals (Modules 0-5)

| Module | Topic | Key Concepts |
|--------|-------|--------------|
| **0** | [Setup](module-0-setup/) | API keys, tokens, SDK, first API call |
| **1** | [LLM APIs](module-1-llm-apis/) | Raw HTTP, multi-turn, streaming, structured output |
| **2** | [Agent Loop](module-2-agent-loop/) | while loop, stop_reason, tool execution, maxTurns |
| **3** | [Tool System](module-3-tools/) | Tool registry, error handling, JSON Schema |
| **4** | [Filesystem](module-4-filesystem/) | Sandbox security, file tools, path traversal defense |
| **5** | [Coding Agent](module-5-coding-agent/) | Search-and-replace editing, system prompt design |

### Part 2: Scale (Modules 6-8)

| Module | Topic | Key Concepts |
|--------|-------|--------------|
| **6** | [Context Engineering](module-6-context/) | Compaction, scratchpad, sub-agents |
| **7** | [Evaluations](module-7-evals/) | Graders, trials, pass@k metrics, isolation |
| **8** | [Harness](module-8-harness/) | Session persistence, progress tracking, MCP |

### Part 3: Optimization (Modules 9-11)

| Module | Topic | Key Concepts |
|--------|-------|--------------|
| **9** | [Self-Improvement](module-9-self-improve/) | Bootstrap loop, meta-agent, prompt patching |
| **10** | [Fine-Tuning](module-10-fine-tuning/) | SFT, DPO, data pipelines, intent classification |
| **11** | [RL Agents](module-11-rl-agents/) | Rewards, trajectories, curriculum learning, RLVR |

---

## Prerequisites

- **Students**: Basic programming in TypeScript or Python
- **Environment**: Node.js/Bun + npm, or Python 3.10+
- **API Access**: Anthropic API key (from console.anthropic.com)

## Setup

```bash
# Clone the course repository
git clone <repo-url>
cd ai-agent-basics

# Install TypeScript dependencies
npm install

# Or install Python dependencies
pip install -r requirements.txt

# Create .env with your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

## Directory Structure

```
classroom/
├── README.md                          # This file
├── module-0-setup/
│   ├── tutorial.md
│   ├── handout.md
│   ├── lab.md
│   ├── quiz.md
│   └── homework.md
├── module-1-llm-apis/
│   └── ... (same 5 files)
├── module-2-agent-loop/
│   └── ...
├── module-3-tools/
│   └── ...
├── module-4-filesystem/
│   └── ...
├── module-5-coding-agent/
│   └── ...
├── module-6-context/
│   └── ...
├── module-7-evals/
│   └── ...
├── module-8-harness/
│   └── ...
├── module-9-self-improve/
│   └── ...
├── module-10-fine-tuning/
│   └── ...
└── module-11-rl-agents/
    └── ...
```

## Pacing Guide

| Week | Modules | Focus |
|------|---------|-------|
| 1 | 0-1 | API fundamentals |
| 2 | 2-3 | Agent loop and tools |
| 3 | 4-5 | Filesystem and coding agent |
| 4 | 6-7 | Context management and evals |
| 5 | 8-9 | Production harness and self-improvement |
| 6 | 10-11 | Fine-tuning and RL |

## Key Patterns Across Modules

- **Tool interface**: `{ name, description, input_schema, execute }` — tools always return strings
- **Agent loop**: `send → check stop_reason → execute tools → loop`
- **Registry pattern**: centralized tool management with error wrapping
- **Search-and-replace**: surgical file editing (old_string/new_string)
- **Path validation**: sandbox with `startsWith()` check
- **Context compaction**: keep first + last 6 + summarize middle
- **Eval isolation**: fresh temp workspace per trial

## Model Reference

All examples use `claude-sonnet-4-20250514`. TypeScript uses `@anthropic-ai/sdk` with `dotenv/config`; Python uses `anthropic` with `python-dotenv`.
