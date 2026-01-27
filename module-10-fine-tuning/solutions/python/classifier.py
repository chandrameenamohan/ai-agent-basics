"""Module 10: LLM-as-classifier."""
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()


def classify(text: str, categories: list[str], context: str = "") -> dict:
    category_list = "\n".join(f"{i}: {c}" for i, c in enumerate(categories))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=16,
        messages=[{
            "role": "user",
            "content": f"""Classify the following text into exactly one category. Reply with ONLY the category number.

{f'Context: {context}' + chr(10) if context else ''}Categories:
{category_list}

Text: {text}

Category number:""",
        }],
    )

    response_text = response.content[0]
    if response_text.type != "text":
        return {"label": categories[0], "confidence": 0.0}

    try:
        num = int(response_text.text.strip())
        if 0 <= num < len(categories):
            return {"label": categories[num], "confidence": 0.9}
    except ValueError:
        pass

    return {"label": categories[0], "confidence": 0.5}


def route_intent(task: str) -> dict:
    return classify(task, [
        "code_edit",
        "code_create",
        "code_debug",
        "code_refactor",
        "question",
    ])
