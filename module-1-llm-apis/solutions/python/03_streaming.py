"""Module 1.3: Streaming responses."""
import sys
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()


def main():
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Write a haiku about programming."
    print(f"Prompt: {prompt}\n")

    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)

    final = stream.get_final_message()
    print(f"\n\n[{final.usage.input_tokens}+{final.usage.output_tokens} tokens]")


if __name__ == "__main__":
    main()
