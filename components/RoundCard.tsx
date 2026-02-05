"use client";

import Link from "next/link";
import { Countdown } from "./Countdown";
import type { Round } from "@/types/round";

interface RoundCardProps {
  round: Round;
}

const categoryColors: Record<string, string> = {
  Action: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Comedy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Drama: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Horror: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  "Sci-Fi": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Romance: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  Animation: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Thriller: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export function RoundCard({ round }: RoundCardProps) {
  const categoryStyle =
    categoryColors[round.category] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

  return (
    <Link
      href={`/round/${round.round_id}`}
      className="block p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${categoryStyle}`}
        >
          {round.category}
        </span>
        <Countdown deadline={round.deadline} compact />
      </div>

      <div className="text-4xl text-center py-4 tracking-wider">
        {round.emoji_description}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
        <span>
          by {round.creator.slice(0, 6)}...{round.creator.slice(-4)}
        </span>
        <span>{round.duration_minutes} min round</span>
      </div>
    </Link>
  );
}
