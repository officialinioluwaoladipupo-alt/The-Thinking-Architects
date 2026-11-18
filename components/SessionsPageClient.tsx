"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  Play,
  Radio,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  DEFAULT_LIVE_SETTINGS,
  subscribeLiveSettings,
  subscribePublishedMedia,
  subscribePublishedSessions,
  type FirestoreMediaRecord,
  type FirestoreSessionRecord,
  type LiveSettingsRecord,
} from "../lib/firebaseContent";
import { CONTACT_EMAIL, TALLY_FORM_URL, triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import LiveElapsedTimer from "./LiveElapsedTimer";
import LiveQuestionQueue from "./LiveQuestionQueue";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

function hasMatchingRecording(
  session: FirestoreSessionRecord,
  mediaItems: FirestoreMediaRecord[],
): boolean {
  const num = session.number.trim().toLowerCase();
  const title = session.title.trim().toLowerCase();
  return mediaItems.some((m) => {
    if (!m.mediaUrl.trim()) return false;
    const ref = m.sessionRef.trim().toLowerCase();
    const mTitle = m.title.trim().toLowerCase();
    return (
      (num && ref.includes(num)) ||
      (title && (mTitle.includes(title) || title.includes(mTitle)))
    );
  });
}

function SessionsPageInner() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [nextSession, setNextSession] = useState<FirestoreSessionRecord | null>(null);
  const [pastSessions, setPastSessions] = useState<FirestoreSessionRecord[]>([]);
  const [mediaItems, setMediaItems] = useState<FirestoreMediaRecord[]>([]);
  const [liveSettings, setLiveSettings] = useState<LiveSettingsRecord>(DEFAULT_LIVE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    const unsubSessions = subscribePublishedSessions(
      (items) => {
        if (!active) return;
        const upcoming =
          items.find((item) => item.isNextSession && item.status === "upcoming") ??
          items.find((item) => item.status === "upcoming") ??
          null;
        setNextSession(upcoming);
        setPastSessions(
          upcoming ? items.filter((item) => item.id !== upcoming.id) : items,
        );
        setLoading(false);
        setErrorMessage(null);
      },
      (err) => {
        if (!active) return;
        setErrorMessage(formatFirestoreErrorMessage(err));
        setLoading(false);
      },
    );

    const unsubMedia = subscribePublishedMedia(
      (items) => {
        if (!active) return;
        setMediaItems(items);
      },
      () => {
        // Optional recording cross-reference; do not block sessions list
      },
    );

    const unsubLive = subscribeLiveSettings(
      (settings) => {
        if (!active) return;
        setLiveSettings(settings);
      },
      () => {
        // Optional live overlay
      },
    );

    return () => {
      active = false;
      unsubSessions();
      unsubMedia();
      unsubLive();
    };
  }, [retryKey]);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  return (
    <>
      <SiteHeader onOpenJoin={handleOpenJoin} />

      <main className="min-h-screen bg-[#f7f6f4] pt-32 pb-20 text-[#111111]">
        <div className="mx-auto max-w-[1120px] px-6">
          <Link
            href="/"
            className="label-mono inline-flex items-center gap-2 text-[#111111]/60 transition-colors hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>

          <div className="mt-8">
            <p className="label-mono text-[#fe3619]">Events · Monthly Live Conversations</p>
            <h1
              className="mt-3 max-w-[18ch] text-[clamp(2.2rem,5vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.035em]"
              style={{ textWrap: "balance" }}
            >
              Think Sessions
            </h1>
            <p className="mt-5 max-w-[62ch] text-[1.06rem] leading-[1.6] text-[#111111]/75">
              Monthly live conversations with practising architects on the real questions: the path
              to licensure, running a studio, building a career that lasts. Every session reserves
              time for your questions.
            </p>
          </div>

          {liveSettings.isLive && (
            <section
              aria-label="Live session now"
              className="mt-10 rounded-[12px] border border-white/10 bg-[#1C1C1C] p-6 text-[#F2EDE8] sm:p-8"
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="max-w-[64ch]">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.09em]">
                    <span className="inline-flex items-center gap-1.5 bg-[#D94F2B] px-2.5 py-1 text-white">
                      <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Happening Live Now</span>
                    </span>
                    {liveSettings.liveStartedAtIso && (
                      <span className="inline-flex items-center gap-1.5 text-[#F2EDE8]/75">
                        <Clock className="h-3.5 w-3.5 text-[#D94F2B]" aria-hidden="true" />
                        <span>Elapsed</span>
                        <LiveElapsedTimer
                          startedAtIso={liveSettings.liveStartedAtIso}
                          className="text-[#F2EDE8]"
                        />
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-[1.5rem] font-medium leading-[1.16] tracking-[-0.025em] sm:text-[2rem]">
                    {liveSettings.liveTitle.trim() ||
                      nextSession?.title ||
                      "Think Session Live Companion"}
                  </h2>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#F2EDE8]/75">
                    {liveSettings.liveSessionId
                      ? "Enter the active session room to submit and upvote live audience questions."
                      : "Use the live Q&A queue below to send questions directly to the host and speaker."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {liveSettings.liveSessionId ? (
                    <Link
                      href={`/sessions/${encodeURIComponent(liveSettings.liveSessionId)}`}
                      className="label-mono inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#D94F2B] px-6 py-3 text-white transition-opacity hover:opacity-90"
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                      <span>Enter Session Room</span>
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href="#live-qa"
                      className="label-mono inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#D94F2B] px-6 py-3 text-white transition-opacity hover:opacity-90"
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                      <span>Open Live Q&amp;A Queue</span>
                    </a>
                  )}

                  {liveSettings.liveRoomUrl.trim().startsWith("https://") && (
                    <a
                      href={liveSettings.liveRoomUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label-mono inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-5 py-3 text-[#F2EDE8] transition-colors hover:bg-white/[0.12]"
                    >
                      <span>Join Live Call</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          {liveSettings.isLive && !liveSettings.liveSessionId && (
            <LiveQuestionQueue
              sessionId="live-lobby"
              qaEnabled={liveSettings.qaEnabled}
              isLive={true}
              heading="Live Session Q&A Queue"
            />
          )}

          {loading ? (
            <section
              aria-busy="true"
              className="mt-12 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
            >
              <div className="space-y-4">
                <div className="h-4 w-56 animate-pulse rounded bg-black/[0.08]" />
                <div className="h-10 w-3/4 animate-pulse rounded bg-black/[0.08]" />
                <div className="h-4 w-64 animate-pulse rounded bg-black/[0.06]" />
                <div className="h-20 w-full animate-pulse rounded bg-black/[0.06]" />
              </div>
              <div className="mt-7 grid gap-3 border-t border-black/[0.08] pt-6 sm:grid-cols-3">
                <div className="h-24 animate-pulse rounded-lg bg-[#f7f6f4]" />
                <div className="h-24 animate-pulse rounded-lg bg-[#f7f6f4]" />
                <div className="h-24 animate-pulse rounded-lg bg-[#f7f6f4]" />
              </div>
            </section>
          ) : errorMessage ? (
            <section
              role="alert"
              className="mt-12 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
            >
              <div className="flex items-center gap-2 text-[#fe3619]">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span className="label-mono">Connection Notice</span>
              </div>
              <h2 className="mt-3 text-[1.5rem] font-medium leading-[1.16] tracking-[-0.025em]">
                Unable to load Think Sessions right now.
              </h2>
              <p className="mt-2 max-w-[60ch] text-[15px] leading-[1.6] text-[#111111]/75">
                {errorMessage}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="label-mono inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-6 py-3 text-white transition-opacity hover:opacity-85"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry connection</span>
                </button>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="label-mono inline-flex min-h-[46px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-5 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                >
                  <span>Email {CONTACT_EMAIL}</span>
                </a>
              </div>
            </section>
          ) : (
            <>
              {/* Next Session Block (or Empty State when no upcoming session) */}
              {!nextSession ? (
                <section
                  aria-label="Next session"
                  className="mt-12 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
                >
                  <p className="label-mono text-[#fe3619]">Next Session</p>
                  <h2 className="mt-3 max-w-[30ch] text-[clamp(1.55rem,3vw,2.25rem)] font-medium leading-[1.14] tracking-[-0.025em]">
                    The next session is being planned. Join the community to hear first.
                  </h2>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOpenJoin}
                      className="label-mono group inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-7 py-3 text-white transition-opacity hover:opacity-90"
                    >
                      <span>Join the community</span>
                      <ArrowUpRight
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </button>
                    <Link
                      href="/media"
                      className="label-mono inline-flex min-h-[48px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-6 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                    >
                      <span>Watch past recordings</span>
                    </Link>
                  </div>
                </section>
              ) : (
                <section
                  aria-label="Next live session"
                  className="mt-12 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
                >
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#111111]/60">
                    <span className="text-[#fe3619]">Next Session · {nextSession.number}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{nextSession.dateLabel}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{nextSession.timeLabel}</span>
                    </span>
                  </div>

                  <h2 className="mt-4 max-w-[28ch] text-[clamp(1.6rem,3vw,2.5rem)] font-medium leading-[1.12] tracking-[-0.025em]">
                    <Link
                      href={`/sessions/${encodeURIComponent(nextSession.id)}`}
                      className="transition-colors hover:text-[#fe3619]"
                    >
                      {nextSession.title}
                    </Link>
                  </h2>

                  <p className="mt-2 font-mono text-[12px] text-[#111111]/65">
                    {nextSession.speaker} — {nextSession.speakerRole}
                  </p>

                  <p className="mt-5 max-w-[65ch] text-[15px] leading-[1.65] text-[#111111]/75">
                    {nextSession.summary}
                  </p>

                  <div className="mt-7 grid gap-3 border-t border-black/[0.08] pt-6 sm:grid-cols-3">
                    {nextSession.topics.map((topic, i) => (
                      <div key={topic} className="rounded-lg bg-[#f7f6f4] p-4">
                        <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                          0{i + 1}
                        </span>
                        <p className="mt-2 text-[14px] leading-snug text-[#111111]/85">{topic}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    {nextSession.registrationUrl &&
                    nextSession.registrationUrl.trim().startsWith("https://") &&
                    nextSession.registrationUrl.trim() !== TALLY_FORM_URL ? (
                      <a
                        href={nextSession.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-mono inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#fe3619] px-8 py-3.5 text-white transition-opacity hover:opacity-90"
                      >
                        <span>Reserve your place</span>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenJoin}
                        className="label-mono group inline-flex min-h-[50px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-8 py-3.5 text-white transition-opacity hover:opacity-90"
                      >
                        <span>Reserve your place</span>
                        <ArrowUpRight
                          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          aria-hidden="true"
                        />
                      </button>
                    )}

                    <Link
                      href={`/sessions/${encodeURIComponent(nextSession.id)}`}
                      className="label-mono inline-flex min-h-[50px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-6 py-3.5 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                    >
                      <span>Session details</span>
                    </Link>
                  </div>
                </section>
              )}

              {/* Past Sessions Hairline List */}
              <section className="mt-16">
                <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4">
                  <h2 className="text-[1.65rem] font-medium tracking-[-0.025em]">
                    Past sessions
                  </h2>
                  <Link
                    href="/media"
                    className="label-mono text-[#111111]/65 underline-offset-4 hover:text-[#111111] hover:underline"
                  >
                    Browse all recordings
                  </Link>
                </div>

                <div className="border-t border-black/[0.09]">
                  {pastSessions.length === 0 ? (
                    <p className="border-b border-black/[0.09] py-10 text-[15px] text-[#111111]/65">
                      Past Think Sessions will appear here after they conclude.
                    </p>
                  ) : (
                    pastSessions.map((session) => {
                      const canWatch = hasMatchingRecording(session, mediaItems);
                      return (
                        <article
                          key={session.id}
                          className="grid gap-6 border-b border-black/[0.09] py-8 md:grid-cols-[190px_1fr_auto] md:items-start"
                        >
                          <div>
                            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#fe3619]">
                              {session.number}
                            </span>
                            <p className="mt-1 font-mono text-[12px] text-[#111111]/65">
                              {session.dateLabel}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#111111]/50">
                              {session.timeLabel}
                            </p>
                          </div>

                          <div>
                            <h3 className="text-[1.3rem] font-medium leading-[1.2] tracking-[-0.02em]">
                              <Link
                                href={`/sessions/${encodeURIComponent(session.id)}`}
                                className="transition-colors hover:text-[#fe3619]"
                              >
                                {session.title}
                              </Link>
                            </h3>
                            <p className="mt-1.5 font-mono text-[12px] text-[#111111]/60">
                              {session.speaker} · {session.speakerRole}
                            </p>
                            <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-[#111111]/75">
                              {session.summary}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {canWatch && (
                              <Link
                                href={`/media?session=${encodeURIComponent(session.number)}`}
                                className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#fe3619] px-4 py-2 text-white transition-opacity hover:opacity-90"
                              >
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Watch</span>
                              </Link>
                            )}
                            <Link
                              href={`/sessions/${encodeURIComponent(session.id)}`}
                              className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-black/10 bg-[#efeeec] px-4 py-2 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                            >
                              <span>Details</span>
                              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Closing CTA */}
              <section className="mt-14 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-[15px] leading-[1.6] text-[#111111]/85">
                    <strong className="font-semibold text-[#111111]">
                      Have a topic or want to speak?
                    </strong>{" "}
                    Email{" "}
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=Think%20Session%20Topic`}
                      className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                    >
                      {CONTACT_EMAIL}
                    </a>
                    .
                  </p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Think%20Session%20Topic`}
                    className="label-mono inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-white transition-opacity hover:opacity-85"
                  >
                    <span>Email us</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}

export default function SessionsPageClient() {
  return (
    <FirestoreErrorBoundary>
      <SessionsPageInner />
    </FirestoreErrorBoundary>
  );
}
