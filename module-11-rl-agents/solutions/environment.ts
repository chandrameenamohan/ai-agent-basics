/**
 * Module 11: Agent environment
 * Sandboxed workspace with tool access and state reset between episodes.
 */
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { Sandbox } from "../../module-4-filesystem/solutions/sandbox.js";
import { createFileTools } from "../../module-4-filesystem/solutions/tools.js";
import { createEditFileTool } from "../../module-5-coding-agent/solutions/edit-file.js";
import { ToolRegistry } from "../../module-3-tools/solutions/tool-registry.js";
import type { Tool } from "../../module-2-agent-loop/solutions/types.js";

export interface EnvironmentState {
  workspaceDir: string;
  sandbox: Sandbox;
  registry: ToolRegistry;
  step: number;
  maxSteps: number;
  done: boolean;
}

export interface EpisodeSetup {
  files: Record<string, string>;
  prompt: string;
}

export class AgentEnvironment {
  private state: EnvironmentState | null = null;

  async reset(setup: EpisodeSetup): Promise<EnvironmentState> {
    // Create fresh workspace
    const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "rl-env-"));
    const sandbox = new Sandbox(workspaceDir);

    // Write setup files
    for (const [filePath, content] of Object.entries(setup.files)) {
      const fullPath = path.join(workspaceDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
    }

    // Build tool registry
    const registry = new ToolRegistry();
    for (const tool of createFileTools(sandbox)) registry.register(tool);
    registry.register(createEditFileTool(sandbox));

    this.state = {
      workspaceDir,
      sandbox,
      registry,
      step: 0,
      maxSteps: 20,
      done: false,
    };

    return this.state;
  }

  async step(toolName: string, input: Record<string, unknown>): Promise<{
    result: string;
    done: boolean;
    step: number;
  }> {
    if (!this.state) throw new Error("Environment not initialized. Call reset() first.");
    if (this.state.done) throw new Error("Episode is done. Call reset().");

    this.state.step++;
    const result = await this.state.registry.execute(toolName, input);

    if (this.state.step >= this.state.maxSteps) {
      this.state.done = true;
    }

    return { result, done: this.state.done, step: this.state.step };
  }

  async cleanup(): Promise<void> {
    if (this.state) {
      await fs.rm(this.state.workspaceDir, { recursive: true, force: true });
      this.state = null;
    }
  }

  getState(): EnvironmentState | null {
    return this.state;
  }
}
