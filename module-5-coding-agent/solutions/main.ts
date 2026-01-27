/**
 * Module 5: Coding Agent CLI
 * Usage: npx tsx main.ts "Add error handling to server.ts"
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as path from "path";
import { Sandbox } from "../../module-4-filesystem/solutions/sandbox.js";
import { createFileTools } from "../../module-4-filesystem/solutions/tools.js";
import { createEditFileTool } from "./edit-file.js";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import { CODING_AGENT_PROMPT } from "./prompt.js";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

async function codingAgent(task: string, workspacePath: string): Promise<string> {
  const sandbox = new Sandbox(path.resolve(workspacePath));
  const registry = new ToolRegistry();

  for (const tool of createFileTools(sandbox)) registry.register(tool);
  registry.register(createEditFileTool(sandbox));

  const messages: Message[] = [{ role: "user", content: task }];
  const maxTurns = 30;

  for (let turn = 0; turn < maxTurns; turn++) {
    console.log(`\n[Turn ${turn + 1}/${maxTurns}]`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: CODING_AGENT_PROMPT + `\nWorkspace: ${sandbox.root}`,
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
        const preview = result.slice(0, 300);
        console.log(`  ← ${preview}${result.length > 300 ? "..." : ""}`);
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
    console.error("Usage: npx tsx module-5-coding-agent/main.ts \"<task>\" [workspace-path]");
    process.exit(1);
  }
  const workspace = process.argv[3] || process.cwd();
  console.log(`Task: ${task}`);
  console.log(`Workspace: ${workspace}`);
  const result = await codingAgent(task, workspace);
  console.log(`\n=== Result ===\n${result}`);
}

main().catch(console.error);
