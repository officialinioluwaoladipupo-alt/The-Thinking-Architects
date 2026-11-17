"use client";

import { useEffect, useState } from "react";
import type { FirestoreSessionRecord } from "./firebaseContent";
import { parseSessionStartMs } from "./sessionCalendar";

export const REMINDER_LEAD_MINUTES = 15;
const STORAGE_KEY = "tta_session_reminders_v1";
const MAX_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours max per timer tick to avoid 32-bit setTimeout overflow

export type StoredSessionReminder = {
  sessionId: string;
  number: string;
  title: string;
  speaker: string;
  startAtIso: string;
  startAtMs: number;
  notifyAtMs: number;
  notified: boolean;
};

type Listener = () => void;
const listeners = new Set<Listener>();
let activeTimer: number | null = null;
let runnerBooted = false;

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function isNotificationApiSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function readStoredReminders(): StoredSessionReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    // Prune reminders whose event ended > 2 hours ago
    const cleaned = parsed.filter(
      (item): item is StoredSessionReminder =>
        Boolean(item) &&
        typeof item.sessionId === "string" &&
        typeof item.title === "string" &&
        typeof item.startAtMs === "number" &&
        typeof item.notifyAtMs === "number" &&
        item.startAtMs > now - 2 * 60 * 60 * 1000,
    );
    if (cleaned.length !== parsed.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

function writeStoredReminders(items: StoredSessionReminder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function fireBrowserNotification(item: StoredSessionReminder, isImmediateLeadWindow = false) {
  if (!isNotificationApiSupported() || Notification.permission !== "granted") return;

  const minsUntil = Math.max(1, Math.round((item.startAtMs - Date.now()) / 60000));
  const heading =
    isImmediateLeadWindow && item.startAtMs > Date.now()
      ? `Think Session starting in ${minsUntil} min`
      : `Starting soon · ${item.number}`;

  try {
    const notification = new Notification(heading, {
      body: `${item.title} with ${item.speaker}`,
      tag: `tta-session-${item.sessionId}`,
      requireInteraction: false,
    });
    notification.onclick = () => {
      try {
        window.focus();
        window.location.href = `/sessions/${encodeURIComponent(item.sessionId)}`;
        notification.close();
      } catch {
        // Ignore focus errors in sandboxed frames
      }
    };
  } catch {
    // Some embedded contexts restrict direct Notification construction
  }
}

export function processDueSessionReminders() {
  if (typeof window === "undefined") return;
  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
    activeTimer = null;
  }

  const items = readStoredReminders();
  if (items.length === 0) return;

  const now = Date.now();
  let changed = false;
  let nextWakeMs: number | null = null;

  const updated = items.map((item) => {
    if (item.notified) return item;
    if (now >= item.notifyAtMs) {
      if (item.startAtMs > now - 30 * 60 * 1000) {
        fireBrowserNotification(item, true);
      }
      changed = true;
      return { ...item, notified: true };
    }
    if (nextWakeMs === null || item.notifyAtMs < nextWakeMs) {
      nextWakeMs = item.notifyAtMs;
    }
    return item;
  });

  if (changed) {
    writeStoredReminders(updated);
    notifyListeners();
  }

  if (nextWakeMs !== null) {
    const delay = Math.max(1000, Math.min(nextWakeMs - Date.now(), MAX_TIMEOUT_MS));
    activeTimer = window.setTimeout(() => {
      processDueSessionReminders();
    }, delay);
  }
}

export function ensureReminderRunner() {
  if (typeof window === "undefined" || runnerBooted) return;
  runnerBooted = true;

  processDueSessionReminders();

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      processDueSessionReminders();
    }
  });
  window.addEventListener("focus", processDueSessionReminders);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      processDueSessionReminders();
      notifyListeners();
    }
  });
}

export type EnableReminderResult =
  | { ok: true; mode: "scheduled" | "starting-soon"; notifyAtMs: number }
  | { ok: false; reason: "unsupported" | "denied" | "past" | "error"; message: string };

export async function enableSessionReminder(
  session: FirestoreSessionRecord,
): Promise<EnableReminderResult> {
  if (!isNotificationApiSupported()) {
    return {
      ok: false,
      reason: "unsupported",
      message: "Browser notifications aren't supported here. Use Google Calendar or .ics instead.",
    };
  }

  const startAtMs = parseSessionStartMs(session.startAtIso);
  if (startAtMs === null || startAtMs <= Date.now()) {
    return {
      ok: false,
      reason: "past",
      message: "This session has already started or has no scheduled start timestamp.",
    };
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return {
        ok: false,
        reason: "error",
        message: "Unable to request notification permission in this browser context.",
      };
    }
  }

  if (permission !== "granted") {
    return {
      ok: false,
      reason: "denied",
      message: "Notifications are blocked in your browser settings. Use Google Calendar or .ics above.",
    };
  }

  const now = Date.now();
  const leadMs = REMINDER_LEAD_MINUTES * 60 * 1000;
  const rawNotifyAt = startAtMs - leadMs;
  const isStartingSoon = rawNotifyAt <= now;
  const notifyAtMs = isStartingSoon ? now : rawNotifyAt;

  const entry: StoredSessionReminder = {
    sessionId: session.id,
    number: session.number,
    title: session.title,
    speaker: session.speaker,
    startAtIso: session.startAtIso,
    startAtMs,
    notifyAtMs,
    notified: isStartingSoon,
  };

  const existing = readStoredReminders().filter((item) => item.sessionId !== session.id);
  writeStoredReminders([...existing, entry]);

  if (isStartingSoon) {
    fireBrowserNotification(entry, true);
  } else {
    try {
      const localNotifyTime = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(notifyAtMs));
      const confirmNote = new Notification(`Reminder set · ${session.number}`, {
        body: `We'll alert you at ${localNotifyTime} (${REMINDER_LEAD_MINUTES} mins before "${session.title}").`,
        tag: `tta-confirm-${session.id}`,
      });
      window.setTimeout(() => confirmNote.close(), 5000);
    } catch {
      // Ignore if immediate preview confirmation is throttled
    }
  }

  processDueSessionReminders();
  notifyListeners();

  return {
    ok: true,
    mode: isStartingSoon ? "starting-soon" : "scheduled",
    notifyAtMs,
  };
}

export function cancelSessionReminder(sessionId: string) {
  const existing = readStoredReminders().filter((item) => item.sessionId !== sessionId);
  writeStoredReminders(existing);
  processDueSessionReminders();
  notifyListeners();
}

export function useSessionReminderState(session: FirestoreSessionRecord) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [reminder, setReminder] = useState<StoredSessionReminder | null>(null);
  const [isFuture, setIsFuture] = useState(false);

  useEffect(() => {
    ensureReminderRunner();

    const sync = () => {
      const hasApi = isNotificationApiSupported();
      setSupported(hasApi);
      setPermission(hasApi ? Notification.permission : "default");
      const startMs = parseSessionStartMs(session.startAtIso);
      setIsFuture(
        session.status === "upcoming" && startMs !== null && startMs > Date.now(),
      );
      const found =
        readStoredReminders().find((item) => item.sessionId === session.id) ?? null;
      setReminder(found);
    };

    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [session.id, session.startAtIso, session.status]);

  return { supported, permission, reminder, isFuture };
}
