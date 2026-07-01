"""
llm_tutor.py

Uses Claude (claude-sonnet-4-6) to actually answer student questions,
then appends the Neo4j graph memory connection on top.

This transforms the app from a "mistake tracker" into a genuine
AI tutor that:
1. Explains any concept clearly
2. Connects it to the student's personal history of mistakes
3. Speaks back in the student's own language
"""

import os
import requests

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


def ask_claude(question: str, graph_connection: dict = None) -> str:
    """
    Sends the student's question to Claude for a real explanation,
    then appends the graph memory connection if one exists.

    graph_connection: dict with keys newTopic, connectedWeakness, pastMistake
    (or None if no past connection found)
    """

    # Build the system prompt
    system_prompt = """You are a friendly, concise AI tutor helping a student 
understand computer science concepts. 
- Give clear, simple explanations in 2-3 sentences maximum
- Use analogies where helpful
- Always end with one practical tip or example
- Be encouraging, not intimidating
- The student may be asking in Hindi or Kannada — always reply in English"""

    # Build the user message
    if graph_connection:
        user_message = f"""Student question: {question}

Also note: this topic connects to something they struggled with before — 
{graph_connection['connectedWeakness']}: "{graph_connection['pastMistake']}". 
Mention this connection naturally in your explanation to help them see how 
the concepts relate."""
    else:
        user_message = f"Student question: {question}"

    # Call Claude API
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-4-6",
            "max_tokens": 300,
            "system": system_prompt,
            "messages": [
                {"role": "user", "content": user_message}
            ]
        }
    )

    response.raise_for_status()
    result = response.json()
    return result["content"][0]["text"]


if __name__ == "__main__":
    # Quick test — no graph connection
    print("Test 1: Basic question (no past connection)")
    reply = ask_claude("What is Binary Search?")
    print(reply)
    print()

    # Test with a graph connection
    print("Test 2: Question with a past mistake connection")
    connection = {
        "newTopic": "Merge Sort",
        "connectedWeakness": "Recursion",
        "pastMistake": "Couldn't identify base case correctly"
    }
    reply = ask_claude("How does merge sort work?", connection)
    print(reply)
