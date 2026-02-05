"use client";

import { useState, useCallback } from "react";
import {
  validateEmojiDescription,
  cleanEmojiString,
  countEmojis,
} from "@/lib/emojiValidator";

interface EmojiPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ value, onChange, disabled }: EmojiPickerProps) {
  const [isFocused, setIsFocused] = useState(false);

  const validation = validateEmojiDescription(value);
  const showError = value.length > 0 && !validation.valid;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // Clean the input to only keep emojis
      const cleaned = cleanEmojiString(newValue);
      onChange(cleaned);
    },
    [onChange]
  );

  // Common movie emojis for quick selection
  const quickEmojis = [
    "🎬",
    "🎥",
    "🍿",
    "🎭",
    "👻",
    "🤖",
    "💀",
    "👽",
    "🦸",
    "🧙",
    "🏎️",
    "🚀",
    "💣",
    "🔫",
    "💕",
    "💔",
    "👸",
    "🤴",
    "🦁",
    "🐠",
    "🦖",
    "🕷️",
    "🦇",
    "🐒",
    "🏠",
    "🏰",
    "🌊",
    "🌲",
    "⛵",
    "🚢",
    "✈️",
    "🔥",
  ];

  const addEmoji = useCallback(
    (emoji: string) => {
      if (countEmojis(value) < 8) {
        onChange(value + emoji);
      }
    },
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder="Type or select emojis..."
          className={`w-full px-4 py-3 text-2xl border rounded-lg transition-colors
            ${
              showError
                ? "border-red-500 focus:ring-red-500"
                : isFocused
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-gray-300 dark:border-gray-600"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
            dark:bg-gray-800`}
        />
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${
            validation.count < 3
              ? "text-gray-400"
              : validation.count > 8
              ? "text-red-500"
              : "text-green-500"
          }`}
        >
          {validation.count}/8
        </span>
      </div>

      {showError && (
        <p className="text-sm text-red-500">{validation.error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => addEmoji(emoji)}
            disabled={disabled || validation.count >= 8}
            className="text-2xl p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {emoji}
          </button>
        ))}
      </div>

      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={disabled}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
