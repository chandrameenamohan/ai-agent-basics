/**
 * Module 3: Calculator agent
 * Tool registry + agent loop = working calculator agent.
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "./tool-registry.js";
import type { Tool, Message } from "../../module-2-agent-loop/solutions/types.js";

const client = new Anthropic();

const addTool: Tool = {
  name: "add",
  description: "Add two numbers",
  input_schema: {
    type: "object" as const,
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" },
    },
    required: ["a", "b"],
  },
  execute: async (input) => String(Number(input.a) + Number(input.b)),
};

const multiplyTool: Tool = {
  name: "multiply",
  description: "Multiply two numbers",
  input_schema: {
    type: "object" as const,
    properties: {
      a: { type: "number", description: "First number" },
      b: { type: "number", description: "Second number" },
    },
    required: ["a", "b"],
  },
  execute: async (input) => String(Number(input.a) * Number(input.b)),
};

const factorialTool: Tool = {
  name: "factorial",
  description: "Compute factorial of n",
  input_schema: {
    type: "object" as const,
    properties: { n: { type: "number", description: "Non-negative integer" } },
    required: ["n"],
  },
  execute: async (input) => {
    let n = Number(input.n);
    if (n < 0 || !Number.isInteger(n)) return "Error: n must be a non-negative integer";
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return String(result);
  },
};

async function calculatorAgent(question: string): Promise<string> {
  const registry = new ToolRegistry();
  registry.register(addTool);
  registry.register(multiplyTool);
  registry.register(factorialTool);

  const messages: Message[] = [{ role: "user", content: question }];
  const maxTurns = 10;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are a calculator assistant. Use the provided tools to compute answers. Always use tools rather than mental math.",
      tools: registry.getDefinitions(),
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.type === "text" ? text.text : "(no text)";
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        console.log(`  → ${block.name}(${JSON.stringify(block.input)})`);
        const result = await registry.execute(block.name, block.input as Record<string, unknown>);
        console.log(`  ← ${result}`);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "(max turns reached)";
}

async function main() {
  const question = process.argv[2] || "What is 7 factorial?";
  console.log(`Q: ${question}\n`);
  const answer = await calculatorAgent(question);
  console.log(`\nA: ${answer}`);
}

main().catch(console.error);
