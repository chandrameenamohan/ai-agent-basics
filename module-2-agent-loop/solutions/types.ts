/**
 * Module 2: Core types for the agent loop
 */
import Anthropic from "@anthropic-ai/sdk";

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

export interface AgentConfig {
  model: string;
  maxTokens: number;
  maxTurns: number;
  systemPrompt?: string;
  tools: Tool[];
}

export type Message = Anthropic.MessageParam;
export type ContentBlock = Anthropic.ContentBlock;
export type ToolUseBlock = Anthropic.ToolUseBlock;
export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;
