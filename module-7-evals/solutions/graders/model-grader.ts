/**
 * Module 7: Model-based graders (LLM-as-judge)
 */
import Anthropic from "@anthropic-ai/sdk";
import type { Grader, GradeResult, Transcript } from "../types.js";

const client = new Anthropic();

/** LLM rubric grader: score 0-10 based on a rubric */
export function rubricGrader(rubric: string): Grader {
  return {
    name: `rubric-grader`,
    grade: async (_workspaceDir, transcript): Promise<GradeResult> => {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `You are an eval grader. Score the following agent transcript on a scale of 0-10.

Rubric:
${rubric}

Agent transcript (task and tool calls):
Task: ${transcript.task}
Turns: ${transcript.turns.length}
Tool calls: ${transcript.turns
              .flatMap((t) => t.toolCalls || [])
              .map((tc) => `${tc.name}: ${tc.result.slice(0, 100)}`)
              .join("\n")}

Respond with ONLY a JSON object: {"score": <0-10>, "explanation": "<brief explanation>"}`,
          },
        ],
      });

      try {
        const text = response.content[0];
        if (text.type !== "text") throw new Error("No text");
        const parsed = JSON.parse(text.text);
        const score = Number(parsed.score) / 10;
        return {
          score,
          passed: score >= 0.7,
          explanation: parsed.explanation,
        };
      } catch {
        return { score: 0, passed: false, explanation: "Failed to parse grader response" };
      }
    },
  };
}

/** Pairwise comparison grader */
export function pairwiseGrader(criteria: string): Grader {
  return {
    name: `pairwise-grader`,
    grade: async (_workspaceDir, transcript): Promise<GradeResult> => {
      // For pairwise, we'd need two transcripts. This is a simplified version
      // that grades against an ideal behavior description.
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `Does this agent transcript meet the criteria? Answer YES or NO with explanation.

Criteria: ${criteria}
Task: ${transcript.task}
Turns used: ${transcript.turns.length}

Respond with ONLY: {"meets_criteria": true/false, "explanation": "..."}`,
          },
        ],
      });

      try {
        const text = response.content[0];
        if (text.type !== "text") throw new Error("No text");
        const parsed = JSON.parse(text.text);
        return {
          score: parsed.meets_criteria ? 1 : 0,
          passed: parsed.meets_criteria,
          explanation: parsed.explanation,
        };
      } catch {
        return { score: 0, passed: false, explanation: "Failed to parse grader response" };
      }
    },
  };
}
