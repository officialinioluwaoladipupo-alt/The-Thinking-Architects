"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  ExternalLink,
  Play,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildSpeakerDirectory,
  DISCOVERY_TOPICS,
  matchesDiscoveryTopic,
  matchesSearchQuery,
  speakerMatchesFilter,
  type DiscoveryTopic,
} from "../lib/archiveDiscovery";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  subscribePublishedMedia,
  subscribePublishedSessions,
  type FirestoreMediaRecord,
  type FirestoreSessionRecord,
  type PitchType,
} from "../lib/firebaseContent";
import { CONTACT_EMAIL, TALLY_FORM_URL, triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import PitchModal from "./PitchModal";
import { SessionCalendarActions, SessionLocalTimeNote } from "./SessionCalendarActions";
import { SessionRemindButton } from "./SessionRemindButton";
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
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pitchMode, setPitchMode] = useState<PitchType>("topic");
  const [nextSession, setNextSession] = useState<FirestoreSessionRecord | null>(null);
  const [allSessions, setAllSessions] = useState<FirestoreSessionRecord[]>([]);
  const [pastSessions, setPastSessions] = useState<FirestoreSessionRecord[]>([]);
  const [mediaItems, setMediaItems] = useState<FirestoreMediaRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<DiscoveryTopic>("All");
  const [activeSpeakerKey, setActiveSpeakerKey] = useState("");
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
        setAllSessions(items);
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

    return () => {
      active = false;
      unsubSessions();
      unsubMedia();
    };
  }, [retryKey]);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  const hasArchiveFilters = Boolean(
    searchQuery.trim() || activeTopic !== "All" || activeSpeakerKey,
  );
  const directorySource = hasArchiveFilters ? allSessions : pastSessions;
  const filteredSessions = directorySource.filter((session) => {
    const corpus = [
      session.number,
      session.title,
      session.speaker,
      session.speakerRole,
      session.summary,
      session.dateLabel,
      ...session.topics,
    ];
    return (
      matchesSearchQuery(corpus, searchQuery) &&
      matchesDiscoveryTopic(corpus, activeTopic) &&
      speakerMatchesFilter(session.speaker, activeSpeakerKey)
    );
  });

  const speakerDirectory = buildSpeakerDirectory(allSessions);
  const activeSpeakerEntry = speakerDirectory.find((s) => s.key === activeSpeakerKey) ?? null;

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
                    <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{nextSession.timeLabel}</span>
                      <SessionLocalTimeNote startAtIso={nextSession.startAtIso} />
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

                  <div className="mt-8 flex flex-wrap items-start gap-3 sm:gap-4">
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

                    <SessionCalendarActions session={nextSession} />

                    <SessionRemindButton session={nextSession} />
                  </div>
                </section>
              )}

              {/* Archive Discovery & Past Sessions Hairline List */}
              <section className="mt-16">
                <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4">
                  <div>
                    <h2 className="text-[1.65rem] font-medium tracking-[-0.025em]">
                      {hasArchiveFilters ? "Matching sessions" : "Past sessions"}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.07em] tabular-nums text-[#111111]/55">
                      Showing {filteredSessions.length} of {directorySource.length} conversation
                      {directorySource.length === 1 ? "" : "s"}
                      {activeSpeakerEntry ? ` · Speaker: ${activeSpeakerEntry.name}` : ""}
                    </p>
                  </div>
                  <Link
                    href="/media"
                    className="label-mono text-[#111111]/65 underline-offset-4 hover:text-[#111111] hover:underline"
                  >
                    Browse all recordings
                  </Link>
                </div>

                {/* Search + Topic Filters */}
                <div className="mb-6 space-y-4 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1 lg:max-w-[380px]">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#111111]/45"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sessions by title, speaker, or topic..."
                        aria-label="Search Think Sessions"
                        className="h-11 w-full rounded-lg border border-black/10 bg-[#f7f6f4] pr-9 pl-10 text-[14px] text-[#111111] placeholder:text-[#111111]/45 focus:border-[#fe3619] focus:outline-none"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          aria-label="Clear search"
                          className="absolute top-1/2 right-2.5 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#111111]/50 hover:text-[#111111]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by topic">
                      {DISCOVERY_TOPICS.map((topic) => {
                        const selected = activeTopic === topic;
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => setActiveTopic(topic)}
                            className={`label-mono min-h-[38px] cursor-pointer rounded-lg border px-3.5 py-1.5 text-[11px] whitespace-nowrap transition-colors ${
                              selected
                                ? "border-[#111111] bg-[#111111] text-white"
                                : "border-black/10 bg-[#f7f6f4] text-[#111111]/70 hover:border-black/25 hover:text-[#111111]"
                            }`}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Past Speakers Directory Strip */}
                  {speakerDirectory.length > 0 && (
                    <div className="border-t border-black/[0.08] pt-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-[#111111]/60">
                          <Users className="h-3.5 w-3.5 text-[#fe3619]" aria-hidden="true" />
                          <span>Past Speakers Directory</span>
                        </span>
                        {hasArchiveFilters && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setActiveTopic("All");
                              setActiveSpeakerKey("");
                            }}
                            className="label-mono cursor-pointer text-[11px] text-[#fe3619] hover:underline"
                          >
                            Reset all filters
                          </button>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {speakerDirectory.map((sp) => {
                          const selected = activeSpeakerKey === sp.key;
                          return (
                            <button
                              key={sp.key}
                              type="button"
                              onClick={() =>
                                setActiveSpeakerKey((prev) => (prev === sp.key ? "" : sp.key))
                              }
                              title={sp.role || sp.name}
                              className={`inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-[12.5px] transition-colors ${
                                selected
                                  ? "border-[#fe3619] bg-[#fe3619] text-white"
                                  : "border-black/10 bg-[#f7f6f4] text-[#111111]/80 hover:border-black/25 hover:text-[#111111]"
                              }`}
                            >
                              <span className="font-medium">{sp.name}</span>
                              <span
                                className={`font-mono text-[10px] tabular-nums ${
                                  selected ? "text-white/85" : "text-[#111111]/45"
                                }`}
                              >
                                {sp.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-black/[0.09]">
                  {filteredSessions.length === 0 ? (
                    <div className="border-b border-black/[0.09] py-10">
                      <p className="text-[15px] text-[#111111]/65">
                        {hasArchiveFilters
                          ? "No sessions match your current search or filter."
                          : "Past Think Sessions will appear here after they conclude."}
                      </p>
                      {hasArchiveFilters && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setActiveTopic("All");
                            setActiveSpeakerKey("");
                          }}
                          className="label-mono mt-4 inline-flex min-h-[42px] cursor-pointer items-center rounded-lg bg-[#111111] px-5 py-2 text-white"
                        >
                          Show all sessions
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredSessions.map((session) => {
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
                            {session.status === "upcoming" && session.startAtIso && (
                              <SessionLocalTimeNote
                                startAtIso={session.startAtIso}
                                className="mt-1 block text-[11px]"
                              />
                            )}
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
                              {session.resources.length > 0 &&
                                ` · ${session.resources.length} resource${
                                  session.resources.length === 1 ? "" : "s"
                                }`}
                            </p>
                            <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-[#111111]/75">
                              {session.summary}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-start gap-2">
                            {canWatch && (
                              <Link
                                href={`/media?session=${encodeURIComponent(session.number)}`}
                                className="label-mono inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#fe3619] px-4 py-2 text-white transition-opacity hover:opacity-90"
                              >
                                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Watch</span>
                              </Link>
                            )}
                            <SessionRemindButton session={session} compact />
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
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-[15.5px] leading-[1.6] text-[#111111]/85">
                      <strong className="font-semibold text-[#111111]">
                        Have a topic or want to speak?
                      </strong>{" "}
                      Send a pitch directly to our programming team or email{" "}
                      <a
                        href={`mailto:${CONTACT_EMAIL}?subject=Think%20Session%20Topic`}
                        className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                      >
                        {CONTACT_EMAIL}
                      </a>
                      .
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPitchMode("topic");
                        setPitchOpen(true);
                      }}
                      className="label-mono inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/12 bg-[#f7f6f4] px-5 py-2.5 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                    >
                      <span>Suggest a topic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPitchMode("speaker");
                        setPitchOpen(true);
                      }}
                      className="label-mono inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                    >
                      <span>Offer to speak</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <PitchModal
        open={pitchOpen}
        onClose={() => setPitchOpen(false)}
        defaultPitchType={pitchMode}
      />
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
