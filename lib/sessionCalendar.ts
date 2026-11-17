"use client";

import { useEffect, useState } from "react";
import type { FirestoreSessionRecord } from "./firebaseContent";

export type LocalTimeDisplay = {
  formattedTime: string;
  formattedDate: string;
  timezoneName: string;
  isDifferentFromWat: boolean;
};

export function parseSessionStartMs(startAtIso?: string): number | null {
  if (!startAtIso) return null;
  const trimmed = startAtIso.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Converts a stored ISO timestamp (e.g. "2026-11-28T18:00:00+01:00")
 * into a "+01:00" WAT datetime-local input value ("YYYY-MM-DDTHH:mm").
 */
export function isoToWatDatetimeLocal(iso?: string): string {
  const ms = parseSessionStartMs(iso);
  if (ms === null) return "";
  // Shift to WAT (UTC+1) to format YYYY-MM-DDTHH:mm cleanly
  const watDate = new Date(ms + 60 * 60 * 1000);
  const year = watDate.getUTCFullYear();
  const month = String(watDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(watDate.getUTCDate()).padStart(2, "0");
  const hour = String(watDate.getUTCHours()).padStart(2, "0");
  const min = String(watDate.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${min}`;
}

/**
 * Converts a datetime-local string ("YYYY-MM-DDTHH:mm") entered in WAT (UTC+1)
 * to a canonical ISO-8601 string with explicit "+01:00" offset.
 */
export function watDatetimeLocalToIso(localVal: string): string {
  const trimmed = localVal.trim();
  if (!trimmed) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return "";
  return `${trimmed}:00+01:00`;
}

export function formatTimezonePreview(iso: string, timeZone: string): string {
  const ms = parseSessionStartMs(iso);
  if (ms === null) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(ms));
  } catch {
    return "";
  }
}

export function useLocalSessionTime(startAtIso?: string): LocalTimeDisplay | null {
  const [display, setDisplay] = useState<LocalTimeDisplay | null>(null);

  useEffect(() => {
    const ms = parseSessionStartMs(startAtIso);
    if (ms === null) {
      setDisplay(null);
      return;
    }

    try {
      const dateObj = new Date(ms);
      const resolvedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const localTime = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(dateObj);
      const localDate = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(dateObj);

      // WAT is UTC+1 (negative getTimezoneOffset === -60 in JS)
      const isWatOffset = dateObj.getTimezoneOffset() === -60;
      const isLagosZone = resolvedZone === "Africa/Lagos";

      setDisplay({
        formattedTime: localTime,
        formattedDate: localDate,
        timezoneName: resolvedZone,
        isDifferentFromWat: !(isWatOffset || isLagosZone),
      });
    } catch {
      setDisplay(null);
    }
  }, [startAtIso]);

  return display;
}

function toUtcCalendarStamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}Z`
  );
}

export function buildGoogleCalendarUrl(
  session: Pick<
    FirestoreSessionRecord,
    "id" | "number" | "title" | "speaker" | "speakerRole" | "summary" | "registrationUrl" | "startAtIso"
  >,
): string | null {
  const startMs = parseSessionStartMs(session.startAtIso);
  if (startMs === null) return null;
  const endMs = startMs + 60 * 60 * 1000;

  const title = `The Thinking Architects: ${session.title} (${session.number})`;
  const sessionPageUrl = `https://thethinkingarchitects.com.ng/sessions/${encodeURIComponent(session.id)}`;
  const detailsLines = [
    `Speaker: ${session.speaker} (${session.speakerRole})`,
    "",
    session.summary,
    "",
    `Session details: ${sessionPageUrl}`,
  ];
  if (session.registrationUrl?.startsWith("https://")) {
    detailsLines.push(`Register / Join: ${session.registrationUrl}`);
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toUtcCalendarStamp(startMs)}/${toUtcCalendarStamp(endMs)}`,
    details: detailsLines.join("\n"),
    location: "Online Live Session · The Thinking Architects",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function downloadSessionIcs(
  session: Pick<
    FirestoreSessionRecord,
    "id" | "number" | "title" | "speaker" | "speakerRole" | "summary" | "registrationUrl" | "startAtIso"
  >,
): boolean {
  const startMs = parseSessionStartMs(session.startAtIso);
  if (startMs === null) return false;
  const endMs = startMs + 60 * 60 * 1000;
  const nowStamp = toUtcCalendarStamp(Date.now());
  const sessionPageUrl = `https://thethinkingarchitects.com.ng/sessions/${encodeURIComponent(session.id)}`;

  const descriptionParts = [
    `Think Session (${session.number}) with ${session.speaker} — ${session.speakerRole}`,
    "",
    session.summary,
    "",
    `Session link: ${sessionPageUrl}`,
  ];
  if (session.registrationUrl?.startsWith("https://")) {
    descriptionParts.push(`RSVP / Join: ${session.registrationUrl}`);
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Thinking Architects//Think Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${session.id}@thethinkingarchitects.com.ng`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${toUtcCalendarStamp(startMs)}`,
    `DTEND:${toUtcCalendarStamp(endMs)}`,
    `SUMMARY:${escapeIcsText(`TTA Think Session: ${session.title}`)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n"))}`,
    `LOCATION:${escapeIcsText("Online Live Session · The Thinking Architects")}`,
    `URL:${sessionPageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `tta-${session.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  return true;
}
