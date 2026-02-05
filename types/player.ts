// Player types matching the contract

export interface Player {
  address: string;
  xp: number;
  rounds_created: number;
  rounds_guessed: number;
  correct_guesses: number;
}

// Leaderboard entry with rank
export interface LeaderboardEntry extends Player {
  rank: number;
}
