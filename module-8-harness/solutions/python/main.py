"""Module 8: Harness CLI."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from harness import run_harness
from session import list_sessions


def main():
    args = sys.argv[1:]

    if args and args[0] == "--list":
        sessions = list_sessions()
        if not sessions:
            print("No sessions found.")
        else:
            print("Sessions:")
            for s in sessions:
                print(f"  {s['id']} — {s['task'][:60]} ({s['updatedAt']})")
        return

    session_id = None
    if "--resume" in args:
        idx = args.index("--resume")
        session_id = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    task = args[0] if args else None
    if not task and not session_id:
        print('Usage: python main.py "<task>" [workspace] [--resume session-id]')
        print("       python main.py --list")
        sys.exit(1)

    workspace = args[1] if len(args) > 1 else os.getcwd()
    result = run_harness(task or "(resumed)", workspace, session_id)
    print(f"\n=== Result ===\n{result}")


if __name__ == "__main__":
    main()
