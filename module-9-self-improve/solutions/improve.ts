/**
 * Module 9: Self-improvement meta-agent
 * Reads eval scorecard + agent source, proposes and applies fixes.
 */
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { EvalReport } from "../../module-7-evals/solutions/types.js";

const client = new Anthropic();

export interface Improvement {
  file: string;
  description: string;
  oldContent: string;
  newContent: string;
}

export async function analyzeAndImprove(
  report: EvalReport,
  agentSourceDir: string
): Promise<Improvement[]> {
  // Read agent source files
  const promptPath = path.join(agentSourceDir, "module-5-coding-agent", "prompt.ts");
  const promptSource = await fs.readFile(promptPath, "utf-8");

  // Extract failure patterns from report
  const failures = report.tasks
    .flatMap((t) =>
      t.trials
        .filter((trial) => !trial.grade.passed)
        .map((trial) => ({
          task: trial.taskId,
          explanation: trial.grade.explanation,
          turns: trial.transcript.turns.length,
          toolCalls: trial.transcript.turns
            .flatMap((turn) => turn.toolCalls || [])
            .map((tc) => tc.name),
        }))
    );

  if (failures.length === 0) {
    console.log("No failures to analyze — agent is performing well!");
    return [];
  }

  console.log(`Analyzing ${failures.length} failures across ${report.tasks.length} tasks...`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are an agent improvement specialist. Analyze these eval failures and propose improvements to the agent's system prompt.

## Current System Prompt
\`\`\`typescript
${promptSource}
\`\`\`

## Eval Scorecard
Overall pass rate: ${(report.overallPassRate * 100).toFixed(1)}%

## Failure Details
${failures.map((f) => `- Task: ${f.task}\n  Explanation: ${f.explanation}\n  Turns used: ${f.turns}\n  Tools used: ${f.toolCalls.join(", ")}`).join("\n\n")}

## Instructions
1. Identify recurring failure patterns (e.g., "edits without reading first", "wrong search pattern")
2. For each pattern, propose a specific addition to the system prompt
3. Return ONLY valid JSON array:
[{"description": "what this fixes", "addition": "text to add to the prompt rules"}]

Be specific and actionable. Don't add vague advice.`,
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== "text") return [];

  try {
    const suggestions: { description: string; addition: string }[] = JSON.parse(text.text);

    // Apply suggestions to prompt
    let updatedPrompt = promptSource;
    const improvements: Improvement[] = [];

    for (const suggestion of suggestions) {
      const oldRules = updatedPrompt.match(/## Rules\n([\s\S]*?)(?=\n\n## |`;\s*$)/);
      if (oldRules) {
        const ruleLines = oldRules[1].trim().split("\n");
        const nextNum = ruleLines.length + 1;
        const newRule = `${nextNum}. ${suggestion.addition}`;
        const newRules = oldRules[1].trimEnd() + "\n" + newRule;
        updatedPrompt = updatedPrompt.replace(oldRules[1], newRules);

        improvements.push({
          file: "module-5-coding-agent/prompt.ts",
          description: suggestion.description,
          oldContent: oldRules[1],
          newContent: newRules,
        });
      }
    }

    return improvements;
  } catch {
    console.error("Failed to parse improvement suggestions");
    return [];
  }
}

export async function applyImprovements(
  improvements: Improvement[],
  baseDir: string
): Promise<void> {
  for (const imp of improvements) {
    const filePath = path.join(baseDir, imp.file);
    let content = await fs.readFile(filePath, "utf-8");
    content = content.replace(imp.oldContent, imp.newContent);
    await fs.writeFile(filePath, content, "utf-8");
    console.log(`Applied: ${imp.description}`);
  }
}
