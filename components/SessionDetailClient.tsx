"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  ExternalLink,
  Link2,
  MessageSquare,
  Play,
  Radio,
  RotateCcw,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  DEFAULT_LIVE_STATE,
  subscribeLiveState,
  subscribePublishedMedia,
  subscribePublishedSessions,
  type FirestoreMediaRecord,
  type FirestoreSessionRecord,
  type LiveStateInput,
} from "../lib/firebaseContent";
import { getEmbedInfo } from "../lib/mediaEmbed";
import { CONTACT_EMAIL, TALLY_FORM_URL, triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import { LiveElapsedClock } from "./LiveElapsedClock";
import PitchModal from "./PitchModal";
import { SessionCalendarActions, SessionLocalTimeNote } from "./SessionCalendarActions";
import { SessionLiveQaQueue } from "./SessionLiveQaQueue";
import { SessionRemindButton } from "./SessionRemindButton";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { TakeawayQuoteButton } from "./TakeawayQuoteButton";

type SessionDetailClientProps = {
  sessionId: string;
};

function SessionDetailInner({ sessionId }: SessionDetailClientProps) {
  const [joinOpen, setJoinOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [session, setSession] = useState<FirestoreSessionRecord | null>(null);
  const [matchingMedia, setMatchingMedia] = useState<FirestoreMediaRecord | null>(null);
  const [liveState, setLiveState] = useState<LiveStateInput>(DEFAULT_LIVE_STATE);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    let latestSessions: FirestoreSessionRecord[] = [];
    let latestMedia: FirestoreMediaRecord[] = [];

    const syncMatch = () => {
      if (!active) return;
      const found = latestSessions.find((s) => s.id === sessionId) ?? null;
      setSession(found);
      if (found) {
        const num = found.number.trim().toLowerCase();
        const title = found.title.trim().toLowerCase();
        const mediaMatch =
          latestMedia.find((m) => {
            const ref = m.sessionRef.trim().toLowerCase();
            const mTitle = m.title.trim().toLowerCase();
            return (
              (num && ref.includes(num)) ||
              (title && (mTitle.includes(title) || title.includes(mTitle)))
            );
          }) ?? null;
        setMatchingMedia(mediaMatch);
      } else {
        setMatchingMedia(null);
      }
    };

    const unsubSessions = subscribePublishedSessions(
      (items) => {
        latestSessions = items;
        syncMatch();
        if (active) {
          setLoading(false);
          setErrorMessage(null);
        }
      },
      (err) => {
        if (!active) return;
        setErrorMessage(formatFirestoreErrorMessage(err));
        setLoading(false);
      },
    );

    const unsubMedia = subscribePublishedMedia(
      (items) => {
        latestMedia = items;
        syncMatch();
      },
      () => {
        // Recording cross-reference is optional
      },
    );

    const unsubLive = subscribeLiveState(
      (state) => {
        if (!active) return;
        setLiveState(state);
      },
      () => {
        // Non-blocking fallback
      },
    );

    return () => {
      active = false;
      unsubSessions();
      unsubMedia();
      unsubLive();
    };
  }, [sessionId, retryKey]);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  const recordingEmbed =
    matchingMedia && matchingMedia.mediaUrl
      ? getEmbedInfo(matchingMedia.mediaUrl, matchingMedia.title)
      : null;

  const hasCustomRegistration =
    session &&
    session.registrationUrl &&
    session.registrationUrl.trim().startsWith("https://") &&
    session.registrationUrl.trim() !== TALLY_FORM_URL;

  const showRecordingSection =
    Boolean(session && (session.status === "archived" || matchingMedia?.mediaUrl));

  const isThisSessionLive = Boolean(
    session && liveState.isLive && liveState.sessionId === session.id,
  );
  const liveCallUrl =
    isThisSessionLive && liveState.roomUrl && liveState.roomUrl.startsWith("https://")
      ? liveState.roomUrl
      : "";
  const isQaOpenForThis = Boolean(isThisSessionLive && liveState.qaOpen);

  return (
    <>
      <SiteHeader onOpenJoin={handleOpenJoin} />

      <main className="min-h-screen bg-[#f7f6f4] pt-32 pb-20 text-[#111111]">
        <div className="mx-auto max-w-[960px] px-6">
          <Link
            href="/sessions"
            className="label-mono inline-flex items-center gap-2 text-[#111111]/60 transition-colors hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Think Sessions</span>
          </Link>

          {loading ? (
            <div className="mt-10 space-y-6 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-8">
              <div className="h-4 w-40 animate-pulse rounded bg-black/[0.08]" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-black/[0.08]" />
              <div className="h-24 w-full animate-pulse rounded bg-black/[0.06]" />
            </div>
          ) : errorMessage ? (
            <section
              role="alert"
              className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
            >
              <div className="flex items-center gap-2 text-[#fe3619]">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span className="label-mono">Connection Notice</span>
              </div>
              <h1 className="mt-3 text-[1.6rem] font-medium tracking-[-0.025em]">
                Unable to load this Think Session.
              </h1>
              <p className="mt-2 text-[15px] leading-[1.6] text-[#111111]/75">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="label-mono mt-6 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-6 py-2.5 text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
            </section>
          ) : !session ? (
            <section className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10">
              <p className="label-mono text-[#fe3619]">Session Unavailable</p>
              <h1 className="mt-3 text-[1.75rem] font-medium tracking-[-0.025em]">
                This Think Session could not be found.
              </h1>
              <p className="mt-3 max-w-[55ch] text-[15px] leading-[1.6] text-[#111111]/75">
                It may have been moved or is still being prepared. Check all upcoming and past
                sessions to explore what&apos;s scheduled.
              </p>
              <Link
                href="/sessions"
                className="label-mono mt-6 inline-flex min-h-[46px] items-center rounded-xl bg-[#111111] px-6 py-3 text-white"
              >
                See all Think Sessions
              </Link>
            </section>
          ) : (
            <article className="mt-8">
              <p className="label-mono text-[#fe3619]">
                Think Session · {session.number} ·{" "}
                {session.status === "upcoming" ? "Upcoming" : "Past Session"}
              </p>

              <h1
                className="mt-3 max-w-[22ch] text-[clamp(2rem,4.5vw,3.6rem)] font-medium leading-[1.06] tracking-[-0.03em]"
                style={{ textWrap: "balance" }}
              >
                {session.title}
              </h1>

              {isThisSessionLive && (
                <section
                  aria-label="Live session companion bar"
                  className="mt-7 flex flex-col justify-between gap-4 rounded-[12px] bg-[#111111] p-5 text-[#f7f6f4] sm:flex-row sm:items-center sm:p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
                      <span className="inline-flex items-center gap-1.5 text-[#fe3619]">
                        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Session is Live Now</span>
                      </span>
                      <span className="text-white/35" aria-hidden="true">·</span>
                      <span className="text-white/85">
                        <LiveElapsedClock
                          startedAtIso={liveState.startedAtIso}
                          targetStartIso={session.startAtIso}
                        />
                      </span>
                    </div>
                    <p className="mt-1.5 text-[14.5px] text-white/75">
                      Ask your questions and upvote topics in the live Q&amp;A queue below.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href="#live-qa"
                      className="label-mono inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                    >
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Live Q&amp;A Queue</span>
                    </a>
                    {liveCallUrl && (
                      <a
                        href={liveCallUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-mono inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-5 py-2.5 text-white transition-colors hover:bg-white hover:text-[#111111]"
                      >
                        <span>Join Live Call</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </section>
              )}

              {/* Metadata Grid: Your speaker + Date and time */}
              <div className="mt-8 grid grid-cols-1 gap-px border border-black/[0.09] bg-black/[0.09] sm:grid-cols-2">
                <div className="bg-[#efeeec] p-6">
                  <div className="flex items-center gap-2 text-[#111111]/55">
                    <User className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="label-mono">Your speaker</span>
                  </div>
                  <p className="mt-2.5 text-[1.15rem] font-medium tracking-[-0.015em]">
                    {session.speaker}
                  </p>
                  <p className="mt-1 text-[14px] text-[#111111]/70">{session.speakerRole}</p>
                </div>

                <div className="bg-[#efeeec] p-6">
                  <div className="flex items-center gap-2 text-[#111111]/55">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="label-mono">Date and time</span>
                  </div>
                  <p className="mt-2.5 text-[1.15rem] font-medium tracking-[-0.015em]">
                    {session.dateLabel}
                  </p>
                  <p className="mt-1 inline-flex flex-wrap items-center gap-1.5 font-mono text-[13px] tabular-nums text-[#111111]/70">
                    <Clock className="h-3.5 w-3.5 text-[#111111]/45" aria-hidden="true" />
                    <span>
                      {session.timeLabel} · {session.format}
                    </span>
                    <SessionLocalTimeNote startAtIso={session.startAtIso} />
                  </p>
                </div>
              </div>

              {/* About this session */}
              <section className="mt-10 border-t border-black/[0.09] pt-8">
                <p className="label-mono text-[#fe3619]">About this session</p>
                <p className="mt-4 max-w-[65ch] text-[1.04rem] leading-[1.68] text-[#111111]/80">
                  {session.summary}
                </p>

                {session.topics.length > 0 && (
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {session.topics.map((topic, idx) => (
                      <div
                        key={topic}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-black/[0.08] bg-[#efeeec] p-5"
                      >
                        <div>
                          <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                            0{idx + 1}
                          </span>
                          <p className="mt-2 text-[14px] leading-snug text-[#111111]/85">{topic}</p>
                        </div>
                        <TakeawayQuoteButton
                          payload={{
                            quote: topic,
                            label: `${session.number} · Topic 0${idx + 1}`,
                            sourceTitle: session.title,
                            speaker: session.speaker,
                            speakerRole: session.speakerRole,
                            metaLabel: `${session.number} · ${session.dateLabel}`,
                            fileSlug: `${session.id}-topic-${idx + 1}`,
                          }}
                          className="self-start bg-[#f7f6f4]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Key Takeaways from Linked Recording/Feature (when published) */}
              {matchingMedia && matchingMedia.highlights.length > 0 && (
                <section className="mt-10 border-t border-black/[0.09] pt-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="label-mono text-[#fe3619]">Key Takeaways</p>
                      <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em]">
                        Shareable highlights from this conversation
                      </h2>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#111111]/55">
                      1080×1350 Story / Post Cards
                    </span>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {matchingMedia.highlights.map((note, idx) => (
                      <div
                        key={note}
                        className="flex flex-col justify-between gap-4 rounded-xl border border-black/[0.08] bg-[#efeeec] p-5"
                      >
                        <div>
                          <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                            Takeaway 0{idx + 1}
                          </span>
                          <p className="mt-2 text-[14px] leading-snug text-[#111111]/85">{note}</p>
                        </div>
                        <TakeawayQuoteButton
                          payload={{
                            quote: note,
                            label: `${session.number} · Key Takeaway 0${idx + 1}`,
                            sourceTitle: session.title,
                            speaker: matchingMedia.speaker || session.speaker,
                            speakerRole: session.speakerRole,
                            metaLabel: `${matchingMedia.kind} · ${session.dateLabel}`,
                            fileSlug: `${session.id}-takeaway-${idx + 1}`,
                          }}
                          className="self-start bg-[#f7f6f4]"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Companion Links & Resources */}
              {session.resources.length > 0 && (
                <section className="mt-10 border-t border-black/[0.09] pt-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="label-mono text-[#fe3619]">Session Companion Links</p>
                      <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em]">
                        Templates, reading &amp; resources
                      </h2>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.07em] tabular-nums text-[#111111]/55">
                      0{session.resources.length} curated link{session.resources.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-5 divide-y divide-black/[0.08] rounded-[12px] border border-black/[0.08] bg-[#efeeec]">
                    {session.resources.map((res, idx) => {
                      let hostname = "External resource";
                      try {
                        hostname = new URL(res.url).hostname.replace(/^www\./, "");
                      } catch {
                        // Ignore invalid URL parse
                      }
                      return (
                        <a
                          key={`${res.url}-${idx}`}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-black/[0.03]"
                        >
                          <div className="flex items-start gap-3">
                            <Link2
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#fe3619]"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="text-[15px] font-medium text-[#111111]">{res.label}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-[#111111]/55">
                                {hostname}
                              </p>
                            </div>
                          </div>
                          <span className="label-mono inline-flex items-center gap-1.5 text-[11px] text-[#111111]/75">
                            <span>Open resource</span>
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Live Session Q&A Queue */}
              <SessionLiveQaQueue
                sessionId={session.id}
                sessionTitle={session.title}
                speaker={session.speaker}
                isLiveNow={isThisSessionLive}
                qaOpen={isQaOpenForThis}
              />

              {/* Reserve your place (upcoming) OR Watch the recording (after session) */}
              {session.status === "upcoming" && (
                <section className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-8">
                  <p className="label-mono text-[#fe3619]">Reserve your place</p>
                  <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em]">
                    Join us live and bring your questions.
                  </h2>
                  <p className="mt-2 max-w-[58ch] text-[15px] leading-[1.6] text-[#111111]/75">
                    Every Think Session reserves open Q&amp;A time with our speakers. RSVP to get
                    the session link and calendar invite.
                  </p>
                  <div className="mt-6 flex flex-wrap items-start gap-3">
                    {hasCustomRegistration ? (
                      <a
                        href={session.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-mono inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#fe3619] px-7 py-3 text-white transition-opacity hover:opacity-90"
                      >
                        <span>Reserve your place</span>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenJoin}
                        className="label-mono group inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-7 py-3 text-white transition-opacity hover:opacity-90"
                      >
                        <span>Reserve your place</span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}

                    <SessionCalendarActions session={session} />

                    <SessionRemindButton session={session} />
                  </div>
                </section>
              )}

              {showRecordingSection && (
                <section className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-8">
                  <p className="label-mono text-[#fe3619]">Watch the recording</p>
                  <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em]">
                    {matchingMedia ? matchingMedia.title : "Session Recording"}
                  </h2>

                  {recordingEmbed ? (
                    <div className="mt-5 overflow-hidden rounded-[10px] border border-black/[0.08] bg-[#111111]">
                      {recordingEmbed.type === "iframe" && recordingEmbed.aspect === "video" && (
                        <div className="relative aspect-video w-full">
                          <iframe
                            src={recordingEmbed.src}
                            title={recordingEmbed.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full border-0"
                          />
                        </div>
                      )}
                      {recordingEmbed.type === "iframe" && recordingEmbed.aspect === "audio" && (
                        <iframe
                          src={recordingEmbed.src}
                          title={recordingEmbed.title}
                          height="152"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          className="w-full border-0"
                        />
                      )}
                      {recordingEmbed.type === "video" && (
                        <video
                          src={recordingEmbed.src}
                          controls
                          preload="metadata"
                          className="aspect-video w-full bg-black"
                        />
                      )}
                      {recordingEmbed.type === "audio" && (
                        <div className="bg-[#f7f6f4] p-4">
                          <audio
                            src={recordingEmbed.src}
                            controls
                            preload="metadata"
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[15px] text-[#111111]/75">
                      {matchingMedia?.mediaUrl
                        ? "Watch the full recording or browse highlights on our Media page."
                        : "The recording for this session will appear on the Media page once published."}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/media?session=${encodeURIComponent(session.number)}`}
                      className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#111111] px-6 py-3 text-white transition-opacity hover:opacity-85"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Watch the recording</span>
                    </Link>
                    {matchingMedia?.mediaUrl && (
                      <a
                        href={matchingMedia.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-black/10 bg-[#f7f6f4] px-5 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                      >
                        <span>Open external link</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </section>
              )}

              <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-black/[0.09] pt-8">
                <p className="text-[14.5px] text-[#111111]/72">
                  Have a topic or want to speak at a future Think Session?{" "}
                  <button
                    type="button"
                    onClick={() => setPitchOpen(true)}
                    className="cursor-pointer font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                  >
                    Pitch a topic or offer to speak
                  </button>{" "}
                  or email{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Think%20Session%20Topic`}
                    className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </article>
          )}
        </div>
      </main>

      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <PitchModal open={pitchOpen} onClose={() => setPitchOpen(false)} defaultPitchType="speaker" />
    </>
  );
}

export default function SessionDetailClient({ sessionId }: SessionDetailClientProps) {
  return (
    <FirestoreErrorBoundary>
      <SessionDetailInner sessionId={sessionId} />
    </FirestoreErrorBoundary>
  );
}
