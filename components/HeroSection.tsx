"use client";

import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import heroStudioImg from "../src/assets/images/hero_architecture_studio_1794913643987.jpg";

type HeroSectionProps = {
  onOpenJoin: () => void;
};

export default function HeroSection({ onOpenJoin }: HeroSectionProps) {
  return (
    <div className="relative mb-[12vh] min-h-[90svh] overflow-hidden bg-[#181614] sm:mb-[20vh] sm:h-svh">
      <Image
        src={heroStudioImg}
        alt="Architects collaborating around timber scale models and architectural blueprints inside a sunlit studio"
        fill
        priority
        referrerPolicy="no-referrer"
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Measured contrast scrim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/35"
      />

      <div className="relative z-10 flex h-full min-h-[90svh] flex-col justify-end px-6 pt-32 pb-16 text-white sm:min-h-0 sm:items-center sm:justify-center sm:pt-36 sm:pb-16 sm:text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="flex max-w-[1120px] flex-col items-start sm:items-center"
        >
          <p className="label-mono mb-5 text-white/80">
            Media &amp; Events Community · Students · Graduates · Practitioners
          </p>

          <h1
            className="max-w-[18ch] text-[clamp(2.35rem,7.2vw,5.1rem)] font-medium leading-[1.03] tracking-[-0.035em] text-white"
            style={{ textWrap: "balance" }}
          >
            Figure out the profession with people who&apos;ve done it.
          </h1>

          <p className="mt-6 max-w-[60ch] text-[clamp(1rem,1.3vw,1.18rem)] leading-[1.55] text-white/85">
            The Thinking Architects is a media and events community for architecture students,
            graduates, and practitioners. We host monthly live sessions with practising architects,
            publish what they share, and talk openly about what comes after design school.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4 sm:mt-11">
            <button
              type="button"
              onClick={onOpenJoin}
              className="label-mono group inline-flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-xl bg-[#fe3619] px-9 py-4 text-[13px] text-white transition-opacity duration-200 hover:opacity-90"
            >
              <span className="whitespace-nowrap">Join the community</span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </button>

            <Link
              href="/sessions"
              className="label-mono inline-flex min-h-[52px] items-center rounded-xl border border-white/30 bg-black/30 px-7 py-4 text-[12px] text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/15"
            >
              <span className="whitespace-nowrap">See Think Sessions</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
