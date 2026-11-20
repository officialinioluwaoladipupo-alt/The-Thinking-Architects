"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import atriumImg from "../src/assets/images/closing_architectural_atrium_1794913646044.jpg";
import { EditorialReveal, SplitHeadlineReveal } from "./MotionPrimitives";
import { MagneticAction } from "./WrappedPrimitives";

type ClosingSectionProps = {
  onOpenJoin: () => void;
};

export default function ClosingSection({ onOpenJoin }: ClosingSectionProps) {
  const prefersReduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.0]);

  return (
    <section
      ref={sectionRef}
      id="join"
      className="relative flex min-h-[70svh] w-full flex-col items-center justify-center overflow-hidden bg-[#0e0d0c] px-4 py-20 text-center text-white sm:min-h-[82vh] sm:px-10 sm:py-24"
    >
      <motion.div
        style={prefersReduced ? undefined : { scale: bgScale }}
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        <Image
          src={atriumImg}
          alt="Architectural concrete atrium with shafts of warm natural light"
          fill
          referrerPolicy="no-referrer"
          sizes="100vw"
          className="object-cover object-center opacity-55"
        />
      </motion.div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75"
      />

      <div className="relative z-10 mx-auto flex max-w-[920px] flex-col items-center">
        <EditorialReveal>
          <p className="label-mono text-white/75">
            Students · Graduates · Practitioners
          </p>
        </EditorialReveal>

        <h2
          className="mt-5 max-w-[18ch] text-[clamp(2.1rem,5.2vw,4.65rem)] font-medium leading-[1.04] tracking-[-0.035em] text-white"
          style={{ textWrap: "balance" }}
        >
          <SplitHeadlineReveal
            text="Bring the questions you haven't had anywhere to ask."
            trigger="inView"
            stagger={0.035}
          />
        </h2>

        <EditorialReveal delay={0.14}>
          <p className="mt-6 max-w-[46ch] text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.55] text-white/80">
            Join the community and we&apos;ll send you the next session invitation.
          </p>
        </EditorialReveal>

        <EditorialReveal delay={0.22} className="mt-9 w-full max-w-[320px] sm:mt-10 sm:w-auto sm:max-w-none">
          <MagneticAction strength={0.16} className="w-full sm:w-auto">
            <motion.button
              type="button"
              onClick={onOpenJoin}
              whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              className="label-mono group inline-flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-[#fe3619] px-7 py-4 text-[13px] text-white transition-opacity duration-200 hover:opacity-90 sm:w-auto sm:px-11"
            >
              <span className="whitespace-nowrap">Join the community</span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </motion.button>
          </MagneticAction>
        </EditorialReveal>
      </div>
    </section>
  );
}
