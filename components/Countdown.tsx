"use client";

import { useCountdown } from "@/hooks/useCountdown";

interface CountdownProps {
  deadline: number;
  compact?: boolean;
}

export function Countdown({ deadline, compact }: CountdownProps) {
  const { formatted, isExpired, minutes } = useCountdown(deadline);

  if (isExpired) {
    return (
      <span
        className={`font-mono ${
          compact ? "text-sm" : "text-lg"
        } text-red-500 font-bold`}
      >
        Time&apos;s up!
      </span>
    );
  }

  // Color based on urgency
  let colorClass = "text-green-600 dark:text-green-400";
  if (minutes < 1) {
    colorClass = "text-red-500 animate-pulse";
  } else if (minutes < 2) {
    colorClass = "text-orange-500";
  }

  if (compact) {
    return (
      <span className={`font-mono text-sm font-bold ${colorClass}`}>
        {formatted}
      </span>
    );
  }

  return (
    <div className="text-center">
      <div className={`font-mono text-4xl font-bold ${colorClass}`}>
        {formatted}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        time remaining
      </div>
    </div>
  );
}
