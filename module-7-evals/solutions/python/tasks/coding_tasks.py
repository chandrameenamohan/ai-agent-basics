"""Module 7: Sample eval tasks for the coding agent."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from eval_types import EvalTask
from graders.code_grader import string_match_grader, file_exists_grader, composite_grader


def _setup_rename(d):
    with open(os.path.join(d, "app.ts"), "w") as f:
        f.write("const x = 0;\nfunction increment() {\n  return x + 1;\n}\nconsole.log(x);\n")


def _setup_add_function(d):
    with open(os.path.join(d, "utils.ts"), "w") as f:
        f.write("export function add(a: number, b: number): number {\n  return a + b;\n}\n")


def _setup_fix_bug(d):
    with open(os.path.join(d, "counter.ts"), "w") as f:
        f.write("let count = 1; // BUG: should start at 0\n\nexport function increment() {\n  count += 2; // BUG: should add 1\n  return count;\n}\n\nexport function getCount() {\n  return count;\n}\n")


def _setup_multi_file(d):
    with open(os.path.join(d, "helpers.ts"), "w") as f:
        f.write('export function formatDate(d: Date): string {\n  return d.toISOString().split("T")[0];\n}\n\nexport function capitalize(s: string): string {\n  return s.charAt(0).toUpperCase() + s.slice(1);\n}\n')
    with open(os.path.join(d, "main.ts"), "w") as f:
        f.write('import { formatDate } from "./helpers.js";\n\nconsole.log(formatDate(new Date()));\n')


coding_tasks: list[EvalTask] = [
    EvalTask(
        id="rename-variable",
        description="Rename a variable in a TypeScript file",
        prompt="In app.ts, rename the variable 'x' to 'count' everywhere it appears.",
        setup=_setup_rename,
        grader=composite_grader([
            string_match_grader("app.ts", "const count"),
            string_match_grader("app.ts", "return count + 1"),
            string_match_grader("app.ts", "console.log(count)"),
        ]),
    ),
    EvalTask(
        id="add-function",
        description="Add a new function to an existing file",
        prompt="Add a function called 'greet' to utils.ts that takes a name (string) and returns 'Hello, {name}!'.",
        setup=_setup_add_function,
        grader=composite_grader([
            string_match_grader("utils.ts", "function greet"),
            string_match_grader("utils.ts", "Hello"),
        ]),
    ),
    EvalTask(
        id="fix-bug",
        description="Fix an off-by-one bug",
        prompt="Fix the bug in counter.ts — the count should start at 0 and increment should add 1.",
        setup=_setup_fix_bug,
        grader=composite_grader([
            string_match_grader("counter.ts", "count = 0"),
            string_match_grader("counter.ts", "count += 1"),
        ]),
    ),
    EvalTask(
        id="create-file",
        description="Create a new config file",
        prompt="Create a config.json file with fields: port (number, 3000), host (string, 'localhost'), debug (boolean, false).",
        setup=lambda d: None,
        grader=composite_grader([
            file_exists_grader("config.json"),
            string_match_grader("config.json", '"port"'),
            string_match_grader("config.json", "3000"),
            string_match_grader("config.json", '"host"'),
            string_match_grader("config.json", '"debug"'),
        ]),
    ),
    EvalTask(
        id="multi-file-refactor",
        description="Move a function from one file to another and update imports",
        prompt="Move the 'formatDate' function from helpers.ts to date-utils.ts (new file). Update main.ts to import from date-utils.ts instead.",
        setup=_setup_multi_file,
        grader=composite_grader([
            file_exists_grader("date-utils.ts"),
            string_match_grader("date-utils.ts", "formatDate"),
            string_match_grader("main.ts", "date-utils"),
        ]),
    ),
]
