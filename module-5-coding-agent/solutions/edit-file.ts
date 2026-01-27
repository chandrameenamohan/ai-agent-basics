/**
 * Module 5: Edit file tool
 * Search-and-replace pattern (old_string/new_string).
 */
import * as fs from "fs/promises";
import { Sandbox } from "../../module-4-filesystem/solutions/sandbox.js";
import type { Tool } from "../../module-2-agent-loop/solutions/types.js";

export function createEditFileTool(sandbox: Sandbox): Tool {
  return {
    name: "edit-file",
    description:
      "Edit a file by replacing old_string with new_string. The old_string must match exactly (including whitespace). To create a new file, use old_string='' and new_string with the full content.",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to workspace" },
        old_string: { type: "string", description: "Exact string to find and replace (empty = create new file)" },
        new_string: { type: "string", description: "Replacement string" },
      },
      required: ["path", "old_string", "new_string"],
    },
    execute: async (input) => {
      const filePath = sandbox.resolve(String(input.path));
      const oldStr = String(input.old_string);
      const newStr = String(input.new_string);

      // Create new file
      if (oldStr === "") {
        const dir = (await import("path")).dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, newStr, "utf-8");
        return `Created ${input.path} (${newStr.length} bytes)`;
      }

      // Edit existing file
      let content: string;
      try {
        content = await fs.readFile(filePath, "utf-8");
      } catch {
        return `Error: file "${input.path}" not found`;
      }

      const occurrences = content.split(oldStr).length - 1;
      if (occurrences === 0) {
        return `Error: old_string not found in ${input.path}. Make sure it matches exactly (including whitespace and indentation).`;
      }
      if (occurrences > 1) {
        return `Error: old_string found ${occurrences} times in ${input.path}. Provide a more unique string to match exactly once.`;
      }

      const updated = content.replace(oldStr, newStr);
      await fs.writeFile(filePath, updated, "utf-8");
      return `Edited ${input.path}: replaced ${oldStr.length} chars with ${newStr.length} chars`;
    },
  };
}
