"use client";

import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import atriumImg from "../src/assets/images/closing_architectural_atrium_1794913646044.jpg";

type ClosingSectionProps = {
  onOpenJoin: () => void;
};

export default function ClosingSection({ onOpenJoin }: ClosingSectionProps) {
  return (
    <section
      id="join"
      className="relative flex min-h-[82vh] w-full flex-col items-center justify-center overflow-hidden bg-[#0e0d0c] px-6 py-24 text-center text-white sm:px-10"
    >
      <Image
        src={atriumImg}
        alt="Architectural concrete atrium with shafts of warm natural light"
        fill
        referrerPolicy="no-referrer"
        sizes="100vw"
        className="object-cover object-center opacity-55"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75"
      />

      <div className="relative z-10 mx-auto flex max-w-[920px] flex-col items-center">
        <p className="label-mono text-white/75">
          Students · Graduates · Practitioners
        </p>

        <h2
          className="mt-5 max-w-[18ch] text-[clamp(2.25rem,5.2vw,4.65rem)] font-medium leading-[1.04] tracking-[-0.035em] text-white"
          style={{ textWrap: "balance" }}
        >
          Bring the questions you haven&apos;t had anywhere to ask.
        </h2>

        <p className="mt-6 max-w-[46ch] text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.55] text-white/80">
          Join the community and we&apos;ll send you the next session invitation.
        </p>

        <div className="mt-10">
          <button
            type="button"
            onClick={onOpenJoin}
            className="label-mono group inline-flex min-h-[54px] cursor-pointer items-center gap-2.5 rounded-xl bg-[#fe3619] px-11 py-4 text-[13px] text-white transition-opacity duration-200 hover:opacity-90"
          >
            <span className="whitespace-nowrap">Join the community</span>
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  );
}
