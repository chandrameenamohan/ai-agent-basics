"""Module 5: Edit file tool — search-and-replace pattern."""
import os
from sandbox import Sandbox


def create_edit_file_tool(sandbox: Sandbox) -> dict:
    def execute(inp):
        file_path = sandbox.resolve(str(inp["path"]))
        old_str = str(inp["old_string"])
        new_str = str(inp["new_string"])

        if old_str == "":
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "w") as f:
                f.write(new_str)
            return f"Created {inp['path']} ({len(new_str)} bytes)"

        try:
            with open(file_path) as f:
                content = f.read()
        except FileNotFoundError:
            return f'Error: file "{inp["path"]}" not found'

        occurrences = content.count(old_str)
        if occurrences == 0:
            return f"Error: old_string not found in {inp['path']}. Make sure it matches exactly (including whitespace and indentation)."
        if occurrences > 1:
            return f"Error: old_string found {occurrences} times in {inp['path']}. Provide a more unique string to match exactly once."

        updated = content.replace(old_str, new_str, 1)
        with open(file_path, "w") as f:
            f.write(updated)
        return f"Edited {inp['path']}: replaced {len(old_str)} chars with {len(new_str)} chars"

    return {
        "name": "edit-file",
        "description": "Edit a file by replacing old_string with new_string. The old_string must match exactly (including whitespace). To create a new file, use old_string='' and new_string with the full content.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to workspace"},
                "old_string": {"type": "string", "description": "Exact string to find and replace (empty = create new file)"},
                "new_string": {"type": "string", "description": "Replacement string"},
            },
            "required": ["path", "old_string", "new_string"],
        },
        "execute": execute,
    }
