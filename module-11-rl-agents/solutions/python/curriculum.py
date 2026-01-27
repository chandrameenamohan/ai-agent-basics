"""Module 11: Curriculum learning."""
import random


class Curriculum:
    def __init__(self, tiers: list[dict]):
        self.tiers = tiers
        self.state = {
            "current_tier": 0,
            "tier_pass_rates": [0.0] * len(tiers),
            "episodes_completed": 0,
            "total_successes": 0,
        }

    def get_current_tier(self) -> dict:
        return self.tiers[self.state["current_tier"]]

    def record_outcome(self, success: bool) -> dict:
        self.state["episodes_completed"] += 1
        if success:
            self.state["total_successes"] += 1

        alpha = 0.1
        idx = self.state["current_tier"]
        current = self.state["tier_pass_rates"][idx]
        self.state["tier_pass_rates"][idx] = current * (1 - alpha) + (1.0 if success else 0.0) * alpha

        tier = self.tiers[idx]
        pass_rate = self.state["tier_pass_rates"][idx]

        if pass_rate >= tier["promotion_threshold"] and idx < len(self.tiers) - 1:
            self.state["current_tier"] += 1
            new_tier = self.tiers[self.state["current_tier"]]
            return {"promoted": True, "new_tier": new_tier["name"]}

        return {"promoted": False}

    def sample_task(self):
        tier = self.get_current_tier()
        return random.choice(tier["tasks"])

    def get_state(self) -> dict:
        return dict(self.state)

    def is_complete(self) -> bool:
        idx = self.state["current_tier"]
        return (
            idx == len(self.tiers) - 1
            and self.state["tier_pass_rates"][idx] >= self.tiers[idx]["promotion_threshold"]
        )
