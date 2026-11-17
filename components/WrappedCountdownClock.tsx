"use client";

import { useEffect, useState } from "react";

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
  valid: boolean;
};

export function computeCountdown(iso: string, nowMs: number): CountdownParts {
  if (!iso || !iso.trim()) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, valid: false };
  }
  const targetMs = Date.parse(iso);
  if (Number.isNaN(targetMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false, valid: false };
  }
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, valid: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, expired: false, valid: true };
}

export function WrappedCountdownClock({
  targetIso,
  variant = "dark",
}: {
  targetIso: string;
  variant?: "dark" | "light";
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  if (nowMs === null) {
    return (
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] opacity-60">
        <span>--d : --h : --m : --s</span>
      </div>
    );
  }

  const parts = computeCountdown(targetIso, nowMs);
  if (!parts.valid) return null;

  if (parts.expired) {
    return (
      <span
        className={`label-mono inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ${
          variant === "dark"
            ? "bg-[#fe3619]/20 text-[#F2EDE8]"
            : "bg-[#fe3619]/12 text-[#fe3619]"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#fe3619]" aria-hidden="true" />
        <span>Live Now</span>
      </span>
    );
  }

  const cells = [
    { label: "Days", value: String(parts.days).padStart(2, "0") },
    { label: "Hrs", value: String(parts.hours).padStart(2, "0") },
    { label: "Min", value: String(parts.minutes).padStart(2, "0") },
    { label: "Sec", value: String(parts.seconds).padStart(2, "0") },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label={`Countdown: ${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds`}
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={`flex min-w-[54px] flex-col items-center rounded-lg border px-2.5 py-1.5 ${
            variant === "dark"
              ? "border-[#F2EDE8]/15 bg-white/[0.04] text-[#F2EDE8]"
              : "border-black/10 bg-[#f7f6f4] text-[#111111]"
          }`}
        >
          <span className="font-mono text-[16px] font-bold leading-none tabular-nums">
            {cell.value}
          </span>
          <span
            className={`mt-1 font-mono text-[9px] uppercase tracking-[0.1em] ${
              variant === "dark" ? "text-[#F2EDE8]/55" : "text-[#111111]/55"
            }`}
          >
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}
