/**
 * Module 8: Agent harness
 * Wraps agent: loads CLAUDE.md, manages sessions, injects context.
 */
import * as fs from "fs/promises";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import { Sandbox } from "../../module-4-filesystem/solutions/sandbox.js";
import { createFileTools } from "../../module-4-filesystem/solutions/tools.js";
import { createEditFileTool } from "../../module-5-coding-agent/solutions/edit-file.js";
import { CODING_AGENT_PROMPT } from "../../module-5-coding-agent/solutions/prompt.js";
import { createScratchpadTools } from "../../module-6-context/solutions/scratchpad.js";
import { createDelegateTaskTool } from "../../module-6-context/solutions/sub-agent.js";
import { compactHistory } from "../../module-6-context/solutions/compaction.js";
import { createProgressTools } from "./progress.js";
import { Session, saveSession, loadSession, createSession } from "./session.js";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

async function loadClaudeMd(workspaceDir: string): Promise<string> {
  try {
    return await fs.readFile(path.join(workspaceDir, "CLAUDE.md"), "utf-8");
  } catch {
    return "";
  }
}

export async function runHarness(
  task: string,
  workspacePath: string,
  sessionId?: string
): Promise<string> {
  const workspace = path.resolve(workspacePath);
  const sandbox = new Sandbox(workspace);

  // Load or create session
  let session: Session;
  if (sessionId) {
    const loaded = await loadSession(sessionId);
    if (!loaded) throw new Error(`Session ${sessionId} not found`);
    session = loaded;
    console.log(`Resumed session ${session.id} (turn ${session.turn})`);
  } else {
    session = createSession(task, workspace);
    console.log(`New session ${session.id}`);
  }

  // Build tools
  const registry = new ToolRegistry();
  for (const tool of createFileTools(sandbox)) registry.register(tool);
  registry.register(createEditFileTool(sandbox));
  for (const tool of createScratchpadTools(workspace)) registry.register(tool);
  const { tools: progressTools } = createProgressTools();
  for (const tool of progressTools) registry.register(tool);

  // Load CLAUDE.md for context
  const claudeMd = await loadClaudeMd(workspace);
  const systemPrompt = [
    CODING_AGENT_PROMPT,
    `\nWorkspace: ${workspace}`,
    claudeMd ? `\n## Project Context (CLAUDE.md)\n${claudeMd}` : "",
    "\nYou have progress tracking tools. Use them for multi-step tasks.",
    "\nYou can delegate subtasks to sub-agents to keep context clean.",
  ].join("");

  registry.register(createDelegateTaskTool(registry, systemPrompt));

  const maxTurns = 40;
  let messages = session.messages;

  for (let turn = session.turn; turn < maxTurns; turn++) {
    session.turn = turn;
    messages = await compactHistory(messages, 80000);

    console.log(`\n[Turn ${turn + 1}/${maxTurns}]`);

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

    // Save session after each turn for crash recovery
    session.messages = messages;
    await saveSession(session);

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "(done)";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`  → ${block.name}`);
        const result = await registry.execute(block.name, block.input as Record<string, unknown>);
        console.log(`  ← ${result.slice(0, 200)}${result.length > 200 ? "..." : ""}`);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
    session.messages = messages;
    await saveSession(session);
  }

  return "(max turns reached)";
}
