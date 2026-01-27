/**
 * Module 6: Context-aware coding agent
 * Module 5 agent + compaction + scratchpad + delegation
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as path from "path";
import { Sandbox } from "../../module-4-filesystem/solutions/sandbox.js";
import { createFileTools } from "../../module-4-filesystem/solutions/tools.js";
import { createEditFileTool } from "../../module-5-coding-agent/solutions/edit-file.js";
import { CODING_AGENT_PROMPT } from "../../module-5-coding-agent/solutions/prompt.js";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import { compactHistory, estimateTokens } from "./compaction.js";
import { createScratchpadTools } from "./scratchpad.js";
import { createDelegateTaskTool } from "./sub-agent.js";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

async function contextAgent(task: string, workspacePath: string): Promise<string> {
  const sandbox = new Sandbox(path.resolve(workspacePath));
  const registry = new ToolRegistry();

  for (const tool of createFileTools(sandbox)) registry.register(tool);
  registry.register(createEditFileTool(sandbox));
  for (const tool of createScratchpadTools(sandbox.root)) registry.register(tool);

  const systemPrompt = CODING_AGENT_PROMPT + `\nWorkspace: ${sandbox.root}\n\nYou also have a scratchpad for persistent notes and can delegate subtasks to sub-agents. Use the scratchpad to track progress on complex tasks. Use delegation for self-contained subtasks.`;

  registry.register(createDelegateTaskTool(registry, systemPrompt));

  let messages: Message[] = [{ role: "user", content: task }];
  const maxTurns = 40;
  const tokenLimit = 80000;

  for (let turn = 0; turn < maxTurns; turn++) {
    // Compact if approaching token limit
    messages = await compactHistory(messages, tokenLimit);

    const tokens = estimateTokens(messages);
    console.log(`\n[Turn ${turn + 1}/${maxTurns}] (~${tokens} tokens, ${messages.length} messages)`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: registry.getDefinitions(),
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    for (const block of response.content) {
      if (block.type === "text") console.log(block.text);
    }

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "(done)";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const inputStr = JSON.stringify(block.input);
        console.log(`  → ${block.name}(${inputStr.slice(0, 120)}${inputStr.length > 120 ? "..." : ""})`);
        const result = await registry.execute(block.name, block.input as Record<string, unknown>);
        console.log(`  ← ${result.slice(0, 200)}${result.length > 200 ? "..." : ""}`);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "(max turns reached)";
}

async function main() {
  const task = process.argv[2];
  if (!task) {
    console.error("Usage: npx tsx module-6-context/context-agent.ts \"<task>\" [workspace-path]");
    process.exit(1);
  }
  const workspace = process.argv[3] || process.cwd();
  console.log(`Task: ${task}`);
  console.log(`Workspace: ${workspace}`);
  const result = await contextAgent(task, workspace);
  console.log(`\n=== Result ===\n${result}`);
}

main().catch(console.error);
