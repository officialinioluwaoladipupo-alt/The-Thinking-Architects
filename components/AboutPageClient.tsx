"use client";

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

const principles = [
  {
    index: "01",
    title: "Candid over polished.",
    body: "We ask practitioners what went wrong as well as what went right.",
  },
  {
    index: "02",
    title: "Open to every stage.",
    body: "A first-year student and a registered architect belong in the same room.",
  },
  {
    index: "03",
    title: "Independent.",
    body: "We are not affiliated with ARCON, NIA, or JBAE. For official requirements, always go to the source.",
  },
];

function AboutPageInner() {
  const [joinOpen, setJoinOpen] = useState(false);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

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
            <p className="label-mono text-[#fe3619]">About The Thinking Architects</p>
            <h1
              className="mt-3 max-w-[18ch] text-[clamp(2.2rem,5vw,4.35rem)] font-medium leading-[1.04] tracking-[-0.035em]"
              style={{ textWrap: "balance" }}
            >
              Built for the questions school doesn&apos;t answer.
            </h1>
            <p className="mt-6 max-w-[60ch] text-[clamp(1.04rem,1.3vw,1.2rem)] leading-[1.6] text-[#111111]/78">
              The Thinking Architects is a media and events community for architecture students,
              graduates, and practitioners. We exist so that nobody has to figure this profession
              out alone.
            </p>
          </header>

          {/* The gap + What we do */}
          <section className="mt-14 grid gap-12 border-b border-black/[0.09] pb-14 md:grid-cols-2">
            <div>
              <p className="label-mono text-[#fe3619]">01 · Why We Exist</p>
              <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.15rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                The gap
              </h2>
              <div className="mt-4 space-y-4 text-[15.5px] leading-[1.68] text-[#111111]/75">
                <p>
                  Most of us spend five years or more learning how to design. Very few of us are
                  taught clearly what comes after: how registration works, what counts as
                  experience, what the professional exam involves, and when to start preparing for
                  it.
                </p>
                <p>
                  That information exists, but it travels informally, to whoever happens to be near
                  the right conversation. We think it should reach everyone.
                </p>
              </div>
            </div>

            <div>
              <p className="label-mono text-[#fe3619]">02 · Format</p>
              <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.15rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                What we do
              </h2>
              <p className="mt-4 text-[15.5px] leading-[1.68] text-[#111111]/75">
                We bring practising architects, educators, and students into the same conversation
                through monthly live Think Sessions. We record and publish those conversations so
                they outlast the call. And we run a community where members keep talking between
                sessions.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/sessions"
                  className="label-mono inline-flex min-h-[44px] items-center rounded-xl border border-black/10 bg-[#efeeec] px-5 py-2.5 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                >
                  <span>Explore Think Sessions</span>
                </Link>
                <Link
                  href="/media"
                  className="label-mono inline-flex min-h-[44px] items-center rounded-xl border border-black/10 bg-[#efeeec] px-5 py-2.5 text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                >
                  <span>Browse Media</span>
                </Link>
              </div>
            </div>
          </section>

          {/* How we work */}
          <section className="mt-14">
            <p className="label-mono text-[#fe3619]">03 · Principles</p>
            <h2 className="mt-2.5 text-[clamp(1.55rem,2.6vw,2.25rem)] font-medium leading-[1.15] tracking-[-0.025em]">
              How we work
            </h2>

            <div className="mt-8 grid gap-px border border-black/[0.09] bg-black/[0.09] md:grid-cols-3">
              {principles.map((item) => (
                <article key={item.index} className="bg-[#f7f6f4] p-7">
                  <span className="font-mono text-[11px] font-bold tabular-nums tracking-[0.09em] text-[#fe3619]">
                    {item.index}
                  </span>
                  <h3 className="mt-4 text-[1.25rem] font-medium leading-[1.2] tracking-[-0.02em]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[#111111]/72">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Closing line + Join CTA */}
          <section className="mt-14 rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7 sm:p-10">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <p className="max-w-[58ch] text-[1.05rem] font-medium leading-[1.55] tracking-[-0.015em] text-[#111111]">
                Founded in January 2026 and run by volunteers who believe the profession gets better
                when its knowledge is shared.
              </p>
              <button
                type="button"
                onClick={handleOpenJoin}
                className="label-mono group inline-flex min-h-[50px] shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-7 py-3.5 text-white transition-opacity hover:opacity-90"
              >
                <span>Join the community</span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </button>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}

export default function AboutPageClient() {
  return (
    <FirestoreErrorBoundary>
      <AboutPageInner />
    </FirestoreErrorBoundary>
  );
}
