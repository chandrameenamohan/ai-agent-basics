"""Module 4: Path sandbox."""
import os


class Sandbox:
    def __init__(self, root: str):
        self.root = os.path.realpath(root)

    def resolve(self, file_path: str) -> str:
        resolved = os.path.realpath(os.path.join(self.root, file_path))
        if not resolved.startswith(self.root):
            raise ValueError(f'Path "{file_path}" escapes sandbox root "{self.root}"')
        return resolved
