"""Module 2: Core types for the agent loop."""
from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable


@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    execute: Callable[[dict[str, Any]], str]


@dataclass
class AgentConfig:
    model: str
    max_tokens: int
    max_turns: int
    system_prompt: str = ""
    tools: list[Tool] = field(default_factory=list)
