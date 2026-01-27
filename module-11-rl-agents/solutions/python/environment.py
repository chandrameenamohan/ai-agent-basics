"""Module 11: Agent environment."""
import os
import sys
import tempfile
import shutil

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-4-filesystem", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-5-coding-agent", "solutions", "python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-3-tools", "solutions", "python"))

from sandbox import Sandbox
from tools import create_file_tools
from edit_file import create_edit_file_tool
from tool_registry import ToolRegistry, Tool


class AgentEnvironment:
    def __init__(self):
        self.state = None

    def reset(self, setup: dict) -> dict:
        workspace_dir = tempfile.mkdtemp(prefix="rl-env-")
        sandbox = Sandbox(workspace_dir)

        for file_path, content in setup.get("files", {}).items():
            full_path = os.path.join(workspace_dir, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w") as f:
                f.write(content)

        registry = ToolRegistry()
        for t in create_file_tools(sandbox):
            registry.register(Tool(**t))
        registry.register(Tool(**create_edit_file_tool(sandbox)))

        self.state = {
            "workspace_dir": workspace_dir,
            "sandbox": sandbox,
            "registry": registry,
            "step": 0,
            "max_steps": 20,
            "done": False,
        }
        return self.state

    def step(self, tool_name: str, inp: dict) -> dict:
        if not self.state:
            raise RuntimeError("Environment not initialized. Call reset() first.")
        if self.state["done"]:
            raise RuntimeError("Episode is done. Call reset().")

        self.state["step"] += 1
        result = self.state["registry"].execute(tool_name, inp)

        if self.state["step"] >= self.state["max_steps"]:
            self.state["done"] = True

        return {"result": result, "done": self.state["done"], "step": self.state["step"]}

    def cleanup(self):
        if self.state:
            shutil.rmtree(self.state["workspace_dir"], ignore_errors=True)
            self.state = None

    def get_state(self):
        return self.state
