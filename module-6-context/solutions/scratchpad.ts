/**
 * Module 6: Scratchpad tools
 * External memory via .scratchpad/{key}.md files.
 */
import * as fs from "fs/promises";
import * as path from "path";
import type { Tool } from "../../module-2-agent-loop/solutions/types.js";

export function createScratchpadTools(workspaceRoot: string): Tool[] {
  const scratchDir = path.join(workspaceRoot, ".scratchpad");

  const write: Tool = {
    name: "scratchpad-write",
    description: "Write a note to the scratchpad (persistent memory across turns)",
    input_schema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Note key (used as filename)" },
        content: { type: "string", description: "Note content (markdown)" },
      },
      required: ["key", "content"],
    },
    execute: async (input) => {
      await fs.mkdir(scratchDir, { recursive: true });
      const filePath = path.join(scratchDir, `${input.key}.md`);
      await fs.writeFile(filePath, String(input.content), "utf-8");
      return `Saved to scratchpad: ${input.key}`;
    },
  };

  const read: Tool = {
    name: "scratchpad-read",
    description: "Read a note from the scratchpad",
    input_schema: {
      type: "object" as const,
      properties: {
        key: { type: "string", description: "Note key to read" },
      },
      required: ["key"],
    },
    execute: async (input) => {
      const filePath = path.join(scratchDir, `${input.key}.md`);
      try {
        return await fs.readFile(filePath, "utf-8");
      } catch {
        return `No scratchpad entry found for key: ${input.key}`;
      }
    },
  };

  const list: Tool = {
    name: "scratchpad-list",
    description: "List all scratchpad notes",
    input_schema: { type: "object" as const, properties: {}, required: [] },
    execute: async () => {
      try {
        const entries = await fs.readdir(scratchDir);
        return entries.filter((e) => e.endsWith(".md")).map((e) => e.replace(".md", "")).join("\n") || "(empty)";
      } catch {
        return "(no scratchpad directory)";
      }
    },
  };

  return [write, read, list];
}
