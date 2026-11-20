"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { FirestoreSessionRecord } from "../lib/firebaseContent";
import {
  cancelSessionReminder,
  enableSessionReminder,
  ensureReminderRunner,
  REMINDER_LEAD_MINUTES,
  useSessionReminderState,
} from "../lib/sessionReminders";

export function SessionReminderRunner() {
  useEffect(() => {
    ensureReminderRunner();
  }, []);
  return null;
}

export function SessionRemindButton({
  session,
  compact = false,
}: {
  session: FirestoreSessionRecord;
  compact?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const { supported, permission, reminder, isFuture } = useSessionReminderState(session);
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState<{ tone: "info" | "error"; text: string } | null>(
    null,
  );

  // Do not render on past/archived sessions or sessions without an exact start timestamp
  if (!isFuture) return null;

  const isActive = Boolean(reminder);
  const isDenied = supported && permission === "denied" && !isActive;

  const handleToggle = async () => {
    if (isActive) {
      cancelSessionReminder(session.id);
      setStatusNote(null);
      return;
    }

    setBusy(true);
    setStatusNote(null);
    const result = await enableSessionReminder(session);
    setBusy(false);

    if (!result.ok) {
      setStatusNote({ tone: "error", text: result.message });
      return;
    }

    const formattedAt = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(result.notifyAtMs));

    setStatusNote({
      tone: "info",
      text:
        result.mode === "starting-soon"
          ? "Starting soon — notification sent."
          : `Alert scheduled for ${formattedAt} (${REMINDER_LEAD_MINUTES} mins before).`,
    });
  };

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <motion.button
        type="button"
        disabled={busy}
        onClick={handleToggle}
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
        aria-pressed={isActive}
        title={
          isActive
            ? `Reminder scheduled ${REMINDER_LEAD_MINUTES} mins before start. Click to cancel.`
            : `Get a browser notification ${REMINDER_LEAD_MINUTES} minutes before this session starts.`
        }
        className={`label-mono inline-flex cursor-pointer items-center gap-1.5 rounded-xl border transition-colors whitespace-nowrap disabled:opacity-60 ${
          compact
            ? "min-h-[42px] px-4 py-2 text-[11px]"
            : "min-h-[48px] px-5 py-3 text-[11px]"
        } ${
          isActive
            ? "border-[#111111] bg-[#111111] text-white hover:bg-[#111111]/85"
            : isDenied
              ? "border-[#fe3619]/35 bg-[#f7f6f4] text-[#fe3619] hover:border-[#fe3619]"
              : "border-black/12 bg-[#f7f6f4] text-[#111111] hover:bg-[#111111] hover:text-white"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isActive ? (
            <motion.span
              key="remind-on"
              initial={prefersReduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-1.5"
            >
              <BellRing className="h-3.5 w-3.5 shrink-0 text-[#fe3619]" aria-hidden="true" />
              <span>{reminder?.notified ? "Reminder Sent" : "Reminder Set"}</span>
            </motion.span>
          ) : isDenied ? (
            <motion.span
              key="remind-denied"
              initial={prefersReduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-1.5"
            >
              <BellOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Notifications Blocked</span>
            </motion.span>
          ) : (
            <motion.span
              key="remind-idle"
              initial={prefersReduced ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              className="inline-flex items-center gap-1.5"
            >
              <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{busy ? "Requesting..." : "Remind Me"}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {statusNote && (
          <motion.p
            key="status-note"
            initial={prefersReduced ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            role={statusNote.tone === "error" ? "alert" : "status"}
            className={`max-w-[42ch] text-[12px] leading-snug ${
              statusNote.tone === "error" ? "font-medium text-[#fe3619]" : "text-[#111111]/65"
            }`}
          >
            {statusNote.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
