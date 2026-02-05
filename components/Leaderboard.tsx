"use client";

import type { LeaderboardEntry } from "@/types/player";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentAddress?: string | null;
  compact?: boolean;
}

export function Leaderboard({
  entries,
  currentAddress,
  compact,
}: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No players yet. Be the first!
      </div>
    );
  }

  const displayEntries = compact ? entries.slice(0, 5) : entries;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
            <th className="pb-2 font-medium">Rank</th>
            <th className="pb-2 font-medium">Player</th>
            <th className="pb-2 font-medium text-right">XP</th>
            {!compact && (
              <>
                <th className="pb-2 font-medium text-right">Rounds</th>
                <th className="pb-2 font-medium text-right">Correct</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {displayEntries.map((entry, index) => {
            const addressStr = typeof entry.address === "string" ? entry.address : String(entry.address);
            const isCurrentUser =
              currentAddress?.toLowerCase() === addressStr.toLowerCase();

            return (
              <tr
                key={addressStr || `player-${index}`}
                className={`border-b dark:border-gray-700 last:border-0 ${
                  isCurrentUser
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <td className="py-3">
                  {entry.rank <= 3 ? (
                    <span className="text-xl">
                      {entry.rank === 1 && "🥇"}
                      {entry.rank === 2 && "🥈"}
                      {entry.rank === 3 && "🥉"}
                    </span>
                  ) : (
                    <span className="text-gray-500">#{entry.rank}</span>
                  )}
                </td>
                <td className="py-3">
                  <span className={`${isCurrentUser ? "font-bold" : ""} font-mono text-sm break-all`}>
                    {addressStr}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-blue-500">(you)</span>
                    )}
                  </span>
                </td>
                <td className="py-3 text-right font-mono font-bold">
                  {entry.xp}
                </td>
                {!compact && (
                  <>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {entry.rounds_guessed}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {entry.correct_guesses}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
