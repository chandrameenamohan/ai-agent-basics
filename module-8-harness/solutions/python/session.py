"""Module 8: Session persistence."""
import os
import json
import time

SESSIONS_DIR = os.path.join(os.getcwd(), "sessions")


def _ensure_dir():
    os.makedirs(SESSIONS_DIR, exist_ok=True)


def save_session(session: dict) -> None:
    _ensure_dir()
    from datetime import datetime
    session["updatedAt"] = datetime.now().isoformat()
    path = os.path.join(SESSIONS_DIR, f"{session['id']}.json")
    with open(path, "w") as f:
        json.dump(session, f, indent=2, default=str)


def load_session(session_id: str) -> dict | None:
    try:
        with open(os.path.join(SESSIONS_DIR, f"{session_id}.json")) as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def list_sessions() -> list[dict]:
    _ensure_dir()
    sessions = []
    for fname in os.listdir(SESSIONS_DIR):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(SESSIONS_DIR, fname)) as f:
                s = json.load(f)
            sessions.append({"id": s["id"], "task": s["task"], "updatedAt": s["updatedAt"]})
        except Exception:
            pass
    return sorted(sessions, key=lambda s: s["updatedAt"], reverse=True)


def create_session(task: str, workspace: str) -> dict:
    from datetime import datetime
    now = datetime.now().isoformat()
    return {
        "id": f"session-{int(time.time() * 1000)}",
        "createdAt": now,
        "updatedAt": now,
        "task": task,
        "messages": [{"role": "user", "content": task}],
        "turn": 0,
        "workspace": workspace,
    }
