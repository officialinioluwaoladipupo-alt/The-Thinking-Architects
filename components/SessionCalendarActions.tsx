"use client";

import { CalendarPlus, Check, Copy, Download, Rss } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { FirestoreSessionRecord } from "../lib/firebaseContent";
import {
  buildGoogleCalendarUrl,
  downloadSessionIcs,
  parseSessionStartMs,
  useLocalSessionTime,
} from "../lib/sessionCalendar";
import { SpotlightSurface } from "./MotionPrimitives";

export function SessionLocalTimeNote({
  startAtIso,
  className = "",
}: {
  startAtIso?: string;
  className?: string;
}) {
  const local = useLocalSessionTime(startAtIso);
  if (!local || !local.isDifferentFromWat) return null;

  return (
    <span className={`font-mono text-[#fe3619] tabular-nums ${className}`}>
      · {local.formattedTime} for you
    </span>
  );
}

export function SessionCalendarActions({
  session,
  compact = false,
}: {
  session: FirestoreSessionRecord;
  compact?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const [icsSaved, setIcsSaved] = useState(false);

  if (parseSessionStartMs(session.startAtIso) === null) return null;
  const gCalUrl = buildGoogleCalendarUrl(session);
  if (!gCalUrl) return null;

  const handleDownloadIcs = () => {
    const ok = downloadSessionIcs(session);
    if (ok) {
      setIcsSaved(true);
      window.setTimeout(() => setIcsSaved(false), 2400);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <motion.a
        href={gCalUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
        className={`label-mono inline-flex items-center gap-1.5 rounded-xl border border-black/12 bg-[#f7f6f4] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap ${
          compact ? "min-h-[44px] px-4 py-2.5 text-[11px]" : "min-h-[48px] px-5 py-3 text-[11px]"
        }`}
      >
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Google Calendar</span>
      </motion.a>
      <motion.button
        type="button"
        onClick={handleDownloadIcs}
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
        className={`label-mono inline-flex cursor-pointer items-center gap-1.5 overflow-hidden rounded-xl border border-black/12 bg-[#f7f6f4] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap ${
          compact ? "min-h-[44px] px-4 py-2.5 text-[11px]" : "min-h-[48px] px-5 py-3 text-[11px]"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {icsSaved ? (
            <motion.span
              key="ics-saved"
              initial={prefersReduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5 shrink-0 text-[#fe3619]" aria-hidden="true" />
              <span>Saved .ics</span>
            </motion.span>
          ) : (
            <motion.span
              key="ics-idle"
              initial={prefersReduced ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Download .ics</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

export function SubscribeAllSessionsBar() {
  const prefersReduced = useReducedMotion();
  const [feedUrl, setFeedUrl] = useState("/api/sessions/calendar.ics");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFeedUrl(`${window.location.origin}/api/sessions/calendar.ics`);
    }
  }, []);

  const webcalUrl = feedUrl.startsWith("http")
    ? feedUrl.replace(/^https?:\/\//i, "webcal://")
    : "";
  const googleSubscribeUrl = webcalUrl
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`
    : "";

  const handleCopyFeed = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <SpotlightSurface
      spotlightColor="rgba(254, 54, 25, 0.05)"
      className="mt-6 flex flex-col justify-between gap-4 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Rss className="mt-0.5 h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#111111]">
            Subscribe to all Think Sessions
          </p>
          <p className="mt-0.5 break-words text-[13px] text-[#111111]/65">
            Add our live .ics feed once to receive every newly scheduled session automatically.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {googleSubscribeUrl && (
          <motion.a
            href={googleSubscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#111111] px-4 py-2 text-[11px] text-white transition-opacity hover:opacity-85 whitespace-nowrap"
          >
            <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Google Calendar</span>
          </motion.a>
        )}
        {webcalUrl && (
          <motion.a
            href={webcalUrl}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[11px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap"
          >
            <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Apple / Outlook</span>
          </motion.a>
        )}
        <motion.button
          type="button"
          onClick={handleCopyFeed}
          whileTap={prefersReduced ? undefined : { scale: 0.97 }}
          className="label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[11px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="feed-copied"
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="inline-flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5 shrink-0 text-[#fe3619]" aria-hidden="true" />
                <span>Feed URL copied</span>
              </motion.span>
            ) : (
              <motion.span
                key="feed-copy"
                initial={prefersReduced ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="inline-flex items-center gap-1.5"
              >
                <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Copy .ics link</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </SpotlightSurface>
  );
}
