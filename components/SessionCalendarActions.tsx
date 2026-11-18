"use client";

import { CalendarPlus, Check, Copy, Download, Rss } from "lucide-react";
import { useEffect, useState } from "react";
import type { FirestoreSessionRecord } from "../lib/firebaseContent";
import {
  buildGoogleCalendarUrl,
  downloadSessionIcs,
  parseSessionStartMs,
  useLocalSessionTime,
} from "../lib/sessionCalendar";

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
      <a
        href={gCalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`label-mono inline-flex items-center gap-1.5 rounded-xl border border-black/12 bg-[#f7f6f4] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap ${
          compact ? "min-h-[44px] px-4 py-2.5 text-[11px]" : "min-h-[48px] px-5 py-3 text-[11px]"
        }`}
      >
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Google Calendar</span>
      </a>
      <button
        type="button"
        onClick={handleDownloadIcs}
        className={`label-mono inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/12 bg-[#f7f6f4] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap ${
          compact ? "min-h-[44px] px-4 py-2.5 text-[11px]" : "min-h-[48px] px-5 py-3 text-[11px]"
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{icsSaved ? "Saved .ics" : "Download .ics"}</span>
      </button>
    </div>
  );
}

export function SubscribeAllSessionsBar() {
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
    <div className="mt-6 flex flex-col justify-between gap-4 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex items-start gap-3">
        <Rss className="mt-0.5 h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
        <div>
          <p className="text-[14px] font-medium text-[#111111]">
            Subscribe to all Think Sessions
          </p>
          <p className="mt-0.5 text-[13px] text-[#111111]/65">
            Add our live .ics feed once to receive every newly scheduled session automatically.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {googleSubscribeUrl && (
          <a
            href={googleSubscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#111111] px-4 py-2 text-[11px] text-white transition-opacity hover:opacity-85 whitespace-nowrap"
          >
            <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Google Calendar</span>
          </a>
        )}
        {webcalUrl && (
          <a
            href={webcalUrl}
            className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[11px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap"
          >
            <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Apple / Outlook</span>
          </a>
        )}
        <button
          type="button"
          onClick={handleCopyFeed}
          className="label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[11px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-[#fe3619]" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{copied ? "Feed URL copied" : "Copy .ics link"}</span>
        </button>
      </div>
    </div>
  );
}
