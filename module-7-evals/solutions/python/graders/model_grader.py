"""Module 7: Model-based graders (LLM-as-judge)."""
import os
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import anthropic
from eval_types import Grader, GradeResult, Transcript

client = anthropic.Anthropic()


def rubric_grader(rubric: str) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        tool_calls_text = "\n".join(
            f"{tc['name']}: {tc['result'][:100]}"
            for turn in (transcript.turns if transcript else [])
            for tc in (turn.tool_calls or [])
        )
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=512,
            messages=[{
                "role": "user",
                "content": f"""You are an eval grader. Score the following agent transcript on a scale of 0-10.

Rubric:
{rubric}

Agent transcript (task and tool calls):
Task: {transcript.task if transcript else 'unknown'}
Turns: {len(transcript.turns) if transcript else 0}
Tool calls: {tool_calls_text}

Respond with ONLY a JSON object: {{"score": <0-10>, "explanation": "<brief explanation>"}}""",
            }],
        )
        try:
            parsed = json.loads(response.content[0].text)
            score = float(parsed["score"]) / 10
            return GradeResult(score=score, passed=score >= 0.7, explanation=parsed["explanation"])
        except Exception:
            return GradeResult(score=0.0, passed=False, explanation="Failed to parse grader response")

    return Grader(name="rubric-grader", grade=grade)


def pairwise_grader(criteria: str) -> Grader:
    def grade(workspace_dir: str, transcript: Transcript = None) -> GradeResult:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=256,
            messages=[{
                "role": "user",
                "content": f"""Does this agent transcript meet the criteria? Answer YES or NO with explanation.

Criteria: {criteria}
Task: {transcript.task if transcript else 'unknown'}
Turns used: {len(transcript.turns) if transcript else 0}

Respond with ONLY: {{"meets_criteria": true/false, "explanation": "..."}}""",
            }],
        )
        try:
            parsed = json.loads(response.content[0].text)
            return GradeResult(
                score=1.0 if parsed["meets_criteria"] else 0.0,
                passed=parsed["meets_criteria"],
                explanation=parsed["explanation"],
            )
        except Exception:
            return GradeResult(score=0.0, passed=False, explanation="Failed to parse grader response")

    return Grader(name="pairwise-grader", grade=grade)
