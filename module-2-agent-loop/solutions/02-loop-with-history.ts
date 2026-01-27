/**
 * Module 2.2: Agent loop with turn counting, maxTurns safety, and logging
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool, AgentConfig, Message } from "./types.js";

const client = new Anthropic();

const timeTool: Tool = {
  name: "get_time",
  description: "Returns the current date and time",
  input_schema: { type: "object" as const, properties: {}, required: [] },
  execute: async () => new Date().toISOString(),
};

const mathTool: Tool = {
  name: "calculate",
  description: "Evaluates a math expression",
  input_schema: {
    type: "object" as const,
    properties: { expression: { type: "string", description: "Math expression to evaluate" } },
    required: ["expression"],
  },
  execute: async (input) => {
    try {
      // Safe eval for simple math only
      const expr = String(input.expression).replace(/[^0-9+\-*/().%\s]/g, "");
      return String(Function(`"use strict"; return (${expr})`)());
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};

async function agentLoop(userMessage: string, config: AgentConfig): Promise<string> {
  const messages: Message[] = [{ role: "user", content: userMessage }];
  const toolDefs = config.tools.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema: input_schema as Anthropic.Tool["input_schema"],
  }));

  let turn = 0;

  while (turn < config.maxTurns) {
    turn++;
    console.log(`\n--- Turn ${turn}/${config.maxTurns} ---`);

    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      system: config.systemPrompt || "",
      tools: toolDefs,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });
    console.log(`Stop reason: ${response.stop_reason}`);
    console.log(`Tokens: ${response.usage.input_tokens}in + ${response.usage.output_tokens}out`);

    // Print any text blocks
    for (const block of response.content) {
      if (block.type === "text") console.log(`Text: ${block.text}`);
    }

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    // Execute tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`Tool call: ${block.name}(${JSON.stringify(block.input)})`);
        const tool = config.tools.find((t) => t.name === block.name);
        const result = tool
          ? await tool.execute(block.input as Record<string, unknown>)
          : `Error: unknown tool ${block.name}`;
        console.log(`Tool result: ${result}`);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return `(max turns ${config.maxTurns} reached)`;
}

async function main() {
  const config: AgentConfig = {
    model: "claude-sonnet-4-20250514",
    maxTokens: 1024,
    maxTurns: 10,
    systemPrompt: "You are a helpful assistant. Use tools when needed.",
    tools: [timeTool, mathTool],
  };

  const result = await agentLoop(
    "What time is it? Also, what is 42 * 17 + 3?",
    config
  );
  console.log("\n=== Final answer ===");
  console.log(result);
}

main().catch(console.error);
