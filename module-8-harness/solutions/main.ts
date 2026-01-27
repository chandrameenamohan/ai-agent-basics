/**
 * Module 8: Harness CLI
 * Usage: npx tsx module-8-harness/main.ts "task" [workspace] [--resume session-id]
 */
import "dotenv/config";
import { runHarness } from "./harness.js";
import { listSessions } from "./session.js";

async function main() {
  const args = process.argv.slice(2);

  // Handle --list flag
  if (args[0] === "--list") {
    const sessions = await listSessions();
    if (sessions.length === 0) {
      console.log("No sessions found.");
    } else {
      console.log("Sessions:");
      for (const s of sessions) {
        console.log(`  ${s.id} — ${s.task.slice(0, 60)} (${s.updatedAt})`);
      }
    }
    return;
  }

  // Handle --resume flag
  const resumeIdx = args.indexOf("--resume");
  let sessionId: string | undefined;
  if (resumeIdx !== -1) {
    sessionId = args[resumeIdx + 1];
    args.splice(resumeIdx, 2);
  }

  const task = args[0];
  if (!task && !sessionId) {
    console.error("Usage: npx tsx module-8-harness/main.ts \"<task>\" [workspace] [--resume session-id]");
    console.error("       npx tsx module-8-harness/main.ts --list");
    process.exit(1);
  }

  const workspace = args[1] || process.cwd();
  const result = await runHarness(task || "(resumed)", workspace, sessionId);
  console.log(`\n=== Result ===\n${result}`);
}

main().catch(console.error);
