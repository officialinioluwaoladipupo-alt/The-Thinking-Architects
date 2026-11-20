"use client";

import { ArrowUpRight, Check, ExternalLink, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import { BLUEPRINT_LIMITS, saveSubscriber } from "../lib/firebaseContent";
import {
  CONTACT_EMAIL,
  TALLY_FORM_ID,
  TALLY_FORM_URL,
  triggerTallyPopup,
} from "../lib/tally";

type JoinModalProps = {
  open: boolean;
  onClose: () => void;
};

const stages = [
  "Student",
  "Graduate",
  "Early-career architect",
  "Registered architect",
  "Other",
];

export default function JoinModal({ open, onClose }: JoinModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [stage, setStage] = useState(stages[0]);
  const [whyJoin, setWhyJoin] = useState("");
  const [howFound, setHowFound] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    const detailsParts = [
      country.trim() ? `Country: ${country.trim()}` : "",
      whyJoin.trim() ? `Why: ${whyJoin.trim()}` : "",
      howFound.trim() ? `Found via: ${howFound.trim()}` : "",
    ].filter(Boolean);

    setError("");
    setSubmitting(true);
    try {
      await saveSubscriber({
        name: trimmedName,
        email: trimmedEmail,
        stage,
        question: detailsParts.join(" · "),
        source: "join_modal",
      });
      setSubmitted(true);
    } catch (err) {
      setError(formatFirestoreErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenTally = () => {
    triggerTallyPopup();
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />

          <div className="flex min-h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 my-auto w-full max-w-[560px] overflow-hidden rounded-2xl border border-black/10 bg-[#f7f6f4] p-5 text-[#111111] shadow-2xl sm:p-8"
            >
            <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] pb-5">
              <div>
                <p className="label-mono text-[#fe3619]">Community Intake</p>
                <h2
                  id="join-modal-title"
                  className="mt-1.5 text-[1.6rem] font-medium leading-[1.15] tracking-[-0.03em]"
                >
                  Join The Thinking Architects
                </h2>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label="Close signup form"
                className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#efeeec] text-[#111111] transition-colors hover:bg-[#e3e1de]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {submitted ? (
                <motion.div
                  key="join-submitted"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="py-6"
                >
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fe3619]/12 text-[#fe3619]"
                  >
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </motion.div>
                  <h3 className="mt-4 text-xl font-medium tracking-[-0.025em]">
                    You&apos;re in, {name.trim()}.
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#111111]/70">
                    We&apos;ve saved your details ({stage}) for{" "}
                    <span className="font-medium text-[#111111]">{email.trim()}</span>. You&apos;ll
                    get a welcome email from us—check your spam folder if it doesn&apos;t arrive.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <a
                      href={TALLY_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="label-mono inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
                    >
                      <span>Open Tally Form</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={resetAndClose}
                      className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-black/10 bg-[#efeeec] px-5 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="join-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onSubmit={handleSubmit}
                  className="mt-5 space-y-4"
                  noValidate
                >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="join-name" className="label-mono block text-[#111111]/65">
                      Full name
                    </label>
                    <input
                      id="join-name"
                      type="text"
                      required
                      maxLength={BLUEPRINT_LIMITS.subscriber.name.max}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Adaeze Okafor"
                      className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[15px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="join-email" className="label-mono block text-[#111111]/65">
                      Email address
                    </label>
                    <input
                      id="join-email"
                      type="email"
                      required
                      maxLength={BLUEPRINT_LIMITS.subscriber.email.max}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[15px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="join-country" className="label-mono block text-[#111111]/65">
                      Country
                    </label>
                    <input
                      id="join-country"
                      type="text"
                      maxLength={60}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Nigeria"
                      className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[15px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="join-stage" className="label-mono block text-[#111111]/65">
                      Where are you in your journey?
                    </label>
                    <select
                      id="join-stage"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[15px] text-[#111111] focus:border-[#111111]/40 focus:outline-none"
                    >
                      {stages.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="join-why" className="label-mono block text-[#111111]/65">
                    Why do you want to join?
                  </label>
                  <input
                    id="join-why"
                    type="text"
                    maxLength={180}
                    value={whyJoin}
                    onChange={(e) => setWhyJoin(e.target.value)}
                    placeholder="What you hope to learn or share"
                    className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[15px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="join-found" className="label-mono block text-[#111111]/65">
                    How did you find us?
                  </label>
                  <input
                    id="join-found"
                    type="text"
                    maxLength={80}
                    value={howFound}
                    onChange={(e) => setHowFound(e.target.value)}
                    placeholder="e.g. Instagram, X, friend, studio"
                    className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[15px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-[13px] font-medium text-[#fe3619]">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="label-mono inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#fe3619] px-7 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <span>{submitting ? "Saving..." : "Join the community"}</span>
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenTally}
                    data-tally-open={TALLY_FORM_ID}
                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 text-[13px] font-medium text-[#111111]/70 underline underline-offset-4 transition-colors hover:text-[#111111]"
                  >
                    <span>Open Tally popup</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-[12px] leading-relaxed text-[#111111]/55">
                  We only use your name, email, and stage to send community updates and session
                  invitations. Write to{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                    {CONTACT_EMAIL}
                  </a>{" "}
                  to delete your details anytime.
                </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
