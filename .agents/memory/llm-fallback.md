---
name: LLM fallback knowledge base
description: Anthropic API key has zero credits; llm_tutor.py has a rich CS knowledge base as fallback.
---

**Rule:** Never rely solely on the Anthropic API key for responses. The key has zero credits and all calls fail.

**Why:** The project's `ANTHROPIC_API_KEY` secret runs out of credits. Every Claude call returns an error, so the app needs a substantive local fallback.

**How to apply:** `llm_tutor.py` tries `_call_claude()` first, then falls back to `KNOWLEDGE_BASE` dict covering: recursion, arrays, merge sort, joins, binary search, linked list, dynamic programming, trees, hashing, graphs, sorting. Each topic has real explanations, 5 sample Q&A pairs, and hint strings. To add more topics, add a new key to `KNOWLEDGE_BASE`.

If Replit's Anthropic AI integration proxy is eventually set up (skill: `ai-integrations-anthropic`), the base URL and key env var would need to be updated in `_call_claude()`.
