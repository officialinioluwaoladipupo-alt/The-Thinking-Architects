"use client";

import { CalendarPlus, Download } from "lucide-react";
import { useState } from "react";
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
