/**
 * Module 7: Eval harness
 * Isolates each trial (clean env), runs N trials per task, collects transcripts.
 */
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import { Sandbox } from "../../module-4-filesystem/solutions/sandbox.js";
import { createFileTools } from "../../module-4-filesystem/solutions/tools.js";
import { createEditFileTool } from "../../module-5-coding-agent/solutions/edit-file.js";
import { CODING_AGENT_PROMPT } from "../../module-5-coding-agent/solutions/prompt.js";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";
import type { EvalTask, Trial, Transcript, TranscriptTurn } from "./types.js";

const client = new Anthropic();

async function runSingleTrial(
  task: EvalTask,
  trialIndex: number
): Promise<Trial> {
  // Create isolated workspace
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), `eval-${task.id}-`));
  console.log(`  Trial ${trialIndex + 1}: workspace=${workspaceDir}`);

  // Setup task
  await task.setup(workspaceDir);

  // Run agent
  const transcript = await runAgent(task.prompt, workspaceDir);

  // Grade
  const grade = await task.grader.grade(workspaceDir, transcript);
  console.log(`  Trial ${trialIndex + 1}: ${grade.passed ? "PASS" : "FAIL"} (${grade.score.toFixed(2)}) — ${grade.explanation.slice(0, 100)}`);

  // Cleanup
  await fs.rm(workspaceDir, { recursive: true, force: true });

  return { taskId: task.id, trialIndex, transcript, grade };
}

async function runAgent(prompt: string, workspaceDir: string): Promise<Transcript> {
  const sandbox = new Sandbox(workspaceDir);
  const registry = new ToolRegistry();
  for (const tool of createFileTools(sandbox)) registry.register(tool);
  registry.register(createEditFileTool(sandbox));

  const messages: Message[] = [{ role: "user", content: prompt }];
  const turns: TranscriptTurn[] = [{ role: "user", content: prompt }];
  const maxTurns = 20;
  const startTime = Date.now();
  let totalTokens = 0;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: CODING_AGENT_PROMPT + `\nWorkspace: ${sandbox.root}`,
      tools: registry.getDefinitions(),
      messages,
    });

    totalTokens += response.usage.input_tokens + response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    const textBlocks = response.content.filter((b) => b.type === "text");
    const text = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n");

    if (response.stop_reason === "end_turn") {
      turns.push({ role: "assistant", content: text });
      break;
    }

    const toolCalls: TranscriptTurn["toolCalls"] = [];
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await registry.execute(block.name, block.input as Record<string, unknown>);
        toolCalls.push({ name: block.name, input: block.input, result });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }

    turns.push({ role: "assistant", content: text, toolCalls });
    messages.push({ role: "user", content: toolResults });
  }

  return { task: prompt, turns, totalTokens, durationMs: Date.now() - startTime };
}

export async function runEvals(
  tasks: EvalTask[],
  trialsPerTask: number = 3
): Promise<Trial[]> {
  const allTrials: Trial[] = [];

  for (const task of tasks) {
    console.log(`\nTask: ${task.id} — ${task.description}`);
    for (let i = 0; i < trialsPerTask; i++) {
      const trial = await runSingleTrial(task, i);
      allTrials.push(trial);
    }
  }

  return allTrials;
}
