"""Module 11: RL training loop."""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "module-7-evals", "solutions", "python"))

from dotenv import load_dotenv
load_dotenv()

from environment import AgentEnvironment
from trajectories import collect_trajectory
from curriculum import Curriculum
from eval_types import EvalTask
from graders.code_grader import string_match_grader, file_exists_grader, composite_grader

easy_tasks = [
    EvalTask(
        id="easy-create-file", description="Create a simple file",
        prompt="Create a file called hello.txt containing 'Hello, World!'",
        setup=lambda d: None,
        grader=composite_grader([file_exists_grader("hello.txt"), string_match_grader("hello.txt", "Hello, World!")]),
    ),
    EvalTask(
        id="easy-edit-line", description="Change one line in a file",
        prompt="In greeting.ts, change the greeting from 'Hi' to 'Hello'.",
        setup=lambda d: open(os.path.join(d, "greeting.ts"), "w").write('export const greeting = "Hi";\n'),
        grader=string_match_grader("greeting.ts", '"Hello"'),
    ),
]

medium_tasks = [
    EvalTask(
        id="medium-add-function", description="Add a function to existing code",
        prompt="Add an 'isEven' function to math.ts that returns true if a number is even.",
        setup=lambda d: open(os.path.join(d, "math.ts"), "w").write("export function add(a: number, b: number) { return a + b; }\n"),
        grader=composite_grader([string_match_grader("math.ts", "isEven"), string_match_grader("math.ts", "% 2")]),
    ),
]

hard_tasks = [
    EvalTask(
        id="hard-fix-bug-and-test", description="Fix a bug and verify the fix",
        prompt="Fix the bug in sort.ts where the comparison is reversed, causing descending instead of ascending sort.",
        setup=lambda d: open(os.path.join(d, "sort.ts"), "w").write(
            "export function sortNumbers(arr: number[]): number[] {\n"
            "  return [...arr].sort((a, b) => b - a); // BUG: should be a - b\n}\n"
        ),
        grader=string_match_grader("sort.ts", "a - b"),
    ),
]

curriculum_tiers = [
    {"name": "Easy", "difficulty": "easy", "tasks": easy_tasks, "promotion_threshold": 0.8},
    {"name": "Medium", "difficulty": "medium", "tasks": medium_tasks, "promotion_threshold": 0.8},
    {"name": "Hard", "difficulty": "hard", "tasks": hard_tasks, "promotion_threshold": 0.8},
]


def main():
    max_episodes = int(sys.argv[1]) if len(sys.argv) > 1 else 6
    print("=== Module 11: RL Training Loop ===\n")
    print(f"Running {max_episodes} episodes with curriculum learning\n")

    curriculum = Curriculum(curriculum_tiers)
    env = AgentEnvironment()
    trajectories = []

    for ep in range(max_episodes):
        tier = curriculum.get_current_tier()
        task = curriculum.sample_task()

        print(f"\nEpisode {ep + 1}/{max_episodes} [{tier['name']}] Task: {task.id}")

        try:
            trajectory = collect_trajectory(
                env,
                {"files": {}, "prompt": task.prompt},
                task.grader,
            )
            trajectories.append(trajectory)

            outcome = curriculum.record_outcome(trajectory["success"])

            print(f"  Result: {'SUCCESS' if trajectory['success'] else 'FAIL'}")
            print(f"  Reward: {trajectory['reward']['total']:.3f} ({trajectory['reward']['breakdown']})")
            print(f"  Steps: {len(trajectory['steps'])}")

            if outcome["promoted"]:
                print(f"  Promoted to {outcome['new_tier']}!")
        except Exception as e:
            print(f"  Error: {e}")
            curriculum.record_outcome(False)

    state = curriculum.get_state()
    print("\n" + "=" * 60)
    print("RL TRAINING SUMMARY")
    print("=" * 60)
    print(f"Episodes: {state['episodes_completed']}")
    print(f"Successes: {state['total_successes']}")
    print(f"Current tier: {curriculum.get_current_tier()['name']}")
    print(f"Tier pass rates: {', '.join(f'{r * 100:.1f}%' for r in state['tier_pass_rates'])}")
    print(f"Curriculum complete: {curriculum.is_complete()}")

    output_path = os.path.join(os.getcwd(), "rl-trajectories.jsonl")
    with open(output_path, "w") as f:
        for t in trajectories:
            f.write(json.dumps({
                "episode_id": t["episode_id"],
                "prompt": t["prompt"],
                "steps": len(t["steps"]),
                "reward": t["reward"]["total"],
                "success": t["success"],
            }) + "\n")
    print(f"\nTrajectories saved to {output_path}")


if __name__ == "__main__":
    main()
