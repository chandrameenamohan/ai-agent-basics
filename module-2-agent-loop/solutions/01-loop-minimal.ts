/**
 * Module 2.1: Minimal agent loop (~50 lines)
 * send → check stop_reason → execute tools → loop
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool, Message } from "./types.js";

const client = new Anthropic();

// A trivial tool for demonstration
const echoTool: Tool = {
  name: "echo",
  description: "Echoes back the input message",
  input_schema: {
    type: "object" as const,
    properties: { message: { type: "string", description: "Message to echo" } },
    required: ["message"],
  },
  execute: async (input) => `Echo: ${input.message}`,
};

async function agentLoop(userMessage: string, tools: Tool[]) {
  const messages: Message[] = [{ role: "user", content: userMessage }];
  const toolDefs = tools.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema: input_schema as Anthropic.Tool["input_schema"],
  }));

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: toolDefs,
      messages,
    });

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });

    // If no tool use, we're done
    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "(no text response)";
    }

    // Execute each tool call
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const tool = tools.find((t) => t.name === block.name);
        const result = tool
          ? await tool.execute(block.input as Record<string, unknown>)
          : `Error: unknown tool ${block.name}`;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }
}

async function main() {
  const result = await agentLoop('Use the echo tool to say "Hello from the agent loop!"', [echoTool]);
  console.log("Agent:", result);
}

main().catch(console.error);
