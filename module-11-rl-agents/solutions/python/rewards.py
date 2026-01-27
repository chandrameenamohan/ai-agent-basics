"""Module 11: Reward design."""
from dataclasses import dataclass


@dataclass
class RewardConfig:
    outcome_weight: float = 1.0
    step_penalty: float = -0.02
    valid_tool_bonus: float = 0.01
    invalid_tool_penalty: float = -0.05
    progress_shaping: float = 0.1


DEFAULT_REWARD_CONFIG = RewardConfig()


def compute_reward(grade_result, steps: list[dict], config: RewardConfig = None) -> dict:
    if config is None:
        config = DEFAULT_REWARD_CONFIG

    outcome = grade_result.score * config.outcome_weight
    efficiency = len(steps) * config.step_penalty

    valid_calls = sum(1 for s in steps if s.get("was_valid", True))
    invalid_calls = sum(1 for s in steps if not s.get("was_valid", True))
    tool_use = valid_calls * config.valid_tool_bonus + invalid_calls * config.invalid_tool_penalty

    total = outcome + efficiency + tool_use

    return {
        "total": total,
        "outcome": outcome,
        "efficiency": efficiency,
        "tool_use": tool_use,
        "breakdown": f"outcome={outcome:.3f} efficiency={efficiency:.3f} toolUse={tool_use:.3f}",
    }
