"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Countdown } from "@/components/Countdown";
import { GuessInput } from "@/components/GuessInput";
import { TransactionStatus } from "@/components/TransactionStatus";
import { useRound } from "@/hooks/useRound";
import { useWallet } from "@/hooks/useWallet";
import { writeContract, type TransactionState } from "@/lib/transactions";
import { getErrorMessage } from "@/lib/errors";
import { getRoundStatus } from "@/types/round";

export default function RoundPage() {
  const params = useParams();
  const roundId = params.id ? parseInt(params.id as string, 10) : null;

  const { round, isLoading, error, refetch } = useRound(roundId);
  const { address, isConnected, isCorrectNetwork } = useWallet();

  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  const [action, setAction] = useState<"guess" | "resolve" | null>(null);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading round...</p>
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-2xl font-bold mb-2">Round not found</h1>
        <p className="text-gray-500 mb-4">{error || "This round doesn't exist"}</p>
        <Link href="/" className="text-blue-600 hover:text-blue-700">
          Back to rounds
        </Link>
      </div>
    );
  }

  const status = getRoundStatus(round);
  const isCreator =
    address?.toLowerCase() === round.creator.toLowerCase();
  const hasGuessed = round.guesses.some(
    (g) => g.player.toLowerCase() === address?.toLowerCase()
  );
  const canGuess =
    isConnected &&
    isCorrectNetwork &&
    status === "active" &&
    !isCreator &&
    !hasGuessed;
  const canResolve =
    isConnected &&
    isCorrectNetwork &&
    status === "guessing_ended" &&
    round.guesses.length >= 2;

  const handleGuess = async (guess: string) => {
    if (!address || roundId === null) return;

    setAction("guess");
    try {
      await writeContract(
        address as `0x${string}`,
        "submit_guess",
        [roundId, guess],
        setTxState
      );
      await refetch();
      setTxState({ status: "idle" });
    } catch (err) {
      setTxState({
        status: "error",
        error: getErrorMessage(err),
      });
    }
    setAction(null);
  };

  const handleResolve = async () => {
    if (!address || roundId === null) return;

    setAction("resolve");
    try {
      await writeContract(
        address as `0x${string}`,
        "resolve_round",
        [roundId],
        setTxState
      );
      await refetch();
    } catch (err) {
      setTxState({
        status: "error",
        error: getErrorMessage(err),
      });
    }
    setAction(null);
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
      >
        ← Back to rounds
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700">
              {round.category}
            </span>
            {status === "active" && <Countdown deadline={round.deadline} />}
            {status === "guessing_ended" && (
              <span className="text-orange-500 font-bold">Awaiting Resolution</span>
            )}
            {status === "resolved" && (
              <span className="text-green-500 font-bold">Resolved</span>
            )}
          </div>

          {/* Emojis */}
          <div className="text-5xl text-center py-6 tracking-widest">
            {round.emoji_description}
          </div>

          {/* Movie title (if resolved) */}
          {round.resolved && round.movie_title && (
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">The movie was:</div>
              <div className="text-2xl font-bold">{round.movie_title}</div>
            </div>
          )}

          {/* Creator info */}
          <div className="text-center text-sm text-gray-500 mt-4">
            Created by {round.creator.slice(0, 6)}...{round.creator.slice(-4)}
            {isCreator && <span className="text-blue-500 ml-1">(you)</span>}
          </div>
        </div>

        {/* Guessing Section */}
        <div className="p-6">
          {!isConnected && (
            <div className="text-center mb-4">
              <p className="text-gray-500 mb-2">Connect wallet to participate</p>
              <ConnectWallet />
            </div>
          )}

          {isConnected && !isCorrectNetwork && (
            <div className="text-center">
              <ConnectWallet />
            </div>
          )}

          {canGuess && (
            <div className="space-y-4">
              <h3 className="font-medium">Submit your guess</h3>
              <GuessInput
                onSubmit={handleGuess}
                disabled={txState.status !== "idle"}
                isSubmitting={action === "guess" && txState.status !== "idle"}
              />
              {action === "guess" && <TransactionStatus state={txState} />}
            </div>
          )}

          {isCreator && !round.resolved && (
            <div className="text-center py-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300">
                This is your round - you can&apos;t guess!
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                {status === "active"
                  ? "Wait for others to guess and the timer to expire."
                  : "Wait for the round to be resolved."}
              </p>
            </div>
          )}

          {hasGuessed && !round.resolved && (
            <div className="text-center py-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-700 dark:text-green-300">
                You&apos;ve submitted your guess!
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Wait for the round to be resolved.
              </p>
            </div>
          )}

          {canResolve && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Time&apos;s up! This round has {round.guesses.length} guesses and can be resolved.
                </p>
                <button
                  onClick={handleResolve}
                  disabled={txState.status !== "idle"}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Resolve Round
                </button>
              </div>
              {action === "resolve" && <TransactionStatus state={txState} />}
            </div>
          )}

          {status === "guessing_ended" && round.guesses.length < 2 && (
            <div className="text-center py-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-700 dark:text-yellow-300">
                Not enough guesses to resolve ({round.guesses.length}/2 minimum)
              </p>
            </div>
          )}
        </div>

        {/* Guesses List */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-medium mb-4">
            Guesses ({round.guesses.length})
          </h3>

          {round.guesses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No guesses yet. Be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {round.guesses.map((guess, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <div className="text-sm text-gray-500">
                      {guess.player.slice(0, 6)}...{guess.player.slice(-4)}
                      {guess.player.toLowerCase() === address?.toLowerCase() && (
                        <span className="text-blue-500 ml-1">(you)</span>
                      )}
                    </div>
                    {round.resolved ? (
                      <div className="font-medium">{guess.guess}</div>
                    ) : (
                      <div className="text-gray-400 italic">
                        {guess.player.toLowerCase() === address?.toLowerCase()
                          ? guess.guess
                          : "Hidden until resolved"}
                      </div>
                    )}
                  </div>
                  {round.resolved && (
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        +{guess.score} XP
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
