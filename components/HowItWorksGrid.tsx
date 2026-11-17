"use client";

import { ArrowUpRight } from "lucide-react";

type HowItWorksGridProps = {
  onOpenJoin: () => void;
};

const steps = [
  {
    number: "01",
    title: "Join",
    detail:
      'Tap "Join the community" and fill in the short form so we know your stage and interests.',
  },
  {
    number: "02",
    title: "Get connected",
    detail: "We send you a welcome email with the link to the community.",
  },
  {
    number: "03",
    title: "Take part",
    detail: "Attend sessions, ask questions, and talk with other members.",
  },
];

export default function HowItWorksGrid({ onOpenJoin }: HowItWorksGridProps) {
  return (
    <section
      id="how-it-works"
      className="flex flex-col items-center gap-12 bg-[#f7f6f4] pt-[100px] pb-12 sm:pt-[130px]"
    >
      <div className="w-full max-w-[1040px] px-6">
        <p className="label-mono text-[#fe3619]">A Simple First Step</p>
        <h2
          className="mt-3 text-[clamp(1.75rem,3.45vw,3.75rem)] font-medium leading-[1.08] tracking-[-0.025em] text-[#111111]"
          style={{ textWrap: "balance" }}
        >
          How it works
        </h2>
      </div>

      {/* 1px hairline matrix matching theacademysf.com Section 5 */}
      <div className="flex w-full flex-col gap-10">
        <div className="grid w-full grid-cols-1 gap-px border-y border-black/[0.09] bg-black/[0.09] md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col justify-between bg-[#f7f6f4] p-7 transition-colors duration-200 hover:bg-[#efeeec]/60 sm:p-10"
            >
              <span className="font-mono text-[12px] font-bold tabular-nums text-[#fe3619]">
                {step.number}
              </span>
              <div className="mt-8">
                <h3 className="text-[1.45rem] font-medium tracking-[-0.025em] text-[#111111]">
                  {step.title}
                </h3>
                <p className="mt-2.5 max-w-[36ch] text-[15px] leading-[1.55] text-[#111111]/70">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center px-6 pt-2">
          <button
            type="button"
            onClick={onOpenJoin}
            className="label-mono group inline-flex min-h-[50px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-9 py-3.5 text-[12px] text-white transition-opacity duration-200 hover:opacity-90"
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
