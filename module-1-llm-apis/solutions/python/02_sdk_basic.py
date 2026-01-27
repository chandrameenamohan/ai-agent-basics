"""Module 1.2: SDK multi-turn chatbot."""
from dotenv import load_dotenv
import anthropic

load_dotenv()

client = anthropic.Anthropic()
messages = []


def main():
    print("Multi-turn chatbot (type 'quit' to exit)\n")

    while True:
        user_input = input("You: ")
        if user_input.lower() == "quit":
            break

        messages.append({"role": "user", "content": user_input})

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=messages,
        )

        block = response.content[0]
        if block.type == "text":
            print(f"\nClaude: {block.text}\n")
            messages.append({"role": "assistant", "content": block.text})

        print(f"[{len(messages)} messages, {response.usage.input_tokens}+{response.usage.output_tokens} tokens]")


if __name__ == "__main__":
    main()
