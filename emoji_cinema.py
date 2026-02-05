# { "Depends": "py-genlayer:test" }
from genlayer import *
from dataclasses import dataclass
import json


@allow_storage
@dataclass
class Round:
    """Represents a single game round."""
    round_id: u256
    movie_title: str
    emoji_description: str
    category: str
    creator: Address
    created_at: u256
    deadline: u256
    duration_minutes: u256
    resolved: bool


@allow_storage
@dataclass
class Guess:
    """Represents a player's guess for a round."""
    player: Address
    guess: str
    timestamp: u256
    score: u256


@allow_storage
@dataclass
class Player:
    """Represents a player's statistics."""
    address: Address
    xp: u256
    rounds_created: u256
    rounds_guessed: u256
    correct_guesses: u256


@allow_storage
@dataclass
class RoundResult:
    """Result returned from get_round, hides movie_title if not resolved."""
    round_id: u256
    movie_title: str  # Empty string if not resolved
    emoji_description: str
    category: str
    creator: Address
    created_at: u256
    deadline: u256
    duration_minutes: u256
    resolved: bool


class Contract(gl.Contract):
    """Emoji Cinema game contract."""

    rounds: TreeMap[u256, Round]
    round_guesses: TreeMap[u256, DynArray[Guess]]
    players: TreeMap[Address, Player]
    round_counter: u256
    valid_categories: DynArray[str]

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

    def _get_or_create_player(self, address: Address) -> Player:
        """Get existing player or create new one."""
        if address in self.players:
            return self.players[address]

        player = Player(
            address=address,
            xp=u256(0),
            rounds_created=u256(0),
            rounds_guessed=u256(0),
            correct_guesses=u256(0)
        )
        self.players[address] = player
        return player

    def _validate_emoji_description(self, text: str) -> bool:
        """Validate emoji description - just check it's not empty and not too long."""
        # Simple deterministic check - avoid complex Unicode emoji detection
        # which can produce different results across validators
        if len(text) < 1:
            return False
        if len(text) > 50:  # Reasonable max length for 8 emojis
            return False
        return True

    def _is_valid_category(self, category: str) -> bool:
        """Check if category is valid."""
        for valid_cat in self.valid_categories:
            if valid_cat == category:
                return True
        return False

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
        """
        Create a new game round.

        Args:
            round_id: The ID for this round (choose your own)
            movie_title: The actual movie title (hidden until resolution)
            emoji_description: 3-8 emojis describing the movie
            category: One of the valid categories
            duration_minutes: Time window (2, 3, or 5 minutes)
            created_at: Unix timestamp when round was created
            deadline: Unix timestamp when guessing ends
        """
        rid = u256(round_id)

        # Check if round ID already exists
        if rid in self.rounds:
            raise gl.vm.UserError("Round ID already exists")

        # Validate emoji description (simple check to ensure deterministic consensus)
        if not self._validate_emoji_description(emoji_description):
            raise gl.vm.UserError("Emoji description must be 1-50 characters")

        # Validate category
        if not self._is_valid_category(category):
            raise gl.vm.UserError(f"Invalid category: {category}")

        # Validate duration
        if duration_minutes != 2 and duration_minutes != 3 and duration_minutes != 5:
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

    @gl.public.write
    def submit_guess(self, round_id: int, guess: str) -> None:
        """
        Submit a guess for a round.

        Args:
            round_id: The round to guess on
            guess: The player's guess for the movie title
        """
        rid = u256(round_id)

        # Validate round exists
        if rid not in self.rounds:
            raise gl.vm.UserError("Round does not exist")

        game_round = self.rounds[rid]

        # Validate round not resolved
        if game_round.resolved:
            raise gl.vm.UserError("Round has already been resolved")

        # Deadline check disabled for testing
        # current_time = u256(0)
        # if current_time > game_round.deadline:
        #     raise gl.vm.UserError("Round deadline has passed")

        sender: Address = gl.message.sender_address

        # Validate caller is not the round creator
        if sender == game_round.creator:
            raise gl.vm.UserError("Round creator cannot guess in their own round")

        # Check if player already guessed
        guesses = self.round_guesses.get_or_insert_default(rid)
        for existing_guess in guesses:
            if existing_guess.player == sender:
                raise gl.vm.UserError("You have already submitted a guess for this round")

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

    @gl.public.write
    def resolve_round(self, round_id: int) -> None:
        """
        Resolve a round using AI consensus to evaluate guesses.

        Args:
            round_id: The round to resolve
        """
        rid = u256(round_id)

        # Validate round exists
        if rid not in self.rounds:
            raise gl.vm.UserError("Round does not exist")

        game_round = self.rounds[rid]

        # Validate round not already resolved
        if game_round.resolved:
            raise gl.vm.UserError("Round has already been resolved")

        # Validate deadline has passed (disabled for testing)
        # current_time = u256(gl.message.timestamp)
        # if current_time <= game_round.deadline:
        #     raise gl.vm.UserError("Round deadline has not passed yet")

        # Get guesses
        guesses = self.round_guesses.get_or_insert_default(rid)

        # Validate at least 2 guesses
        if len(guesses) < 2:
            raise gl.vm.UserError("At least 2 guesses are required to resolve a round")

        # Build formatted guesses for the prompt
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

        # Use non-comparative equivalence principle for subjective evaluation
        # The lambda executes the LLM prompt via gl.nondet.exec_prompt
        result = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(prompt),
            task="Evaluate movie guesses and emoji description quality for a movie guessing game",
            criteria="Return valid JSON matching the specified format. Accuracy levels: exact (correct movie title), close (minor typo or alternate title), partial (sequel/prequel confusion or closely related movie), wrong (incorrect guess)."
        )

        # Parse the result
        try:
            evaluation = json.loads(result)
        except json.JSONDecodeError:
            raise gl.vm.UserError("Failed to parse AI evaluation result")

        # Track first correct guesser
        first_correct_found = False
        describer_bonus = u256(3)  # Default: nobody guessed correctly

        # Process each guess result
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
                    xp_earned = u256(15)  # First correct
                    first_correct_found = True
                    describer_bonus = u256(12)  # Someone guessed correctly
                else:
                    xp_earned = u256(10)  # Subsequent correct
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

            # Update guess score and player XP
            guess.score = xp_earned
            player.xp = player.xp + xp_earned
            self.players[guess.player] = player

        # Award describer XP
        describer = self._get_or_create_player(game_round.creator)
        describer.xp = describer.xp + describer_bonus

        # Check for creativity bonus
        emoji_rating = evaluation.get("emoji_rating", {})
        creativity = emoji_rating.get("creativity", 5)
        if creativity >= 8:
            describer.xp = describer.xp + u256(5)  # Creativity bonus

        self.players[game_round.creator] = describer

        # Mark round as resolved
        game_round.resolved = True
        self.rounds[rid] = game_round

    @gl.public.view
    def get_round(self, round_id: int) -> RoundResult:
        """
        Get round details. Hides movie_title if round is not resolved.

        Args:
            round_id: The round to retrieve

        Returns:
            RoundResult with round details
        """
        rid = u256(round_id)

        if rid not in self.rounds:
            raise gl.vm.UserError("Round does not exist")

        game_round: Round = self.rounds[rid]

        # Hide movie title if not resolved
        movie_title: str = game_round.movie_title if game_round.resolved else ""

        # Extract typed values
        r_id: u256 = game_round.round_id
        r_emoji: str = game_round.emoji_description
        r_category: str = game_round.category
        r_creator: Address = game_round.creator
        r_created: u256 = game_round.created_at
        r_deadline: u256 = game_round.deadline
        r_duration: u256 = game_round.duration_minutes
        r_resolved: bool = game_round.resolved

        return RoundResult(
            round_id=r_id,
            movie_title=movie_title,
            emoji_description=r_emoji,
            category=r_category,
            creator=r_creator,
            created_at=r_created,
            deadline=r_deadline,
            duration_minutes=r_duration,
            resolved=r_resolved
        )

    @gl.public.view
    def get_round_guesses(self, round_id: int) -> list[Guess]:
        """
        Get all guesses for a round.

        Args:
            round_id: The round to get guesses for

        Returns:
            List of guesses
        """
        rid = u256(round_id)

        if rid not in self.rounds:
            raise gl.vm.UserError("Round does not exist")

        # Use 'in' check to avoid write operation in view function
        if rid not in self.round_guesses:
            return []

        return list(self.round_guesses[rid])

    @gl.public.view
    def get_active_rounds(self) -> list[RoundResult]:
        """
        Get all unresolved rounds.

        Returns:
            List of active rounds (movie titles hidden)
        """
        active_rounds: list[RoundResult] = []

        for round_id in self.rounds:
            game_round: Round = self.rounds[round_id]
            if not game_round.resolved:
                # Extract typed values
                r_id: u256 = game_round.round_id
                r_emoji: str = game_round.emoji_description
                r_category: str = game_round.category
                r_creator: Address = game_round.creator
                r_created: u256 = game_round.created_at
                r_deadline: u256 = game_round.deadline
                r_duration: u256 = game_round.duration_minutes
                r_resolved: bool = game_round.resolved

                active_rounds.append(RoundResult(
                    round_id=r_id,
                    movie_title="",  # Always hidden for active rounds
                    emoji_description=r_emoji,
                    category=r_category,
                    creator=r_creator,
                    created_at=r_created,
                    deadline=r_deadline,
                    duration_minutes=r_duration,
                    resolved=r_resolved
                ))

        return active_rounds

    @gl.public.view
    def get_leaderboard(self, limit: int) -> list[Player]:
        """
        Get top players by XP.

        Args:
            limit: Maximum number of players to return

        Returns:
            List of players sorted by XP descending
        """
        all_players: list[Player] = []

        for address in self.players:
            all_players.append(self.players[address])

        # Sort by XP descending (simple bubble sort for on-chain)
        for i in range(len(all_players)):
            for j in range(i + 1, len(all_players)):
                if all_players[j].xp > all_players[i].xp:
                    all_players[i], all_players[j] = all_players[j], all_players[i]

        # Return top 'limit' players
        result: list[Player] = []
        count = 0
        for player in all_players:
            if count >= limit:
                break
            result.append(player)
            count = count + 1

        return result

    @gl.public.view
    def get_player_stats(self, address: Address) -> Player:
        """
        Get statistics for a specific player.

        Args:
            address: The player's address

        Returns:
            Player statistics
        """
        if address not in self.players:
            # Return empty stats for new player
            return Player(
                address=address,
                xp=u256(0),
                rounds_created=u256(0),
                rounds_guessed=u256(0),
                correct_guesses=u256(0)
            )

        return self.players[address]

    @gl.public.view
    def get_categories(self) -> list[str]:
        """
        Get the list of valid categories.

        Returns:
            List of category names
        """
        return list(self.valid_categories)

    @gl.public.view
    def get_round_count(self) -> int:
        """
        Get the current round counter.
        Call this BEFORE create_round to know what ID will be assigned.

        Returns:
            The next round ID that will be created
        """
        return int(self.round_counter)

    @gl.public.view
    def get_last_round_id(self) -> int:
        """
        Get the most recently created round ID.

        Returns:
            Last round ID, or -1 if no rounds exist
        """
        if self.round_counter == u256(0):
            return -1
        return int(self.round_counter) - 1

    @gl.public.write
    def clear_all_rounds(self) -> None:
        """
        Clear all rounds by marking them as resolved.
        Useful for testing/resetting the game state.
        """
        for round_id in self.rounds:
            game_round = self.rounds[round_id]
            game_round.resolved = True
            self.rounds[round_id] = game_round
