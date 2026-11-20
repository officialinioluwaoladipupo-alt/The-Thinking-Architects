"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import heroStudioImg from "../src/assets/images/hero_architecture_studio_1794913643987.jpg";
import { EDITORIAL_EASE, SplitHeadlineReveal } from "./MotionPrimitives";
import { MagneticAction } from "./WrappedPrimitives";

type HeroSectionProps = {
  onOpenJoin: () => void;
};

export default function HeroSection({ onOpenJoin }: HeroSectionProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "14%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.09]);

  return (
    <div
      ref={containerRef}
      className="relative mb-[8vh] min-h-[88svh] overflow-hidden bg-[#181614] sm:mb-[18vh] sm:min-h-svh"
    >
      <motion.div
        initial={prefersReduced ? false : { opacity: 0.72, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1.02 }}
        transition={{ duration: 0.9, ease: EDITORIAL_EASE }}
        style={prefersReduced ? undefined : { y: bgY, scale: bgScale }}
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        <Image
          src={heroStudioImg}
          alt="Architects collaborating around timber scale models and architectural blueprints inside a sunlit studio"
          fill
          priority
          referrerPolicy="no-referrer"
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Measured contrast scrim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/35"
      />

      <div className="relative z-10 flex min-h-[88svh] flex-col justify-end px-4 pt-28 pb-12 text-white sm:min-h-svh sm:items-center sm:justify-center sm:px-6 sm:pt-32 sm:pb-16 sm:text-center">
        <div className="flex w-full max-w-[1120px] flex-col items-start sm:items-center">
          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EDITORIAL_EASE }}
            className="label-mono mb-4 text-white/80 sm:mb-5"
          >
            Media &amp; Events Community · Students · Graduates · Practitioners
          </motion.p>

          <h1
            className="max-w-[18ch] text-[clamp(2.15rem,7.2vw,5.1rem)] font-medium leading-[1.03] tracking-[-0.035em] text-white"
            style={{ textWrap: "balance" }}
          >
            <SplitHeadlineReveal
              text="Figure out the profession with people who've done it."
              delay={0.06}
              stagger={0.032}
            />
          </h1>

          <motion.p
            initial={prefersReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24, ease: EDITORIAL_EASE }}
            className="mt-5 max-w-[60ch] text-[clamp(0.98rem,1.3vw,1.18rem)] leading-[1.55] text-white/85 sm:mt-6"
          >
            The Thinking Architects is a media and events community for architecture students,
            graduates, and practitioners. We host monthly live sessions with practising architects,
            publish what they share, and talk openly about what comes after design school.
          </motion.p>

          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.34, ease: EDITORIAL_EASE }}
            className="mt-8 flex w-full flex-col gap-3 sm:mt-11 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4"
          >
            <MagneticAction strength={0.14} className="w-full sm:w-auto">
              <motion.button
                type="button"
                onClick={onOpenJoin}
                whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                className="label-mono group inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#fe3619] px-6 py-4 text-[13px] text-white transition-opacity duration-200 hover:opacity-90 sm:w-auto sm:px-9"
              >
                <span className="whitespace-nowrap">Join the community</span>
                <ArrowUpRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </motion.button>
            </MagneticAction>

            <motion.div
              whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              className="w-full sm:w-auto"
            >
              <Link
                href="/sessions"
                className="label-mono inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-white/30 bg-black/30 px-6 py-4 text-[12px] text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/15 sm:w-auto sm:px-7"
              >
                <span className="whitespace-nowrap">See Think Sessions</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
