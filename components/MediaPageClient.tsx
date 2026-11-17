"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Play,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { YouTubeVideoItem } from "../app/api/youtube/route";
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
  subscribeSiteSettings,
  type FirestoreMediaRecord,
  type FirestoreSessionRecord,
} from "../lib/firebaseContent";
import { getEmbedInfo } from "../lib/mediaEmbed";
import { CONTACT_EMAIL, triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { TakeawayQuoteButton } from "./TakeawayQuoteButton";

function MediaPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionQuery = searchParams.get("session")?.trim() ?? "";

  const [joinOpen, setJoinOpen] = useState(false);
  const [filter, setFilter] = useState<"All" | "Recording" | "Feature">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState<DiscoveryTopic>("All");
  const [activeSpeakerKey, setActiveSpeakerKey] = useState("");
  const [mediaList, setMediaList] = useState<FirestoreMediaRecord[]>([]);
  const [sessionList, setSessionList] = useState<FirestoreSessionRecord[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideoItem[]>([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    const unsubMedia = subscribePublishedMedia(
      (items) => {
        if (!active) return;
        setMediaList(items);
        setLoading(false);
        setErrorMessage(null);
      },
      (err) => {
        if (!active) return;
        setErrorMessage(formatFirestoreErrorMessage(err));
        setLoading(false);
      },
    );

    const unsubSessions = subscribePublishedSessions(
      (items) => {
        if (!active) return;
        setSessionList(items);
      },
      () => {
        // Optional cross-reference for speaker directory
      },
    );

    const unsubSettings = subscribeSiteSettings(
      (settings) => {
        if (!active) return;
        setYoutubeUrl(settings.youtubeUrl.trim());
      },
      () => {
        // Optional channel settings
      },
    );

    return () => {
      active = false;
      unsubMedia();
      unsubSessions();
      unsubSettings();
    };
  }, [retryKey]);

  useEffect(() => {
    if (!youtubeUrl || !youtubeUrl.startsWith("https://")) {
      setYoutubeVideos([]);
      setYoutubeError(null);
      setYoutubeLoading(false);
      return;
    }

    let active = true;
    setYoutubeLoading(true);
    setYoutubeError(null);

    fetch(`/api/youtube?channelUrl=${encodeURIComponent(youtubeUrl)}`)
      .then((res) => res.json())
      .then((data: { videos?: YouTubeVideoItem[]; error?: string }) => {
        if (!active) return;
        setYoutubeVideos(Array.isArray(data.videos) ? data.videos : []);
        setYoutubeError(data.error ?? null);
      })
      .catch(() => {
        if (!active) return;
        setYoutubeError("Unable to load YouTube recordings right now.");
      })
      .finally(() => {
        if (active) setYoutubeLoading(false);
      });

    return () => {
      active = false;
    };
  }, [youtubeUrl, retryKey]);

  const normalizedQuery = sessionQuery.toLowerCase();

  // Merge Firestore entries with dynamically pulled YouTube channel videos (deduped by URL)
  const existingUrls = new Set(mediaList.map((m) => m.mediaUrl.trim()).filter(Boolean));
  const mergedList: FirestoreMediaRecord[] = [
    ...mediaList,
    ...youtubeVideos
      .filter((yt) => !existingUrls.has(yt.url))
      .map(
        (yt): FirestoreMediaRecord => ({
          id: `yt-${yt.id}`,
          kind: "Recording",
          sessionRef: "YouTube Channel",
          title: yt.title,
          speaker: "The Thinking Architects",
          duration: yt.publishedAt || "YouTube",
          publishedAt: yt.publishedAt || "YouTube",
          mediaUrl: yt.url,
          published: true,
          summary:
            yt.description ||
            "Session recording from The Thinking Architects YouTube channel.",
          highlights: ["Full Think Session conversation from our YouTube channel"],
          createdBy: "youtube",
        }),
      ),
  ];

  const sessionMatched = normalizedQuery
    ? mergedList.filter(
        (item) =>
          item.sessionRef.toLowerCase().includes(normalizedQuery) ||
          item.title.toLowerCase().includes(normalizedQuery),
      )
    : mergedList;

  const baseList = normalizedQuery && sessionMatched.length > 0 ? sessionMatched : mergedList;

  const filtered = baseList.filter((item) => {
    if (filter !== "All" && item.kind !== filter) return false;
    const corpus = [
      item.sessionRef,
      item.title,
      item.speaker,
      item.summary,
      item.publishedAt,
      ...item.highlights,
    ];
    return (
      matchesSearchQuery(corpus, searchQuery) &&
      matchesDiscoveryTopic(corpus, activeTopic) &&
      speakerMatchesFilter(item.speaker, activeSpeakerKey)
    );
  });

  const mediaSpeakerDirectory = buildSpeakerDirectory(sessionList, mergedList);
  const hasMediaDiscoveryFilters = Boolean(
    filter !== "All" || searchQuery.trim() || activeTopic !== "All" || activeSpeakerKey,
  );

  const activeMedia = filtered.find((m) => m.id === activeMediaId) ?? filtered[0] ?? null;

  const embedInfo = activeMedia ? getEmbedInfo(activeMedia.mediaUrl, activeMedia.title) : null;

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

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label-mono text-[#fe3619]">Media · Latest Recordings &amp; Features</p>
              <h1
                className="mt-3 max-w-[18ch] text-[clamp(2.2rem,5vw,4.5rem)] font-medium leading-[1.04] tracking-[-0.035em]"
                style={{ textWrap: "balance" }}
              >
                Media
              </h1>
              <p className="mt-5 max-w-[60ch] text-[1.06rem] leading-[1.6] text-[#111111]/75">
                The conversation doesn&apos;t end when the call does. Watch recordings from our
                Think Sessions and share them with someone who needs them.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {youtubeUrl.startsWith("https://") ? (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                  >
                    <span>Subscribe on YouTube</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <Link
                    href="/contact#find-us"
                    className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                  >
                    <span>Subscribe on YouTube</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>

            {/* Interactive filter segmented control */}
            <div className="flex items-center gap-1 rounded-xl border border-black/[0.08] bg-[#efeeec] p-1">
              {(["All", "Recording", "Feature"] as const).map((tab) => {
                const active = filter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`label-mono min-h-[38px] cursor-pointer rounded-lg px-4 py-2 transition-colors ${
                      active
                        ? "bg-[#111111] text-white"
                        : "text-[#111111]/65 hover:text-[#111111]"
                    }`}
                  >
                    {tab === "All" ? "Latest recordings" : `${tab}s`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + Topic Tags + Speakers Directory Bar */}
          <div className="mt-8 space-y-4 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-4 sm:p-5">
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
                  placeholder="Search recordings, takeaways, or speakers..."
                  aria-label="Search media archive"
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

              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter media by topic">
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

            {mediaSpeakerDirectory.length > 0 && (
              <div className="border-t border-black/[0.08] pt-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-[#111111]/60">
                    <Users className="h-3.5 w-3.5 text-[#fe3619]" aria-hidden="true" />
                    <span>Past Speakers</span>
                  </span>
                  {hasMediaDiscoveryFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilter("All");
                        setSearchQuery("");
                        setActiveTopic("All");
                        setActiveSpeakerKey("");
                      }}
                      className="label-mono cursor-pointer text-[11px] text-[#fe3619] hover:underline"
                    >
                      Reset filters ({filtered.length} shown)
                    </button>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {mediaSpeakerDirectory.map((sp) => {
                    const selected = activeSpeakerKey === sp.key;
                    return (
                      <button
                        key={sp.key}
                        type="button"
                        onClick={() =>
                          setActiveSpeakerKey((prev) => (prev === sp.key ? "" : sp.key))
                        }
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

          {sessionQuery && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-black/[0.08] bg-[#EAEAEA] px-4 py-2.5">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-[#111111]">
                {sessionMatched.length > 0
                  ? `Showing media matched to "${sessionQuery}"`
                  : `No exact match found for "${sessionQuery}" — showing all available recordings`}
              </span>
              <button
                type="button"
                onClick={() => router.push("/media")}
                className="label-mono inline-flex cursor-pointer items-center gap-1 text-[#fe3619] hover:underline"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear filter</span>
              </button>
            </div>
          )}

          {loading || (youtubeLoading && mergedList.length === 0) ? (
            <section
              aria-busy="true"
              className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
            >
              <p className="label-mono text-[#111111]/60">
                Recordings are loading. You can also watch directly on our YouTube channel.
              </p>
              <div className="mt-6 space-y-4">
                <div className="h-9 w-3/4 animate-pulse rounded bg-black/[0.08]" />
                <div className="h-20 w-full animate-pulse rounded bg-black/[0.06]" />
              </div>
            </section>
          ) : errorMessage && mergedList.length === 0 ? (
            <section
              role="alert"
              className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10"
            >
              <div className="flex items-center gap-2 text-[#fe3619]">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span className="label-mono">Notice</span>
              </div>
              <h2 className="mt-3 text-[1.45rem] font-medium leading-[1.18] tracking-[-0.025em]">
                Recordings are loading. You can also watch directly on our YouTube channel.
              </h2>
              <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.6] text-[#111111]/70">
                {errorMessage}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="label-mono inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-6 py-3 text-white transition-opacity hover:opacity-85"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry</span>
                </button>
                {youtubeUrl.startsWith("https://") && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                  >
                    <span>Watch on YouTube</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </section>
          ) : mergedList.length === 0 ? (
            <section className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10">
              <p className="label-mono text-[#fe3619]">Latest Recordings</p>
              <h2 className="mt-3 max-w-[30ch] text-[clamp(1.55rem,3vw,2.25rem)] font-medium leading-[1.14] tracking-[-0.025em]">
                Recordings are loading. You can also watch directly on our YouTube channel.
              </h2>
              {youtubeError && (
                <p className="mt-2 text-[14px] text-[#111111]/65">{youtubeError}</p>
              )}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {youtubeUrl.startsWith("https://") ? (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label-mono inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#fe3619] px-7 py-3 text-white transition-opacity hover:opacity-90"
                  >
                    <span>Subscribe on YouTube</span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleOpenJoin}
                  className="label-mono group inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-7 py-3 text-white transition-opacity hover:opacity-85"
                >
                  <span>Join the community</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="label-mono inline-flex min-h-[48px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-6 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                >
                  <span>Email us</span>
                </a>
              </div>
            </section>
          ) : (
            <>
              {/* Active Feature / Recording Reader */}
              {activeMedia && (
                <section className="mt-10 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-10">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#111111]/60">
                    <span className="text-[#fe3619]">{activeMedia.kind}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeMedia.sessionRef}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{activeMedia.duration}</span>
                  </div>

                  <h2 className="mt-3 max-w-[28ch] text-[clamp(1.55rem,3vw,2.35rem)] font-medium leading-[1.14] tracking-[-0.025em]">
                    {activeMedia.title}
                  </h2>

                  <p className="mt-2 font-mono text-[12px] text-[#111111]/65">
                    Featuring {activeMedia.speaker}
                  </p>

                  {embedInfo && (
                    <div className="mt-6 overflow-hidden rounded-[10px] border border-black/[0.08] bg-[#111111]">
                      {embedInfo.type === "iframe" && embedInfo.aspect === "video" && (
                        <div className="relative aspect-video w-full">
                          <iframe
                            src={embedInfo.src}
                            title={embedInfo.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full border-0"
                          />
                        </div>
                      )}
                      {embedInfo.type === "iframe" && embedInfo.aspect === "audio" && (
                        <iframe
                          src={embedInfo.src}
                          title={embedInfo.title}
                          height="152"
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                          className="w-full border-0"
                        />
                      )}
                      {embedInfo.type === "video" && (
                        <video
                          src={embedInfo.src}
                          controls
                          preload="metadata"
                          className="aspect-video w-full bg-black"
                        />
                      )}
                      {embedInfo.type === "audio" && (
                        <div className="bg-[#f7f6f4] p-4">
                          <audio src={embedInfo.src} controls preload="metadata" className="w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  <p className="mt-5 max-w-[65ch] text-[15px] leading-[1.65] text-[#111111]/75">
                    {activeMedia.summary}
                  </p>

                  <div className="mt-6 grid gap-3 border-t border-black/[0.08] pt-6 sm:grid-cols-3">
                    {activeMedia.highlights.map((note, idx) => (
                      <div
                        key={note}
                        className="flex flex-col justify-between gap-4 rounded-lg bg-[#f7f6f4] p-4"
                      >
                        <div>
                          <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                            Key Takeaway 0{idx + 1}
                          </span>
                          <p className="mt-2 text-[14px] leading-snug text-[#111111]/85">{note}</p>
                        </div>
                        <TakeawayQuoteButton
                          payload={{
                            quote: note,
                            label: `${activeMedia.sessionRef} · Key Takeaway 0${idx + 1}`,
                            sourceTitle: activeMedia.title,
                            speaker: activeMedia.speaker,
                            metaLabel: `${activeMedia.kind} · ${activeMedia.publishedAt}`,
                            fileSlug: `${activeMedia.id}-takeaway-${idx + 1}`,
                          }}
                          className="self-start"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-wrap items-center gap-4">
                    {activeMedia.mediaUrl ? (
                      <a
                        href={activeMedia.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label-mono inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#111111] px-7 py-3 text-white transition-opacity hover:opacity-85"
                      >
                        <span>Open {activeMedia.kind}</span>
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ) : null}

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
                  </div>
                </section>
              )}

              {/* Media Archive List */}
              <section className="mt-14">
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-black/[0.08] bg-[#efeeec] p-8 text-center">
                    <p className="text-[15px] text-[#111111]/75">
                      No media items match your current search or filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilter("All");
                        setSearchQuery("");
                        setActiveTopic("All");
                        setActiveSpeakerKey("");
                      }}
                      className="label-mono mt-4 inline-flex min-h-[42px] cursor-pointer items-center rounded-lg bg-[#111111] px-5 py-2 text-white"
                    >
                      Show all recordings
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-px border-y border-black/[0.09] bg-black/[0.09] md:grid-cols-3">
                    {filtered.map((item) => {
                      const isActive = activeMedia && item.id === activeMedia.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveMediaId(item.id)}
                          className={`flex cursor-pointer flex-col justify-between p-7 text-left transition-colors ${
                            isActive ? "bg-[#efeeec]" : "bg-[#f7f6f4] hover:bg-[#efeeec]/55"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-[0.08em]">
                              <span className="text-[#fe3619]">{item.kind}</span>
                              <span className="tabular-nums text-[#111111]/55">
                                {item.duration}
                              </span>
                            </div>
                            <h3 className="mt-4 text-[1.2rem] font-medium leading-[1.22] tracking-[-0.02em] text-[#111111]">
                              {item.title}
                            </h3>
                            <p className="mt-2.5 text-[14px] leading-[1.55] text-[#111111]/70">
                              {item.summary}
                            </p>
                          </div>

                          <div className="mt-6 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#111111]">
                            <Play className="h-3.5 w-3.5 text-[#fe3619]" aria-hidden="true" />
                            <span>
                              {isActive ? "Viewing summary above" : "Watch & view notes"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
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

export default function MediaPageClient() {
  return (
    <FirestoreErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-[#f7f6f4]" />}>
        <MediaPageInner />
      </Suspense>
    </FirestoreErrorBoundary>
  );
}
