"use client";

import { ArrowUpRight, Check, Mic, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  BLUEPRINT_LIMITS,
  PITCH_TARGET_STAGES,
  submitTopicPitch,
  validatePitchInput,
  type PitchTargetStage,
  type PitchType,
} from "../lib/firebaseContent";
import { CONTACT_EMAIL } from "../lib/tally";

type PitchModalProps = {
  open: boolean;
  onClose: () => void;
  defaultPitchType?: PitchType;
  defaultTopicTitle?: string;
};

function PitchModalForm({
  onClose,
  defaultPitchType = "speaker",
  defaultTopicTitle = "",
}: Omit<PitchModalProps, "open">) {
  const [pitchType, setPitchType] = useState<PitchType>(defaultPitchType);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleOrStudio, setRoleOrStudio] = useState("");
  const [topicTitle, setTopicTitle] = useState(defaultTopicTitle);
  const [targetStage, setTargetStage] = useState<PitchTargetStage>("All Stages");
  const [outline, setOutline] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const L = BLUEPRINT_LIMITS.pitch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      pitchType,
      name,
      email,
      roleOrStudio,
      topicTitle,
      targetStage,
      outline,
      linkUrl,
    };

    const validationErr = validatePitchInput(payload);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await submitTopicPitch(payload);
      setSubmitted(true);
    } catch (err) {
      setError(formatFirestoreErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 my-auto w-full max-w-[600px] overflow-hidden rounded-2xl border border-black/10 bg-[#f7f6f4] p-5 text-[#111111] shadow-2xl sm:p-8"
    >
      <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] pb-5">
        <div>
          <p className="label-mono text-[#fe3619]">Think Sessions Pitch</p>
          <h2
            id="pitch-modal-title"
            className="mt-1.5 text-[1.55rem] font-medium leading-[1.15] tracking-[-0.03em]"
          >
            Suggest a topic or offer to speak
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pitch form"
          className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-[#efeeec] text-[#111111] transition-colors hover:bg-[#e3e1de]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {submitted ? (
          <motion.div
            key="pitch-submitted"
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
              Pitch received, {name.trim()}.
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-[#111111]/75">
              Your {pitchType === "speaker" ? "speaker proposal" : "topic suggestion"} for{" "}
              <span className="font-medium text-[#111111]">&ldquo;{topicTitle.trim()}&rdquo;</span> is
              now in our programming console. Our team reviews every pitch and will reach out to{" "}
              <span className="font-medium text-[#111111]">{email.trim()}</span> if we schedule a
              conversation around it.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="label-mono inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-[#111111] px-6 py-3 text-white transition-opacity hover:opacity-85"
              >
                Done
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="pitch-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onSubmit={handleSubmit}
            className="mt-5 space-y-4"
            noValidate
          >
            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-black/10 bg-[#efeeec] p-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setPitchType("speaker")}
                className={`label-mono relative flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] transition-colors sm:px-3 sm:text-[11px] ${
                  pitchType === "speaker"
                    ? "text-white"
                    : "text-[#111111]/65 hover:text-[#111111]"
                }`}
              >
                {pitchType === "speaker" && (
                  <motion.span
                    layoutId="pitch-mode-pill"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-lg bg-[#111111]"
                  />
                )}
                <Mic className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="relative z-10">Offer to speak</span>
              </button>
              <button
                type="button"
                onClick={() => setPitchType("topic")}
                className={`label-mono relative flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] transition-colors sm:px-3 sm:text-[11px] ${
                  pitchType === "topic"
                    ? "text-white"
                    : "text-[#111111]/65 hover:text-[#111111]"
                }`}
              >
                {pitchType === "topic" && (
                  <motion.span
                    layoutId="pitch-mode-pill"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-lg bg-[#111111]"
                  />
                )}
                <Sparkles className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="relative z-10">Suggest a topic</span>
              </button>
            </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pitch-name" className="label-mono block text-[#111111]/65">
                Your name
              </label>
              <input
                id="pitch-name"
                type="text"
                required
                maxLength={L.name.max}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arc. Tunde Bakare"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[14.5px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="pitch-email" className="label-mono block text-[#111111]/65">
                Email address
              </label>
              <input
                id="pitch-email"
                type="email"
                required
                maxLength={L.email.max}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[14.5px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pitch-role" className="label-mono block text-[#111111]/65">
                Role or studio (optional)
              </label>
              <input
                id="pitch-role"
                type="text"
                maxLength={L.roleOrStudio.max}
                value={roleOrStudio}
                onChange={(e) => setRoleOrStudio(e.target.value)}
                placeholder="Project Architect, Studio K / M.Arch"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[14.5px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="pitch-stage" className="label-mono block text-[#111111]/65">
                Who does this help most?
              </label>
              <select
                id="pitch-stage"
                value={targetStage}
                onChange={(e) => setTargetStage(e.target.value as PitchTargetStage)}
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[14.5px] text-[#111111] focus:border-[#111111]/40 focus:outline-none"
              >
                {PITCH_TARGET_STAGES.map((stageOption) => (
                  <option key={stageOption} value={stageOption}>
                    {stageOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="pitch-title" className="label-mono block text-[#111111]/65">
              Proposed session title or question
            </label>
            <input
              id="pitch-title"
              type="text"
              required
              maxLength={L.topicTitle.max}
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder={
                pitchType === "speaker"
                  ? "What Your First Year on Site Actually Teaches You"
                  : "How to price freelance design work without undercutting studios"
              }
              className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[14.5px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="pitch-outline" className="label-mono block text-[#111111]/65">
              {pitchType === "speaker"
                ? "Short outline & why this matters"
                : "What should the session unpack?"}{" "}
              ({outline.length}/{L.outline.max})
            </label>
            <textarea
              id="pitch-outline"
              rows={3}
              required
              maxLength={L.outline.max}
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder={
                pitchType === "speaker"
                  ? "Share 2–3 key lessons, stories from practice, or questions you'd explore with members."
                  : "Tell us what feels unclear right now and what kind of practitioner you'd love to hear from."
              }
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-[#efeeec] p-3.5 text-base sm:text-[14.5px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="pitch-link" className="label-mono block text-[#111111]/65">
              LinkedIn, portfolio, or talk link (optional HTTPS)
            </label>
            <input
              id="pitch-link"
              type="url"
              maxLength={L.linkUrl.max}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourname"
              className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-[#efeeec] px-4 text-base sm:text-[14.5px] text-[#111111] placeholder:text-[#111111]/35 focus:border-[#111111]/40 focus:outline-none"
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
              <span>
                {submitting
                  ? "Submitting..."
                  : pitchType === "speaker"
                    ? "Submit speaker pitch"
                    : "Submit topic idea"}
              </span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Think%20Session%20Pitch`}
              className="text-[12.5px] font-medium text-[#111111]/65 underline underline-offset-4 transition-colors hover:text-[#111111]"
            >
              Or email {CONTACT_EMAIL}
            </a>
          </div>
        </motion.form>
      )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PitchModal({
  open,
  onClose,
  defaultPitchType = "speaker",
  defaultTopicTitle = "",
}: PitchModalProps) {
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

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pitch-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />
          <div className="flex min-h-full items-center justify-center">
            <PitchModalForm
              key={`${defaultPitchType}-${defaultTopicTitle}`}
              onClose={onClose}
              defaultPitchType={defaultPitchType}
              defaultTopicTitle={defaultTopicTitle}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
