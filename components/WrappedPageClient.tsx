"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  Copy,
  Download,
  EyeOff,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SlidersHorizontal,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_WRAPPED_CONFIG,
  subscribePublishedWrappedEditions,
  subscribeWrappedConfig,
  type WrappedConfigRecord,
  type WrappedEditionRecord,
} from "../lib/firebaseContent";
import { triggerTallyPopup } from "../lib/tally";
import { useFirebase } from "./FirebaseProvider";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { WrappedCountdownClock } from "./WrappedCountdownClock";
import {
  BlurWords,
  DecryptedText,
  MagneticAction,
  RollingCounter,
  SpotlightStageBackdrop,
} from "./WrappedPrimitives";

type SlideTheme = "dark" | "cream";

interface SlideMeta {
  key: string;
  number: string;
  label: string;
  theme: SlideTheme;
}

const DEFAULT_WRAPPED_URL = "https://thethinkingarchitects.com.ng/wrapped";

function parseSessionHighlight(raw: string): { date: string; title: string } {
  const parts = raw.split("|");
  if (parts.length >= 2) {
    return {
      date: parts[0].trim(),
      title: parts.slice(1).join("|").trim(),
    };
  }
  return { date: "Session", title: raw.trim() };
}

function parseCustomStat(raw: string): { value: string; label: string; detail: string } {
  const parts = raw.split("|").map((p) => p.trim());
  return {
    value: parts[0] || "—",
    label: parts[1] || "Milestone",
    detail: parts.slice(2).join(" · ") || "",
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = words[i];
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
  }
}

function downloadWrappedSummaryCard(config: WrappedConfigRecord) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background paper
  ctx.fillStyle = "#1C1C1C";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(242, 237, 232, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 72; x < canvas.width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 72; y < canvas.height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Accent top bar
  ctx.fillStyle = "#D94F2B";
  ctx.fillRect(84, 84, 120, 6);

  // Brand header
  ctx.fillStyle = "#D94F2B";
  ctx.font = "700 42px system-ui, -apple-system, sans-serif";
  ctx.fillText("TTA", 84, 154);

  ctx.fillStyle = "rgba(242, 237, 232, 0.72)";
  ctx.font = "600 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText("THE THINKING ARCHITECTS", 184, 150);

  // Title
  ctx.fillStyle = "#F2EDE8";
  ctx.font = "600 72px system-ui, -apple-system, sans-serif";
  wrapCanvasText(ctx, config.pageTitle, 84, 270, 912, 84);

  ctx.fillStyle = "rgba(242, 237, 232, 0.72)";
  ctx.font = "400 32px system-ui, -apple-system, sans-serif";
  wrapCanvasText(ctx, config.coverSubtitle, 84, 430, 912, 46);

  // Three stat blocks
  const stats = [
    {
      value: `${config.audiencePrefix}${config.audienceCount}${config.audienceSuffix}`,
      label: "EVENT REGISTRATIONS",
    },
    {
      value: `${config.returningCount}${config.returningSuffix}`,
      label: "REPEAT ATTENDEES",
    },
    {
      value: `${config.communityTotal}`,
      label: "COMMUNITY MEMBERS",
    },
  ];

  const cardY = 560;
  const cardH = 260;
  const cardW = 288;
  const gap = 24;

  stats.forEach((stat, idx) => {
    const cx = 84 + idx * (cardW + gap);
    ctx.fillStyle = "rgba(242, 237, 232, 0.04)";
    drawRoundedRect(ctx, cx, cardY, cardW, cardH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(242, 237, 232, 0.14)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#D94F2B";
    ctx.font = "700 72px system-ui, -apple-system, sans-serif";
    ctx.fillText(stat.value, cx + 28, cardY + 120);

    ctx.fillStyle = "rgba(242, 237, 232, 0.7)";
    ctx.font = "700 18px ui-monospace, SFMono-Regular, monospace";
    wrapCanvasText(ctx, stat.label, cx + 28, cardY + 184, cardW - 56, 26);
  });

  // Closing thesis
  ctx.fillStyle = "#F2EDE8";
  ctx.font = "500 38px system-ui, -apple-system, sans-serif";
  wrapCanvasText(ctx, `“${config.startStatement}”`, 84, 960, 912, 52);

  // Footer
  ctx.strokeStyle = "rgba(242, 237, 232, 0.14)";
  ctx.beginPath();
  ctx.moveTo(84, 1200);
  ctx.lineTo(996, 1200);
  ctx.stroke();

  ctx.fillStyle = "rgba(242, 237, 232, 0.58)";
  ctx.font = "600 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(`ANNUAL REVIEW · ${config.yearLabel.toUpperCase()}`, 84, 1258);
  ctx.fillText("THETHINKINGARCHITECTS.COM.NG", 570, 1258);

  const link = document.createElement("a");
  link.download = `tta-wrapped-${config.yearLabel || "2026"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function WrappedSlideContent({
  slideKey,
  config,
  onOpenJoin,
}: {
  slideKey: string;
  config: WrappedConfigRecord;
  onOpenJoin: () => void;
}) {
  const highlights = config.sessionHighlights.map(parseSessionHighlight);
  const customCards = config.customStats.map(parseCustomStat);
  const splitDenominator = Math.max(
    config.communityTotal,
    config.studentsCount + config.professionalsCount,
    1,
  );

  switch (slideKey) {
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
            <span className="h-4 w-px bg-[#F2EDE8]/25" aria-hidden="true" />
            <span className="text-[13px] font-medium tracking-[0.06em] text-[#F2EDE8]/75 uppercase">
              The Thinking Architects
            </span>
          </motion.div>

          <h2
            className="mt-8 max-w-[14ch] text-[clamp(2.35rem,5.5vw,4.35rem)] font-medium leading-[1.03] tracking-[-0.03em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={config.coverTitle} delay={0.06} stagger={0.06} />
          </h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-[36ch] text-[clamp(1.08rem,1.8vw,1.38rem)] italic leading-[1.5] text-[#F2EDE8]/84"
          >
            {config.coverSubtitle}
          </motion.p>
        </div>
      );

    case "start":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[32ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-normal leading-[1.35] tracking-[-0.02em] text-[#1C1C1C]/78"
          >
            {config.startLead}
          </motion.p>
          <p
            className="mt-5 max-w-[20ch] text-[clamp(1.9rem,4vw,3.15rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={config.startStatement} delay={0.14} stagger={0.05} />
          </p>
        </div>
      );

    case "audience":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(4.5rem,13.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter
              target={config.audienceCount}
              prefix={config.audiencePrefix}
              suffix={config.audienceSuffix}
            />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            {config.audienceCaption}
          </motion.p>
        </div>
      );

    case "returning":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(4.5rem,13.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter target={config.returningCount} suffix={config.returningSuffix} />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            {config.returningCaption}
          </motion.p>
        </div>
      );

    case "sessions":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="max-w-[36ch] text-[clamp(1.2rem,2.1vw,1.65rem)] font-semibold leading-[1.25] tracking-[-0.025em] text-[#1C1C1C]">
            <BlurWords text={config.sessionsHeading} stagger={0.04} />
          </p>
          <ul className="mt-6 divide-y divide-[#1C1C1C]/12 border-y border-[#1C1C1C]/12">
            {highlights.map((item, idx) => (
              <motion.li
                key={`${item.date}-${idx}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.38,
                  delay: 0.14 + idx * 0.09,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex flex-col gap-1.5 py-3 transition-colors hover:bg-[#1C1C1C]/[0.03] sm:flex-row sm:items-baseline sm:gap-5 sm:px-2"
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

    case "awareness":
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
              <DecryptedText text={config.awarenessDate} speed={28} />
            </span>
            , {config.awarenessPrefix}{" "}
            <strong className="font-bold">{config.awarenessProgramTitle}</strong>,{" "}
            {config.awarenessSpeaker}
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

    case "community":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-[clamp(4.5rem,13.5vw,8.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-[#D94F2B]">
            <RollingCounter target={config.communityTotal} />
          </p>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-[28ch] text-[clamp(1.3rem,2.3vw,1.8rem)] font-medium leading-[1.3] tracking-[-0.02em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            {config.communityCaption}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-[360px]"
          >
            <p className="font-mono text-[13.5px] leading-[1.6] tracking-[0.02em] tabular-nums text-[#F2EDE8]/84 sm:text-[15px]">
              <RollingCounter target={config.studentsCount} /> are students.{" "}
              <RollingCounter target={config.professionalsCount} /> are professionals.
            </p>
            <div
              className="mt-3 flex h-[4px] w-full overflow-hidden rounded-full bg-[#F2EDE8]/14"
              aria-hidden="true"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: `${(config.studentsCount / splitDenominator) * 100}%` }}
                className="h-full origin-left bg-[#D94F2B]"
              />
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.65, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: `${(config.professionalsCount / splitDenominator) * 100}%` }}
                className="h-full origin-left bg-[#F2EDE8]/70"
              />
            </div>
          </motion.div>
        </div>
      );

    case "discovery":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.7rem,3.6vw,2.75rem)] font-medium leading-[1.22] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <strong className="font-bold text-[#D94F2B]">{config.discoveryHighlight}</strong>{" "}
            <BlurWords text={config.discoveryBody} delay={0.12} stagger={0.04} />
          </p>
          <div
            className="mt-8 h-[4px] max-w-[320px] overflow-hidden rounded-full bg-[#1C1C1C]/12"
            aria-hidden="true"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: `${Math.min(100, Math.max(1, config.discoveryPercent))}%` }}
              className="h-full origin-left bg-[#D94F2B]"
            />
          </div>
        </div>
      );

    case "locations":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.7rem,3.6vw,2.75rem)] font-medium leading-[1.22] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={config.locationsLead} stagger={0.04} />{" "}
            <strong className="font-bold text-[#D94F2B]">{config.locationPrimary}</strong>
            {config.locationSecondary ? (
              <>
                {" "}
                <BlurWords text="and" delay={0.22} />{" "}
                <strong className="font-bold text-[#D94F2B]">{config.locationSecondary}</strong>
              </>
            ) : null}
            .
          </p>
          {config.extraLocations.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2">
              {config.extraLocations.map((loc) => (
                <span
                  key={loc}
                  className="rounded-lg border border-[#1C1C1C]/15 bg-[#1C1C1C]/[0.04] px-3 py-1.5 font-mono text-[12px] font-medium text-[#1C1C1C]/80"
                >
                  {loc}
                </span>
              ))}
            </div>
          )}
        </div>
      );

    case "welcome":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.6rem,3.3vw,2.55rem)] font-medium leading-[1.25] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={config.welcomeStatement} stagger={0.04} />
          </p>
        </div>
      );

    case "thanks":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[26ch] text-[clamp(1.6rem,3.3vw,2.55rem)] font-medium leading-[1.25] tracking-[-0.03em] text-[#1C1C1C]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={config.thankYouStatement} stagger={0.045} />
          </p>
        </div>
      );

    case "milestones":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p className="font-mono text-[11px] font-bold tracking-[0.09em] text-[#D94F2B] uppercase">
            More Numbers · {config.yearLabel}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customCards.map((card, idx) => (
              <motion.div
                key={`${card.label}-${idx}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, delay: idx * 0.08 }}
                className="rounded-xl border border-[#F2EDE8]/14 bg-white/[0.03] p-5"
              >
                <p className="text-[clamp(1.85rem,3vw,2.5rem)] font-bold leading-none tracking-[-0.03em] text-[#D94F2B]">
                  {card.value}
                </p>
                <p className="mt-2.5 text-[15px] font-semibold text-[#F2EDE8]">{card.label}</p>
                {card.detail ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-[#F2EDE8]/65">
                    {card.detail}
                  </p>
                ) : null}
              </motion.div>
            ))}
          </div>
        </div>
      );

    case "next":
    default:
      return (
        <div className="flex flex-1 flex-col justify-center">
          <p
            className="max-w-[24ch] text-[clamp(1.85rem,4vw,3.15rem)] font-medium leading-[1.14] tracking-[-0.03em] text-[#F2EDE8]"
            style={{ textWrap: "balance" }}
          >
            <BlurWords text={config.closingStatement} stagger={0.055} />
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
                <span>{config.closingCtaLabel}</span>
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
  const { isAdmin } = useFirebase();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedYear = searchParams.get("year")?.trim() ?? "";

  const [publicConfig, setPublicConfig] = useState<WrappedConfigRecord>({
    ...DEFAULT_WRAPPED_CONFIG,
    exists: false,
  });
  const [publishedEditions, setPublishedEditions] = useState<WrappedEditionRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const requested = Number(searchParams.get("slide"));
    return Number.isInteger(requested) && requested >= 1 ? requested - 1 : 0;
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [baseShareUrl, setBaseShareUrl] = useState(DEFAULT_WRAPPED_URL);

  const deckContainerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubPublic = subscribeWrappedConfig(
      (data) => setPublicConfig(data),
      () => {
        // Fallback to DEFAULT_WRAPPED_CONFIG on transient error
      },
      "public",
    );
    const unsubEditions = subscribePublishedWrappedEditions(
      (list) => setPublishedEditions(list),
      () => {
        // Optional archives list; public config alone remains resilient
      },
    );
    return () => {
      unsubPublic();
      unsubEditions();
    };
  }, []);

  const availableEditions: WrappedEditionRecord[] = useMemo(() => {
    const byYear = new Map<string, WrappedEditionRecord>();
    if (publicConfig.enabled) {
      byYear.set(publicConfig.yearLabel.trim() || "2026", {
        id: "public",
        ...publicConfig,
      });
    }
    for (const item of publishedEditions) {
      const yearKey = item.yearLabel.trim() || item.id.replace(/^year-/, "");
      if (!byYear.has(yearKey)) {
        byYear.set(yearKey, item);
      }
    }
    return Array.from(byYear.values()).sort((a, b) =>
      b.yearLabel.localeCompare(a.yearLabel, undefined, { numeric: true }),
    );
  }, [publicConfig, publishedEditions]);

  const matchedArchive = useMemo(() => {
    if (!requestedYear) return null;
    return (
      availableEditions.find(
        (ed) => ed.yearLabel.trim() === requestedYear || ed.id === `year-${requestedYear}`,
      ) ?? null
    );
  }, [availableEditions, requestedYear]);

  const config: WrappedConfigRecord = matchedArchive ?? availableEditions[0] ?? publicConfig;
  const activeEditionId = matchedArchive?.id ?? availableEditions[0]?.id ?? "public";
  const showHoldingScreen = !config.enabled && !isAdmin;

  const slides: SlideMeta[] = useMemo(() => {
    const base: SlideMeta[] = [
      { key: "cover", number: "01", label: "Cover", theme: "dark" },
      { key: "start", number: "02", label: "Start", theme: "cream" },
      { key: "audience", number: "03", label: "Audience", theme: "dark" },
      { key: "returning", number: "04", label: "Coming back", theme: "dark" },
      { key: "sessions", number: "05", label: "Think Sessions", theme: "cream" },
      { key: "awareness", number: "06", label: "Awareness program", theme: "cream" },
      { key: "community", number: "07", label: "Community", theme: "dark" },
      { key: "discovery", number: "08", label: "How they found us", theme: "cream" },
      { key: "locations", number: "09", label: "Where they're from", theme: "cream" },
      { key: "welcome", number: "10", label: "Welcome", theme: "cream" },
      { key: "thanks", number: "11", label: "Thank you", theme: "cream" },
    ];
    if (config.customStats.length > 0) {
      base.push({ key: "milestones", number: "12", label: "Milestones", theme: "dark" });
      base.push({ key: "next", number: "13", label: "Next", theme: "dark" });
    } else {
      base.push({ key: "next", number: "12", label: "Next", theme: "dark" });
    }
    return base;
  }, [config.customStats.length]);

  const safeIndex = Math.min(currentIndex, Math.max(0, slides.length - 1));

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.href) {
      setBaseShareUrl(window.location.href.split("#")[0].split("?")[0]);
    }
  }, []);

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= slides.length || nextIndex === safeIndex) return;
      setDirection(nextIndex > safeIndex ? 1 : -1);
      setCurrentIndex(nextIndex);
    },
    [safeIndex, slides.length],
  );

  const goNext = useCallback(() => {
    if (safeIndex < slides.length - 1) {
      setDirection(1);
      setCurrentIndex(safeIndex + 1);
    } else {
      setAutoPlay(false);
    }
  }, [safeIndex, slides.length]);

  const goPrev = useCallback(() => {
    if (safeIndex > 0) {
      setDirection(-1);
      setCurrentIndex(safeIndex - 1);
    }
  }, [safeIndex]);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      goNext();
    }, 5200);
    return () => window.clearInterval(timer);
  }, [autoPlay, goNext]);

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
        setAutoPlay(false);
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setAutoPlay(false);
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

  // Holding screen when Wrapped is turned OFF (for non-admin visitors)
  if (showHoldingScreen) {
    return (
      <MotionConfig reducedMotion="user">
        <SiteHeader onOpenJoin={handleOpenJoin} />
        <main className="min-h-screen bg-[#f7f6f4] pt-28 pb-24 text-[#111111]">
          <div className="mx-auto max-w-[780px] px-6">
            <Link
              href="/"
              className="label-mono inline-flex items-center gap-2 text-[#111111]/60 transition-colors hover:text-[#111111]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Home</span>
            </Link>

            <section className="mt-8 rounded-2xl border border-black/[0.1] bg-[#1C1C1C] p-8 text-[#F2EDE8] sm:p-12">
              <p className="label-mono text-[#D94F2B]">{config.eyebrow}</p>
              <h1
                className="mt-3 text-[clamp(2rem,4.5vw,3.2rem)] font-medium leading-[1.08] tracking-[-0.03em]"
                style={{ textWrap: "balance" }}
              >
                {config.offlineTitle}
              </h1>
              <p className="mt-4 max-w-[50ch] text-[16px] leading-[1.6] text-[#F2EDE8]/78">
                {config.offlineMessage}
              </p>

              {config.homeCountdownEnabled && config.launchDateIso.trim() && (
                <div className="mt-7">
                  <p className="label-mono mb-3 text-[#F2EDE8]/55">Next edition countdown</p>
                  <WrappedCountdownClock targetIso={config.launchDateIso} variant="dark" />
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="label-mono inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-[#D94F2B] px-6 py-3 text-[#F2EDE8] transition-opacity hover:opacity-90"
                >
                  <span>Join the community</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <Link
                  href="/sessions"
                  className="label-mono inline-flex min-h-[48px] items-center rounded-xl border border-[#F2EDE8]/20 px-5 py-3 text-[#F2EDE8] transition-colors hover:bg-[#F2EDE8]/10"
                >
                  Explore Think Sessions
                </Link>
              </div>
            </section>
          </div>
        </main>
        <SiteFooter />
        <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      </MotionConfig>
    );
  }

  const activeSlide = slides[safeIndex] ?? slides[0];
  const isDark = activeSlide.theme === "dark";
  const shareUrl =
    activeEditionId === "public" && !requestedYear
      ? baseShareUrl
      : `${baseShareUrl}?year=${encodeURIComponent(config.yearLabel)}`;

  const fullShareCaption = `${config.shareCaption.trim()} See our Year Wrapped: ${shareUrl}`;

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(fullShareCaption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback ignored if clipboard permissions are blocked
    }
  };

  const handleSelectYear = (edition: WrappedEditionRecord) => {
    setAutoPlay(false);
    setCurrentIndex(0);
    if (edition.id === "public" && edition.yearLabel === publicConfig.yearLabel) {
      router.replace("/wrapped", { scroll: false });
    } else {
      router.replace(`/wrapped?year=${encodeURIComponent(edition.yearLabel)}`, { scroll: false });
    }
  };

  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareCaption)}`;
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const customMilestoneCards = config.customStats.map(parseCustomStat);

  return (
    <MotionConfig reducedMotion="user">
      <SiteHeader onOpenJoin={handleOpenJoin} />

      <main className="min-h-screen bg-[#f7f6f4] pt-24 pb-24 text-[#111111] sm:pt-28">
        <div className="mx-auto max-w-[1040px] px-6">
          {!config.enabled && isAdmin && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fe3619]/35 bg-[#fe3619]/10 px-5 py-3.5 text-[13.5px]">
              <div className="flex items-center gap-2.5 font-medium text-[#111111]">
                <EyeOff className="h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
                <span>
                  Wrapped is currently <strong>OFFLINE</strong> for visitors. You are seeing Admin
                  Preview Mode.
                </span>
              </div>
              <Link
                href="/admin"
                className="label-mono inline-flex items-center gap-1.5 rounded-lg bg-[#111111] px-3.5 py-2 text-white"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Edit in Console</span>
              </Link>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="label-mono inline-flex items-center gap-2 text-[#111111]/60 transition-colors hover:text-[#111111]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Home</span>
            </Link>

            {availableEditions.length > 1 && (
              <div
                aria-label="Wrapped archive year switcher"
                className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-black/10 bg-[#efeeec] p-1"
              >
                <span className="inline-flex items-center gap-1.5 px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.07em] text-[#111111]/55">
                  <Calendar className="h-3 w-3 text-[#fe3619]" aria-hidden="true" />
                  <span>Edition</span>
                </span>
                {availableEditions.map((edition) => {
                  const selected = edition.id === activeEditionId;
                  return (
                    <button
                      key={edition.id}
                      type="button"
                      onClick={() => handleSelectYear(edition)}
                      aria-pressed={selected}
                      className={`label-mono min-h-[34px] cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
                        selected
                          ? "bg-[#111111] text-white"
                          : "text-[#111111]/70 hover:bg-black/5 hover:text-[#111111]"
                      }`}
                    >
                      {edition.yearLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Page header */}
          <header className="mt-5 border-b border-black/[0.09] pb-7">
            <p className="label-mono text-[#D94F2B]">{config.eyebrow}</p>
            <h1
              className="mt-2 max-w-[18ch] text-[clamp(2.1rem,4.5vw,3.75rem)] font-medium leading-[1.04] tracking-[-0.035em]"
              style={{ textWrap: "balance" }}
            >
              <BlurWords key={config.pageTitle} text={config.pageTitle} stagger={0.055} />
            </h1>
            <div className="mt-3.5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-[54ch] text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.55] text-[#111111]/78">
                {config.pageSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAutoPlay((p) => !p)}
                  className={`label-mono inline-flex min-h-[44px] w-fit shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                    autoPlay
                      ? "border-[#D94F2B] bg-[#D94F2B] text-white"
                      : "border-black/15 bg-[#efeeec] text-[#111111] hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                  }`}
                >
                  {autoPlay ? (
                    <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{autoPlay ? "Pause tour" : "Auto-play"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void enterFullscreen()}
                  className="label-mono inline-flex min-h-[44px] w-fit shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open full screen</span>
                </button>
              </div>
            </div>
          </header>

          {/* Interactive slide deck */}
          <section aria-label={`${config.pageTitle} interactive slides`} className="mt-7">
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
                    setAutoPlay(false);
                    goNext();
                  } else if (delta > 45) {
                    setAutoPlay(false);
                    goPrev();
                  }
                }}
                onClick={(e) => {
                  setAutoPlay(false);
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  if (ratio < 0.3) goPrev();
                  else goNext();
                }}
                role="region"
                aria-roledescription="carousel"
                aria-label={`Slide ${safeIndex + 1} of ${slides.length}: ${activeSlide.label}`}
                className={`relative flex w-full cursor-pointer select-none flex-col justify-between overflow-hidden rounded-[12px] border transition-colors duration-300 ${
                  isFullscreen
                    ? "mx-auto h-full w-full max-w-[1040px] border-white/15 p-6 sm:p-12"
                    : "min-h-[450px] border-black/[0.1] p-6 sm:min-h-[480px] sm:p-10"
                } ${isDark ? "bg-[#1C1C1C] text-[#F2EDE8]" : "bg-[#F2EDE8] text-[#1C1C1C]"}`}
              >
                <SpotlightStageBackdrop
                  theme={activeSlide.theme}
                  slideIndex={safeIndex}
                />

                {/* Top progress bar + metadata row */}
                <div onClick={(e) => e.stopPropagation()} className="relative z-10 space-y-4">
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }}
                    role="tablist"
                    aria-label="Slide progress"
                  >
                    {slides.map((slide, idx) => {
                      const active = idx === safeIndex;
                      const passed = idx < safeIndex;
                      return (
                        <button
                          key={slide.key}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-label={`Go to slide ${idx + 1}: ${slide.label}`}
                          onClick={() => {
                            setAutoPlay(false);
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
                        {activeSlide.number} / {String(slides.length).padStart(2, "0")}
                      </span>
                      <span aria-hidden="true">·</span>
                      <DecryptedText
                        key={`label-${activeEditionId}-${activeSlide.key}`}
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
                      key={`${activeEditionId}-${activeSlide.key}`}
                      initial={{ opacity: 0, x: direction * 22, scale: 0.99 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: direction * -22, scale: 0.99 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-1 flex-col justify-center"
                    >
                      <WrappedSlideContent
                        slideKey={activeSlide.key}
                        config={config}
                        onOpenJoin={handleOpenJoin}
                      />
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
                      setAutoPlay(false);
                      goPrev();
                    }}
                    disabled={safeIndex === 0}
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
                      setAutoPlay(false);
                      goNext();
                    }}
                    disabled={safeIndex === slides.length - 1}
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

            {/* Slide chapter index */}
            <div className="mt-4 grid grid-cols-2 gap-px border border-black/[0.08] bg-black/[0.08] sm:grid-cols-4 lg:grid-cols-6">
              {slides.map((slide, idx) => {
                const active = idx === safeIndex;
                return (
                  <button
                    key={slide.key}
                    type="button"
                    onClick={() => {
                      setAutoPlay(false);
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
                      {slide.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {customMilestoneCards.length > 0 && (
            <section className="mt-10 border-t border-black/[0.09] pt-8">
              <p className="label-mono text-[#D94F2B]">Additional Highlights · {config.yearLabel}</p>
              <div className="mt-4 grid gap-px border border-black/[0.09] bg-black/[0.09] sm:grid-cols-2 lg:grid-cols-3">
                {customMilestoneCards.map((card, idx) => (
                  <div key={`${card.label}-${idx}`} className="bg-[#f7f6f4] p-6">
                    <p className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-[#D94F2B]">
                      {card.value}
                    </p>
                    <p className="mt-2.5 text-[15px] font-semibold text-[#111111]">{card.label}</p>
                    {card.detail ? (
                      <p className="mt-1 text-[13.5px] leading-relaxed text-[#111111]/68">
                        {card.detail}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Closing block */}
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
                  <span>{config.closingCtaLabel}</span>
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </button>
              </MagneticAction>
            </div>
          </section>

          {/* Share caption & downloadable summary card */}
          <section className="mt-12 border-t border-black/[0.09] pt-10">
            <p className="label-mono text-[#D94F2B]">Share · Instagram, LinkedIn, X</p>
            <div className="mt-4 flex flex-col justify-between gap-6 rounded-[12px] border border-black/[0.08] bg-white p-6 sm:p-8 lg:flex-row lg:items-center">
              <p className="max-w-[60ch] text-[15px] leading-[1.65] text-[#111111]/82">
                {fullShareCaption}
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

                <button
                  type="button"
                  onClick={() => downloadWrappedSummaryCard(config)}
                  className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-black/12 bg-[#efeeec] px-4 py-2.5 text-[#111111] transition-colors hover:bg-[#1C1C1C] hover:text-[#F2EDE8]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save PNG Card</span>
                </button>

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
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#f7f6f4] pt-32 text-center font-mono text-xs uppercase tracking-[0.08em] text-[#111111]/60">
            Loading Year Wrapped...
          </div>
        }
      >
        <WrappedPageInner />
      </Suspense>
    </FirestoreErrorBoundary>
  );
}
