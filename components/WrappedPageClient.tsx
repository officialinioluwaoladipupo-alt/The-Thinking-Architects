"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { triggerTallyPopup } from "../lib/tally";
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

type SlideTheme = "dark" | "cream";

interface SlideMeta {
  number: string;
  label: string;
  theme: SlideTheme;
}

const SLIDES: SlideMeta[] = [
  { number: "01", label: "Cover", theme: "dark" },
  { number: "02", label: "Start", theme: "cream" },
  { number: "03", label: "Audience", theme: "dark" },
  { number: "04", label: "Coming back", theme: "dark" },
  { number: "05", label: "Think Sessions", theme: "cream" },
  { number: "06", label: "Awareness program", theme: "cream" },
  { number: "07", label: "Community", theme: "dark" },
  { number: "08", label: "How they found us", theme: "cream" },
  { number: "09", label: "Where they're from", theme: "cream" },
  { number: "10", label: "Welcome", theme: "cream" },
  { number: "11", label: "Thank you", theme: "cream" },
  { number: "12", label: "Next", theme: "dark" },
];

const SESSION_HIGHLIGHTS = [
  {
    date: "Apr 18",
    title: "Building Your Name Before You Build Buildings, with Sana Tabassum",
  },
  {
    date: "May 30",
    title: "The Project That Broke Me, and What I Built After, with Arc. Stephen Iyobosa Omwanghe",
  },
  {
    date: "Sep 26",
    title:
      "Career-Proofing: How Architects Stay Relevant and Resilient, with Arc. Ololade Babajide Suleiman and Dr. Burabari Akpe Nwako",
  },
];

const DEFAULT_WRAPPED_URL = "https://thethinkingarchitects.com.ng/wrapped";

function WrappedSlideContent({
  index,
  onOpenJoin,
}: {
  index: number;
  onOpenJoin: () => void;
}) {
  switch (index) {
    case 0:
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
            <span className="h-4 w-px bg-[#F2EDE8]/25" aria-hidden="true" />
            <span className="text-[13px] font-medium tracking-[0.06em] text-[#F2EDE8]/75 uppercase">
              The Thinking Architects
            </span>
          </motion.div>

          <h2
            className="mt-8 max-w-[14ch] text-[clamp(2.35rem,5.5vw,4.35rem)] font-medium leading-[1.03] tracking-[-0.03em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text="TTA Year Wrapped 2026" delay={0.06} stagger={0.06} />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-[36ch] text-[clamp(1.08rem,1.8vw,1.38rem)] italic leading-[1.5] text-[#F2EDE8]/84"
          >
            Our first year, in conversations.
          </motion.p>
        </div>
      );

    case 1:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[32ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-normal leading-[1.35] tracking-[-0.02em] text-[#1C1C1C]/78"
          >
            In January 2026, we started with one idea:
          </motion.p>
          <p
            className="mt-5 max-w-[20ch] text-[clamp(1.9rem,4vw,3.15rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords
              text="nobody should have to figure this profession out alone."
              delay={0.14}
              stagger={0.05}
            />
          </p>
        </div>
      );

    case 2:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(4.5rem,13.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter target={300} prefix="~" />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            people registered for at least one of our events.
          </motion.p>
        </div>
      );

    case 3:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(4.5rem,13.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter target={50} suffix="+" />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            registered for more than one session.
          </motion.p>
        </div>
      );

    case 4:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="max-w-[36ch] text-[clamp(1.2rem,2.1vw,1.65rem)] font-semibold leading-[1.25] tracking-[-0.025em] text-[#1C1C1C]">
            <BlurWords text="Real conversations with practising architects." stagger={0.04} />
          </p>
          <ul className="mt-6 divide-y divide-[#1C1C1C]/12 border-y border-[#1C1C1C]/12">
            {SESSION_HIGHLIGHTS.map((item, idx) => (
              <motion.li
                key={item.date}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.38,
                  delay: 0.14 + idx * 0.11,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex flex-col gap-1.5 py-3.5 transition-colors hover:bg-[#1C1C1C]/[0.03] sm:flex-row sm:items-baseline sm:gap-5 sm:px-2"
              >
                <span className="w-[5.2rem] shrink-0 font-mono text-[13px] font-bold tracking-[0.04em] tabular-nums text-[#D94F2B] uppercase">
                  <DecryptedText text={item.date} speed={26} />
                </span>
                <span className="text-[14.5px] leading-[1.48] font-medium text-[#1C1C1C] sm:text-[15.5px]">
                  {item.title}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      );

    case 5:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[30ch] text-[clamp(1.45rem,2.9vw,2.2rem)] font-medium leading-[1.34] tracking-[-0.025em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            On{" "}
            <span className="font-mono font-semibold text-[#D94F2B]">
              <DecryptedText text="Nov 14" speed={28} />
            </span>
            , we walked students and early-career architects through ARCON registration in{" "}
            <strong className="font-bold">Pathway to Practice</strong>, with Arc. Agboola Tomiloba
            Matthew.
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 h-[2px] w-24 origin-left bg-[#D94F2B]"
            aria-hidden="true"
          />
        </div>
      );

    case 6:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(4.5rem,13.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter target={76} />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            members have joined the community.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[360px]"
          >
            <p className="font-mono text-[13.5px] leading-[1.6] tracking-[0.02em] tabular-nums text-[#F2EDE8]/84 sm:text-[15px]">
              <RollingCounter target={40} /> are students. <RollingCounter target={26} /> are
              professionals.
            </p>
            <div
              className="mt-3 flex h-[4px] w-full overflow-hidden rounded-full bg-[#F2EDE8]/14"
              aria-hidden="true"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: `${(40 / 76) * 100}%` }}
                className="h-full origin-left bg-[#D94F2B]"
              />
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.65, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: `${(26 / 76) * 100}%` }}
                className="h-full origin-left bg-[#F2EDE8]/70"
              />
            </div>
          </motion.div>
        </div>
      );

    case 7:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.7rem,3.6vw,2.75rem)] font-medium leading-[1.22] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <strong className="font-bold text-[#D94F2B]">More than half</strong>{" "}
            <BlurWords
              text="of our members joined after attending a Think Session."
              delay={0.12}
              stagger={0.04}
            />
          </p>
          <div
            className="mt-8 h-[4px] max-w-[320px] overflow-hidden rounded-full bg-[#1C1C1C]/12"
            aria-hidden="true"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-[58%] origin-left bg-[#D94F2B]"
            />
          </div>
        </div>
      );

    case 8:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.7rem,3.6vw,2.75rem)] font-medium leading-[1.22] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text="Members from across Nigeria, led by" stagger={0.04} />{" "}
            <strong className="font-bold text-[#D94F2B]">Lagos</strong>{" "}
            <BlurWords text="and" delay={0.22} />{" "}
            <strong className="font-bold text-[#D94F2B]">Oyo</strong>.
          </p>
        </div>
      );

    case 9:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.6rem,3.3vw,2.55rem)] font-medium leading-[1.25] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords
              text="Every new member gets a welcome email from us. Nobody joins and hears nothing."
              stagger={0.04}
            />
          </p>
        </div>
      );

    case 10:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.6rem,3.3vw,2.55rem)] font-medium leading-[1.25] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords
              text="To our guests, our team, and everyone who showed up and asked a question: thank you."
              stagger={0.045}
            />
          </p>
        </div>
      );

    case 11:
    default:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[24ch] text-[clamp(1.85rem,4vw,3.15rem)] font-medium leading-[1.14] tracking-[-0.03em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords
              text="More sessions. More conversations. See you in 2027."
              stagger={0.055}
            />
          </p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8"
            onClick={(e) => e.stopPropagation()}
          >
            <MagneticAction>
              <button
                type="button"
                onClick={onOpenJoin}
                className="label-mono group inline-flex min-h-[50px] cursor-pointer items-center gap-2 rounded-xl bg-[#D94F2B] px-7 py-3.5 text-[#F2EDE8] transition-opacity duration-200 hover:opacity-90"
              >
                <span>Join the community</span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </button>
            </MagneticAction>
          </motion.div>
        </div>
      );
  }
}

function WrappedPageInner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= SLIDES.length || nextIndex === currentIndex) return;
      setDirection(nextIndex > currentIndex ? 1 : -1);
      setCurrentIndex(nextIndex);
    },
    [currentIndex],
  );

  const goNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

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
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
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

  const shareCaption = `Our first year at The Thinking Architects, in conversations. Around 300 people registered, 76 joined the community, and we're just getting started. See our Year Wrapped: ${shareUrl}`;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(shareCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored if clipboard permissions are blocked
    }
  };

  const activeSlide = SLIDES[currentIndex];
  const isDark = activeSlide.theme === "dark";

  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareCaption)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <MotionConfig reducedMotion="user">
      <SiteHeader onOpenJoin={handleOpenJoin} />

      <main className="min-h-screen bg-[#f7f6f4] pt-24 pb-24 text-[#111111] sm:pt-28">
        <div className="mx-auto max-w-[1040px] px-6">
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
              <BlurWords text="TTA Year Wrapped 2026" stagger={0.055} />
            </h1>
            <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[54ch] text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.55] text-[#111111]/78">
                Our first year, in conversations. Tap through to see what we built together.
              </p>

              <button
                type="button"
                onClick={() => void enterFullscreen()}
                className="label-mono inline-flex min-h-[44px] w-fit shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Open full screen</span>
              </button>
            </div>
          </header>

          {/* Interactive 12-slide deck */}
          <section aria-label="TTA Year Wrapped 2026 interactive slides" className="mt-7">
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
                  if (delta < -45) goNext();
                  else if (delta > 45) goPrev();
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  if (ratio < 0.3) goPrev();
                  else goNext();
                }}
                role="region"
                aria-roledescription="carousel"
                aria-label={`Slide ${currentIndex + 1} of ${SLIDES.length}: ${activeSlide.label}`}
                className={`relative flex w-full cursor-pointer select-none flex-col justify-between overflow-hidden rounded-[12px] border transition-colors duration-300 ${
                  isFullscreen
                    ? "mx-auto h-full w-full max-w-[1040px] border-white/15 p-6 sm:p-12"
                    : "min-h-[450px] border-black/[0.1] p-6 sm:min-h-[480px] sm:p-10"
                } ${isDark ? "bg-[#1C1C1C] text-[#F2EDE8]" : "bg-[#F2EDE8] text-[#1C1C1C]"}`}
              >
                {/* 21st.dev + ReactBits Spotlight, Architectural Grid & Elevation Backdrop */}
                <SpotlightStageBackdrop
                  theme={activeSlide.theme}
                  slideIndex={currentIndex}
                />

                {/* Top 12-segment animated progress bar + metadata row */}
                <div onClick={(e) => e.stopPropagation()} className="relative z-10 space-y-4">
                  <div
                    className="grid grid-cols-12 gap-1.5"
                    role="tablist"
                    aria-label="Slide progress"
                  >
                    {SLIDES.map((slide, idx) => {
                      const active = idx === currentIndex;
                      const passed = idx < currentIndex;
                      return (
                        <button
                          key={slide.number}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-label={`Go to slide ${idx + 1}: ${slide.label}`}
                          onClick={() => goToSlide(idx)}
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
                            {active && (
                              <motion.span
                                layoutId="wrapped-active-bar"
                                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                                className="absolute inset-0 rounded-full bg-[#D94F2B]"
                              />
                            )}
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
                        {activeSlide.number} / {String(SLIDES.length).padStart(2, "0")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <DecryptedText
                        key={`label-${activeSlide.number}`}
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
                <div className="relative z-10 my-8 flex flex-1 flex-col justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentIndex}
                      initial={{ opacity: 0, x: direction * 22, scale: 0.99 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: direction * -22, scale: 0.99 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-1 flex-col justify-center"
                    >
                      <WrappedSlideContent index={currentIndex} onOpenJoin={handleOpenJoin} />
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
                    onClick={goPrev}
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
                    onClick={goNext}
                    disabled={currentIndex === SLIDES.length - 1}
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
              {SLIDES.map((slide, idx) => {
                const active = idx === currentIndex;
                return (
                  <button
                    key={slide.number}
                    type="button"
                    onClick={() => goToSlide(idx)}
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
                      {slide.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Closing block (below the embed) */}
          <section className="mt-14 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7 sm:p-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-[54ch]">
                <h2 className="text-[clamp(1.6rem,2.8vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                  Be part of what comes next.
                </h2>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-[#111111]/75">
                  Join the community and we&apos;ll send you the next session invitation.
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
            <div className="mt-4 flex flex-col justify-between gap-6 rounded-[12px] border border-black/[0.08] bg-white p-6 sm:p-8 lg:flex-row lg:items-center">
              <p className="max-w-[66ch] text-[15px] leading-[1.65] text-[#111111]/82">
                {shareCaption}
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
