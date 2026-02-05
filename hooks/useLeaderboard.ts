"use client";

import { useState, useEffect, useCallback } from "react";
import { readContract, bigintToNumber, toAddressString } from "@/lib/genlayer";
import { POLL_INTERVAL } from "@/lib/config";
import type { Player, LeaderboardEntry } from "@/types/player";

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Convert raw contract data to typed Player
function parsePlayer(data: Record<string, unknown>, index: number): Player {
  const address = toAddressString(data.address);
  return {
    // Use index as fallback to ensure uniqueness
    address: address || `unknown-${index}`,
    xp: bigintToNumber(data.xp),
    rounds_created: bigintToNumber(data.rounds_created),
    rounds_guessed: bigintToNumber(data.rounds_guessed),
    correct_guesses: bigintToNumber(data.correct_guesses),
  };
}

export function useLeaderboard(limit = 20): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await readContract<Record<string, unknown>[]>(
        "get_leaderboard",
        [limit]
      );

      const parsedPlayers = Array.isArray(data) ? data.map((p, i) => parsePlayer(p, i)) : [];

      // Add rank to each player
      const rankedPlayers: LeaderboardEntry[] = parsedPlayers.map(
        (player, index) => ({
          ...player,
          rank: index + 1,
        })
      );

      setEntries(rankedPlayers);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch leaderboard"
      );
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Poll for updates (less frequently for leaderboard)
  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, POLL_INTERVAL * 2);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  return { entries, isLoading, error, refetch: fetchLeaderboard };
}
