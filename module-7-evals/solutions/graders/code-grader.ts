/**
 * Module 7: Deterministic code graders
 * String match, file exists, test passes, static analysis.
 */
import * as fs from "fs/promises";
import * as path from "path";
import { execSync } from "child_process";
import type { Grader, GradeResult, Transcript } from "../types.js";

/** Check if a file contains an expected string */
export function stringMatchGrader(filePath: string, expected: string): Grader {
  return {
    name: `string-match(${filePath})`,
    grade: async (workspaceDir): Promise<GradeResult> => {
      try {
        const content = await fs.readFile(path.join(workspaceDir, filePath), "utf-8");
        const found = content.includes(expected);
        return {
          score: found ? 1 : 0,
          passed: found,
          explanation: found
            ? `Found expected string in ${filePath}`
            : `Expected string not found in ${filePath}`,
        };
      } catch {
        return { score: 0, passed: false, explanation: `File ${filePath} not found` };
      }
    },
  };
}

/** Check if a file exists */
export function fileExistsGrader(filePath: string): Grader {
  return {
    name: `file-exists(${filePath})`,
    grade: async (workspaceDir): Promise<GradeResult> => {
      try {
        await fs.access(path.join(workspaceDir, filePath));
        return { score: 1, passed: true, explanation: `File ${filePath} exists` };
      } catch {
        return { score: 0, passed: false, explanation: `File ${filePath} not found` };
      }
    },
  };
}

/** Run a shell command and check exit code */
export function shellTestGrader(command: string, name?: string): Grader {
  return {
    name: name || `shell-test(${command.slice(0, 40)})`,
    grade: async (workspaceDir): Promise<GradeResult> => {
      try {
        const output = execSync(command, {
          cwd: workspaceDir,
          encoding: "utf-8",
          timeout: 30000,
        });
        return { score: 1, passed: true, explanation: `Command passed: ${output.trim().slice(0, 200)}` };
      } catch (e) {
        return {
          score: 0,
          passed: false,
          explanation: `Command failed: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`,
        };
      }
    },
  };
}

/** Composite grader: all sub-graders must pass (partial credit) */
export function compositeGrader(graders: Grader[]): Grader {
  return {
    name: `composite(${graders.map((g) => g.name).join(", ")})`,
    grade: async (workspaceDir, transcript): Promise<GradeResult> => {
      const results = await Promise.all(graders.map((g) => g.grade(workspaceDir, transcript)));
      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const allPassed = results.every((r) => r.passed);
      const explanation = results.map((r) => `${r.passed ? "✓" : "✗"} ${r.explanation}`).join("\n");
      return { score: avgScore, passed: allPassed, explanation };
    },
  };
}
