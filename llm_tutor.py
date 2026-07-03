"""
llm_tutor.py

Uses Claude (claude-sonnet-4-6) to actually answer student questions,
then appends the Neo4j graph memory connection on top.

Falls back gracefully if the API is unavailable (quota, network, etc.)
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

    Returns a fallback explanation if Claude is unavailable.
    """

    system_prompt = """You are a friendly, concise AI tutor helping a student 
understand computer science concepts. 
- Give clear, simple explanations in 2-3 sentences maximum
- Use analogies where helpful
- Always end with one practical tip or example
- Be encouraging, not intimidating
- The student may be asking in Hindi or Kannada — always reply in English"""

    if graph_connection:
        user_message = f"""Student question: {question}

Also note: this topic connects to something they struggled with before — 
{graph_connection['connectedWeakness']}: "{graph_connection['pastMistake']}". 
Mention this connection naturally in your explanation to help them see how 
the concepts relate."""
    else:
        user_message = f"Student question: {question}"

    try:
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
            },
            timeout=15
        )
        response.raise_for_status()
        result = response.json()
        return result["content"][0]["text"]

    except Exception as e:
        # Graceful fallback — still useful even without LLM
        error_str = str(e).lower()
        if "credit" in error_str or "balance" in error_str or "quota" in error_str:
            prefix = "[AI tutor offline — add Anthropic credits to enable full answers] "
        else:
            prefix = ""

        if graph_connection:
            weakness = graph_connection.get("connectedWeakness", "a related concept")
            past     = graph_connection.get("pastMistake", "a past mistake")
            return (
                f"{prefix}{question} builds directly on {weakness}. "
                f"You previously struggled with: \"{past}\" — "
                f"so pay special attention to how {question} relates to that. "
                f"Tip: trace through a concrete example step-by-step and check each assumption."
            )
        else:
            return (
                f"{prefix}{question} is a great topic to explore! "
                f"This looks like a fresh area for you — build your understanding from first principles. "
                f"Tip: find one concrete example, work through it manually, then generalise the pattern you see."
            )


if __name__ == "__main__":
    print("Test 1: Basic question (no past connection)")
    reply = ask_claude("What is Binary Search?")
    print(reply)
    print()

    print("Test 2: Question with a past mistake connection")
    connection = {
        "newTopic": "Merge Sort",
        "connectedWeakness": "Recursion",
        "pastMistake": "Couldn't identify base case correctly"
    }
    reply = ask_claude("How does merge sort work?", connection)
    print(reply)
