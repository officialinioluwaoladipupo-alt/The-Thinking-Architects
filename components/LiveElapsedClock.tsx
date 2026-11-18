"use client";

import { useEffect, useState } from "react";

type LiveElapsedClockProps = {
  startedAtIso?: string;
  targetStartIso?: string;
  className?: string;
};

function formatHms(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LiveElapsedClock({
  startedAtIso = "",
  targetStartIso = "",
  className = "",
}: LiveElapsedClockProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAtIso, targetStartIso]);

  if (nowMs === null) {
    return (
      <span className={`font-mono tabular-nums ${className}`}>
        00:00:00
      </span>
    );
  }

  const parsedTarget = targetStartIso ? Date.parse(targetStartIso) : Number.NaN;
  const parsedStarted = startedAtIso ? Date.parse(startedAtIso) : Number.NaN;

  // If scheduled start is still slightly in the future while Live Room is already open
  if (!Number.isNaN(parsedTarget) && parsedTarget > nowMs) {
    const remainingSec = Math.floor((parsedTarget - nowMs) / 1000);
    return (
      <span className={`font-mono tabular-nums ${className}`}>
        Starts in {formatHms(remainingSec)}
      </span>
    );
  }

  const baseMs = !Number.isNaN(parsedStarted)
    ? parsedStarted
    : !Number.isNaN(parsedTarget)
      ? parsedTarget
      : nowMs;

  const elapsedSec = Math.max(0, Math.floor((nowMs - baseMs) / 1000));
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      Elapsed {formatHms(elapsedSec)}
    </span>
  );
}
