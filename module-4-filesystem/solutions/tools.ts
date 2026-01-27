/**
 * Module 4: File system tools
 * read-file, write-file, list-dir, search-grep, run-shell
 */
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import { Sandbox } from "./sandbox.js";
import type { Tool } from "../../module-2-agent-loop/solutions/types.js";

export function createFileTools(sandbox: Sandbox): Tool[] {
  const readFile: Tool = {
    name: "read-file",
    description: "Read the contents of a file",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string", description: "File path relative to workspace" } },
      required: ["path"],
    },
    execute: async (input) => {
      const p = sandbox.resolve(String(input.path));
      return await fs.readFile(p, "utf-8");
    },
  };

  const writeFile: Tool = {
    name: "write-file",
    description: "Write content to a file (creates directories as needed)",
    input_schema: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "File path relative to workspace" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    },
    execute: async (input) => {
      const p = sandbox.resolve(String(input.path));
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, String(input.content), "utf-8");
      return `Wrote ${String(input.content).length} bytes to ${input.path}`;
    },
  };

  const listDir: Tool = {
    name: "list-dir",
    description: "List files and directories at a path",
    input_schema: {
      type: "object" as const,
      properties: { path: { type: "string", description: "Directory path relative to workspace (default: '.')" } },
      required: [],
    },
    execute: async (input) => {
      const p = sandbox.resolve(String(input.path || "."));
      const entries = await fs.readdir(p, { withFileTypes: true });
      return entries
        .map((e) => `${e.isDirectory() ? "[dir]" : "[file]"} ${e.name}`)
        .join("\n");
    },
  };

  const searchGrep: Tool = {
    name: "search-grep",
    description: "Search for a pattern in files (grep -rn)",
    input_schema: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Search pattern (regex)" },
        path: { type: "string", description: "Directory to search (default: '.')" },
      },
      required: ["pattern"],
    },
    execute: async (input) => {
      const p = sandbox.resolve(String(input.path || "."));
      try {
        const result = execSync(`grep -rn "${String(input.pattern)}" "${p}" --include="*.ts" --include="*.js" --include="*.json" --include="*.md"`, {
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
          timeout: 10000,
        });
        const lines = result.trim().split("\n");
        return lines.length > 50
          ? lines.slice(0, 50).join("\n") + `\n... (${lines.length - 50} more lines)`
          : result.trim();
      } catch {
        return "No matches found";
      }
    },
  };

  const runShell: Tool = {
    name: "run-shell",
    description: "Run a shell command in the workspace directory",
    input_schema: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
      },
      required: ["command"],
    },
    execute: async (input) => {
      const cmd = String(input.command);
      // Block dangerous commands
      const blocked = ["rm -rf /", "mkfs", "dd if=", ":(){", "fork bomb"];
      if (blocked.some((b) => cmd.includes(b))) {
        return "Error: command blocked for safety";
      }
      try {
        return execSync(cmd, {
          cwd: sandbox.root,
          encoding: "utf-8",
          maxBuffer: 1024 * 1024,
          timeout: 30000,
        }).trim();
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  };

  return [readFile, writeFile, listDir, searchGrep, runShell];
}
