"""Module 11: RLVR — Rule-based Verification RL."""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-7-evals", "solutions", "python"))

from rewards import compute_reward, RewardConfig
from eval_types import Grader, GradeResult, Transcript


def grader_as_reward(grader: Grader, config: RewardConfig = None):
    if config is None:
        config = RewardConfig()

    def reward_fn(workspace_dir: str, transcript: Transcript, steps: list[dict]) -> dict:
        grade = grader.grade(workspace_dir, transcript)
        return compute_reward(grade, steps, config)

    return reward_fn


def composite_rlvr(graders: list[dict]) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        results = []
        for g in graders:
            result = g["grader"].grade(workspace_dir, transcript)
            results.append({"result": result, "weight": g["weight"]})

        total_weight = sum(r["weight"] for r in results)
        weighted_score = sum(r["result"].score * r["weight"] for r in results) / total_weight
        explanations = [
            f"[{r['weight']}x] {'✓' if r['result'].passed else '✗'} {r['result'].explanation}"
            for r in results
        ]

        return GradeResult(
            score=weighted_score,
            passed=weighted_score >= 0.7,
            explanation="\n".join(explanations),
        )

    return Grader(
        name=f"rlvr-composite({', '.join(g['grader'].name for g in graders)})",
        grade=grade,
    )
