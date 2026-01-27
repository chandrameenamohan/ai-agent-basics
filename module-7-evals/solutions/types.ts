/**
 * Module 7: Core eval vocabulary
 */
export interface EvalTask {
  id: string;
  description: string;
  /** Set up the workspace for this task (create files, etc.) */
  setup: (workspaceDir: string) => Promise<void>;
  /** The prompt to give the agent */
  prompt: string;
  /** Grader that determines pass/fail */
  grader: Grader;
}

export interface Grader {
  name: string;
  /** Returns 0.0 (fail) to 1.0 (pass), with optional explanation */
  grade: (workspaceDir: string, transcript: Transcript) => Promise<GradeResult>;
}

export interface GradeResult {
  score: number; // 0.0 to 1.0
  passed: boolean;
  explanation: string;
}

export interface Transcript {
  task: string;
  turns: TranscriptTurn[];
  totalTokens: number;
  durationMs: number;
}

export interface TranscriptTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: { name: string; input: unknown; result: string }[];
}

export interface Trial {
  taskId: string;
  trialIndex: number;
  transcript: Transcript;
  grade: GradeResult;
}

export interface TaskResult {
  taskId: string;
  trials: Trial[];
  passRate: number;
  passAtK: number; // pass@k: at least 1 of k passes
  passExpK: number; // pass^k: all k pass
  avgScore: number;
  avgTurns: number;
}

export interface EvalReport {
  timestamp: string;
  tasks: TaskResult[];
  overallPassRate: number;
  overallPassAtK: number;
}
