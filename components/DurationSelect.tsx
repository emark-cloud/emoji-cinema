"use client";

import { DURATIONS, type Duration } from "@/types/round";

interface DurationSelectProps {
  value: Duration | null;
  onChange: (value: Duration) => void;
  disabled?: boolean;
}

export function DurationSelect({
  value,
  onChange,
  disabled,
}: DurationSelectProps) {
  return (
    <div className="flex gap-3">
      {DURATIONS.map((duration) => (
        <button
          key={duration}
          type="button"
          onClick={() => onChange(duration)}
          disabled={disabled}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all
            ${
              value === duration
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="text-lg font-bold">{duration}</div>
          <div className="text-sm text-gray-500">minutes</div>
        </button>
      ))}
    </div>
  );
}
