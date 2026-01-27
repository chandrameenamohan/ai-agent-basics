"""Module 6: Scratchpad tools."""
import os


def create_scratchpad_tools(workspace_root: str) -> list[dict]:
    scratch_dir = os.path.join(workspace_root, ".scratchpad")

    def write(inp):
        os.makedirs(scratch_dir, exist_ok=True)
        path = os.path.join(scratch_dir, f"{inp['key']}.md")
        with open(path, "w") as f:
            f.write(str(inp["content"]))
        return f"Saved to scratchpad: {inp['key']}"

    def read(inp):
        path = os.path.join(scratch_dir, f"{inp['key']}.md")
        try:
            with open(path) as f:
                return f.read()
        except FileNotFoundError:
            return f"No scratchpad entry found for key: {inp['key']}"

    def list_notes(_):
        try:
            entries = [e.replace(".md", "") for e in os.listdir(scratch_dir) if e.endswith(".md")]
            return "\n".join(entries) or "(empty)"
        except FileNotFoundError:
            return "(no scratchpad directory)"

    return [
        {"name": "scratchpad-write", "description": "Write a note to the scratchpad (persistent memory across turns)",
         "input_schema": {"type": "object", "properties": {"key": {"type": "string", "description": "Note key (used as filename)"}, "content": {"type": "string", "description": "Note content (markdown)"}}, "required": ["key", "content"]},
         "execute": write},
        {"name": "scratchpad-read", "description": "Read a note from the scratchpad",
         "input_schema": {"type": "object", "properties": {"key": {"type": "string", "description": "Note key to read"}}, "required": ["key"]},
         "execute": read},
        {"name": "scratchpad-list", "description": "List all scratchpad notes",
         "input_schema": {"type": "object", "properties": {}, "required": []},
         "execute": list_notes},
    ]
