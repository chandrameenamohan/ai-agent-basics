# AI Agent Engineering from First Principles

## How to Use This Course

This is a hands-on course. Each module has:

```
module-N-topic/
├── LESSON.md          # Read this — it's the lesson
└── solutions/
    ├── *.ts           # TypeScript reference code
    └── python/        # Python reference code
```

**The workflow:**
1. Open `LESSON.md` and read the **Concepts** section
2. Follow the **Build It** section — write code in the module root (e.g., `module-2-agent-loop/types.ts`)
3. Run your code and compare output to what the lesson says you should see
4. Do the **Exercises** — they force understanding through experimentation
5. Check the **Checkpoint** questions — if you can answer them, move on
6. Only look at `solutions/` if you're stuck

The `bun run` scripts point to `solutions/` so they work as demos. To run your own code: `bun module-N/my-file.ts`

Python solutions are also available. Install dependencies with `pip install -r requirements.txt`, then run: `python module-N-topic/solutions/python/file.py`

## Structure
- Modules 0-5: Build fundamentals (API → loop → tools → coding agent)
- Modules 6-8: Scale (context engineering, evals, harness)
- Module 9: Self-improvement via eval-driven bootstrap
- Modules 10-11: Fine-tuning + RL

## Commands
- `bun run verify` — run the solution demo for Module 0
- `bun run m1:raw` through `bun run m11:rl` — run solution demos for each module
- `bun module-N/my-file.ts` — run your own TypeScript code directly
- `pip install -r requirements.txt` — install Python dependencies
- `python module-N-topic/solutions/python/file.py` — run Python solutions

## Conventions
- TypeScript modules use `dotenv/config`; Python modules use `python-dotenv` for API key loading
- Python uses `pydantic` for structured output (replaces Zod)
- Tools always return strings (errors too, never throw into the loop)
- Agent loop pattern: send → check stop_reason → execute tools → loop
- Path validation: all file tools validate paths against allowed root
- Evals: deterministic graders preferred; model graders for subjective quality

## Key Patterns
- Tool interface: { name, description, input_schema, execute }
- Registry pattern for tool management
- Search-and-replace for file editing (old_string/new_string)
- Context compaction when approaching token limits
- Session persistence as JSON for crash recovery
