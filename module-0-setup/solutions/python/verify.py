"""Module 0: Verify API connection."""
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()


def main():
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=256,
        messages=[{"role": "user", "content": "Say hello and confirm you're working. One sentence."}],
    )

    block = response.content[0]
    if block.type == "text":
        print("✓ API connected successfully")
        print("Response:", block.text)
        print("Model:", response.model)
        print("Usage:", response.usage)


if __name__ == "__main__":
    main()
