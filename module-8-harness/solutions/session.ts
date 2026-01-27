/**
 * Module 8: Session persistence
 * Save/load/list sessions as JSON for crash recovery.
 */
import * as fs from "fs/promises";
import * as path from "path";
import type { Message } from "../../module-2-agent-loop/solutions/types.js";

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  task: string;
  messages: Message[];
  turn: number;
  workspace: string;
}

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

async function ensureDir() {
  await fs.mkdir(SESSIONS_DIR, { recursive: true });
}

export async function saveSession(session: Session): Promise<void> {
  await ensureDir();
  session.updatedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(SESSIONS_DIR, `${session.id}.json`),
    JSON.stringify(session, null, 2),
    "utf-8"
  );
}

export async function loadSession(id: string): Promise<Session | null> {
  try {
    const data = await fs.readFile(path.join(SESSIONS_DIR, `${id}.json`), "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<{ id: string; task: string; updatedAt: string }[]> {
  await ensureDir();
  const files = await fs.readdir(SESSIONS_DIR);
  const sessions = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const data = await fs.readFile(path.join(SESSIONS_DIR, file), "utf-8");
      const s = JSON.parse(data);
      sessions.push({ id: s.id, task: s.task, updatedAt: s.updatedAt });
    } catch {
      // skip corrupt files
    }
  }
  return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createSession(task: string, workspace: string): Session {
  return {
    id: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    task,
    messages: [{ role: "user", content: task }],
    turn: 0,
    workspace,
  };
}
