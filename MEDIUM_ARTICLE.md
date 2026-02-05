# Building an AI-Powered Movie Guessing Game on GenLayer

*How I used intelligent contracts to create a game where AI judges if your movie guess is "close enough"*

---

Traditional smart contracts are deterministic by design. Given the same input, every node must produce the exact same output. This works great for token transfers, but what about use cases that need judgment?

I wanted to build a movie guessing game where players describe films using emojis and others guess the title. The catch: the AI should accept "The Godfather" even if someone types "Godfather" or "God Father." Traditional blockchains can't do this. GenLayer can.

Here's how I built **Emoji Cinema** — and how you can build something similar.

## What Makes GenLayer Different

GenLayer introduces **Intelligent Contracts** — smart contracts that can call LLMs and reach consensus on subjective outputs. Instead of every validator computing the same deterministic result, validators independently query an AI, then use an "Equivalence Principle" to agree on whether their answers are equivalent.

This unlocks use cases that were previously impossible on-chain:
- Fuzzy text matching
- Content moderation
- Sentiment analysis
- Any task requiring "judgment"

## The Game: Emoji Cinema

The rules are simple:

1. **Create** — Pick a movie, describe it with 3-8 emojis
2. **Guess** — Other players submit their guesses
3. **Resolve** — AI evaluates guesses and awards XP

For example: 🦁👑🌍 → "The Lion King"

But what if someone guesses "Lion King" without "The"? Or "El Rey León"? A traditional contract would mark these wrong. GenLayer's AI consensus can recognize them as correct.

## Contract Structure

GenLayer contracts are written in Python. Here's the basic setup:

```python
from genlayer import *
from dataclasses import dataclass

@allow_storage
@dataclass
class Round:
    round_id: u256
    movie_title: str        # Hidden until resolved
    emoji_description: str
    category: str
    creator: Address
    deadline: u256
    resolved: bool

@allow_storage
@dataclass
class Guess:
    player: Address
    guess: str
    score: u256

class Contract(gl.Contract):
    rounds: TreeMap[u256, Round]
    round_guesses: TreeMap[u256, DynArray[Guess]]
    players: TreeMap[Address, Player]
```

Key differences from Solidity:
- **Python syntax** — No new language to learn
- **`@allow_storage`** — Required for custom types stored on-chain
- **`TreeMap` / `DynArray`** — GenLayer's persistent collections (not regular dicts/lists)
- **`u256`** — No floats allowed; use unsigned integers

## The Magic: AI-Powered Resolution

The `resolve_round` method is where GenLayer shines. Here's the core logic:

```python
@gl.public.write
def resolve_round(self, round_id: int) -> None:
    game_round = self.rounds[u256(round_id)]
    guesses = self.round_guesses[u256(round_id)]

    # Build the prompt
    prompt = f"""You are evaluating guesses for a movie emoji game.

Movie Title: {game_round.movie_title}
Emoji Description: {game_round.emoji_description}
Category: {game_round.category}

Guesses to evaluate:
{formatted_guesses}

For each guess, determine:
1. Accuracy: "exact" (correct), "close" (minor typo), "partial" (related movie), "wrong"
2. Brief reasoning

Return JSON:
{{
  "guesses": [
    {{"player_index": 0, "accuracy": "exact|close|partial|wrong", "reason": "..."}}
  ],
  "emoji_rating": {{"creativity": 7, "difficulty": 6}}
}}
"""

    # This is where consensus happens
    result = gl.eq_principle.prompt_non_comparative(
        lambda: gl.nondet.exec_prompt(prompt),
        task="Evaluate movie guesses for a guessing game",
        criteria="Return valid JSON. Accuracy: exact, close, partial, or wrong."
    )

    evaluation = json.loads(result)
    # ... distribute XP based on results
```

### Understanding `prompt_non_comparative`

This is the key GenLayer primitive. Here's what happens:

1. **Leader validator** executes the prompt, gets a result
2. **Other validators** independently execute the same prompt
3. **Equivalence check** — Validators don't need identical outputs, just *equivalent* ones
4. The `task` and `criteria` parameters guide validators on what "equivalent" means

For movie guessing, if the leader says a guess is "close" and another validator says "exact," that's a consensus failure. But if both agree the guess is correct (even with different reasoning), consensus passes.

## The Hardest Part: Prompt Engineering for Consensus

Getting multiple AI instances to agree was trickier than expected. My early prompts produced inconsistent JSON structures, causing parse failures.

What worked:
- **Explicit JSON schema** in the prompt
- **Clear evaluation criteria** (exact/close/partial/wrong)
- **Deterministic-where-possible** — I validate emoji length with regular code, not AI

```python
def _validate_emoji_description(self, text: str) -> bool:
    # Simple deterministic check - avoid complex Unicode detection
    # which can produce different results across validators
    if len(text) < 1 or len(text) > 50:
        return False
    return True
```

The principle: use AI only where you need judgment. Keep everything else deterministic.

## XP Distribution

After AI evaluation, XP is awarded based on accuracy:

| Result | Guesser XP | Describer XP |
|--------|------------|--------------|
| First correct | +15 | +12 |
| Subsequent correct | +10 | — |
| Close guess | +5 | +12 |
| Participated | +3 | — |
| Nobody guessed | — | +3 only |
| High creativity | — | +5 bonus |

```python
if accuracy == "exact":
    if not first_correct_found:
        xp_earned = u256(15)
        first_correct_found = True
        describer_bonus = u256(12)
    else:
        xp_earned = u256(10)
    player.correct_guesses = player.correct_guesses + u256(1)
```

## Deploying to StudioNet

GenLayer has a hosted testnet called StudioNet. To deploy:

1. Go to [studio.genlayer.com](https://studio.genlayer.com)
2. Upload your contract
3. Deploy and grab the contract address
4. Interact via the Studio UI or GenLayerJS

No local node setup required for testing.

## What You Can Build

Emoji Cinema is just one example. The same pattern — AI consensus for subjective evaluation — enables:

- **Prediction markets** with natural language resolution
- **Content moderation** that understands context
- **Reputation systems** based on contribution quality
- **Games** with flexible rule interpretation

The key insight: if your use case requires "judgment" that a traditional `if/else` can't handle, GenLayer might be the right tool.

## Try It Yourself

The full source code is available at: [github.com/emark-cloud/emoji-cinema](https://github.com/emark-cloud/emoji-cinema)

Start with the [GenLayer docs](https://docs.genlayer.com) to understand the basics, then adapt the patterns from Emoji Cinema for your own project.

The barrier to building AI-powered on-chain applications is lower than you think.

---

*Have questions about GenLayer or Intelligent Contracts? Drop a comment below.*
