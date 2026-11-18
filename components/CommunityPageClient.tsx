"use client";

import { ArrowLeft, ArrowUpRight, Mail, Mic } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_COMMUNITY_STATS,
  DEFAULT_WRAPPED_CONFIG,
  subscribeCommunityStats,
  subscribePublishedSessions,
  subscribeWrappedConfig,
  type CommunityStatsRecord,
  type FirestoreSessionRecord,
  type WrappedConfigRecord,
} from "../lib/firebaseContent";
import { CONTACT_EMAIL, TALLY_FORM_ID, triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import PitchModal from "./PitchModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

const benefits = [
  "Honest conversation about studio, internships, registration, and practice",
  "Session announcements and reminders",
  "People a few years ahead of you who remember what it was like",
];

const steps = [
  {
    number: "01",
    body: 'Tap "Join the community" and fill in the short form (takes about two minutes).',
  },
  {
    number: "02",
    body: "You'll get a welcome email from us with next steps. Check your spam folder if it doesn't arrive.",
  },
  {
    number: "03",
    body: "Introduce yourself and take part.",
  },
];

const formFields = [
  { label: "Full name", detail: "Your name so we know how to address you" },
  { label: "Email address", detail: "Where we send your welcome email and session invites" },
  { label: "Country", detail: "Helps us understand time zones and regional context" },
  {
    label: "Where are you in your journey?",
    detail: "Student · Graduate · Early-career architect · Registered architect · Other",
  },
  { label: "Why do you want to join?", detail: "What you're hoping to learn, ask, or share" },
  { label: "How did you find us?", detail: "Helps us know how people discover the community" },
];

const groundRules = [
  "Be respectful. Disagree with ideas, not people.",
  "Ask freely. No question is too basic.",
  "Keep it relevant to architecture and the profession.",
];

function CommunityPageInner() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [communityStats, setCommunityStats] = useState<CommunityStatsRecord>({
    ...DEFAULT_COMMUNITY_STATS,
    exists: false,
  });
  const [wrappedConfig, setWrappedConfig] = useState<WrappedConfigRecord>({
    ...DEFAULT_WRAPPED_CONFIG,
    exists: false,
  });
  const [sessions, setSessions] = useState<FirestoreSessionRecord[]>([]);

  useEffect(() => {
    const unsubStats = subscribeCommunityStats(setCommunityStats, () => {
      // Keep defaults gracefully on transient error
    });
    const unsubWrapped = subscribeWrappedConfig(setWrappedConfig, () => {
      // Keep defaults gracefully on transient error
    });
    const unsubSessions = subscribePublishedSessions(setSessions, () => {
      // Keep empty list gracefully on transient error
    });
    return () => {
      unsubStats();
      unsubWrapped();
      unsubSessions();
    };
  }, []);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  // Prefer synced Google Sheets / CommunityStats when present, falling back to Wrapped highlights cleanly
  const totalMembers = communityStats.exists
    ? communityStats.communityTotal
    : wrappedConfig.communityTotal;
  const studentsCount = communityStats.exists
    ? communityStats.studentsCount
    : wrappedConfig.studentsCount;
  const professionalsCombined = communityStats.exists
    ? communityStats.graduatesCount + communityStats.professionalsCount
    : wrappedConfig.professionalsCount;

  const fallbackLocations = [
    wrappedConfig.locationPrimary,
    wrappedConfig.locationSecondary,
    ...wrappedConfig.extraLocations,
  ]
    .map((loc) => loc.trim())
    .filter(Boolean);

  const displayLocations =
    communityStats.exists && communityStats.topLocations.length > 0
      ? communityStats.topLocations
      : fallbackLocations;

  const countriesOrRegionsCount = communityStats.exists
    ? communityStats.countriesCount
    : displayLocations.length;

  const uniqueSpeakersCount = new Set(
    sessions.map((s) => s.speaker.trim().toLowerCase()).filter(Boolean),
  ).size;

  const showStatsBand = communityStats.showOnCommunity;

  return (
    <>
      <SiteHeader onOpenJoin={handleOpenJoin} />

      <main className="min-h-screen bg-[#f7f6f4] pt-32 pb-24 text-[#111111]">
        <div className="mx-auto max-w-[1040px] px-6">
          <Link
            href="/"
            className="label-mono inline-flex items-center gap-2 text-[#111111]/60 transition-colors hover:text-[#111111]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>

          <header className="mt-8 border-b border-black/[0.09] pb-12">
            <p className="label-mono text-[#fe3619]">Community &amp; Onboarding</p>
            <h1
              className="mt-3 max-w-[18ch] text-[clamp(2.2rem,5vw,4.35rem)] font-medium leading-[1.04] tracking-[-0.035em]"
              style={{ textWrap: "balance" }}
            >
              A place to talk openly.
            </h1>
            <p className="mt-6 max-w-[62ch] text-[clamp(1.04rem,1.3vw,1.2rem)] leading-[1.6] text-[#111111]/78">
              The TTA community is where architecture students, graduates, and practitioners ask
              questions, share what they&apos;re learning, and hear about sessions first.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={handleOpenJoin}
                data-tally-open={TALLY_FORM_ID}
                className="label-mono group inline-flex min-h-[52px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-8 py-3.5 text-[12px] text-white transition-opacity hover:opacity-90"
              >
                <span>Join the community</span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </header>

          {/* Dynamic Community Numbers Band */}
          {showStatsBand && (
            <section
              aria-label="Community highlights"
              className="mt-12 border-b border-black/[0.09] pb-12"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="label-mono text-[#fe3619]">
                  {communityStats.sourceLabel || "Community Highlights"}
                </p>
                <Link
                  href="/sessions"
                  className="font-mono text-[11px] uppercase tracking-[0.07em] text-[#111111]/60 underline underline-offset-4 transition-colors hover:text-[#fe3619]"
                >
                  Browse Think Sessions →
                </Link>
              </div>

              <div className="mt-5 grid gap-px border border-black/[0.09] bg-black/[0.09] md:grid-cols-3">
                <div className="bg-[#f7f6f4] p-7">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-[#111111]/55">
                    01 · Members
                  </span>
                  <p className="mt-3 text-[clamp(2rem,3.2vw,2.75rem)] font-medium leading-none tracking-[-0.03em] tabular-nums">
                    {totalMembers}
                  </p>
                  <p className="mt-2.5 text-[14px] leading-[1.55] text-[#111111]/72">
                    {studentsCount > 0 || professionalsCombined > 0
                      ? `${studentsCount} students · ${professionalsCombined} graduates & practitioners`
                      : "Students, graduates, and practising architects."}
                  </p>
                </div>

                <div className="bg-[#f7f6f4] p-7">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-[#111111]/55">
                    02 · Countries &amp; Hubs
                  </span>
                  <p className="mt-3 text-[clamp(2rem,3.2vw,2.75rem)] font-medium leading-none tracking-[-0.03em] tabular-nums">
                    {countriesOrRegionsCount > 0 ? countriesOrRegionsCount : "Nigeria"}
                  </p>
                  <p className="mt-2.5 text-[14px] leading-[1.55] text-[#111111]/72">
                    {displayLocations.length > 0
                      ? displayLocations.slice(0, 4).join(" · ")
                      : "Chapters and members tuning in across regions."}
                  </p>
                </div>

                <div className="bg-[#f7f6f4] p-7">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-[#111111]/55">
                    03 · Think Sessions
                  </span>
                  <p className="mt-3 text-[clamp(2rem,3.2vw,2.75rem)] font-medium leading-none tracking-[-0.03em] tabular-nums">
                    {sessions.length > 0
                      ? sessions.length
                      : wrappedConfig.sessionHighlights.length}
                  </p>
                  <p className="mt-2.5 text-[14px] leading-[1.55] text-[#111111]/72">
                    {uniqueSpeakersCount > 0
                      ? `Conversations hosted with ${uniqueSpeakersCount} guest speakers`
                      : "Monthly live sessions with open Q&A"}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* What you'll find + Who's in it */}
          <section className="mt-14 grid gap-12 border-b border-black/[0.09] pb-14 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="label-mono text-[#fe3619]">Inside the Room</p>
              <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.15rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                What you&apos;ll find
              </h2>
              <ul className="mt-6 space-y-4 border-t border-black/[0.08] pt-6">
                {benefits.map((item, idx) => (
                  <li key={item} className="flex items-start gap-4 text-[15.5px] leading-[1.6]">
                    <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                      0{idx + 1}
                    </span>
                    <span className="text-[#111111]/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7">
              <p className="label-mono text-[#fe3619]">Membership</p>
              <h2 className="mt-2.5 text-[1.4rem] font-medium leading-[1.2] tracking-[-0.02em]">
                Who&apos;s in it
              </h2>
              <p className="mt-4 text-[15.5px] leading-[1.68] text-[#111111]/78">
                Students, graduates, early-career architects, and registered practitioners, all at
                different stages and all willing to help.
              </p>
            </div>
          </section>

          {/* How to join */}
          <section className="mt-14 border-b border-black/[0.09] pb-14">
            <p className="label-mono text-[#fe3619]">Getting Started</p>
            <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.15rem)] font-medium leading-[1.15] tracking-[-0.025em]">
              How to join
            </h2>

            <div className="mt-8 grid gap-px border border-black/[0.09] bg-black/[0.09] md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="bg-[#f7f6f4] p-7">
                  <span className="font-mono text-[11px] font-bold tabular-nums tracking-[0.09em] text-[#fe3619]">
                    {step.number}
                  </span>
                  <p className="mt-4 text-[16px] font-medium leading-[1.55] text-[#111111]">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Two-minute form breakdown */}
          <section className="mt-14 border-b border-black/[0.09] pb-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-mono text-[#fe3619]">Two-Minute Form</p>
                <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.15rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                  What the form asks
                </h2>
                <p className="mt-2.5 max-w-[58ch] text-[15px] leading-[1.6] text-[#111111]/72">
                  One short form tells us where you are in your journey and what you&apos;d like
                  from the community. It takes about two minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenJoin}
                data-tally-open={TALLY_FORM_ID}
                className="label-mono group inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
              >
                <span>Open the form</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-8 grid gap-px border border-black/[0.09] bg-black/[0.09] sm:grid-cols-2 lg:grid-cols-3">
              {formFields.map((field, idx) => (
                <div key={field.label} className="bg-[#f7f6f4] p-6">
                  <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                    0{idx + 1}
                  </span>
                  <h3 className="mt-3 text-[1.05rem] font-medium tracking-[-0.015em]">
                    {field.label}
                  </h3>
                  <p className="mt-2 text-[14px] leading-[1.55] text-[#111111]/70">
                    {field.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Ground rules */}
          <section className="mt-14 border-b border-black/[0.09] pb-14">
            <p className="label-mono text-[#fe3619]">Community Standards</p>
            <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.15rem)] font-medium leading-[1.15] tracking-[-0.025em]">
              Ground rules
            </h2>

            <div className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
              {groundRules.map((rule, idx) => (
                <div key={rule} className="flex items-start gap-5 py-5">
                  <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                    0{idx + 1}
                  </span>
                  <p className="text-[15.5px] leading-[1.6] text-[#111111]/85">{rule}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Want to do more than attend? */}
          <section className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7">
              <p className="label-mono text-[#fe3619]">Join Us</p>
              <h3 className="mt-2 text-[1.3rem] font-medium tracking-[-0.02em]">
                Ready to step into the room?
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.6] text-[#111111]/75">
                You&apos;ll get a welcome email from us after submitting. Check your spam folder if
                it doesn&apos;t arrive.
              </p>
              <button
                type="button"
                onClick={handleOpenJoin}
                data-tally-open={TALLY_FORM_ID}
                className="label-mono group mt-6 inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
              >
                <span>Join the community</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7">
              <p className="label-mono text-[#fe3619]">Want to do more than attend?</p>
              <h3 className="mt-2 text-[1.3rem] font-medium tracking-[-0.02em]">
                Speak, volunteer, or partner
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.6] text-[#111111]/78">
                To speak at a session, volunteer, or partner with us, email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPitchOpen(true)}
                  className="label-mono inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#111111] px-6 py-3 text-white transition-opacity hover:opacity-85"
                >
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pitch a topic / speak</span>
                </button>
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=Speaking%20or%20Volunteering%20with%20TTA`}
                  className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-black/12 bg-[#f7f6f4] px-5 py-3 text-[#111111] transition-colors hover:bg-white"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Email the team</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
      <PitchModal open={pitchOpen} onClose={() => setPitchOpen(false)} defaultPitchType="speaker" />
    </>
  );
}

export default function CommunityPageClient() {
  return (
    <FirestoreErrorBoundary>
      <CommunityPageInner />
    </FirestoreErrorBoundary>
  );
}
