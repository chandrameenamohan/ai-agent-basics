"""Module 7: Core eval vocabulary."""
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class GradeResult:
    score: float  # 0.0 to 1.0
    passed: bool
    explanation: str


@dataclass
class TranscriptTurn:
    role: str  # "user" | "assistant" | "tool"
    content: str
    tool_calls: list[dict[str, Any]] | None = None


@dataclass
class Transcript:
    task: str
    turns: list[TranscriptTurn]
    total_tokens: int
    duration_ms: int


@dataclass
class Grader:
    name: str
    grade: Callable  # (workspace_dir: str, transcript: Transcript) -> GradeResult


@dataclass
class EvalTask:
    id: str
    description: str
    setup: Callable  # (workspace_dir: str) -> None
    prompt: str
    grader: Grader


@dataclass
class Trial:
    task_id: str
    trial_index: int
    transcript: Transcript
    grade: GradeResult


@dataclass
class TaskResult:
    task_id: str
    trials: list[Trial]
    pass_rate: float
    pass_at_k: float
    pass_exp_k: float
    avg_score: float
    avg_turns: float


@dataclass
class EvalReport:
    timestamp: str
    tasks: list[TaskResult]
    overall_pass_rate: float
    overall_pass_at_k: float
