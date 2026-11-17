"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CONTACT_EMAIL } from "../lib/tally";

type FaqItem = {
  question: string;
  answer: ReactNode;
};

const questions: FaqItem[] = [
  {
    question: "What is The Thinking Architects?",
    answer:
      "A media and events community for people in architecture at every stage. We run monthly live sessions with practising architects, publish recordings and features from them, and give members a place to talk openly with each other.",
  },
  {
    question: "Is TTA connected to ARCON or NIA?",
    answer:
      "No. We are an independent community. For registration and professional requirements, always check ARCON and NIA directly. Our sessions help you understand the process and ask better questions.",
  },
  {
    question: "What will you do with my email?",
    answer: (
      <>
        We use it to send you a welcome message, session invitations, and updates. We don&apos;t
        share it. To have it deleted, email{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
        >
          {CONTACT_EMAIL}
        </a>
        .
      </>
    ),
  },
  {
    question: "Can I speak at a session or suggest a topic?",
    answer: (
      <>
        Yes. Email{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#fe3619]"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        with your idea, a short note on what you&apos;d cover, and who it would help.
      </>
    ),
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="questions" className="bg-[#f7f6f4] px-6 pt-[100px] pb-[110px] sm:pt-[130px]">
      <div className="mx-auto max-w-[920px]">
        <p className="label-mono text-[#fe3619]">Good to Know</p>
        <h2 className="mt-3 text-[clamp(1.85rem,3.4vw,3.25rem)] font-medium leading-[1.1] tracking-[-0.025em] text-[#111111]">
          Questions
        </h2>

        <div className="mt-10 border-t border-black/[0.09]">
          {questions.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.question} className="border-b border-black/[0.09]">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex min-h-[64px] w-full cursor-pointer items-center justify-between gap-6 py-5 text-left transition-colors hover:text-[#fe3619]"
                >
                  <span className="text-[1.08rem] font-medium tracking-[-0.02em] text-[#111111]">
                    {item.question}
                  </span>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#efeeec] text-[#111111]">
                    {isOpen ? (
                      <Minus className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="pb-6 pr-10">
                    <p className="max-w-[65ch] text-[15px] leading-[1.65] text-[#111111]/72">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
