# Emoji Cinema - Development Guide

## Project Overview

A GenLayer mini-game where players describe movies using only emojis and others guess. The game showcases GenLayer's AI consensus capabilities through fuzzy matching and subjective evaluation.

## Target Network

- **StudioNet** (GenLayer's hosted testnet)
- Chain ID: 61999 (0xF22F)
- RPC URL: https://studio.genlayer.com/api
- Consensus Contract: `0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575`

## Game Rules

### Core Loop
1. **CREATE** - Host picks a movie, describes it with 3-8 emojis
2. **GUESS** - Players submit guesses within the configurable time window
3. **RESOLVE** - AI evaluates guesses via consensus
4. **RESULTS** - XP distributed, leaderboard updated

### Categories
- Action
- Comedy
- Drama
- Horror
- Sci-Fi
- Romance
- Animation
- Thriller

### Timing Options
Describer chooses when creating a round:
- 2 minutes
- 3 minutes
- 5 minutes

### Emoji Constraints
- Minimum: 3 emojis
- Maximum: 8 emojis
- Validation: Frontend enforces emoji-only input

### Participation Rules
- Describers CAN participate as guessers in other active rounds
- Describers CANNOT guess in their own rounds
- Minimum 2 guessers required to resolve a round

### Difficulty
- No upfront selection by describer
- AI evaluates difficulty during resolution
- Affects creativity bonus scoring

## XP Distribution

| Role | Condition | XP |
|------|-----------|-----|
| Guesser | Correct (1st) | +15 |
| Guesser | Correct (2nd+) | +10 |
| Guesser | Close guess | +5 |
| Guesser | Participated | +3 |
| Describer | Someone guessed correctly | +12 |
| Describer | Great emoji creativity | +5 bonus |
| Describer | Nobody guessed (too hard) | +3 only |

## Contract Architecture

### Storage Types (GenLayer-specific)
```python
# Use these types - NO floats allowed
TreeMap[K, V]  # Key-value storage
DynArray[T]    # Growing list
u256           # Unsigned integers (timestamps, amounts, IDs)
Address        # Wallet addresses
str, bool      # Primitives
```

### Data Structures
```python
@allow_storage
@dataclass
class Round:
    round_id: u256
    movie_title: str           # Hidden until resolution
    emoji_description: str     # Visible immediately
    category: str              # One of the 8 categories
    creator: Address
    created_at: u256
    deadline: u256             # created_at + duration
    duration_minutes: u256     # 2, 3, or 5
    resolved: bool

@allow_storage
@dataclass
class Guess:
    player: Address
    guess: str
    timestamp: u256
    score: u256                # Set during resolution

@allow_storage
@dataclass
class Player:
    address: Address
    xp: u256
    rounds_created: u256
    rounds_guessed: u256
    correct_guesses: u256
```

### Core Methods
- `create_round(movie_title, emoji_description, category, duration_minutes)` - Create new round
- `submit_guess(round_id, guess)` - Submit a guess
- `resolve_round(round_id)` - Trigger AI-powered resolution (uses `gl.eq_principle.prompt_non_comparative`)
- `get_round(round_id)` - Get round details (hides movie_title if not resolved)
- `get_active_rounds()` - List all unresolved rounds
- `get_leaderboard(limit)` - Get top players by XP
- `get_player_stats(address)` - Get player statistics

### AI Evaluation (Equivalence Principle)
The resolution uses `gl.eq_principle.prompt_non_comparative` because:
- Subjective evaluation (creativity, difficulty)
- Fuzzy matching needed (handles typos, alternate titles)
- Multiple validators must independently agree

## Frontend Architecture

### Tech Stack
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- genlayer-js SDK

### Project Structure
```
emoji-cinema/
├── emoji_cinema.py              # Intelligent Contract
├── app/
│   ├── page.tsx                 # Home/Lobby - active rounds list
│   ├── create/page.tsx          # Create round flow
│   ├── round/[id]/page.tsx      # Guessing view + results
│   └── leaderboard/page.tsx     # Full leaderboard
├── components/
│   ├── EmojiPicker.tsx          # Emoji input with validation
│   ├── MovieInput.tsx           # Movie title input
│   ├── CategorySelect.tsx       # Category dropdown
│   ├── DurationSelect.tsx       # Time window selector
│   ├── GuessInput.tsx           # Guess submission
│   ├── RoundCard.tsx            # Round preview card
│   ├── Countdown.tsx            # Time remaining display
│   ├── Leaderboard.tsx          # XP rankings
│   ├── ConnectWallet.tsx        # MetaMask connection
│   └── TransactionStatus.tsx    # Pending/confirmed states
├── hooks/
│   ├── useRound.ts              # Round state polling
│   ├── useActiveRounds.ts       # Active rounds list
│   ├── useLeaderboard.ts        # Leaderboard data
│   ├── useCountdown.ts          # Timer logic
│   └── useWallet.ts             # Wallet connection
├── lib/
│   ├── genlayer.ts              # GenLayer client setup
│   ├── transactions.ts          # Write transaction helpers
│   ├── config.ts                # Contract address, network config
│   ├── emojiValidator.ts        # Validate emoji-only input
│   └── errors.ts                # Error message mapping
└── types/
    ├── round.ts                 # Round, Guess types
    ├── player.ts                # Player stats types
    └── global.d.ts              # Window.ethereum
```

## Key Implementation Notes

### GenLayer-Specific Patterns

1. **No floats** - Use `u256` for all numbers
2. **Custom dataclasses need `@allow_storage`**
3. **Errors use `raise UserError("message")`**
4. **LLM calls wrapped in equivalence principles**
5. **Transactions go through consensus contract, not directly to your contract**
6. **1-2 minute consensus delays - design UI accordingly**

### BigInt Handling (Frontend)
```typescript
// GenLayer returns bigint for u256 - convert when needed
const timestamp = typeof data.created_at === 'bigint'
  ? Number(data.created_at)
  : data.created_at;
```

### Map Conversion (Frontend)
```typescript
// GenLayer SDK returns Map objects - convert to plain objects
function mapToObject(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    value.forEach((v, k) => { obj[k] = mapToObject(v); });
    return obj;
  }
  return value;
}
```

### Transaction Flow
```
Submit Tx → Wait Receipt → Poll Contract State → Verify Change → Update UI
```

## AI Prompt Template (for resolution)

```python
prompt = f"""
You are evaluating guesses for a movie emoji game.

Movie Title: {movie_title}
Emoji Description: {emoji_description}
Category: {category}

Guesses to evaluate:
{formatted_guesses}

For each guess, determine:
1. Accuracy: "exact" (correct movie), "close" (minor typo/alternate title), "partial" (sequel confusion), "wrong"
2. Brief reasoning (1 sentence)

Also rate the emoji description (1-10):
- Accuracy: How well do emojis represent the movie?
- Creativity: Clever/unexpected choices?
- Difficulty: Appropriate challenge level?

Return JSON:
{{
  "guesses": [
    {{"player": "0x...", "accuracy": "exact|close|partial|wrong", "reason": "..."}},
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
```

## Development Commands

```bash
# Frontend setup
npx create-next-app@latest emoji-cinema --typescript --tailwind
cd emoji-cinema
npm install genlayer-js ethers viem

# Deploy contract via GenLayer Studio
# 1. Go to https://studio.genlayer.com
# 2. Upload emoji_cinema.py
# 3. Deploy and copy contract address
# 4. Update lib/config.ts with address
```

## Testing Strategy

1. **Contract Testing**: Use GenLayer Studio for interactive testing
2. **Frontend Testing**:
   - Test with StudioNet
   - Create rounds with known movies
   - Submit guesses and verify AI evaluation
   - Check XP distribution accuracy
