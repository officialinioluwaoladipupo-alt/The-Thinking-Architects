"use client";

import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Mic,
  Radio,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  endLiveSession,
  removeSessionQuestion,
  saveLiveState,
  startLiveSession,
  subscribePublishedSessions,
  subscribeSessionQuestions,
  updateSessionQuestionStatus,
  type FirestoreSessionRecord,
  type LiveStateInput,
  type QuestionStatus,
  type SessionQuestionRecord,
} from "../lib/firebaseContent";
import { LiveElapsedClock } from "./LiveElapsedClock";
import { EDITORIAL_EASE } from "./MotionPrimitives";

type AdminLiveCompanionPanelProps = {
  primarySessions: FirestoreSessionRecord[];
  liveState: LiveStateInput;
  onToast: (msg: string) => void;
  onError: (msg: string) => void;
};

export default function AdminLiveCompanionPanel({
  primarySessions,
  liveState,
  onToast,
  onError,
}: AdminLiveCompanionPanelProps) {
  const prefersReduced = useReducedMotion();
  const [fallbackPublished, setFallbackPublished] = useState<FirestoreSessionRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [roomUrlInput, setRoomUrlInput] = useState("");
  const [qaOpenInput, setQaOpenInput] = useState(true);
  const [savingLive, setSavingLive] = useState(false);

  const [questions, setQuestions] = useState<SessionQuestionRecord[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Merge primary sessions + legacy published sessions so hosts can go live with any session
  useEffect(() => {
    const unsub = subscribePublishedSessions(
      (items) => setFallbackPublished(items),
      () => {
        // Primary sessions list remains usable even if fallback listener fails
      },
    );
    return () => unsub();
  }, []);

  const mergedSessionsMap = new Map<string, FirestoreSessionRecord>();
  for (const s of fallbackPublished) mergedSessionsMap.set(s.id, s);
  for (const s of primarySessions) mergedSessionsMap.set(s.id, s);
  const availableSessions = Array.from(mergedSessionsMap.values());

  const firstDefaultSessionId =
    (
      availableSessions.find((s) => s.isNextSession && s.published) ??
      availableSessions.find((s) => s.status === "upcoming" && s.published) ??
      availableSessions[0]
    )?.id ?? "";

  // Keep form inputs synced cleanly when liveState changes on Firestore
  useEffect(() => {
    if (liveState.sessionId) {
      setSelectedSessionId(liveState.sessionId);
    } else if (firstDefaultSessionId) {
      setSelectedSessionId((prev) => prev || firstDefaultSessionId);
    }
    setRoomUrlInput(liveState.roomUrl || "");
    if (liveState.isLive) {
      setQaOpenInput(liveState.qaOpen);
    }
  }, [liveState.isLive, liveState.sessionId, liveState.roomUrl, liveState.qaOpen, firstDefaultSessionId]);

  const activeQaSessionId = liveState.sessionId || selectedSessionId;

  useEffect(() => {
    if (!activeQaSessionId) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    const unsub = subscribeSessionQuestions(
      activeQaSessionId,
      (items) => {
        setQuestions(items);
        setLoadingQuestions(false);
      },
      (err) => {
        setLoadingQuestions(false);
        onErrorRef.current(formatFirestoreErrorMessage(err));
      },
    );
    return () => unsub();
  }, [activeQaSessionId]);

  const selectedSession =
    availableSessions.find((s) => s.id === selectedSessionId) ?? availableSessions[0] ?? null;

  const handleToggleLive = async () => {
    setSavingLive(true);
    try {
      if (liveState.isLive) {
        await endLiveSession(liveState);
        onToast("Live Session Companion turned OFF. Home spotlight restored.");
      } else {
        if (!selectedSession) {
          onError("Create or select a Think Session first before going live.");
          setSavingLive(false);
          return;
        }
        await startLiveSession(selectedSession, {
          roomUrl: roomUrlInput,
          qaOpen: qaOpenInput,
        });
        onToast(`"${selectedSession.title}" is now LIVE across the site.`);
      }
    } catch (err) {
      onError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingLive(false);
    }
  };

  const handleSaveRoomSettings = async () => {
    if (!selectedSession && !liveState.sessionId) return;
    setSavingLive(true);
    try {
      await saveLiveState({
        isLive: liveState.isLive,
        sessionId: liveState.sessionId || selectedSession?.id || "",
        sessionNumber: liveState.sessionNumber || selectedSession?.number || "",
        sessionTitle: liveState.sessionTitle || selectedSession?.title || "",
        speaker: liveState.speaker || selectedSession?.speaker || "",
        startedAtIso: liveState.startedAtIso,
        roomUrl: roomUrlInput.trim(),
        qaOpen: qaOpenInput,
      });
      onToast("Live call link and Q&A settings updated.");
    } catch (err) {
      onError(formatFirestoreErrorMessage(err));
    } finally {
      setSavingLive(false);
    }
  };

  const handleQuestionStatus = async (qId: string, status: QuestionStatus) => {
    setModeratingId(qId);
    try {
      await updateSessionQuestionStatus(qId, status);
    } catch (err) {
      onError(formatFirestoreErrorMessage(err));
    } finally {
      setModeratingId(null);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    setModeratingId(qId);
    try {
      await removeSessionQuestion(qId);
      onToast("Question removed from queue.");
    } catch (err) {
      onError(formatFirestoreErrorMessage(err));
    } finally {
      setModeratingId(null);
    }
  };

  const onAirCount = questions.filter((q) => q.status === "on_air").length;
  const queuedCount = questions.filter((q) => q.status === "queued").length;

  return (
    <div
      className={`mt-6 rounded-2xl border p-4 sm:p-7 ${
        liveState.isLive
          ? "border-black/20 bg-[#111111] text-[#f7f6f4]"
          : "border-black/[0.09] bg-[#efeeec] text-[#111111]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-current/10 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
            <span className="inline-flex items-center gap-1.5 text-[#fe3619]">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {liveState.isLive
                  ? "Live Session Companion · ON AIR"
                  : "Live Session Companion Mode"}
              </span>
            </span>
            {liveState.isLive && liveState.startedAtIso && (
              <>
                <span className="opacity-35" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 text-white/85">
                  <Clock className="h-3.5 w-3.5 text-[#fe3619]" aria-hidden="true" />
                  <LiveElapsedClock startedAtIso={liveState.startedAtIso} />
                </span>
              </>
            )}
          </div>

          <h3 className="mt-2 text-[1.25rem] font-medium tracking-[-0.02em]">
            {liveState.isLive
              ? `Live Now: ${liveState.sessionTitle}`
              : "Switch on Live Broadcast & Real-Time Q&A"}
          </h3>
          <p
            className={`mt-1 max-w-[65ch] text-[13.5px] leading-[1.55] ${
              liveState.isLive ? "text-white/70" : "text-[#111111]/70"
            }`}
          >
            {liveState.isLive
              ? "Home spotlight is transformed into an active Session Room banner with elapsed clock and live Q&A queue."
              : "1 click transforms the Home spotlight into a Happening Live Now room strip with elapsed timer and opens the attendee Q&A queue."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {liveState.isLive && liveState.sessionId && (
            <Link
              href={`/sessions/${encodeURIComponent(liveState.sessionId)}#live-qa`}
              className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2 text-white transition-colors hover:bg-white hover:text-[#111111]"
            >
              <span>Open Live Room</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}

          <motion.button
            type="button"
            disabled={savingLive || (!liveState.isLive && !selectedSession)}
            onClick={handleToggleLive}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            className={`label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              liveState.isLive ? "bg-[#fe3619]" : "bg-[#111111]"
            }`}
          >
            {liveState.isLive ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>{savingLive ? "Updating..." : "End Live Session"}</span>
              </>
            ) : (
              <>
                <Radio className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                <span>{savingLive ? "Starting..." : "Session is LIVE Now"}</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Controls: Session Picker + Room Call URL + Q&A Toggle */}
      <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_1.2fr_auto] md:items-end">
        <div>
          <label
            htmlFor="live-session-select"
            className={`label-mono block text-[11px] ${
              liveState.isLive ? "text-white/65" : "text-[#111111]/65"
            }`}
          >
            Active Session
          </label>
          <select
            id="live-session-select"
            value={selectedSession?.id ?? ""}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            disabled={liveState.isLive}
            className={`mt-1.5 h-11 w-full rounded-lg border px-3 text-base disabled:opacity-65 sm:text-[13.5px] ${
              liveState.isLive
                ? "border-white/15 bg-white/10 text-white"
                : "border-black/10 bg-[#f7f6f4] text-[#111111]"
            }`}
          >
            {availableSessions.length === 0 ? (
              <option value="">No sessions available</option>
            ) : (
              availableSessions.map((s) => (
                <option key={s.id} value={s.id} className="text-[#111111]">
                  {s.number} — {s.title}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="live-room-url"
            className={`label-mono block text-[11px] ${
              liveState.isLive ? "text-white/65" : "text-[#111111]/65"
            }`}
          >
            Optional Live Call URL (Meet / Zoom · HTTPS)
          </label>
          <input
            id="live-room-url"
            type="url"
            value={roomUrlInput}
            onChange={(e) => setRoomUrlInput(e.target.value)}
            placeholder="https://meet.google.com/..."
            className={`mt-1.5 h-11 w-full rounded-lg border px-3.5 text-base sm:text-[13.5px] ${
              liveState.isLive
                ? "border-white/15 bg-white/10 text-white placeholder:text-white/40"
                : "border-black/10 bg-[#f7f6f4] text-[#111111] placeholder:text-[#111111]/40"
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-11 cursor-pointer items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={qaOpenInput}
              onChange={(e) => setQaOpenInput(e.target.checked)}
              className="h-4 w-4 accent-[#fe3619]"
            />
            <span>Q&amp;A Queue Open</span>
          </label>

          {liveState.isLive && (
            <button
              type="button"
              disabled={savingLive}
              onClick={handleSaveRoomSettings}
              className="label-mono h-11 cursor-pointer rounded-lg border border-white/20 bg-white/10 px-4 text-[11px] text-white hover:bg-white hover:text-[#111111]"
            >
              Save Link / Q&amp;A
            </button>
          )}
        </div>
      </div>

      {/* Live Q&A Moderator Desk */}
      {activeQaSessionId && (
        <div
          className={`mt-6 rounded-xl border p-4 sm:p-5 ${
            liveState.isLive
              ? "border-white/15 bg-white/[0.04]"
              : "border-black/[0.08] bg-[#f7f6f4]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
              <span className="label-mono">
                Live Q&amp;A Moderator Queue
              </span>
            </div>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                liveState.isLive ? "text-white/70" : "text-[#111111]/60"
              }`}
            >
              {onAirCount} on-air · {queuedCount} queued · {questions.length} total
            </span>
          </div>

          {loadingQuestions ? (
            <p className="mt-3 text-[13.5px] opacity-65">Loading real-time question queue...</p>
          ) : questions.length === 0 ? (
            <p className="mt-3 text-[13.5px] opacity-65">
              No attendee questions in this session&apos;s queue yet. Incoming questions and upvotes
              appear here in real time.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-current/10">
              <AnimatePresence initial={false}>
                {questions.map((q) => (
                  <motion.li
                    key={q.id}
                    layout={!prefersReduced}
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 max-w-[70ch]">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.06em]">
                        <span
                          className={
                            q.status === "on_air"
                              ? "text-[#fe3619]"
                              : q.status === "answered"
                                ? "opacity-45"
                                : ""
                          }
                        >
                          {q.status === "on_air"
                            ? "On Air Now"
                            : q.status === "answered"
                              ? "Answered"
                              : "Queued"}
                        </span>
                        <span className="opacity-35" aria-hidden="true">·</span>
                        <span className="tabular-nums">{q.upvotes} upvotes</span>
                        <span className="opacity-35" aria-hidden="true">·</span>
                        <span className="font-normal opacity-75">
                          {q.authorName}
                          {q.authorStage ? ` (${q.authorStage})` : ""}
                        </span>
                      </div>
                      <p className="mt-1.5 break-words text-[14.5px] leading-snug">{q.questionText}</p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      {q.status !== "on_air" && (
                        <button
                          type="button"
                          disabled={moderatingId === q.id}
                          onClick={() => handleQuestionStatus(q.id, "on_air")}
                          className="label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg bg-[#fe3619] px-3 py-1.5 text-[11px] text-white transition-opacity hover:opacity-90"
                        >
                          <Mic className="h-3 w-3" aria-hidden="true" />
                          <span>Pick On-Air</span>
                        </button>
                      )}

                      {q.status !== "answered" && (
                        <button
                          type="button"
                          disabled={moderatingId === q.id}
                          onClick={() => handleQuestionStatus(q.id, "answered")}
                          className={`label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] ${
                            liveState.isLive
                              ? "border-white/20 text-white hover:bg-white/10"
                              : "border-black/12 bg-white text-[#111111] hover:bg-[#efeeec]"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          <span>Answered</span>
                        </button>
                      )}

                      {q.status !== "queued" && (
                        <button
                          type="button"
                          disabled={moderatingId === q.id}
                          onClick={() => handleQuestionStatus(q.id, "queued")}
                          className={`label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] ${
                            liveState.isLive
                              ? "border-white/20 text-white hover:bg-white/10"
                              : "border-black/12 bg-white text-[#111111] hover:bg-[#efeeec]"
                          }`}
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          <span>Queue</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={moderatingId === q.id}
                        onClick={() => handleDeleteQuestion(q.id)}
                        aria-label="Delete question"
                        className={`inline-flex h-[36px] w-[36px] cursor-pointer items-center justify-center rounded-lg border ${
                          liveState.isLive
                            ? "border-white/15 text-white/70 hover:border-[#fe3619] hover:text-[#fe3619]"
                            : "border-black/12 bg-white text-[#111111]/60 hover:border-[#fe3619] hover:text-[#fe3619]"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
