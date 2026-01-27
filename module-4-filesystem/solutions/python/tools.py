"""Module 4: File system tools."""
import os
import subprocess
from sandbox import Sandbox


def _make_tool(name, description, input_schema, execute):
    return {"name": name, "description": description, "input_schema": input_schema, "execute": execute}


def create_file_tools(sandbox: Sandbox) -> list[dict]:
    def read_file(inp):
        p = sandbox.resolve(str(inp["path"]))
        with open(p) as f:
            return f.read()

    def write_file(inp):
        p = sandbox.resolve(str(inp["path"]))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        content = str(inp["content"])
        with open(p, "w") as f:
            f.write(content)
        return f"Wrote {len(content)} bytes to {inp['path']}"

    def list_dir(inp):
        p = sandbox.resolve(str(inp.get("path", ".")))
        entries = []
        for name in sorted(os.listdir(p)):
            full = os.path.join(p, name)
            kind = "[dir]" if os.path.isdir(full) else "[file]"
            entries.append(f"{kind} {name}")
        return "\n".join(entries)

    def search_grep(inp):
        p = sandbox.resolve(str(inp.get("path", ".")))
        pattern = str(inp["pattern"])
        try:
            result = subprocess.run(
                ["grep", "-rn", pattern, p,
                 "--include=*.ts", "--include=*.js", "--include=*.json",
                 "--include=*.md", "--include=*.py"],
                capture_output=True, text=True, timeout=10,
            )
            lines = result.stdout.strip().split("\n") if result.stdout.strip() else []
            if len(lines) > 50:
                return "\n".join(lines[:50]) + f"\n... ({len(lines) - 50} more lines)"
            return "\n".join(lines) if lines else "No matches found"
        except Exception:
            return "No matches found"

    def run_shell(inp):
        cmd = str(inp["command"])
        blocked = ["rm -rf /", "mkfs", "dd if=", ":(){", "fork bomb"]
        if any(b in cmd for b in blocked):
            return "Error: command blocked for safety"
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True,
                cwd=sandbox.root, timeout=30,
            )
            return result.stdout.strip() or result.stderr.strip()
        except Exception as e:
            return f"Error: {e}"

    return [
        _make_tool("read-file", "Read the contents of a file",
                    {"type": "object", "properties": {"path": {"type": "string", "description": "File path relative to workspace"}}, "required": ["path"]},
                    read_file),
        _make_tool("write-file", "Write content to a file (creates directories as needed)",
                    {"type": "object", "properties": {"path": {"type": "string", "description": "File path relative to workspace"}, "content": {"type": "string", "description": "Content to write"}}, "required": ["path", "content"]},
                    write_file),
        _make_tool("list-dir", "List files and directories at a path",
                    {"type": "object", "properties": {"path": {"type": "string", "description": "Directory path relative to workspace (default: '.')"}}, "required": []},
                    list_dir),
        _make_tool("search-grep", "Search for a pattern in files (grep -rn)",
                    {"type": "object", "properties": {"pattern": {"type": "string", "description": "Search pattern (regex)"}, "path": {"type": "string", "description": "Directory to search (default: '.')"}}, "required": ["pattern"]},
                    search_grep),
        _make_tool("run-shell", "Run a shell command in the workspace directory",
                    {"type": "object", "properties": {"command": {"type": "string", "description": "Shell command to execute"}}, "required": ["command"]},
                    run_shell),
    ]
