"use client";

import { ArrowLeft, ArrowUpRight, Mail, Mic } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  subscribeSiteSettings,
  type PitchType,
  type SiteSettingsRecord,
} from "../lib/firebaseContent";
import { CONTACT_EMAIL, triggerTallyPopup } from "../lib/tally";
import FirestoreErrorBoundary from "./FirestoreErrorBoundary";
import JoinModal from "./JoinModal";
import PitchModal from "./PitchModal";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

const topics = [
  {
    title: "General questions",
    detail: "about the community or sessions",
  },
  {
    title: "Speaking:",
    detail: "suggest a topic or offer to speak",
    isPitch: true,
  },
  {
    title: "Partnerships and sponsorship",
    detail: "supporting open conversations and architecture access",
  },
  {
    title: "Media and press",
    detail: "features, interviews, and collaboration requests",
  },
];

function ContactPageInner() {
  const [joinOpen, setJoinOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pitchMode, setPitchMode] = useState<PitchType>("speaker");
  const [channels, setChannels] = useState<SiteSettingsRecord>({
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
    exists: false,
  });

  useEffect(() => {
    const unsub = subscribeSiteSettings(
      (data) => setChannels(data),
      () => {
        // Optional channel URLs; fallback handles below keep Contact resilient
      },
    );
    return () => unsub();
  }, []);

  const handleOpenJoin = () => {
    triggerTallyPopup(() => setJoinOpen(true));
  };

  const openPitch = (mode: PitchType) => {
    setPitchMode(mode);
    setPitchOpen(true);
  };

  const instagramHref = channels.instagramUrl.trim().startsWith("https://")
    ? channels.instagramUrl.trim()
    : "https://www.instagram.com/_tta.ng";
  const xHref = channels.xUrl.trim().startsWith("https://")
    ? channels.xUrl.trim()
    : "https://x.com/TTA_Africa";
  const linkedinHref = channels.linkedinUrl.trim().startsWith("https://")
    ? channels.linkedinUrl.trim()
    : "";
  const youtubeHref = channels.youtubeUrl.trim().startsWith("https://")
    ? channels.youtubeUrl.trim()
    : "";

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
            <p className="label-mono text-[#fe3619]">Contact</p>
            <h1
              className="mt-3 max-w-[18ch] text-[clamp(2.2rem,5vw,4.35rem)] font-medium leading-[1.04] tracking-[-0.035em]"
              style={{ textWrap: "balance" }}
            >
              Get in touch.
            </h1>
            <p className="mt-6 max-w-[58ch] text-[clamp(1.04rem,1.3vw,1.2rem)] leading-[1.6] text-[#111111]/78">
              Questions, ideas, or something to share? Pitch a Think Session topic directly or email
              us and we&apos;ll reply as soon as we can.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openPitch("speaker")}
                className="label-mono group inline-flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-xl bg-[#fe3619] px-7 py-3.5 text-[12px] text-white transition-opacity hover:opacity-90"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Pitch a topic or speak</span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </button>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="label-mono inline-flex min-h-[52px] items-center gap-2.5 rounded-xl border border-black/12 bg-[#efeeec] px-6 py-3.5 text-[12px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </div>
          </header>

          {/* What to write to us about + Response & Data */}
          <section className="mt-14 grid gap-12 border-b border-black/[0.09] pb-14 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="label-mono text-[#fe3619]">Topics</p>
              <h2 className="mt-2.5 text-[clamp(1.5rem,2.5vw,2.1rem)] font-medium leading-[1.15] tracking-[-0.025em]">
                What to write to us about
              </h2>

              <ul className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
                {topics.map((item, idx) => (
                  <li key={item.title} className="flex items-start justify-between gap-4 py-4">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-[11px] font-bold tabular-nums text-[#fe3619]">
                        0{idx + 1}
                      </span>
                      <p className="text-[15.5px] leading-[1.55] text-[#111111]/78">
                        <strong className="font-semibold text-[#111111]">{item.title}</strong>{" "}
                        {item.detail}
                      </p>
                    </div>
                    {item.isPitch && (
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPitch("topic")}
                          className="label-mono cursor-pointer rounded-lg border border-black/12 bg-[#efeeec] px-3 py-1.5 text-[11px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                        >
                          Suggest topic
                        </button>
                        <button
                          type="button"
                          onClick={() => openPitch("speaker")}
                          className="label-mono cursor-pointer rounded-lg bg-[#fe3619] px-3 py-1.5 text-[11px] text-white transition-opacity hover:opacity-90"
                        >
                          Offer to speak
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7">
                <p className="label-mono text-[#fe3619]">Speaker &amp; Topic Intake</p>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-[#111111]/85">
                  Have a lesson from practice worth sharing, or a question school never covered?
                  Submit a short pitch straight to our programming desk.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => openPitch("speaker")}
                    className="label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg bg-[#111111] px-4 py-2 text-white transition-opacity hover:opacity-85"
                  >
                    <span>Offer to speak</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openPitch("topic")}
                    className="label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#f7f6f4] px-4 py-2 text-[#111111] transition-colors hover:bg-white"
                  >
                    <span>Suggest a topic</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[12px] border border-black/[0.08] bg-[#efeeec] p-7">
                <p className="label-mono text-[#fe3619]">Response &amp; Data</p>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-[#111111]/85">
                  We aim to reply within 2 to 5 business days. To have your email deleted, write to{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Delete%20My%20Email`}
                    className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* Find us */}
          <section id="find-us" className="mt-14">
            <p className="label-mono text-[#fe3619]">Channels</p>
            <h2 className="mt-2.5 text-[clamp(1.5rem,2.5vw,2.1rem)] font-medium leading-[1.15] tracking-[-0.025em]">
              Find us
            </h2>

            <div className="mt-6 grid gap-px border border-black/[0.09] bg-black/[0.09] sm:grid-cols-2 lg:grid-cols-4">
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between bg-[#f7f6f4] p-6 transition-colors hover:bg-[#efeeec]"
              >
                <span className="label-mono text-[#111111]/55">Instagram</span>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[1.1rem] font-medium">@_tta.ng</span>
                  <ArrowUpRight className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                </div>
              </a>

              <a
                href={xHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between bg-[#f7f6f4] p-6 transition-colors hover:bg-[#efeeec]"
              >
                <span className="label-mono text-[#111111]/55">X</span>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[1.1rem] font-medium">@TTA_Africa</span>
                  <ArrowUpRight className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                </div>
              </a>

              {linkedinHref ? (
                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between bg-[#f7f6f4] p-6 transition-colors hover:bg-[#efeeec]"
                >
                  <span className="label-mono text-[#111111]/55">LinkedIn</span>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[1.1rem] font-medium">The Thinking Architects</span>
                    <ArrowUpRight className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                  </div>
                </a>
              ) : (
                <div className="flex flex-col justify-between bg-[#f7f6f4] p-6">
                  <span className="label-mono text-[#111111]/55">LinkedIn</span>
                  <p className="mt-4 text-[14px] text-[#111111]/60">
                    The Thinking Architects (link added when published)
                  </p>
                </div>
              )}

              {youtubeHref ? (
                <a
                  href={youtubeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between bg-[#f7f6f4] p-6 transition-colors hover:bg-[#efeeec]"
                >
                  <span className="label-mono text-[#111111]/55">YouTube</span>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[1.1rem] font-medium">Think Sessions</span>
                    <ArrowUpRight className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                  </div>
                </a>
              ) : (
                <div className="flex flex-col justify-between bg-[#f7f6f4] p-6">
                  <span className="label-mono text-[#111111]/55">YouTube</span>
                  <p className="mt-4 text-[14px] text-[#111111]/60">
                    Think Sessions recordings (channel link added when published)
                  </p>
                </div>
              )}
            </div>
          </section>
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

export default function ContactPageClient() {
  return (
    <FirestoreErrorBoundary>
      <ContactPageInner />
    </FirestoreErrorBoundary>
  );
}
