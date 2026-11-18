"use client";

import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_WRAPPED_SETTINGS,
  subscribeWrappedSettings,
  type WrappedSettingsRecord,
} from "../lib/firebaseContent";
import DitherBackground from "./DitherBackground";
import { MagneticAction } from "./WrappedPrimitives";

type CountdownParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  expired: boolean;
  hasValidTarget: boolean;
};

function computeCountdown(targetIso: string, nowMs: number): CountdownParts {
  const trimmed = targetIso.trim();
  if (!trimmed) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      expired: false,
      hasValidTarget: false,
    };
  }
  const targetMs = Date.parse(trimmed);
  if (Number.isNaN(targetMs)) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
      expired: false,
      hasValidTarget: false,
    };
  }
  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    expired: diffMs <= 0,
    hasValidTarget: true,
  };
}

export default function WrappedSpotlightBanner({ onOpenJoin }: { onOpenJoin: () => void }) {
  const [settings, setSettings] = useState<WrappedSettingsRecord>(DEFAULT_WRAPPED_SETTINGS);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const unsub = subscribeWrappedSettings(
      (next) => setSettings(next),
      () => {
        // Keep defaults gracefully if network/rules disallow or offline
      },
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!settings.showHomeBanner || settings.enabled) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [settings.showHomeBanner, settings.enabled]);

  if (!settings.showHomeBanner) {
    return null;
  }

  const countdown = computeCountdown(settings.countdownTargetIso, nowMs);

  return (
    <section
      aria-label="TTA Year Wrapped spotlight"
      className="bg-[#f7f6f4] px-6 pb-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[12px] border border-black/[0.12] bg-[#1C1C1C] p-7 text-[#F2EDE8] sm:p-11"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <DitherBackground
            theme="dark"
            pixelSize={3}
            waveSpeed={0.04}
            waveFrequency={2.2}
            waveAmplitude={0.32}
            colorLevels={5}
            mouseRadius={0.28}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(95deg, rgba(28,28,28,0.92) 0%, rgba(28,28,28,0.78) 56%, rgba(28,28,28,0.42) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_auto] lg:items-center">
          <div>
            <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-[#D94F2B] uppercase">
              {settings.enabled ? "Annual Review · Live Now" : "Annual Review · Countdown"}
            </p>
            <h2
              className="mt-2.5 max-w-[26ch] text-[clamp(1.7rem,3.4vw,2.75rem)] font-medium leading-[1.08] tracking-[-0.03em] text-[#F2EDE8]"
              style={{ textWrap: "balance" }}
            >
              {settings.enabled ? settings.pageTitle : settings.countdownHeadline}
            </h2>
            <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.6] text-[#F2EDE8]/78">
              {settings.enabled ? settings.pageIntro : settings.countdownSubtext}
            </p>
          </div>

          {settings.enabled ? (
            <div className="flex flex-col gap-5 lg:items-end">
              <div className="grid grid-cols-3 gap-px border border-[#F2EDE8]/14 bg-[#F2EDE8]/14">
                <div className="bg-[#1C1C1C]/90 px-4 py-3 sm:px-5">
                  <p className="font-mono text-[1.25rem] font-bold tabular-nums text-[#D94F2B] sm:text-[1.45rem]">
                    ~300
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-[#F2EDE8]/65 uppercase">
                    Registered
                  </p>
                </div>
                <div className="bg-[#1C1C1C]/90 px-4 py-3 sm:px-5">
                  <p className="font-mono text-[1.25rem] font-bold tabular-nums text-[#D94F2B] sm:text-[1.45rem]">
                    76
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-[#F2EDE8]/65 uppercase">
                    Members
                  </p>
                </div>
                <div className="bg-[#1C1C1C]/90 px-4 py-3 sm:px-5">
                  <p className="font-mono text-[1.25rem] font-bold tabular-nums text-[#D94F2B] sm:text-[1.45rem]">
                    50+
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] tracking-[0.06em] text-[#F2EDE8]/65 uppercase">
                    Returned
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <MagneticAction strength={0.16}>
                  <Link
                    href="/wrapped"
                    className="label-mono group inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#D94F2B] px-6 py-3 text-[#F2EDE8] transition-opacity hover:opacity-90"
                  >
                    <span>Open Year Wrapped</span>
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </MagneticAction>

                <button
                  type="button"
                  onClick={onOpenJoin}
                  className="label-mono inline-flex min-h-[48px] cursor-pointer items-center gap-1.5 rounded-xl border border-[#F2EDE8]/20 bg-[#1C1C1C]/70 px-5 py-3 text-[#F2EDE8] transition-colors hover:bg-[#F2EDE8] hover:text-[#1C1C1C]"
                >
                  <span>Join the community</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 lg:items-end">
              {countdown.hasValidTarget && !countdown.expired ? (
                <div
                  className="grid grid-cols-4 gap-px border border-[#F2EDE8]/16 bg-[#F2EDE8]/16"
                  aria-label="Countdown to TTA Year Wrapped release"
                >
                  {[
                    { value: countdown.days, label: "Days" },
                    { value: countdown.hours, label: "Hours" },
                    { value: countdown.minutes, label: "Min" },
                    { value: countdown.seconds, label: "Sec" },
                  ].map((unit) => (
                    <div key={unit.label} className="bg-[#1C1C1C]/90 px-3.5 py-3 text-center sm:px-5">
                      <p className="font-mono text-[1.45rem] font-bold tabular-nums text-[#D94F2B] sm:text-[1.75rem]">
                        {unit.value}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] tracking-[0.07em] text-[#F2EDE8]/65 uppercase">
                        {unit.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#F2EDE8]/16 bg-[#1C1C1C]/85 px-4 py-2.5 font-mono text-[12px] tracking-[0.06em] text-[#F2EDE8]/80 uppercase">
                  <Clock className="h-3.5 w-3.5 text-[#D94F2B]" aria-hidden="true" />
                  <span>{countdown.expired ? "Opening soon" : "Coming soon"}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <MagneticAction strength={0.16}>
                  <button
                    type="button"
                    onClick={onOpenJoin}
                    className="label-mono group inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-[#D94F2B] px-6 py-3 text-[#F2EDE8] transition-opacity hover:opacity-90"
                  >
                    <span>Notify me on release</span>
                    <ArrowUpRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </MagneticAction>

                <Link
                  href="/wrapped"
                  className="label-mono inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-[#F2EDE8]/20 bg-[#1C1C1C]/70 px-5 py-3 text-[#F2EDE8] transition-colors hover:bg-[#F2EDE8] hover:text-[#1C1C1C]"
                >
                  <span>View countdown</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
