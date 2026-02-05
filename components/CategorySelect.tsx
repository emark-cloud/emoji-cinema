"use client";

import { CATEGORIES, type Category } from "@/types/round";

interface CategorySelectProps {
  value: Category | "";
  onChange: (value: Category) => void;
  disabled?: boolean;
}

const categoryEmojis: Record<Category, string> = {
  Action: "💥",
  Comedy: "😂",
  Drama: "🎭",
  Horror: "👻",
  "Sci-Fi": "🚀",
  Romance: "💕",
  Animation: "🎨",
  Thriller: "😱",
};

export function CategorySelect({
  value,
  onChange,
  disabled,
}: CategorySelectProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          disabled={disabled}
          className={`p-3 rounded-lg border-2 transition-all
            ${
              value === category
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="text-2xl mb-1">{categoryEmojis[category]}</div>
          <div className="text-sm font-medium">{category}</div>
        </button>
      ))}
    </div>
  );
}
