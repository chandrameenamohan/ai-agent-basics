/**
 * Module 4: File agent
 * Agent loop + filesystem tools = first useful agent.
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import * as path from "path";
import { Sandbox } from "./sandbox.js";
import { createFileTools } from "./tools.js";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

async function fileAgent(task: string, workspacePath: string): Promise<string> {
  const sandbox = new Sandbox(path.resolve(workspacePath));
  const registry = new ToolRegistry();
  for (const tool of createFileTools(sandbox)) {
    registry.register(tool);
  }

  const messages: Message[] = [{ role: "user", content: task }];
  const maxTurns = 20;

  for (let turn = 0; turn < maxTurns; turn++) {
    console.log(`\n[Turn ${turn + 1}/${maxTurns}]`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are a file system agent. You can read, write, list, search, and run shell commands in the workspace directory: ${sandbox.root}\n\nAlways read files before modifying them. Verify changes after making them.`,
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
        console.log(`  → ${block.name}(${JSON.stringify(block.input).slice(0, 100)}...)`);
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
  const task = process.argv[2] || "List the files in this workspace and summarize what you find.";
  const workspace = process.argv[3] || process.cwd();
  console.log(`Task: ${task}`);
  console.log(`Workspace: ${workspace}\n`);
  const result = await fileAgent(task, workspace);
  console.log(`\n=== Result ===\n${result}`);
}

main().catch(console.error);
