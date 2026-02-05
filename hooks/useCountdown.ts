"use client";

import { useState, useEffect, useMemo } from "react";
import { COUNTDOWN_INTERVAL } from "@/lib/config";

interface CountdownResult {
  timeRemaining: number; // seconds
  isExpired: boolean;
  formatted: string;
  minutes: number;
  seconds: number;
}

export function useCountdown(deadline: number): CountdownResult {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, COUNTDOWN_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const result = useMemo(() => {
    const remaining = Math.max(0, deadline - now);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return {
      timeRemaining: remaining,
      isExpired: remaining === 0,
      formatted: `${minutes}:${seconds.toString().padStart(2, "0")}`,
      minutes,
      seconds,
    };
  }, [deadline, now]);

  return result;
}
