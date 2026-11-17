"use client";

import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { motion } from "motion/react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  subscribePublishedSessions,
  type FirestoreSessionRecord,
} from "../lib/firebaseContent";
import { TALLY_FORM_URL } from "../lib/tally";
import studioImg from "../src/assets/images/hero_architecture_studio_1794913643987.jpg";
import draftingImg from "../src/assets/images/track_licensure_path_1794913644519.jpg";
import critiqueImg from "../src/assets/images/track_live_sessions_1794913644707.jpg";
import { SessionCalendarActions, SessionLocalTimeNote } from "./SessionCalendarActions";

type TracksGridProps = {
  onOpenJoin: () => void;
  hasWrappedBanner?: boolean;
};

type PillarItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: StaticImageData;
  alt: string;
  actionLabel: string;
  href?: string;
};

const pillars: PillarItem[] = [
  {
    id: "events",
    eyebrow: "Events",
    title: "Think Sessions",
    description:
      "Monthly live conversations with practising architects on the questions school doesn't answer: registration, early practice, running a studio, and building a career that lasts. Every session leaves time for your questions.",
    image: critiqueImg,
    alt: "Architects reviewing physical building models and architectural drawings together",
    actionLabel: "View sessions",
    href: "/sessions",
  },
  {
    id: "media",
    eyebrow: "Media",
    title: "Recordings & features",
    description:
      "Recordings and features from our sessions, so the conversation doesn't end when the call does. Watch what you missed and share it with someone who needs it.",
    image: draftingImg,
    alt: "Overhead architectural drafting desk with technical plans, scale ruler, and field notebook",
    actionLabel: "Watch on the Media page",
    href: "/media",
  },
  {
    id: "community",
    eyebrow: "Community",
    title: "Members' space",
    description:
      "A members' community where people talk openly, share what they're learning, and hear about the next session first.",
    image: studioImg,
    alt: "Sunlit architectural design studio with timber louvers and collaborative tables",
    actionLabel: "Join the community",
  },
];

export default function TracksGrid({ onOpenJoin, hasWrappedBanner = false }: TracksGridProps) {
  const [nextSession, setNextSession] = useState<FirestoreSessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage(null);

    const unsubscribe = subscribePublishedSessions(
      (items) => {
        if (!active) return;
        const featured =
          items.find((item) => item.isNextSession) ??
          items.find((item) => item.status === "upcoming") ??
          items[0] ??
          null;
        setNextSession(featured);
        setLoading(false);
        setErrorMessage(null);
      },
      (err) => {
        if (!active) return;
        setErrorMessage(formatFirestoreErrorMessage(err));
        setLoading(false);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [retryKey]);

  return (
    <section
      id="what-we-do"
      className={`relative bg-[#f7f6f4] px-6 pb-16 ${
        hasWrappedBanner
          ? "mt-0 pt-10 sm:pt-14"
          : "-mt-[12vh] pt-[96px] sm:-mt-[20vh] sm:pt-[140px]"
      }`}
    >
      <div className="mx-auto max-w-[1440px]">
        <p className="label-mono text-center text-[#fe3619]">Media, Events &amp; Community</p>
        <h2
          className="mx-auto mt-3 max-w-[22ch] text-center text-[clamp(1.85rem,3.6vw,3.45rem)] font-medium leading-[1.08] tracking-[-0.025em] text-[#111111]"
          style={{ textWrap: "balance" }}
        >
          What we do.
        </h2>

        {/* 3 Core Pillar Cards modeled on theacademysf.com square frame + #EAEAEA caption block */}
        <ul className="mx-auto mt-12 grid w-full grid-cols-1 gap-x-5 gap-y-10 md:grid-cols-3">
          {pillars.map((pillar, idx) => (
            <motion.li
              key={pillar.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.45,
                delay: idx * 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex flex-col"
            >
              <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-[#1a1917]">
                <Image
                  src={pillar.image}
                  alt={pillar.alt}
                  fill
                  referrerPolicy="no-referrer"
                  sizes="(max-width: 768px) 92vw, 31vw"
                  className="object-cover object-center grayscale transition-all duration-500 group-hover:scale-[1.02] group-hover:grayscale-0"
                />
              </div>

              <div className="mt-2.5 flex w-full items-center justify-between rounded-[5px] bg-[#EAEAEA] px-3 py-2 text-[#111111]">
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.07em]">
                  {pillar.eyebrow}: {pillar.title}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#111111]/55">
                  0{idx + 1}
                </span>
              </div>

              <p className="mt-4 flex-1 text-[15px] leading-[1.6] text-[#111111]/75">
                {pillar.description}
              </p>

              <div className="mt-5">
                {pillar.href ? (
                  <Link
                    href={pillar.href}
                    className="label-mono group inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-black/12 bg-[#efeeec] px-5 py-2.5 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                  >
                    <span>{pillar.actionLabel}</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenJoin}
                    className="label-mono group inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                  >
                    <span>{pillar.actionLabel}</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>

        {/* Dynamic Next Session block pulled live from Firestore */}
        <div
          id="next-session"
          className="mx-auto mt-14 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-6 sm:p-9"
        >
          {loading ? (
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]" aria-busy="true">
              <div className="space-y-4">
                <div className="h-4 w-48 animate-pulse rounded bg-black/[0.08]" />
                <div className="h-9 w-5/6 animate-pulse rounded bg-black/[0.08]" />
                <div className="h-4 w-64 animate-pulse rounded bg-black/[0.06]" />
                <div className="h-20 w-full animate-pulse rounded bg-black/[0.06]" />
              </div>
              <div className="space-y-3 border-t border-black/[0.08] pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                <div className="h-4 w-40 animate-pulse rounded bg-black/[0.08]" />
                <div className="h-5 w-full animate-pulse rounded bg-black/[0.06]" />
                <div className="h-5 w-5/6 animate-pulse rounded bg-black/[0.06]" />
                <div className="h-11 w-48 animate-pulse rounded-xl bg-black/[0.08]" />
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 text-[#fe3619]">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="label-mono">Next Session Unavailable</span>
                </div>
                <h3 className="mt-2 text-[1.35rem] font-medium tracking-[-0.02em] text-[#111111]">
                  We couldn&apos;t load the live session schedule.
                </h3>
                <p className="mt-2 max-w-[60ch] text-[14px] text-[#111111]/70">
                  {errorMessage}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-white transition-opacity hover:opacity-85"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenJoin}
                  className="label-mono inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-5 py-2.5 text-white transition-opacity hover:opacity-90"
                >
                  <span>Join the community</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : !nextSession ? (
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <p className="label-mono text-[#fe3619]">Monthly Live Sessions</p>
                <h3 className="mt-2 text-[1.5rem] font-medium leading-[1.16] tracking-[-0.025em] text-[#111111] sm:text-[1.85rem]">
                  Next Think Session details are being confirmed.
                </h3>
                <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.6] text-[#111111]/75">
                  Join the community and we&apos;ll send you the invitation as soon as the next
                  conversation with practising architects is scheduled.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenJoin}
                  className="label-mono group inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                >
                  <span>Join the community</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </button>
                <Link
                  href="/sessions"
                  className="label-mono inline-flex min-h-[46px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-5 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                >
                  <span>See Think Sessions</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#111111]/60">
                  <span className="text-[#fe3619]">{nextSession.number}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#111111]/50" aria-hidden="true" />
                    <span>{nextSession.dateLabel}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
                    <Clock className="h-3.5 w-3.5 text-[#111111]/50" aria-hidden="true" />
                    <span>{nextSession.timeLabel}</span>
                    <SessionLocalTimeNote startAtIso={nextSession.startAtIso} />
                  </span>
                </div>

                <h3 className="mt-3 text-[1.5rem] font-medium leading-[1.16] tracking-[-0.025em] text-[#111111] sm:text-[1.95rem]">
                  <Link
                    href={`/sessions/${encodeURIComponent(nextSession.id)}`}
                    className="transition-colors hover:text-[#fe3619]"
                  >
                    {nextSession.title}
                  </Link>
                </h3>

                <p className="mt-2 font-mono text-[12px] text-[#111111]/70">
                  {nextSession.speaker} — {nextSession.speakerRole}
                </p>

                <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-[#111111]/75">
                  {nextSession.summary}
                </p>
              </div>

              <div className="flex flex-col justify-between gap-6 border-t border-black/[0.08] pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                <div>
                  <p className="label-mono text-[#111111]/55">What this session covers</p>
                  <ul className="mt-3.5 space-y-2.5 text-[14px] text-[#111111]/85">
                    {nextSession.topics.map((topic, i) => (
                      <li key={topic} className="flex items-start gap-2.5">
                        <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                          0{i + 1}
                        </span>
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {nextSession.registrationUrl &&
                  nextSession.registrationUrl.trim().startsWith("https://") &&
                  nextSession.registrationUrl.trim() !== TALLY_FORM_URL ? (
                    <a
                      href={nextSession.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                    >
                      <span>Register for this session</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenJoin}
                      className="label-mono group inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                    >
                      <span>Join the community</span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  )}

                  <Link
                    href="/sessions"
                    className="label-mono inline-flex min-h-[44px] items-center rounded-xl border border-black/10 bg-[#f7f6f4] px-5 py-2.5 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                  >
                    <span>View all sessions</span>
                  </Link>

                  {nextSession.status === "upcoming" && (
                    <SessionCalendarActions session={nextSession} compact />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
