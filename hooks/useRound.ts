"use client";

import { useState, useEffect, useCallback } from "react";
import { readContract, bigintToNumber, toAddressString } from "@/lib/genlayer";
import { POLL_INTERVAL } from "@/lib/config";
import { getErrorMessage } from "@/lib/errors";
import type { Round, Guess, RoundWithGuesses } from "@/types/round";

interface UseRoundResult {
  round: RoundWithGuesses | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Convert raw contract data to typed Round
function parseRound(data: Record<string, unknown>): Round {
  return {
    round_id: bigintToNumber(data.round_id),
    movie_title: String(data.movie_title || ""),
    emoji_description: String(data.emoji_description || ""),
    category: String(data.category || ""),
    creator: toAddressString(data.creator),
    created_at: bigintToNumber(data.created_at),
    deadline: bigintToNumber(data.deadline),
    duration_minutes: bigintToNumber(data.duration_minutes),
    resolved: Boolean(data.resolved),
  };
}

// Convert raw contract data to typed Guess
function parseGuess(data: Record<string, unknown>): Guess {
  return {
    player: toAddressString(data.player),
    guess: String(data.guess || ""),
    timestamp: bigintToNumber(data.timestamp),
    score: bigintToNumber(data.score),
  };
}

export function useRound(roundId: number | null): UseRoundResult {
  const [round, setRound] = useState<RoundWithGuesses | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRound = useCallback(async () => {
    if (roundId === null) {
      setRound(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch round and guesses in parallel
      const [roundData, guessesData] = await Promise.all([
        readContract<Record<string, unknown>>("get_round", [roundId]),
        readContract<Record<string, unknown>[]>("get_round_guesses", [roundId]),
      ]);

      const parsedRound = parseRound(roundData);
      const parsedGuesses = Array.isArray(guessesData)
        ? guessesData.map(parseGuess)
        : [];

      setRound({
        ...parsedRound,
        guesses: parsedGuesses,
      });
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [roundId]);

  // Initial fetch
  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  // Poll for updates on active rounds
  useEffect(() => {
    if (roundId === null || round?.resolved) return;

    const interval = setInterval(fetchRound, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [roundId, round?.resolved, fetchRound]);

  return { round, isLoading, error, refetch: fetchRound };
}
