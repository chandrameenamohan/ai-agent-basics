"""Module 1.1: Raw HTTP request to Claude API."""
import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.environ["ANTHROPIC_API_KEY"]
API_URL = "https://api.anthropic.com/v1/messages"


def main():
    body = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 256,
        "messages": [
            {"role": "user", "content": "What is 2+2? Reply in one sentence."},
        ],
    }

    print("→ POST", API_URL)
    print("→ Body:", json.dumps(body, indent=2))

    req = urllib.request.Request(
        API_URL,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        print(f"\n← Status: {resp.status}")
        print("← Response:", json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
