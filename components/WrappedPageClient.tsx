"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Maximize2,
  Minimize2,
  Pause,
  Play,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_WRAPPED_SETTINGS,
  DEFAULT_WRAPPED_SLIDES,
  subscribePublishedWrappedSlides,
  subscribeWrappedSettings,
  type WrappedSettingsRecord,
  type WrappedSlideRecord,
} from "../lib/firebaseContent";
import { triggerTallyPopup } from "../lib/tally";
import DitherBackground from "./DitherBackground";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import {
  BlurWords,
  DecryptedText,
  MagneticAction,
  RollingCounter,
  SpotlightStageBackdrop,
} from "./WrappedPrimitives";

const DEFAULT_WRAPPED_URL = "https://thethinkingarchitects.com.ng/wrapped";

function renderHighlightedHeadline(
  text: string,
  primaryHighlight: string,
  secondaryHighlight: string,
) {
  const tokens: Array<{ value: string; kind: "accent" | "strong" }> = [];
  const p = primaryHighlight.trim();
  const s = secondaryHighlight.trim();

  if (p && text.includes(p)) {
    tokens.push({ value: p, kind: "accent" });
  }
  if (s && s !== p && text.includes(s)) {
    // Geography-style secondary city highlight (short proper noun) or strong phrase
    tokens.push({ value: s, kind: s.length <= 14 && !s.includes(" ") ? "accent" : "strong" });
  }

  if (tokens.length === 0) {
    return <BlurWords text={text} stagger={0.04} />;
  }

  const escaped = tokens.map((t) => t.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) => {
        const match = tokens.find((t) => t.value === part);
        if (!match) {
          return <Fragment key={idx}>{part}</Fragment>;
        }
        if (match.kind === "accent") {
          const isDateLike = /\d/.test(part) && part.length <= 16;
          return (
            <strong key={idx} className="font-bold text-[#D94F2B]">
              {isDateLike ? (
                <span className="font-mono font-semibold">
                  <DecryptedText text={part} speed={24} />
                </span>
              ) : (
                part
              )}
            </strong>
          );
        }
        return (
          <strong key={idx} className="font-bold">
            {part}
          </strong>
        );
      })}
    </>
  );
}

function WrappedSlideContent({
  slide,
  onOpenJoin,
}: {
  slide: WrappedSlideRecord;
  onOpenJoin: () => void;
}) {
  const isDark = slide.theme === "dark";

  switch (slide.kind) {
    case "cover":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3"
          >
            <span className="logo-tta text-[1.75rem] font-bold leading-none text-[#D94F2B] sm:text-[2.1rem]">
              TTA
            </span>
            {slide.eyebrow && (
              <>
                <span
                  className={`h-4 w-px ${isDark ? "bg-[#F2EDE8]/25" : "bg-[#1C1C1C]/25"}`}
                  aria-hidden="true"
                />
                <span
                  className={`text-[13px] font-medium tracking-[0.06em] uppercase ${
                    isDark ? "text-[#F2EDE8]/75" : "text-[#1C1C1C]/75"
                  }`}
                >
                  {slide.eyebrow}
                </span>
              </>
            )}
          </motion.div>

          <h2
            className={`mt-8 max-w-[14ch] text-[clamp(2.35rem,5.5vw,4.35rem)] font-medium leading-[1.03] tracking-[-0.03em] ${
              isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"
            }`}
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={slide.headline || "TTA Year Wrapped"} delay={0.06} stagger={0.06} />
          </h2>

          {slide.body && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-5 max-w-[36ch] text-[clamp(1.08rem,1.8vw,1.38rem)] italic leading-[1.5] ${
                isDark ? "text-[#F2EDE8]/84" : "text-[#1C1C1C]/80"
              }`}
            >
              {slide.body}
            </motion.p>
          )}
        </div>
      );

    case "metric":
      return (
        <div className="flex flex-1 flex-col justify-center">
          {slide.eyebrow && (
            <p
              className={`mb-3 font-mono text-[12px] font-bold tracking-[0.08em] uppercase ${
                isDark ? "text-[#F2EDE8]/65" : "text-[#1C1C1C]/65"
              }`}
            >
              {slide.eyebrow}
            </p>
          )}
          <p className="text-[clamp(3.25rem,12.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter
              target={slide.metricValue}
              prefix={slide.metricPrefix}
              suffix={slide.metricSuffix}
            />
          </p>
          {slide.body && (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-6 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] ${
                isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"
              }`}
              style={{ textWrap: "balance" }}
            >
              {slide.body}
            </motion.p>
          )}
        </div>
      );

    case "sessions":
      return (
        <div className="flex flex-1 flex-col justify-center">
          {slide.headline && (
            <p
              className={`max-w-[36ch] text-[clamp(1.2rem,2.1vw,1.65rem)] font-semibold leading-[1.25] tracking-[-0.025em] ${
                isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"
              }`}
            >
              <BlurWords text={slide.headline} stagger={0.04} />
            </p>
          )}
          <ul
            className={`mt-6 divide-y border-y ${
              isDark
                ? "divide-[#F2EDE8]/14 border-[#F2EDE8]/14"
                : "divide-[#1C1C1C]/12 border-[#1C1C1C]/12"
            }`}
          >
            {slide.items.map((rawLine, idx) => {
              const splitIdx = rawLine.indexOf("::");
              const hasDatePrefix = splitIdx > -1;
              const prefix = hasDatePrefix ? rawLine.slice(0, splitIdx).trim() : "";
              const content = hasDatePrefix ? rawLine.slice(splitIdx + 2).trim() : rawLine.trim();

              return (
                <motion.li
                  key={`${rawLine}-${idx}`}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.38,
                    delay: 0.14 + idx * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`group flex flex-col gap-1.5 py-3.5 transition-colors sm:flex-row sm:items-baseline sm:gap-5 sm:px-2 ${
                    isDark ? "hover:bg-[#F2EDE8]/[0.04]" : "hover:bg-[#1C1C1C]/[0.03]"
                  }`}
                >
                  {hasDatePrefix && (
                    <span className="shrink-0 font-mono text-[13px] font-bold tracking-[0.04em] tabular-nums text-[#D94F2B] uppercase sm:w-[5.5rem]">
                      <DecryptedText text={prefix} speed={24} />
                    </span>
                  )}
                  <span
                    className={`text-[14.5px] leading-[1.48] font-medium sm:text-[15.5px] ${
                      isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"
                    }`}
                  >
                    {content}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      );

    case "community": {
      const total = Math.max(1, slide.metricValue || slide.secondaryMetricA + slide.secondaryMetricB);
      const ratioA = Math.min(100, (slide.secondaryMetricA / total) * 100);
      const ratioB = Math.min(100 - ratioA, (slide.secondaryMetricB / total) * 100);

      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(3.25rem,12.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter
              target={slide.metricValue}
              prefix={slide.metricPrefix}
              suffix={slide.metricSuffix}
            />
          </p>
          {slide.body && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-5 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] ${
                isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"
              }`}
              style={{ textWrap: "balance" }}
            >
              {slide.body}
            </motion.p>
          )}

          {(slide.secondaryMetricA > 0 || slide.secondaryMetricB > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-[380px]"
            >
              <p
                className={`font-mono text-[13.5px] leading-[1.6] tracking-[0.02em] tabular-nums sm:text-[15px] ${
                  isDark ? "text-[#F2EDE8]/84" : "text-[#1C1C1C]/80"
                }`}
              >
                {slide.secondaryMetricA > 0 && (
                  <>
                    <RollingCounter target={slide.secondaryMetricA} /> {slide.secondaryLabelA}{" "}
                  </>
                )}
                {slide.secondaryMetricB > 0 && (
                  <>
                    <RollingCounter target={slide.secondaryMetricB} /> {slide.secondaryLabelB}
                  </>
                )}
              </p>
              <div
                className={`mt-3 flex h-[4px] w-full overflow-hidden rounded-full ${
                  isDark ? "bg-[#F2EDE8]/14" : "bg-[#1C1C1C]/14"
                }`}
                aria-hidden="true"
              >
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: `${ratioA}%` }}
                  className="h-full origin-left bg-[#D94F2B]"
                />
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.65, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  style={{ width: `${ratioB}%` }}
                  className={`h-full origin-left ${isDark ? "bg-[#F2EDE8]/70" : "bg-[#1C1C1C]/65"}`}
                />
              </div>
            </motion.div>
          )}
        </div>
      );
    }

    case "cta":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className={`max-w-[24ch] text-[clamp(1.85rem,4vw,3.15rem)] font-medium leading-[1.14] tracking-[-0.03em] ${
              isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"
            }`}
            style={{ textWrap: "balance" }}
          >
            <BlurWords
              text={slide.headline || "More sessions. More conversations."}
              stagger={0.055}
            />
          </p>
          {slide.body && (
            <p
              className={`mt-4 max-w-[46ch] text-[15.5px] leading-[1.6] ${
                isDark ? "text-[#F2EDE8]/78" : "text-[#1C1C1C]/78"
              }`}
            >
              {slide.body}
            </p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MagneticAction>
              <button
                type="button"
                onClick={onOpenJoin}
                className="label-mono group inline-flex min-h-[50px] cursor-pointer items-center gap-2 rounded-xl bg-[#D94F2B] px-7 py-3.5 text-[#F2EDE8] transition-opacity duration-200 hover:opacity-90"
              >
                <span>{slide.ctaLabel || "Join the community"}</span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </button>
            </MagneticAction>
          </motion.div>
        </div>
      );

    case "statement":
    default: {
      const eyebrowClean = slide.eyebrow.trim();
      const showLeadInEyebrow = Boolean(eyebrowClean) && !slide.headline.includes(eyebrowClean);
      const hasBar = slide.secondaryMetricA > 0 && slide.secondaryMetricA <= 100;
      const hasShortAccentDate = Boolean(slide.accentDate.trim()) && slide.accentDate.length <= 16;

      return (
        <div className="flex flex-1 flex-col justify-center">
          {showLeadInEyebrow && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`mb-5 max-w-[34ch] text-[clamp(1.25rem,2.2vw,1.75rem)] font-normal leading-[1.35] tracking-[-0.02em] ${
                isDark ? "text-[#F2EDE8]/78" : "text-[#1C1C1C]/78"
              }`}
            >
              {eyebrowClean}
            </motion.p>
          )}

          <p
            className={`max-w-[26ch] font-medium leading-[1.2] tracking-[-0.03em] ${
              showLeadInEyebrow
                ? "text-[clamp(1.9rem,4vw,3.15rem)] font-semibold leading-[1.1]"
                : "text-[clamp(1.55rem,3.3vw,2.6rem)]"
            } ${isDark ? "text-[#F2EDE8]" : "text-[#1C1C1C]"}`}
            style={{ textWrap: "balance" }}
          >
            {renderHighlightedHeadline(slide.headline, slide.accentDate, slide.eyebrow)}
          </p>

          {slide.body && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`mt-5 max-w-[48ch] text-[15.5px] leading-[1.6] ${
                isDark ? "text-[#F2EDE8]/75" : "text-[#1C1C1C]/75"
              }`}
            >
              {slide.body}
            </motion.p>
          )}

          {hasBar && (
            <div
              className={`mt-8 h-[4px] max-w-[320px] overflow-hidden rounded-full ${
                isDark ? "bg-[#F2EDE8]/14" : "bg-[#1C1C1C]/12"
              }`}
              aria-hidden="true"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: `${slide.secondaryMetricA}%` }}
                className="h-full origin-left bg-[#D94F2B]"
              />
            </div>
          )}

          {!hasBar && hasShortAccentDate && /\d/.test(slide.accentDate) && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 h-[2px] w-24 origin-left bg-[#D94F2B]"
              aria-hidden="true"
            />
          )}
        </div>
      );
    }
  }
}

function CountdownLockedStage({
  settings,
  onOpenJoin,
}: {
  settings: WrappedSettingsRecord;
  onOpenJoin: () => void;
}) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const targetMs = settings.countdownTargetIso.trim()
    ? Date.parse(settings.countdownTargetIso.trim())
    : NaN;
  const hasValidTarget = !Number.isNaN(targetMs);
  const diffMs = hasValidTarget ? Math.max(0, targetMs - nowMs) : 0;
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return (
    <section aria-label="TTA Year Wrapped countdown" className="mt-7">
      <div className="relative flex min-h-[460px] flex-col justify-between overflow-hidden rounded-[12px] border border-black/[0.12] bg-[#1C1C1C] p-5 text-[#F2EDE8] sm:p-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <DitherBackground
            theme="dark"
            pixelSize={3}
            waveSpeed={0.045}
            waveFrequency={2.3}
            waveAmplitude={0.34}
            colorLevels={5}
            mouseRadius={0.3}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(100deg, rgba(28,28,28,0.92) 0%, rgba(28,28,28,0.72) 60%, rgba(28,28,28,0.34) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#F2EDE8]/14 pb-5 sm:gap-4">
          <span className="font-mono text-[11px] font-bold tracking-[0.09em] text-[#D94F2B] uppercase">
            Annual Review · Upcoming Release
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.07em] text-[#F2EDE8]/70 uppercase">
            <Clock className="h-3.5 w-3.5 text-[#D94F2B]" aria-hidden="true" />
            <span>Countdown</span>
          </span>
        </div>

        <div className="relative z-10 my-10">
          <h2
            className="max-w-[20ch] text-[clamp(2rem,4.5vw,3.5rem)] font-medium leading-[1.06] tracking-[-0.03em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={settings.countdownHeadline} stagger={0.05} />
          </h2>
          <p className="mt-4 max-w-[56ch] text-[16px] leading-[1.6] text-[#F2EDE8]/78">
            {settings.countdownSubtext}
          </p>

          {hasValidTarget && diffMs > 0 ? (
            <div className="mt-8 grid max-w-[540px] grid-cols-2 gap-px border border-[#F2EDE8]/16 bg-[#F2EDE8]/16 sm:grid-cols-4">
              {[
                { value: days, label: "Days" },
                { value: hours, label: "Hours" },
                { value: minutes, label: "Minutes" },
                { value: seconds, label: "Seconds" },
              ].map((unit) => (
                <div key={unit.label} className="bg-[#1C1C1C]/90 px-3 py-3 text-center sm:px-6 sm:py-4">
                  <p className="font-mono text-[clamp(1.6rem,3.6vw,2.75rem)] font-bold tabular-nums text-[#D94F2B]">
                    {String(unit.value).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.08em] text-[#F2EDE8]/65 uppercase">
                    {unit.label}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 font-mono text-[13px] tracking-[0.08em] text-[#D94F2B] uppercase">
              Finalizing conversations &amp; community milestones — opening shortly.
            </p>
          )}
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#F2EDE8]/14 pt-6">
          <p className="text-[14px] text-[#F2EDE8]/72">
            Members get early access when Year Wrapped goes live.
          </p>
          <MagneticAction>
            <button
              type="button"
              onClick={onOpenJoin}
              className="label-mono group inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-[#D94F2B] px-6 py-3 text-[#F2EDE8] transition-opacity hover:opacity-90"
            >
              <span>Join the community</span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </button>
          </MagneticAction>
        </div>
      </div>
    </section>
  );
}

function WrappedPageInner() {
  const [settings, setSettings] = useState<WrappedSettingsRecord>(DEFAULT_WRAPPED_SETTINGS);
  const [dbSlides, setDbSlides] = useState<WrappedSlideRecord[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(DEFAULT_WRAPPED_URL);

  const deckContainerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.href) {
      setShareUrl(window.location.href.split("#")[0]);
    }
  }, []);

  useEffect(() => {
    const unsubSettings = subscribeWrappedSettings(
      (next) => {
        setSettings(next);
        if (next.autoplaySeconds > 0) {
          setIsPlaying(true);
        }
      },
      () => {
        // Retain fallback copy gracefully
      },
    );

    const unsubSlides = subscribePublishedWrappedSlides(
      (items) => {
        setDbSlides(items);
      },
      () => {
        // Retain fallback slides gracefully
      },
    );

    return () => {
      unsubSettings();
      unsubSlides();
    };
  }, []);

  const slides = useMemo(() => {
    if (dbSlides && dbSlides.length > 0) {
      return dbSlides;
    }
    return DEFAULT_WRAPPED_SLIDES;
  }, [dbSlides]);

  useEffect(() => {
    if (currentIndex >= slides.length) {
      setCurrentIndex(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentIndex]);

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === currentIndex) return;
      setDirection(nextIndex > currentIndex ? 1 : -1);
      setCurrentIndex(nextIndex);
    },
    [currentIndex, slides.length],
  );

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const autoplayDurationSec = settings.autoplaySeconds > 0 ? settings.autoplaySeconds : 6;

  useEffect(() => {
    if (!settings.enabled || !isPlaying || currentIndex >= slides.length - 1) {
      return;
    }
    const timer = window.setTimeout(() => {
      goNext();
    }, autoplayDurationSec * 1000);
    return () => window.clearTimeout(timer);
  }, [settings.enabled, isPlaying, currentIndex, slides.length, autoplayDurationSec, goNext]);

  const enterFullscreen = useCallback(async () => {
    setIsFullscreen(true);
    const el = deckContainerRef.current;
    if (el && el.requestFullscreen) {
      try {
        await el.requestFullscreen();
      } catch {
        // Fallback overlay state already active when native Fullscreen API is unavailable
      }
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore fullscreen exit errors
      }
    }
  }, []);

  useEffect(() => {
    const handleNativeFullscreenChange = () => {
      if (typeof document !== "undefined" && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleNativeFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleNativeFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIsPlaying(false);
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIsPlaying(false);
        goPrev();
      } else if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        void exitFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, isFullscreen, exitFullscreen]);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  const resolvedShareCaption = settings.shareCaption.includes("[link]")
    ? settings.shareCaption.replace(/\[link\]/g, shareUrl)
    : `${settings.shareCaption} ${shareUrl}`;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(resolvedShareCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored if clipboard permissions are blocked
    }
  };

  const activeSlide = slides[currentIndex] ?? slides[0];
  const isDark = activeSlide.theme === "dark";

  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(resolvedShareCaption)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <MotionConfig reducedMotion="user">
      <SiteHeader onOpenJoin={handleOpenJoin} />

      <main className="min-h-screen bg-[#f7f6f4] pt-24 pb-16 text-[#111111] sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
          <Link
            href="/"
            className="label-mono inline-flex items-center gap-2 text-[#111111]/60 transition-colors hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>

          {/* Page header */}
          <header className="mt-5 border-b border-black/[0.09] pb-7">
            <p className="label-mono text-[#D94F2B]">Annual Review · 2026</p>
            <h1
              className="mt-2 max-w-[18ch] text-[clamp(2.1rem,4.5vw,3.75rem)] font-medium leading-[1.04] tracking-[-0.035em]"
              style={{ textWrap: "balance" }}
            >
              <BlurWords text={settings.pageTitle} stagger={0.055} />
            </h1>
            <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[54ch] text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.55] text-[#111111]/78">
                {settings.enabled ? settings.pageIntro : settings.countdownSubtext}
              </p>

              {settings.enabled && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlaying && currentIndex >= slides.length - 1) {
                        setCurrentIndex(0);
                      }
                      setIsPlaying((p) => !p);
                    }}
                    className="label-mono inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3.5 w-3.5 text-[#D94F2B]" aria-hidden="true" />
                        <span>Pause story</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Auto-play</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void enterFullscreen()}
                    className="label-mono inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Open full screen</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {!settings.enabled ? (
            <CountdownLockedStage settings={settings} onOpenJoin={handleOpenJoin} />
          ) : (
            /* Interactive dynamic slide deck */
            <section aria-label="TTA Year Wrapped interactive slides" className="mt-7">
              <div
                ref={deckContainerRef}
                className={
                  isFullscreen
                    ? "fixed inset-0 z-50 flex flex-col justify-between bg-[#141414] p-4 sm:p-8"
                    : "relative"
                }
              >
                <div
                  id="wrapped-stage-surface"
                  onTouchStart={(e) => {
                    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const startX = touchStartXRef.current;
                    const endX = e.changedTouches[0]?.clientX ?? null;
                    touchStartXRef.current = null;
                    if (startX === null || endX === null) return;
                    const delta = endX - startX;
                    if (delta < -45) {
                      setIsPlaying(false);
                      goNext();
                    } else if (delta > 45) {
                      setIsPlaying(false);
                      goPrev();
                    }
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const ratio = (e.clientX - rect.left) / rect.width;
                    setIsPlaying(false);
                    if (ratio < 0.3) goPrev();
                    else goNext();
                  }}
                  role="region"
                  aria-roledescription="carousel"
                  aria-label={`Slide ${currentIndex + 1} of ${slides.length}: ${activeSlide.label}`}
                  className={`relative flex min-h-0 w-full cursor-pointer select-none flex-col justify-between overflow-hidden rounded-[12px] border transition-colors duration-300 ${
                    isFullscreen
                      ? "mx-auto h-full w-full max-w-[1040px] border-white/15 p-5 sm:p-12"
                      : "min-h-[430px] border-black/[0.1] p-5 sm:min-h-[480px] sm:p-10"
                  } ${isDark ? "bg-[#1C1C1C] text-[#F2EDE8]" : "bg-[#F2EDE8] text-[#1C1C1C]"}`}
                >
                  {/* WebGL 8x8 Bayer Dither Shader + Architectural Drafting Lines + Pointer Spotlight */}
                  <SpotlightStageBackdrop
                    theme={activeSlide.theme === "dark" ? "dark" : "cream"}
                    slideIndex={currentIndex}
                  />

                  {/* Top segment progress bar + metadata row */}
                  <div onClick={(e) => e.stopPropagation()} className="relative z-10 space-y-4">
                    <div
                      className="grid gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))`,
                      }}
                      role="tablist"
                      aria-label="Slide progress"
                    >
                      {slides.map((slide, idx) => {
                        const active = idx === currentIndex;
                        const passed = idx < currentIndex;
                        return (
                          <button
                            key={slide.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-label={`Go to slide ${idx + 1}: ${slide.label}`}
                            onClick={() => {
                              setIsPlaying(false);
                              goToSlide(idx);
                            }}
                            className="group flex h-6 cursor-pointer items-center py-2"
                          >
                            <span
                              className={`relative block h-[3px] w-full overflow-hidden rounded-full transition-colors duration-150 ${
                                passed
                                  ? isDark
                                    ? "bg-[#F2EDE8]/65"
                                    : "bg-[#1C1C1C]/60"
                                  : isDark
                                    ? "bg-[#F2EDE8]/20 group-hover:bg-[#F2EDE8]/40"
                                    : "bg-[#1C1C1C]/15 group-hover:bg-[#1C1C1C]/35"
                              }`}
                            >
                              {active && isPlaying ? (
                                <motion.span
                                  key={`auto-${currentIndex}-${autoplayDurationSec}`}
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{
                                    duration: autoplayDurationSec,
                                    ease: "linear",
                                  }}
                                  className="absolute inset-0 origin-left rounded-full bg-[#D94F2B]"
                                />
                              ) : active ? (
                                <motion.span
                                  layoutId="wrapped-active-bar"
                                  transition={{ type: "spring", stiffness: 360, damping: 32 }}
                                  className="absolute inset-0 rounded-full bg-[#D94F2B]"
                                />
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div
                        className={`flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.09em] tabular-nums uppercase ${
                          isDark ? "text-[#F2EDE8]/70" : "text-[#1C1C1C]/65"
                        }`}
                      >
                        <span>
                          {String(currentIndex + 1).padStart(2, "0")} /{" "}
                          {String(slides.length).padStart(2, "0")}
                        </span>
                        <span aria-hidden="true">·</span>
                        <DecryptedText
                          key={`label-${activeSlide.id}-${activeSlide.label}`}
                          text={activeSlide.label}
                          speed={22}
                        />
                      </div>

                      {isFullscreen && (
                        <button
                          type="button"
                          onClick={() => void exitFullscreen()}
                          aria-label="Close full screen"
                          className={`label-mono inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
                            isDark
                              ? "border-[#F2EDE8]/25 text-[#F2EDE8] hover:bg-[#F2EDE8]/10"
                              : "border-[#1C1C1C]/20 text-[#1C1C1C] hover:bg-[#1C1C1C]/10"
                          }`}
                        >
                          <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slide body */}
                  <div className="relative z-10 my-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain sm:my-8">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeSlide.id}
                        initial={{ opacity: 0, x: direction * 22, scale: 0.99 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: direction * -22, scale: 0.99 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="my-auto flex flex-col justify-center"
                      >
                        <WrappedSlideContent slide={activeSlide} onOpenJoin={handleOpenJoin} />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Bottom navigation controls */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`relative z-10 flex items-center justify-between gap-4 border-t pt-5 ${
                      isDark ? "border-[#F2EDE8]/12" : "border-[#1C1C1C]/12"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        goPrev();
                      }}
                      disabled={currentIndex === 0}
                      className={`label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                        isDark
                          ? "border-[#F2EDE8]/20 text-[#F2EDE8] hover:bg-[#F2EDE8]/10"
                          : "border-[#1C1C1C]/18 text-[#1C1C1C] hover:bg-[#1C1C1C]/8"
                      }`}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Previous</span>
                    </button>

                    <span
                      className={`hidden font-mono text-[11px] tracking-[0.06em] uppercase sm:inline ${
                        isDark ? "text-[#F2EDE8]/45" : "text-[#1C1C1C]/50"
                      }`}
                    >
                      Tap slide or use arrow keys
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        goNext();
                      }}
                      disabled={currentIndex === slides.length - 1}
                      className={`label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-4 py-2 transition-opacity disabled:cursor-not-allowed disabled:opacity-35 ${
                        isDark
                          ? "bg-[#F2EDE8] text-[#1C1C1C] hover:opacity-90"
                          : "bg-[#1C1C1C] text-[#F2EDE8] hover:opacity-90"
                      }`}
                    >
                      <span>Next</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quiet slide chapter index */}
              <div className="mt-4 grid grid-cols-2 gap-px border border-black/[0.08] bg-black/[0.08] sm:grid-cols-4 lg:grid-cols-6">
                {slides.map((slide, idx) => {
                  const active = idx === currentIndex;
                  const numLabel = String(idx + 1).padStart(2, "0");
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        goToSlide(idx);
                      }}
                      className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors ${
                        active
                          ? "bg-[#1C1C1C] text-[#F2EDE8]"
                          : "bg-[#f7f6f4] text-[#111111]/75 hover:bg-[#efeeec] hover:text-[#111111]"
                      }`}
                    >
                      <span className="truncate text-[12.5px] font-medium">{slide.label}</span>
                      <span
                        className={`shrink-0 font-mono text-[11px] tabular-nums ${
                          active ? "text-[#D94F2B]" : "text-[#111111]/45"
                        }`}
                      >
                        {numLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Closing block (below the embed) */}
          <section className="mt-14 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-5 sm:p-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-[54ch]">
                <h2 className="text-[clamp(1.6rem,2.8vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                  {settings.closingHeadline}
                </h2>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-[#111111]/75">
                  {settings.closingBody}
                </p>
              </div>
              <MagneticAction>
                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="label-mono group inline-flex min-h-[50px] shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#D94F2B] px-7 py-3.5 text-[#F2EDE8] transition-opacity duration-200 hover:opacity-90"
                >
                  <span>Join the community</span>
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </button>
              </MagneticAction>
            </div>
          </section>

          {/* Share caption (Instagram, LinkedIn, X) */}
          <section className="mt-12 border-t border-black/[0.09] pt-10">
            <p className="label-mono text-[#D94F2B]">Share · Instagram, LinkedIn, X</p>
            <div className="mt-4 flex flex-col justify-between gap-6 rounded-[12px] border border-black/[0.08] bg-white p-5 sm:p-8 lg:flex-row lg:items-center">
              <p className="min-w-0 max-w-[66ch] break-words text-[15px] leading-[1.65] text-[#111111]/82">
                {resolvedShareCaption}
              </p>

              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <MagneticAction strength={0.14}>
                  <button
                    type="button"
                    onClick={() => void handleCopyCaption()}
                    className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#1C1C1C] px-5 py-2.5 text-[#F2EDE8] transition-opacity hover:opacity-85"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#D94F2B]" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy caption</span>
                      </>
                    )}
                  </button>
                </MagneticAction>

                <a
                  href={xShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-mono inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-black/12 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                >
                  <span>Share on X</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>

                <a
                  href={linkedInShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label-mono inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-black/12 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                >
                  <span>LinkedIn</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </MotionConfig>
  );
}

export default function WrappedPageClient() {
  return (
    <FirestoreErrorBoundary>
      <WrappedPageInner />
    </FirestoreErrorBoundary>
  );
}
