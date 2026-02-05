# Building an AI-Powered Movie Guessing Game on GenLayer: A Complete Guide

*A deep dive into Intelligent Contracts, AI consensus, and building on-chain applications that can think*

---

## The Problem With Traditional Smart Contracts

Smart contracts are powerful, but they have a fundamental limitation: they're deterministic by design. Given the same input, every node in the network must produce the exact same output. This is crucial for consensus — if nodes computed different results, the blockchain would fork.

This determinism works perfectly for:
- Token transfers ("send 100 tokens from A to B")
- Mathematical operations ("calculate interest at 5%")
- Conditional logic ("if balance > threshold, execute")

But what about use cases that require *judgment*? Consider these scenarios:

- **Content moderation**: Is this post harmful or just edgy humor?
- **Insurance claims**: Does this photo show legitimate damage?
- **Prediction markets**: Did "Bitcoin reaching $100k in 2024" technically happen if it hit $99,950?
- **Games**: Is "Godfather" close enough to "The Godfather"?

Traditional smart contracts can't handle these. You'd need an oracle — an external service that provides the answer. But oracles are centralized trust points. You're trusting one entity to make the judgment call.

What if the judgment itself could be decentralized?

## Enter GenLayer: Blockchain Meets AI

GenLayer is a new Layer-1 blockchain that introduces **Intelligent Contracts** — smart contracts that can:

1. Execute LLM (Large Language Model) prompts
2. Fetch data from the web
3. Reach consensus on *subjective* outputs

The key innovation is the **Equivalence Principle**. Instead of requiring identical outputs from every validator, GenLayer validators check whether outputs are *equivalent* given the context.

Here's how it works:

1. A **leader validator** executes the contract, including any AI prompts
2. **Other validators** independently execute the same prompts
3. Validators compare results using the Equivalence Principle
4. If results are "equivalent enough" (based on criteria you define), consensus passes
5. If not, the transaction is rejected or goes through dispute resolution

This unlocks an entirely new category of on-chain applications.

## The Project: Emoji Cinema

To explore GenLayer's capabilities, I built **Emoji Cinema** — a multiplayer guessing game where:

1. **A player picks a movie** and describes it using 3-8 emojis
2. **Other players guess** the movie title within a time limit
3. **AI evaluates the guesses** — accepting exact matches, close matches (typos, alternate titles), and partial matches (sequels, related films)
4. **XP is distributed** based on accuracy, with bonuses for creative emoji descriptions

For example:
- 🦁👑🌍 → "The Lion King"
- 🚢💑❄️🎻 → "Titanic"
- 🕷️🦸‍♂️🏙️ → "Spider-Man"

The game is simple, but it demonstrates something powerful: **fuzzy matching on-chain**. If someone guesses "Lion King" instead of "The Lion King," the AI recognizes it as correct. Traditional contracts would require an exact string match.

## Contract Architecture Deep Dive

### Setting Up the Environment

GenLayer contracts are written in Python, which dramatically lowers the barrier to entry compared to Solidity. Here's the import structure:

```python
# { "Depends": "py-genlayer:test" }
from genlayer import *
from dataclasses import dataclass
import json
```

The `genlayer` module provides:
- `gl.Contract` — Base class for your contract
- `gl.public.write` / `gl.public.view` — Decorators for external methods
- `gl.message.sender_address` — The transaction sender
- `gl.eq_principle` — Equivalence principle functions
- `gl.nondet.exec_prompt` — Execute LLM prompts
- `gl.vm.UserError` — Revert with an error message

### Data Structures

GenLayer requires explicit type annotations and special decorators for stored data:

```python
@allow_storage
@dataclass
class Round:
    """Represents a single game round."""
    round_id: u256
    movie_title: str           # Hidden until resolution
    emoji_description: str     # Visible immediately
    category: str              # One of 8 categories
    creator: Address           # Who created the round
    created_at: u256           # Unix timestamp
    deadline: u256             # When guessing ends
    duration_minutes: u256     # 2, 3, or 5
    resolved: bool             # Has AI evaluated guesses?


@allow_storage
@dataclass
class Guess:
    """Represents a player's guess for a round."""
    player: Address
    guess: str
    timestamp: u256
    score: u256                # XP earned, set during resolution


@allow_storage
@dataclass
class Player:
    """Represents a player's statistics."""
    address: Address
    xp: u256
    rounds_created: u256
    rounds_guessed: u256
    correct_guesses: u256
```

**Key GenLayer-specific patterns:**

1. **`@allow_storage`** — Required for any custom type you want to persist on-chain. Without this, you'll get runtime errors.

2. **`u256` instead of `int`** — GenLayer doesn't allow floats, and integers must be explicitly typed. `u256` is an unsigned 256-bit integer, the standard for blockchain amounts.

3. **`Address`** — A special type for wallet addresses. Don't use `str` for addresses.

### Contract Storage

The main contract class defines persistent storage:

```python
class Contract(gl.Contract):
    """Emoji Cinema game contract."""

    rounds: TreeMap[u256, Round]
    round_guesses: TreeMap[u256, DynArray[Guess]]
    players: TreeMap[Address, Player]
    round_counter: u256
    valid_categories: DynArray[str]
```

**Understanding `TreeMap` and `DynArray`:**

- **`TreeMap[K, V]`** — A persistent key-value store, similar to Python's `dict` but optimized for blockchain storage. Use this for mappings.

- **`DynArray[T]`** — A persistent dynamic array, similar to Python's `list`. Use this for ordered collections.

You **cannot** use regular Python `dict` or `list` for storage — they won't persist between transactions.

### Initialization

```python
def __init__(self):
    """Initialize the contract with default categories."""
    self.round_counter = u256(0)

    # Initialize valid categories
    self.valid_categories.append("Action")
    self.valid_categories.append("Comedy")
    self.valid_categories.append("Drama")
    self.valid_categories.append("Horror")
    self.valid_categories.append("Sci-Fi")
    self.valid_categories.append("Romance")
    self.valid_categories.append("Animation")
    self.valid_categories.append("Thriller")
```

The constructor runs once when the contract is deployed. Notice we're using `.append()` instead of list initialization — `DynArray` doesn't support `[item1, item2]` syntax.

### Creating a Round

```python
@gl.public.write
def create_round(
    self,
    round_id: int,
    movie_title: str,
    emoji_description: str,
    category: str,
    duration_minutes: int,
    created_at: int,
    deadline: int
) -> None:
    """Create a new game round."""
    rid = u256(round_id)

    # Validate round doesn't already exist
    if rid in self.rounds:
        raise gl.vm.UserError("Round ID already exists")

    # Validate emoji description
    if not self._validate_emoji_description(emoji_description):
        raise gl.vm.UserError("Emoji description must be 1-50 characters")

    # Validate category
    if not self._is_valid_category(category):
        raise gl.vm.UserError(f"Invalid category: {category}")

    # Validate duration (only 2, 3, or 5 minutes allowed)
    if duration_minutes not in [2, 3, 5]:
        raise gl.vm.UserError("Duration must be 2, 3, or 5 minutes")

    sender: Address = gl.message.sender_address

    new_round = Round(
        round_id=rid,
        movie_title=movie_title,
        emoji_description=emoji_description,
        category=category,
        creator=sender,
        created_at=u256(created_at),
        deadline=u256(deadline),
        duration_minutes=u256(duration_minutes),
        resolved=False
    )

    self.rounds[rid] = new_round

    # Update player stats
    player = self._get_or_create_player(sender)
    player.rounds_created = player.rounds_created + u256(1)
    self.players[sender] = player
```

**Key points:**

- **`@gl.public.write`** — This method modifies state, so it requires a transaction (costs gas)
- **`gl.message.sender_address`** — Gets the wallet address that sent the transaction
- **`gl.vm.UserError`** — Reverts the transaction with an error message
- **Type conversion** — We convert `int` parameters to `u256` when storing

### Submitting Guesses

```python
@gl.public.write
def submit_guess(self, round_id: int, guess: str) -> None:
    """Submit a guess for a round."""
    rid = u256(round_id)

    if rid not in self.rounds:
        raise gl.vm.UserError("Round does not exist")

    game_round = self.rounds[rid]

    if game_round.resolved:
        raise gl.vm.UserError("Round has already been resolved")

    sender: Address = gl.message.sender_address

    # Prevent round creator from guessing their own round
    if sender == game_round.creator:
        raise gl.vm.UserError("Round creator cannot guess in their own round")

    # Check for duplicate guesses
    guesses = self.round_guesses.get_or_insert_default(rid)
    for existing_guess in guesses:
        if existing_guess.player == sender:
            raise gl.vm.UserError("You have already submitted a guess")

    # Add the guess
    new_guess = Guess(
        player=sender,
        guess=guess,
        timestamp=u256(0),
        score=u256(0)
    )
    guesses.append(new_guess)

    # Update player stats
    player = self._get_or_create_player(sender)
    player.rounds_guessed = player.rounds_guessed + u256(1)
    self.players[sender] = player
```

**Note on `get_or_insert_default`:** This is a `TreeMap` method that returns the value if the key exists, or inserts and returns a default value if it doesn't. It's useful for initializing nested collections.

## The Heart of the Contract: AI-Powered Resolution

This is where GenLayer's magic happens. The `resolve_round` method uses AI to evaluate guesses:

```python
@gl.public.write
def resolve_round(self, round_id: int) -> None:
    """Resolve a round using AI consensus to evaluate guesses."""
    rid = u256(round_id)

    if rid not in self.rounds:
        raise gl.vm.UserError("Round does not exist")

    game_round = self.rounds[rid]

    if game_round.resolved:
        raise gl.vm.UserError("Round has already been resolved")

    guesses = self.round_guesses.get_or_insert_default(rid)

    # Require minimum 2 guesses for meaningful gameplay
    if len(guesses) < 2:
        raise gl.vm.UserError("At least 2 guesses required to resolve")

    # Format guesses for the prompt
    formatted_guesses = ""
    for i, guess in enumerate(guesses):
        formatted_guesses += f"{i + 1}. Player {guess.player}: \"{guess.guess}\"\n"

    # Build the AI evaluation prompt
    prompt = f"""You are evaluating guesses for a movie emoji game.

Movie Title: {game_round.movie_title}
Emoji Description: {game_round.emoji_description}
Category: {game_round.category}

Guesses to evaluate:
{formatted_guesses}

For each guess, determine:
1. Accuracy: "exact" (correct movie), "close" (minor typo/alternate title), "partial" (sequel confusion or related movie), "wrong"
2. Brief reasoning (1 sentence)

Also rate the emoji description (1-10):
- Accuracy: How well do emojis represent the movie?
- Creativity: Clever/unexpected choices?
- Difficulty: Appropriate challenge level?

Return ONLY valid JSON with this exact structure:
{{
  "guesses": [
    {{"player_index": 0, "accuracy": "exact|close|partial|wrong", "reason": "..."}},
    ...
  ],
  "emoji_rating": {{
    "accuracy": 8,
    "creativity": 7,
    "difficulty": 6,
    "overall": 7
  }}
}}
"""

    # Execute with non-comparative equivalence principle
    result = gl.eq_principle.prompt_non_comparative(
        lambda: gl.nondet.exec_prompt(prompt),
        task="Evaluate movie guesses and emoji description quality",
        criteria="Return valid JSON. Accuracy: exact, close, partial, or wrong."
    )

    # Parse and process results
    evaluation = json.loads(result)
    # ... distribute XP based on evaluation
```

### Understanding `prompt_non_comparative`

This is the most important GenLayer primitive to understand. Let's break it down:

```python
result = gl.eq_principle.prompt_non_comparative(
    lambda: gl.nondet.exec_prompt(prompt),  # The non-deterministic operation
    task="...",                              # What we're trying to accomplish
    criteria="..."                           # How to judge equivalence
)
```

**How it works:**

1. **Leader execution**: The leader validator executes `gl.nondet.exec_prompt(prompt)`, which calls an LLM and gets a response.

2. **Validator execution**: Other validators independently execute the same prompt. They'll likely get *different* responses (LLMs are non-deterministic).

3. **Equivalence check**: Validators use the `task` and `criteria` to determine if their response is *equivalent* to the leader's. For our game:
   - If both say a guess is "exact," they're equivalent
   - If one says "exact" and one says "close," that might fail consensus
   - If both identify the same guesses as correct (even with different reasoning), consensus passes

4. **Result**: If enough validators agree, the leader's result is accepted. If not, the transaction fails.

**Why `non_comparative`?**

GenLayer offers two equivalence modes:

- **`prompt_comparative`**: Validators compare their result directly to the leader's and decide if they're equivalent. Good for simple yes/no questions.

- **`prompt_non_comparative`**: Each validator produces an independent result, then the system checks for equivalence. Better for complex structured outputs like our JSON.

For movie guess evaluation, `non_comparative` works better because we want validators to independently judge each guess, not just rubber-stamp the leader's opinion.

### Prompt Engineering for Consensus

Getting multiple AI instances to agree was the hardest part of this project. Early versions had issues:

**Problem 1: Inconsistent JSON structure**

Early prompts sometimes returned:
```json
{"guesses": [{"player": "0x123", "result": "correct"}]}
```
And sometimes:
```json
{"evaluations": [{"address": "0x123", "accuracy": "exact"}]}
```

**Solution**: Be extremely explicit about the expected structure. Include an example in the prompt.

**Problem 2: Validators disagreeing on edge cases**

Is "Spiderman" close to "Spider-Man"? One validator might say "exact," another "close."

**Solution**: Define clear criteria in the prompt:
- "exact" = correct movie title (minor capitalization/punctuation differences OK)
- "close" = typo or well-known alternate title
- "partial" = wrong movie in the same franchise
- "wrong" = incorrect guess

**Problem 3: Non-deterministic validation logic**

My first version tried to validate emojis using Python's Unicode detection:

```python
# BAD: Can produce different results across validators
import unicodedata
def is_emoji(char):
    return unicodedata.category(char) in ['So', 'Sm', ...]
```

Different Python versions or system configurations might categorize Unicode differently, causing consensus failures.

**Solution**: Keep validation simple and deterministic:

```python
# GOOD: Simple, deterministic check
def _validate_emoji_description(self, text: str) -> bool:
    if len(text) < 1 or len(text) > 50:
        return False
    return True
```

**The principle**: Use AI only where you need judgment. Everything else should be deterministic.

### Processing AI Results

After the AI evaluates guesses, we distribute XP:

```python
# Track first correct guesser for bonus
first_correct_found = False
describer_bonus = u256(3)  # Default: nobody guessed correctly

guess_results = evaluation.get("guesses", [])
for guess_result in guess_results:
    player_index = guess_result.get("player_index", 0)
    accuracy = guess_result.get("accuracy", "wrong")

    if player_index < 0 or player_index >= len(guesses):
        continue

    guess = guesses[player_index]
    player = self._get_or_create_player(guess.player)

    # Assign XP based on accuracy
    xp_earned = u256(0)
    if accuracy == "exact":
        if not first_correct_found:
            xp_earned = u256(15)  # First correct gets bonus
            first_correct_found = True
            describer_bonus = u256(12)
        else:
            xp_earned = u256(10)
        player.correct_guesses = player.correct_guesses + u256(1)
    elif accuracy == "close":
        xp_earned = u256(5)
        if not first_correct_found:
            first_correct_found = True
            describer_bonus = u256(12)
        player.correct_guesses = player.correct_guesses + u256(1)
    elif accuracy == "partial":
        xp_earned = u256(3)
    else:  # wrong
        xp_earned = u256(3)  # Participation XP

    guess.score = xp_earned
    player.xp = player.xp + xp_earned
    self.players[guess.player] = player

# Award describer XP
describer = self._get_or_create_player(game_round.creator)
describer.xp = describer.xp + describer_bonus

# Creativity bonus for great emoji descriptions
emoji_rating = evaluation.get("emoji_rating", {})
if emoji_rating.get("creativity", 5) >= 8:
    describer.xp = describer.xp + u256(5)

self.players[game_round.creator] = describer

# Mark round as resolved
game_round.resolved = True
self.rounds[rid] = game_round
```

**XP Distribution Summary:**

| Role | Condition | XP |
|------|-----------|-----|
| Guesser | First correct | +15 |
| Guesser | Correct (not first) | +10 |
| Guesser | Close guess | +5 |
| Guesser | Participated | +3 |
| Describer | Someone guessed correctly | +12 |
| Describer | High creativity rating | +5 bonus |
| Describer | Nobody guessed | +3 only |

### Read Methods

View methods don't modify state and don't require transactions:

```python
@gl.public.view
def get_round(self, round_id: int) -> RoundResult:
    """Get round details. Hides movie_title if not resolved."""
    rid = u256(round_id)

    if rid not in self.rounds:
        raise gl.vm.UserError("Round does not exist")

    game_round = self.rounds[rid]

    # IMPORTANT: Hide the answer until the round is resolved
    movie_title = game_round.movie_title if game_round.resolved else ""

    return RoundResult(
        round_id=game_round.round_id,
        movie_title=movie_title,  # Empty string if not resolved
        emoji_description=game_round.emoji_description,
        category=game_round.category,
        creator=game_round.creator,
        created_at=game_round.created_at,
        deadline=game_round.deadline,
        duration_minutes=game_round.duration_minutes,
        resolved=game_round.resolved
    )


@gl.public.view
def get_active_rounds(self) -> list[RoundResult]:
    """Get all unresolved rounds."""
    active_rounds: list[RoundResult] = []

    for round_id in self.rounds:
        game_round = self.rounds[round_id]
        if not game_round.resolved:
            active_rounds.append(RoundResult(
                round_id=game_round.round_id,
                movie_title="",  # Always hidden for active rounds
                emoji_description=game_round.emoji_description,
                category=game_round.category,
                creator=game_round.creator,
                created_at=game_round.created_at,
                deadline=game_round.deadline,
                duration_minutes=game_round.duration_minutes,
                resolved=False
            ))

    return active_rounds


@gl.public.view
def get_leaderboard(self, limit: int) -> list[Player]:
    """Get top players by XP."""
    all_players: list[Player] = []

    for address in self.players:
        all_players.append(self.players[address])

    # Sort by XP descending (bubble sort for simplicity)
    for i in range(len(all_players)):
        for j in range(i + 1, len(all_players)):
            if all_players[j].xp > all_players[i].xp:
                all_players[i], all_players[j] = all_players[j], all_players[i]

    # Return top 'limit' players
    return all_players[:limit] if limit < len(all_players) else all_players
```

**Note on sorting**: On-chain sorting is expensive. For a production contract with many players, you'd want to maintain a sorted structure or limit leaderboard queries.

## Deploying to StudioNet

GenLayer provides **StudioNet**, a hosted testnet for development. No local node setup required.

### Deployment Steps

1. **Go to [studio.genlayer.com](https://studio.genlayer.com)**

2. **Connect your wallet** (MetaMask or similar)

3. **Upload your contract** (`emoji_cinema.py`)

4. **Deploy** — The Studio will compile and deploy your contract

5. **Copy the contract address** — You'll need this for your frontend

### Network Configuration

```typescript
// Frontend config
export const GENLAYER_CONFIG = {
  chainId: 61999,  // 0xF22F
  rpcUrl: 'https://studio.genlayer.com/api',
  consensusContract: '0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575'
};
```

### Testing in Studio

The Studio provides an interactive UI for testing your contract:

1. Call `create_round` with test data
2. Switch accounts and call `submit_guess`
3. Call `resolve_round` and watch the AI evaluation happen
4. Check `get_round` to see results

**Important**: AI consensus takes 1-2 minutes. Design your UI to handle this delay gracefully.

## Frontend Integration with GenLayerJS

GenLayer provides a JavaScript SDK for frontend integration:

```typescript
import { createClient } from 'genlayer-js';

const client = createClient({
  endpoint: 'https://studio.genlayer.com/api',
  chainId: 61999
});

// Read contract state (no transaction needed)
const round = await client.readContract({
  address: CONTRACT_ADDRESS,
  method: 'get_round',
  args: [roundId]
});

// Write to contract (requires transaction)
const txHash = await client.writeContract({
  address: CONTRACT_ADDRESS,
  method: 'submit_guess',
  args: [roundId, guess]
});

// Wait for transaction confirmation
const receipt = await client.waitForTransaction(txHash);
```

**Handling BigInt**: GenLayer returns `u256` values as JavaScript `BigInt`. Convert when needed:

```typescript
const timestamp = typeof round.created_at === 'bigint'
  ? Number(round.created_at)
  : round.created_at;
```

## What Else Can You Build?

The pattern used in Emoji Cinema — AI consensus for subjective evaluation — enables many applications:

### Prediction Markets

```python
prompt = f"""
The prediction was: "{market.prediction}"
Resolution criteria: "{market.criteria}"
Current date: {current_date}

Based on available information, has this prediction resolved?
Return: {{"resolved": true/false, "outcome": "yes/no/invalid", "reasoning": "..."}}
"""
```

### Content Moderation

```python
prompt = f"""
Evaluate this content for community guidelines:
Content: "{post.content}"

Check for: hate speech, harassment, misinformation, spam
Return: {{"safe": true/false, "issues": [...], "confidence": 0.0-1.0}}
"""
```

### Reputation Systems

```python
prompt = f"""
Evaluate this contribution:
Type: {contribution.type}
Content: {contribution.content}
Context: {contribution.context}

Rate quality (1-10) and explain:
Return: {{"quality": 7, "reasoning": "...", "suggested_reward": 50}}
"""
```

### Dynamic NFT Traits

```python
prompt = f"""
Based on this NFT's history:
- Battles won: {nft.battles_won}
- Distance traveled: {nft.distance}
- Items collected: {nft.items}

Generate appropriate trait evolution:
Return: {{"new_trait": "...", "rarity": "common/rare/epic", "visual_description": "..."}}
"""
```

## Lessons Learned

Building Emoji Cinema taught me several things about GenLayer development:

1. **AI is a tool, not magic** — You still need careful prompt engineering and error handling. AI consensus doesn't solve sloppy design.

2. **Deterministic where possible** — Only use AI for truly subjective decisions. Everything else should be regular code.

3. **Design for consensus delays** — AI evaluation takes 1-2 minutes. Your UX must account for this. Show pending states, allow users to do other things while waiting.

4. **Test extensively in Studio** — The interactive environment is invaluable. Test edge cases before deploying.

5. **Keep prompts focused** — Complex prompts with many tasks are more likely to cause consensus failures. Break them into smaller, focused evaluations if needed.

## Conclusion

GenLayer opens up a new category of blockchain applications — ones that require judgment, not just computation. Emoji Cinema is a simple game, but the same patterns apply to serious applications: content moderation, dispute resolution, dynamic pricing, reputation systems, and more.

The barrier to entry is surprisingly low. If you know Python, you can write Intelligent Contracts. If you understand prompt engineering, you can design AI consensus logic.

**Resources:**

- Full source code: [github.com/emark-cloud/emoji-cinema](https://github.com/emark-cloud/emoji-cinema)
- GenLayer documentation: [docs.genlayer.com](https://docs.genlayer.com)
- StudioNet: [studio.genlayer.com](https://studio.genlayer.com)

Try building something. The technology is ready.

---

*Questions about GenLayer or Intelligent Contracts? Drop a comment below or find me on Twitter.*
