import type { FirestoreSessionRecord } from "./firebaseContent";
import { TALLY_FORM_URL } from "./tally";

export const DEFAULT_SITE_ORIGIN = "https://thethinkingarchitects.com.ng";

const LIVE_CALL_HOSTS = [
  "meet.google.com",
  "zoom.us",
  "teams.microsoft.com",
  "teams.live.com",
  "whereby.com",
  "meet.jit.si",
];

export function parseSessionStartMs(startAtIso?: string): number | null {
  if (!startAtIso) return null;
  const trimmed = startAtIso.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

export function toUtcCalendarStamp(ms: number): string {
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

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return chunks.join("\r\n");
}

function isLiveCallUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return LIVE_CALL_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return true;
  }
}

export function buildSessionPageUrl(sessionId: string, siteOrigin = DEFAULT_SITE_ORIGIN): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  return `${origin}/sessions/${encodeURIComponent(sessionId)}`;
}

/**
 * Matches the "Reserve your place" button behavior: returns the session's custom
 * Luma / registration HTTPS URL, excluding the global Tally form and any live call URLs.
 */
export function getSessionLumaRegistrationUrl(
  session: Pick<FirestoreSessionRecord, "registrationUrl">,
): string | null {
  const raw = (session.registrationUrl ?? "").trim();
  if (!raw.startsWith("https://")) return null;
  if (raw === TALLY_FORM_URL) return null;
  if (isLiveCallUrl(raw)) return null;
  return raw;
}

export type CalendarEventSession = Pick<
  FirestoreSessionRecord,
  | "id"
  | "number"
  | "title"
  | "speaker"
  | "speakerRole"
  | "summary"
  | "registrationUrl"
  | "startAtIso"
  | "published"
  | "updatedAtMs"
>;

export function buildSessionVeventLines(
  session: CalendarEventSession,
  siteOrigin = DEFAULT_SITE_ORIGIN,
): string[] | null {
  const startMs = parseSessionStartMs(session.startAtIso);
  if (startMs === null) return null;

  const endMs = startMs + 60 * 60 * 1000;
  const stampMs = session.updatedAtMs && session.updatedAtMs > 0 ? session.updatedAtMs : startMs;
  const sessionPageUrl = buildSessionPageUrl(session.id, siteOrigin);
  const lumaUrl = getSessionLumaRegistrationUrl(session);
  const primaryEventUrl = lumaUrl ?? sessionPageUrl;

  const descriptionParts = [
    `Think Session (${session.number}) with ${session.speaker} — ${session.speakerRole}`,
    "",
    session.summary,
    "",
    lumaUrl
      ? `Reserve your place: ${lumaUrl}`
      : `Session details & RSVP: ${sessionPageUrl}`,
    `Session page: ${sessionPageUrl}`,
  ];

  const lines = [
    "BEGIN:VEVENT",
    `UID:${session.id}@thethinkingarchitects.com.ng`,
    `DTSTAMP:${toUtcCalendarStamp(stampMs)}`,
    `LAST-MODIFIED:${toUtcCalendarStamp(stampMs)}`,
    `DTSTART:${toUtcCalendarStamp(startMs)}`,
    `DTEND:${toUtcCalendarStamp(endMs)}`,
    `SUMMARY:${escapeIcsText(`TTA Think Session: ${session.title}`)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\n"))}`,
    `LOCATION:${escapeIcsText("Online Live Session · The Thinking Architects")}`,
    `URL:${primaryEventUrl}`,
    "END:VEVENT",
  ];

  return lines.map(foldIcsLine);
}

export function buildThinkSessionsCalendarIcs(
  sessions: CalendarEventSession[],
  siteOrigin = DEFAULT_SITE_ORIGIN,
): string {
  const scheduled = sessions
    .filter((s) => s.published && parseSessionStartMs(s.startAtIso) !== null)
    .sort(
      (a, b) =>
        (parseSessionStartMs(a.startAtIso) ?? 0) - (parseSessionStartMs(b.startAtIso) ?? 0),
    );

  const headerLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Thinking Architects//Think Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:The Thinking Architects · Think Sessions",
    "X-WR-CALDESC:Monthly live conversations with practising architects.",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  const eventLines: string[] = [];
  for (const session of scheduled) {
    const lines = buildSessionVeventLines(session, siteOrigin);
    if (lines) eventLines.push(...lines);
  }

  return [...headerLines, ...eventLines, "END:VCALENDAR", ""].join("\r\n");
}
