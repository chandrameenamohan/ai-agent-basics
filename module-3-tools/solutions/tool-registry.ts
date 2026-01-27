/**
 * Module 3: Tool Registry
 * Register tools, get definitions for API, execute with error wrapping.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "../../module-2-agent-loop/solutions/types.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getDefinitions(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map(({ name, description, input_schema }) => ({
      name,
      description,
      input_schema: input_schema as Anthropic.Tool["input_schema"],
    }));
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) return `Error: unknown tool "${name}"`;
    try {
      return await tool.execute(input);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}
