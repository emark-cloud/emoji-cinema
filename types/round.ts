// Round and Guess types matching the contract

export interface Round {
  round_id: number;
  movie_title: string; // Empty string if not resolved
  emoji_description: string;
  category: string;
  creator: string;
  created_at: number;
  deadline: number;
  duration_minutes: number;
  resolved: boolean;
}

export interface Guess {
  player: string;
  guess: string;
  timestamp: number;
  score: number;
}

export interface RoundWithGuesses extends Round {
  guesses: Guess[];
}

// Categories
export const CATEGORIES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Romance",
  "Animation",
  "Thriller",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Duration options
export const DURATIONS = [2, 3, 5] as const;
export type Duration = (typeof DURATIONS)[number];

// Round status helper
export type RoundStatus = "active" | "guessing_ended" | "resolved";

export function getRoundStatus(round: Round): RoundStatus {
  if (round.resolved) {
    return "resolved";
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > round.deadline) {
    return "guessing_ended";
  }

  return "active";
}
