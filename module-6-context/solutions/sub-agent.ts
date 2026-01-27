/**
 * Module 6: Sub-agent delegation
 * Spawn a fresh agent loop for a subtask, return summary.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import type { Tool, Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

export function createDelegateTaskTool(
  registry: ToolRegistry,
  systemPrompt: string
): Tool {
  return {
    name: "delegate-task",
    description:
      "Delegate a subtask to a fresh sub-agent. The sub-agent has the same tools but a clean context. Use this for self-contained subtasks to avoid context bloat.",
    input_schema: {
      type: "object" as const,
      properties: {
        task: { type: "string", description: "Clear description of the subtask" },
      },
      required: ["task"],
    },
    execute: async (input) => {
      const task = String(input.task);
      console.log(`  [Sub-agent] Starting: ${task.slice(0, 80)}...`);

      const messages: Message[] = [{ role: "user", content: task }];
      const maxTurns = 15;

      for (let turn = 0; turn < maxTurns; turn++) {
        const response = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          tools: registry.getDefinitions(),
          messages,
        });

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "end_turn") {
          const text = response.content.find((b) => b.type === "text");
          const result = text?.type === "text" ? text.text : "(sub-agent completed)";
          console.log(`  [Sub-agent] Done in ${turn + 1} turns`);
          return result;
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            const result = await registry.execute(block.name, block.input as Record<string, unknown>);
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }
        }
        messages.push({ role: "user", content: toolResults });
      }

      return "(sub-agent max turns reached)";
    },
  };
}
