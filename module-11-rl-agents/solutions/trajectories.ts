/**
 * Module 11: Trajectory collection
 * Complete rollouts (state, action, reward) from agent episodes.
 */
import Anthropic from "@anthropic-ai/sdk";
import { AgentEnvironment, type EpisodeSetup } from "./environment.js";
import { computeReward, type TrajectoryStep, type EpisodeReward, type RewardConfig } from "./rewards.js";
import { CODING_AGENT_PROMPT } from "../../module-5-coding-agent/solutions/prompt.js";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";
import type { Grader, Transcript, TranscriptTurn } from "../../module-7-evals/solutions/types.js";

const client = new Anthropic();

export interface Trajectory {
  episodeId: string;
  prompt: string;
  steps: TrajectoryStep[];
  transcript: Transcript;
  reward: EpisodeReward;
  success: boolean;
}

/**
 * Collect a complete trajectory by running the agent in the environment.
 */
export async function collectTrajectory(
  env: AgentEnvironment,
  setup: EpisodeSetup,
  grader: Grader,
  rewardConfig?: RewardConfig
): Promise<Trajectory> {
  const state = await env.reset(setup);
  const steps: TrajectoryStep[] = [];
  const transcriptTurns: TranscriptTurn[] = [];
  const messages: Message[] = [{ role: "user", content: setup.prompt }];
  transcriptTurns.push({ role: "user", content: setup.prompt });

  const startTime = Date.now();
  let totalTokens = 0;

  for (let turn = 0; turn < state.maxSteps; turn++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: CODING_AGENT_PROMPT + `\nWorkspace: ${state.workspaceDir}`,
      tools: state.registry.getDefinitions(),
      messages,
    });

    totalTokens += response.usage.input_tokens + response.usage.output_tokens;
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      transcriptTurns.push({
        role: "assistant",
        content: text?.type === "text" ? text.text : "",
      });
      break;
    }

    const toolCalls: TranscriptTurn["toolCalls"] = [];
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        const input = block.input as Record<string, unknown>;
        const { result } = await env.step(block.name, input);
        const wasValid = !result.startsWith("Error:");

        steps.push({ toolName: block.name, input, result, wasValid });
        toolCalls.push({ name: block.name, input, result });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
    }

    transcriptTurns.push({ role: "assistant", content: "", toolCalls });
    messages.push({ role: "user", content: toolResults });
  }

  const transcript: Transcript = {
    task: setup.prompt,
    turns: transcriptTurns,
    totalTokens,
    durationMs: Date.now() - startTime,
  };

  // Grade the episode
  const grade = await grader.grade(state.workspaceDir, transcript);
  const reward = computeReward(grade, steps, rewardConfig);

  await env.cleanup();

  return {
    episodeId: `ep-${Date.now()}`,
    prompt: setup.prompt,
    steps,
    transcript,
    reward,
    success: grade.passed,
  };
}
