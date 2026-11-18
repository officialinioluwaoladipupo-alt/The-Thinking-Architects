"use client";

import { useEffect, useState } from "react";

type LiveElapsedTimerProps = {
  startedAtIso: string;
  className?: string;
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function LiveElapsedTimer({
  startedAtIso,
  className = "",
}: LiveElapsedTimerProps) {
  const [elapsedLabel, setElapsedLabel] = useState<string>("00:00:00");

  useEffect(() => {
    const startMs = Date.parse(startedAtIso);
    if (!startedAtIso || Number.isNaN(startMs)) {
      setElapsedLabel("00:00:00");
      return;
    }

    const update = () => {
      setElapsedLabel(formatElapsed(Date.now() - startMs));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAtIso]);

  return (
    <span className={`font-mono tabular-nums ${className}`} aria-label="Live session elapsed time">
      {elapsedLabel}
    </span>
  );
}
