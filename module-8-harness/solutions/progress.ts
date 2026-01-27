/**
 * Module 8: Progress tracking tool
 * Markdown checklist for subtask completion.
 */
import type { Tool } from "../../module-2-agent-loop/solutions/types.js";

export interface ProgressState {
  items: { text: string; done: boolean }[];
}

export function createProgressTools(): { tools: Tool[]; state: ProgressState } {
  const state: ProgressState = { items: [] };

  const addItem: Tool = {
    name: "progress-add",
    description: "Add a subtask to the progress checklist",
    input_schema: {
      type: "object" as const,
      properties: { text: { type: "string", description: "Subtask description" } },
      required: ["text"],
    },
    execute: async (input) => {
      state.items.push({ text: String(input.text), done: false });
      return formatChecklist(state);
    },
  };

  const completeItem: Tool = {
    name: "progress-complete",
    description: "Mark a subtask as completed (by index, 0-based)",
    input_schema: {
      type: "object" as const,
      properties: { index: { type: "number", description: "Index of the subtask to complete" } },
      required: ["index"],
    },
    execute: async (input) => {
      const idx = Number(input.index);
      if (idx < 0 || idx >= state.items.length) return "Error: index out of range";
      state.items[idx].done = true;
      return formatChecklist(state);
    },
  };

  const showProgress: Tool = {
    name: "progress-show",
    description: "Show the current progress checklist",
    input_schema: { type: "object" as const, properties: {}, required: [] },
    execute: async () => formatChecklist(state),
  };

  return { tools: [addItem, completeItem, showProgress], state };
}

function formatChecklist(state: ProgressState): string {
  if (state.items.length === 0) return "(no items)";
  const done = state.items.filter((i) => i.done).length;
  const lines = state.items.map((item, i) => `${i}. [${item.done ? "x" : " "}] ${item.text}`);
  return `Progress: ${done}/${state.items.length}\n${lines.join("\n")}`;
}
