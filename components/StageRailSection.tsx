"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import atriumImg from "../src/assets/images/closing_architectural_atrium_1794913646044.jpg";
import studioImg from "../src/assets/images/hero_architecture_studio_1794913643987.jpg";
import pavilionImg from "../src/assets/images/track_cross_border_1794913645255.jpg";
import draftingImg from "../src/assets/images/track_licensure_path_1794913644519.jpg";
import critiqueImg from "../src/assets/images/track_live_sessions_1794913644707.jpg";
import {
  DraftingRule,
  EDITORIAL_EASE,
  EditorialReveal,
  SplitHeadlineReveal,
} from "./MotionPrimitives";

type AudienceCard = {
  index: string;
  role: string;
  caption: string;
  image: StaticImageData;
  alt: string;
};

const audienceCards: AudienceCard[] = [
  {
    index: "01",
    role: "Students",
    caption: "Wondering what comes after five years of studio.",
    image: studioImg,
    alt: "Architecture students collaborating around physical studio models",
  },
  {
    index: "02",
    role: "Graduates and early-career architects",
    caption: "Working out the route to registration, logbooks, and supervision.",
    image: draftingImg,
    alt: "Architectural drafting table with floor plans, scale ruler, and field logbook",
  },
  {
    index: "03",
    role: "Practising architects",
    caption: "Remembering how hard answers were to find, and passing them on.",
    image: critiqueImg,
    alt: "Senior and junior architects reviewing timber models and drawings",
  },
  {
    index: "04",
    role: "Educators & Mentors",
    caption: "Bridging what design schools teach with how offices and sites operate.",
    image: pavilionImg,
    alt: "Contemporary modernist concrete pavilion with vertical fins and daylight shadows",
  },
  {
    index: "05",
    role: "Open Media Archive",
    caption: "Making what is said in every live session available to everyone who needs it.",
    image: atriumImg,
    alt: "Natural daylight diagonal across a concrete architectural atrium",
  },
];

export default function StageRailSection() {
  const prefersReduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (direction: "prev" | "next") => {
    const el = railRef.current;
    if (!el) return;
    const distance = Math.min(420, el.clientWidth * 0.7);
    el.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  };

  return (
    <section
      id="why"
      className="flex flex-col items-center gap-10 overflow-hidden bg-[#f7f6f4] pt-[76px] pb-12 sm:gap-12 sm:pt-[130px]"
    >
      <div className="w-full max-w-[1040px] px-4 text-left sm:px-6">
        <EditorialReveal>
          <p className="label-mono text-[#fe3619]">The Gap After Design School</p>
        </EditorialReveal>

        <h2
          className="mt-3 text-[clamp(1.85rem,3.5vw,3.85rem)] font-medium leading-[1.08] tracking-[-0.025em] text-[#111111]"
          style={{ textWrap: "balance" }}
        >
          <SplitHeadlineReveal text="Why we exist" trigger="inView" />
        </h2>

        <div className="mt-8 max-w-[64ch] space-y-5 text-[clamp(0.98rem,1.2vw,1.14rem)] leading-[1.6] text-[#111111]/75">
          <EditorialReveal delay={0.04}>
            <p>
              Most of us spend five years or more learning how to design. Very few of us are taught
              clearly what comes after.
            </p>
          </EditorialReveal>
          <EditorialReveal delay={0.08}>
            <p>
              How registration works. What counts as experience. What the professional exam involves,
              and when to start preparing for it. Many people find out late, sometimes after the
              decisions that mattered most have already been made.
            </p>
          </EditorialReveal>
          <EditorialReveal delay={0.12}>
            <p>
              That isn&apos;t a failure of students. The gap is in how information reaches them, and
              how much of it gets passed on informally to whoever happens to be near the right
              conversation.
            </p>
          </EditorialReveal>
          <EditorialReveal delay={0.16}>
            <p className="font-medium text-[#111111]">
              The Thinking Architects exists to close that gap. We bring practising architects,
              educators, and students into the same conversation, and we make what is said there
              available to everyone who needs it.
            </p>
          </EditorialReveal>
        </div>

        {/* Who It's For header + rail controls */}
        <div className="mt-14 pt-1">
          <DraftingRule className="bg-black/[0.08]" />
          <div className="flex flex-wrap items-end justify-between gap-4 pt-8">
            <EditorialReveal>
              <p className="label-mono text-[#fe3619]">Who It&apos;s For</p>
              <h3 className="mt-2 text-[clamp(1.45rem,2.4vw,2.15rem)] font-medium tracking-[-0.025em] text-[#111111]">
                Built for every stage of the profession.
              </h3>
            </EditorialReveal>

            <div className="hidden items-center gap-2 sm:flex">
              <motion.button
                type="button"
                onClick={() => scrollRail("prev")}
                whileTap={prefersReduced ? undefined : { scale: 0.92 }}
                aria-label="Scroll audience cards left"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#efeeec] text-[#111111] transition-colors hover:bg-[#e5e3e0]"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => scrollRail("next")}
                whileTap={prefersReduced ? undefined : { scale: 0.92 }}
                aria-label="Scroll audience cards right"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#efeeec] text-[#111111] transition-colors hover:bg-[#e5e3e0]"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal snap rail */}
      <div
        ref={railRef}
        className="no-scrollbar flex h-[clamp(300px,46vh,480px)] w-full snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 sm:gap-4 sm:px-[max(24px,calc((100vw-1040px)/2+24px))]"
      >
        {audienceCards.map((card, idx) => (
          <motion.article
            key={card.index}
            initial={prefersReduced ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, delay: idx * 0.06, ease: EDITORIAL_EASE }}
            className="group relative isolate aspect-[3/4] h-full max-w-[82vw] shrink-0 snap-center overflow-hidden rounded-[10px] bg-[#1a1917] sm:max-w-none"
          >
            <Image
              src={card.image}
              alt={card.alt}
              fill
              referrerPolicy="no-referrer"
              sizes="(max-width: 640px) 75vw, 360px"
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
            />
            <div className="relative z-10 flex h-full flex-col justify-end p-5 text-white">
              <span className="font-mono text-[11px] font-bold tabular-nums uppercase tracking-[0.09em] text-[#fe3619]">
                {card.index}
              </span>
              <h4 className="mt-1 text-[1.2rem] font-medium leading-[1.2] tracking-[-0.02em]">
                {card.role}
              </h4>
              <p className="mt-1.5 text-[13px] leading-[1.45] text-white/80">
                {card.caption}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
