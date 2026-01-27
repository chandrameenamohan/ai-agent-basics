"""Module 1.4: Structured output with Pydantic."""
import sys
import json
from dotenv import load_dotenv
import anthropic
from pydantic import BaseModel, Field

load_dotenv()

client = anthropic.Anthropic()


class MovieReview(BaseModel):
    title: str
    year: int
    rating: int = Field(ge=1, le=10)
    summary: str
    pros: list[str]
    cons: list[str]


def main():
    movie = sys.argv[1] if len(sys.argv) > 1 else "The Matrix"

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": f'Review the movie "{movie}". Respond with ONLY valid JSON matching this schema: {{ title: string, year: number, rating: number (1-10), summary: string, pros: string[], cons: string[] }}',
            },
        ],
    )

    block = response.content[0]
    if block.type != "text":
        raise ValueError("Expected text response")

    raw = json.loads(block.text)
    review = MovieReview(**raw)

    print("Parsed review:")
    print(f"  {review.title} ({review.year}) — {review.rating}/10")
    print(f"  {review.summary}")
    print(f"  Pros: {', '.join(review.pros)}")
    print(f"  Cons: {', '.join(review.cons)}")


if __name__ == "__main__":
    main()
