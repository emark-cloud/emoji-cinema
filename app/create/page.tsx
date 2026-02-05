"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { EmojiPicker } from "@/components/EmojiPicker";
import { CategorySelect } from "@/components/CategorySelect";
import { DurationSelect } from "@/components/DurationSelect";
import { TransactionStatus } from "@/components/TransactionStatus";
import { useWallet } from "@/hooks/useWallet";
import { writeContract, type TransactionState } from "@/lib/transactions";
import { getErrorMessage } from "@/lib/errors";
import { validateEmojiDescription } from "@/lib/emojiValidator";
import type { Category, Duration } from "@/types/round";

export default function CreateRoundPage() {
  const router = useRouter();
  const { address, isConnected, isCorrectNetwork } = useWallet();

  const [movieTitle, setMovieTitle] = useState("");
  const [emojiDescription, setEmojiDescription] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });

  const emojiValidation = validateEmojiDescription(emojiDescription);
  const isFormValid =
    movieTitle.trim() &&
    emojiValidation.valid &&
    category &&
    duration !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !address) return;

    try {
      // Generate a unique round ID using timestamp + random component
      const roundId = Date.now() + Math.floor(Math.random() * 1000);

      // Calculate timestamps (Unix seconds)
      const createdAt = Math.floor(Date.now() / 1000);
      const deadline = createdAt + duration * 60;

      await writeContract(
        address as `0x${string}`,
        "create_round",
        [roundId, movieTitle.trim(), emojiDescription, category, duration, createdAt, deadline],
        setTxState
      );

      // Redirect to home after success
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      setTxState({
        status: "error",
        error: getErrorMessage(error),
      });
    }
  };

  // Not connected state
  if (!isConnected || !isCorrectNetwork) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Connect to StudioNet to create a round
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
      >
        ← Back to rounds
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Round</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Movie Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Movie Title (hidden from players)
            </label>
            <input
              type="text"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              placeholder="e.g., The Matrix"
              disabled={txState.status !== "idle"}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 dark:bg-gray-800"
            />
          </div>

          {/* Emoji Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Emoji Description (3-8 emojis)
            </label>
            <EmojiPicker
              value={emojiDescription}
              onChange={setEmojiDescription}
              disabled={txState.status !== "idle"}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <CategorySelect
              value={category}
              onChange={setCategory}
              disabled={txState.status !== "idle"}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Guessing Time
            </label>
            <DurationSelect
              value={duration}
              onChange={setDuration}
              disabled={txState.status !== "idle"}
            />
          </div>

          {/* Transaction Status */}
          <TransactionStatus
            state={txState}
            successMessage="Round created! Redirecting..."
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || txState.status !== "idle"}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Round
          </button>
        </form>

        {/* Tips */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="font-medium mb-2">Tips for great emoji descriptions</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Use iconic scenes or characters</li>
            <li>• Mix literal and abstract emojis</li>
            <li>• Consider the movie&apos;s theme and setting</li>
            <li>• Too obvious = no XP bonus, too hard = nobody guesses</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
