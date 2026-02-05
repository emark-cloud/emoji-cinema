"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { RoundCard } from "@/components/RoundCard";
import { Leaderboard } from "@/components/Leaderboard";
import { useActiveRounds } from "@/hooks/useActiveRounds";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useWallet } from "@/hooks/useWallet";
import { writeContract } from "@/lib/transactions";

export default function HomePage() {
  const { rounds, isLoading: roundsLoading, error: roundsError, refetch } = useActiveRounds();
  const { entries, isLoading: leaderboardLoading } = useLeaderboard(5);
  const { address, isConnected, isCorrectNetwork } = useWallet();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearRounds = async () => {
    if (!address || !isConnected) return;

    const confirmed = window.confirm("Are you sure you want to clear all rounds? This will mark them as resolved.");
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await writeContract(
        address as `0x${string}`,
        "clear_all_rounds",
        [],
        undefined
      );
      // Refetch rounds after clearing
      setTimeout(() => refetch(), 2000);
    } catch (error) {
      console.error("Failed to clear rounds:", error);
      alert("Failed to clear rounds: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Connect Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Active Rounds</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Guess the movie from emojis or create your own!
          </p>
        </div>
        <ConnectWallet />
      </div>

      {/* Create Round Button */}
      {isConnected && isCorrectNetwork && (
        <div className="flex gap-3">
          <Link
            href="/create"
            className="flex-1 py-4 text-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            + Create New Round
          </Link>
          {rounds.length > 0 && (
            <button
              onClick={handleClearRounds}
              disabled={isClearing}
              className="px-4 py-4 text-center bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              title="Clear all rounds (for testing)"
            >
              {isClearing ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>
      )}

      {/* Active Rounds */}
      <section>
        {roundsLoading ? (
          <div className="text-center py-12 text-gray-500">
            Loading rounds...
          </div>
        ) : roundsError ? (
          <div className="text-center py-12 text-red-500">
            Error: {roundsError}
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold mb-2">No active rounds</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Be the first to create a round!
            </p>
            {isConnected && isCorrectNetwork && (
              <Link
                href="/create"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Round
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rounds.map((round) => (
              <RoundCard key={round.round_id} round={round} />
            ))}
          </div>
        )}
      </section>

      {/* Mini Leaderboard */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Top Players</h2>
          <Link
            href="/leaderboard"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            View all
          </Link>
        </div>
        {leaderboardLoading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : (
          <Leaderboard entries={entries} currentAddress={address} compact />
        )}
      </section>

      {/* How to Play */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-4">How to Play</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">As a Describer</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Pick a movie you love</li>
              <li>Describe it using 3-8 emojis</li>
              <li>Choose a category and time limit</li>
              <li>Earn XP when others guess correctly!</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-2">As a Guesser</h3>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Look at the emoji description</li>
              <li>Submit your movie guess</li>
              <li>Wait for AI evaluation</li>
              <li>Earn XP for correct guesses!</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
