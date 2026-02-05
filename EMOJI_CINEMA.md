# Emoji Cinema - Game Design

A GenLayer mini-game where players describe movies using only emojis and others guess.

## Core Loop

```
┌─────────────────────────────────────────────────────────┐
│  1. CREATE    Host picks a movie, describes with emojis │
│               "The Matrix" → 💊🔴🔵🤖🕶️💻              │
├─────────────────────────────────────────────────────────┤
│  2. GUESS     Players submit their guesses (2-3 min)    │
│               "The Matrix", "Neo movie", "Matrix 1"     │
├─────────────────────────────────────────────────────────┤
│  3. RESOLVE   AI evaluates everything via consensus     │
│               - Are guesses correct? (fuzzy matching)   │
│               - How good was the emoji description?     │
├─────────────────────────────────────────────────────────┤
│  4. RESULTS   Points distributed, leaderboard updated   │
└─────────────────────────────────────────────────────────┘
```

## GenLayer Features Showcased

- **Optimistic Democracy** - Validators reach consensus on subjective guess accuracy
- **Equivalence Principle** - Multiple validators must agree on AI evaluation
- **LLM Integration** - AI judges guess correctness and emoji creativity
- **Fuzzy Matching** - AI understands "Lion King" = "The Lion King" = "König der Löwen"

## What AI Judges

### For Guessers
- Exact match → Full points
- Close enough ("Lion King" vs "The Lion King") → Full points
- Sequel/prequel confusion → Partial points
- Wrong but reasonable interpretation → Small points
- Completely wrong → Participation only

### For Describer
- **Clarity** - Did the emojis actually represent the movie?
- **Creativity** - Clever/unexpected emoji choices?
- **Goldilocks difficulty** - Not too easy, not impossible

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

## Contract Design

### Storage State

```python
@allow_storage
@dataclass
class Round:
    movie_title: str          # Hidden until resolution
    emoji_description: str    # Visible immediately
    creator: Address
    created_at: u256
    deadline: u256
    resolved: bool

@allow_storage
@dataclass
class Guess:
    player: Address
    guess: str
    timestamp: u256
```

### Core Methods

- `create_round(movie_title, emoji_description)` - Create a new round
- `submit_guess(round_id, guess)` - Submit a guess
- `resolve_round(round_id)` - Trigger AI-powered resolution
- `get_round(round_id)` - Get round details
- `get_leaderboard()` - Get XP leaderboard

### AI Resolution Prompt (Sketch)

```python
prompt = f"""
Movie: {movie_title}
Emoji Description: {emoji_description}
Guesses: {guesses}

Evaluate:
1. For each guess, rate accuracy (exact/close/partial/wrong)
2. Rate the emoji description (1-10) for:
   - Accuracy to movie plot/themes
   - Creativity of emoji choices
   - Appropriate difficulty

Return JSON with scores and brief reasoning.
"""
```

## Design Decisions

### MVP Decisions
1. **Emoji validation** - Frontend enforces emoji-only input
2. **Movie source** - Free-form text (any movie)
3. **Timing** - 3 minute guessing window
4. **Minimum players** - 2 guessers required to resolve
5. **Speed bonus** - First correct guesser gets +15, others get +10

### Open Questions
- Difficulty modes (popular vs obscure films)?
- Can describer participate in other active rounds?
- Emoji count limit (min/max)?
- Categories (Action, Comedy, Horror, etc.)?

## Frontend Structure

```
emoji-cinema/
├── emoji_cinema.py           # Intelligent Contract
├── app/
│   ├── page.tsx              # Home/Lobby
│   ├── create/page.tsx       # Create round flow
│   └── round/[id]/page.tsx   # Guessing view
├── components/
│   ├── EmojiPicker.tsx
│   ├── MovieInput.tsx
│   ├── GuessInput.tsx
│   ├── RoundCard.tsx
│   └── Leaderboard.tsx
├── hooks/
│   ├── useRound.ts
│   ├── useLeaderboard.ts
│   └── useCountdown.ts
└── lib/
    ├── genlayer.ts
    └── emojiValidator.ts
```

## Example Rounds

| Movie | Emoji Description | Difficulty |
|-------|-------------------|------------|
| The Matrix | 💊🔴🔵🤖🕶️💻 | Easy |
| Jaws | 🦈🏊‍♂️🩸🚤 | Easy |
| Inception | 💭🌀🛏️🎯🔫 | Medium |
| The Shining | 🏨❄️🪓👨‍👩‍👦😱 | Medium |
| 2001: A Space Odyssey | 🐒🦴🚀🖥️👁️⭐ | Hard |
| Eternal Sunshine | 🧠💔🧹☀️💑 | Hard |
