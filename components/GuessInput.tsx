"use client";

import { useState } from "react";

interface GuessInputProps {
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function GuessInput({
  onSubmit,
  disabled,
  isSubmitting,
}: GuessInputProps) {
  const [guess, setGuess] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      onSubmit(guess.trim());
      setGuess("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        disabled={disabled || isSubmitting}
        placeholder="What movie is this?"
        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800"
      />
      <button
        type="submit"
        disabled={disabled || isSubmitting || !guess.trim()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Submitting..." : "Guess"}
      </button>
    </form>
  );
}
