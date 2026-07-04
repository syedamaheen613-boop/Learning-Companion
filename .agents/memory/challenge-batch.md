---
name: Challenge batch generation
description: Round-robin across weak concepts to guarantee exactly N questions.
---

**Rule:** Use a round-robin loop across top-K weak concepts, generating a small batch per concept per iteration, until `len(all_questions) >= count`. Then truncate to exactly `count`.

**Why:** `per_concept = count // K` under-generates when K doesn't divide count evenly (e.g., count=5, K=3 → 3 questions). The round-robin approach fills gaps.

**How to apply:** See `challenge()` route in `api.py`. Safety valve breaks if `idx > count * len(top_concepts)` to prevent infinite loops when knowledge-base questions are exhausted for a concept.
