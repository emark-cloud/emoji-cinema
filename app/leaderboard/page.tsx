"use client";

import Link from "next/link";
import { Leaderboard } from "@/components/Leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useWallet } from "@/hooks/useWallet";

export default function LeaderboardPage() {
  const { entries, isLoading, error } = useLeaderboard(50);
  const { address } = useWallet();

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
      >
        ← Back to rounds
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">Error: {error}</div>
        ) : (
          <Leaderboard entries={entries} currentAddress={address} />
        )}

        {/* XP Guide */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium mb-3">How to earn XP</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Guessing
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>First correct guess: +15 XP</li>
                <li>Correct guess (2nd+): +10 XP</li>
                <li>Close guess: +5 XP</li>
                <li>Participation: +3 XP</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Describing
              </h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>Someone guessed correctly: +12 XP</li>
                <li>Creative emoji description: +5 XP bonus</li>
                <li>Nobody guessed: +3 XP</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
