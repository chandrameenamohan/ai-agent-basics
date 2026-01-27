/**
 * Module 7: Sample eval tasks for the coding agent
 */
import * as fs from "fs/promises";
import * as path from "path";
import { stringMatchGrader, fileExistsGrader, compositeGrader } from "../graders/code-grader.js";
import type { EvalTask } from "../types.js";

export const codingTasks: EvalTask[] = [
  {
    id: "rename-variable",
    description: "Rename a variable in a TypeScript file",
    prompt: "In app.ts, rename the variable 'x' to 'count' everywhere it appears.",
    setup: async (dir) => {
      await fs.writeFile(
        path.join(dir, "app.ts"),
        `const x = 0;\nfunction increment() {\n  return x + 1;\n}\nconsole.log(x);\n`
      );
    },
    grader: compositeGrader([
      stringMatchGrader("app.ts", "const count"),
      stringMatchGrader("app.ts", "return count + 1"),
      stringMatchGrader("app.ts", "console.log(count)"),
    ]),
  },
  {
    id: "add-function",
    description: "Add a new function to an existing file",
    prompt: "Add a function called 'greet' to utils.ts that takes a name (string) and returns 'Hello, {name}!'.",
    setup: async (dir) => {
      await fs.writeFile(
        path.join(dir, "utils.ts"),
        `export function add(a: number, b: number): number {\n  return a + b;\n}\n`
      );
    },
    grader: compositeGrader([
      stringMatchGrader("utils.ts", "function greet"),
      stringMatchGrader("utils.ts", "Hello"),
    ]),
  },
  {
    id: "fix-bug",
    description: "Fix an off-by-one bug",
    prompt: "Fix the bug in counter.ts — the count should start at 0 and increment should add 1.",
    setup: async (dir) => {
      await fs.writeFile(
        path.join(dir, "counter.ts"),
        `let count = 1; // BUG: should start at 0\n\nexport function increment() {\n  count += 2; // BUG: should add 1\n  return count;\n}\n\nexport function getCount() {\n  return count;\n}\n`
      );
    },
    grader: compositeGrader([
      stringMatchGrader("counter.ts", "count = 0"),
      stringMatchGrader("counter.ts", "count += 1"),
    ]),
  },
  {
    id: "create-file",
    description: "Create a new config file",
    prompt: "Create a config.json file with fields: port (number, 3000), host (string, 'localhost'), debug (boolean, false).",
    setup: async () => {},
    grader: compositeGrader([
      fileExistsGrader("config.json"),
      stringMatchGrader("config.json", '"port"'),
      stringMatchGrader("config.json", "3000"),
      stringMatchGrader("config.json", '"host"'),
      stringMatchGrader("config.json", '"debug"'),
    ]),
  },
  {
    id: "multi-file-refactor",
    description: "Move a function from one file to another and update imports",
    prompt:
      "Move the 'formatDate' function from helpers.ts to date-utils.ts (new file). Update main.ts to import from date-utils.ts instead.",
    setup: async (dir) => {
      await fs.writeFile(
        path.join(dir, "helpers.ts"),
        `export function formatDate(d: Date): string {\n  return d.toISOString().split("T")[0];\n}\n\nexport function capitalize(s: string): string {\n  return s.charAt(0).toUpperCase() + s.slice(1);\n}\n`
      );
      await fs.writeFile(
        path.join(dir, "main.ts"),
        `import { formatDate } from "./helpers.js";\n\nconsole.log(formatDate(new Date()));\n`
      );
    },
    grader: compositeGrader([
      fileExistsGrader("date-utils.ts"),
      stringMatchGrader("date-utils.ts", "formatDate"),
      stringMatchGrader("main.ts", "date-utils"),
    ]),
  },
];
