"use client";

import { useState, useEffect, useCallback } from "react";
import { readContract, bigintToNumber, toAddressString } from "@/lib/genlayer";
import { POLL_INTERVAL } from "@/lib/config";
import type { Round } from "@/types/round";

interface UseActiveRoundsResult {
  rounds: Round[];
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

export function useActiveRounds(): UseActiveRoundsResult {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    try {
      const data = await readContract<Record<string, unknown>[]>(
        "get_active_rounds",
        []
      );

      const parsedRounds = Array.isArray(data) ? data.map(parseRound) : [];

      // Sort by deadline (most recent first)
      parsedRounds.sort((a, b) => b.deadline - a.deadline);

      setRounds(parsedRounds);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch rounds");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(fetchRounds, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRounds]);

  return { rounds, isLoading, error, refetch: fetchRounds };
}
