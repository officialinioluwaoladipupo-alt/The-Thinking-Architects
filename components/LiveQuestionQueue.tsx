"use client";

import {
  ArrowUp,
  Check,
  CheckCircle2,
  MessageSquare,
  Send,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  BLUEPRINT_LIMITS,
  subscribeSessionQuestions,
  submitSessionQuestion,
  upvoteSessionQuestion,
  validateSessionQuestionInput,
  type SessionQuestionRecord,
} from "../lib/firebaseContent";
import { EDITORIAL_EASE, EditorialReveal } from "./MotionPrimitives";

type LiveQuestionQueueProps = {
  sessionId: string;
  qaEnabled: boolean;
  isLive?: boolean;
  heading?: string;
};

const VOTED_STORAGE_KEY = "tta_voted_question_ids";

function readVotedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(VOTED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function persistVotedId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = readVotedIds();
    existing.add(id);
    window.localStorage.setItem(VOTED_STORAGE_KEY, JSON.stringify([...existing]));
  } catch {
    // Ignore storage quota errors
  }
}

export default function LiveQuestionQueue({
  sessionId,
  qaEnabled,
  isLive = false,
  heading = "Live Q&A Queue",
}: LiveQuestionQueueProps) {
  const prefersReduced = useReducedMotion();
  const [questions, setQuestions] = useState<SessionQuestionRecord[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedNotice, setSubmittedNotice] = useState("");

  useEffect(() => {
    setVotedIds(readVotedIds());
  }, []);

  useEffect(() => {
    if (!sessionId.trim()) return;
    const unsub = subscribeSessionQuestions(
      sessionId,
      (items) => {
        setQuestions(items);
      },
      (err) => {
        setErrorMessage(formatFirestoreErrorMessage(err));
      },
    );
    return () => unsub();
  }, [sessionId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErr = validateSessionQuestionInput({
      sessionId,
      authorName,
      questionText,
    });
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    setErrorMessage("");
    setSubmitting(true);
    try {
      const createdId = await submitSessionQuestion({
        sessionId,
        authorName,
        questionText,
      });
      persistVotedId(createdId);
      setVotedIds((prev) => new Set([...prev, createdId]));
      setQuestionText("");
      setSubmittedNotice("Your question has been added to the live speaker queue.");
      window.setTimeout(() => setSubmittedNotice(""), 4000);
    } catch (err) {
      setErrorMessage(formatFirestoreErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (q: SessionQuestionRecord) => {
    if (votedIds.has(q.id) || upvotingId === q.id) return;
    setUpvotingId(q.id);
    setErrorMessage("");
    try {
      await upvoteSessionQuestion(q.id);
      persistVotedId(q.id);
      setVotedIds((prev) => new Set([...prev, q.id]));
    } catch (err) {
      setErrorMessage(formatFirestoreErrorMessage(err));
    } finally {
      setUpvotingId(null);
    }
  };

  const openQuestions = questions.filter((q) => q.status !== "answered");
  const answeredQuestions = questions.filter((q) => q.status === "answered");

  return (
    <EditorialReveal>
      <section
        id="live-qa"
        aria-label="Live attendee question queue"
        className={`mt-10 rounded-[12px] border p-4 sm:p-8 ${
          isLive
            ? "border-[#1C1C1C]/15 bg-[#1C1C1C] text-[#F2EDE8]"
            : "border-black/[0.08] bg-[#efeeec] text-[#111111]"
        }`}
      >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div
            className={`flex items-center gap-2 ${
              isLive ? "text-[#D94F2B]" : "text-[#fe3619]"
            }`}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="label-mono">
              {isLive ? "On-Air Audience Questions" : "Session Questions"}
            </span>
          </div>
          <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em]">{heading}</h2>
          <p
            className={`mt-1.5 max-w-[60ch] text-[14px] leading-[1.6] ${
              isLive ? "text-[#F2EDE8]/75" : "text-[#111111]/70"
            }`}
          >
            {qaEnabled
              ? "Submit a question for our host and guest speaker, or upvote questions from fellow architects so they rise to the top on-air."
              : "The live question queue is currently closed for submissions. You can still browse questions raised in this session."}
          </p>
        </div>

        <div
          className={`rounded-lg border px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] tabular-nums ${
            isLive
              ? "border-white/15 bg-white/[0.04] text-[#F2EDE8]"
              : "border-black/10 bg-[#f7f6f4] text-[#111111]"
          }`}
        >
          {openQuestions.length} Open · {answeredQuestions.length} Answered
        </div>
      </div>

      {qaEnabled && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className={`mt-6 rounded-xl border p-4 sm:p-5 ${
            isLive
              ? "border-white/12 bg-white/[0.04]"
              : "border-black/[0.08] bg-[#f7f6f4]"
          }`}
        >
          <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
            <div>
              <label
                htmlFor={`qa-name-${sessionId}`}
                className={`label-mono block ${
                  isLive ? "text-[#F2EDE8]/65" : "text-[#111111]/60"
                }`}
              >
                Your Name
              </label>
              <input
                id={`qa-name-${sessionId}`}
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.question.authorName.max}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Tunde A."
                className={`mt-1.5 h-11 w-full rounded-lg border px-3.5 text-base outline-none transition-colors sm:text-[14px] ${
                  isLive
                    ? "border-white/15 bg-[#1C1C1C] text-[#F2EDE8] placeholder:text-[#F2EDE8]/35 focus:border-[#D94F2B]"
                    : "border-black/10 bg-white text-[#111111] placeholder:text-[#111111]/35 focus:border-[#fe3619]"
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`qa-question-${sessionId}`}
                  className={`label-mono block ${
                    isLive ? "text-[#F2EDE8]/65" : "text-[#111111]/60"
                  }`}
                >
                  Your Question for the Speaker
                </label>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isLive ? "text-[#F2EDE8]/50" : "text-[#111111]/45"
                  }`}
                >
                  {questionText.length}/{BLUEPRINT_LIMITS.question.questionText.max}
                </span>
              </div>
              <div className="mt-1.5 flex flex-col gap-2.5 sm:flex-row">
                <input
                  id={`qa-question-${sessionId}`}
                  type="text"
                  required
                  minLength={BLUEPRINT_LIMITS.question.questionText.min}
                  maxLength={BLUEPRINT_LIMITS.question.questionText.max}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ask about practice, registration, portfolio, or studio economics..."
                  className={`h-11 flex-1 rounded-lg border px-3.5 text-base outline-none transition-colors sm:text-[14px] ${
                    isLive
                      ? "border-white/15 bg-[#1C1C1C] text-[#F2EDE8] placeholder:text-[#F2EDE8]/35 focus:border-[#D94F2B]"
                      : "border-black/10 bg-white text-[#111111] placeholder:text-[#111111]/35 focus:border-[#fe3619]"
                  }`}
                />
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                  className={`label-mono inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
                    isLive ? "bg-[#D94F2B]" : "bg-[#fe3619]"
                  }`}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{submitting ? "Sending..." : "Submit question"}</span>
                </motion.button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {errorMessage && (
              <motion.p
                key="liveqa-err"
                initial={prefersReduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0 }}
                role="alert"
                className="mt-3 text-[13px] font-medium text-[#D94F2B]"
              >
                {errorMessage}
              </motion.p>
            )}
            {submittedNotice && (
              <motion.p
                key="liveqa-ok"
                initial={prefersReduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0 }}
                role="status"
                className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium ${
                  isLive ? "text-[#F2EDE8]" : "text-[#111111]"
                }`}
              >
                <Check className="h-3.5 w-3.5 text-[#D94F2B]" aria-hidden="true" />
                <span>{submittedNotice}</span>
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      )}

      {/* Question List */}
      <div className="mt-6 space-y-3">
        {questions.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-5 py-8 text-center text-[14px] ${
              isLive
                ? "border-white/15 text-[#F2EDE8]/60"
                : "border-black/12 text-[#111111]/55"
            }`}
          >
            No questions submitted yet. Be the first to add one to the queue.
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {openQuestions.map((q) => {
                const hasVoted = votedIds.has(q.id);
                return (
                  <motion.article
                    key={q.id}
                    layout={!prefersReduced}
                    initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
                    className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors ${
                      isLive
                        ? "border-white/12 bg-white/[0.03]"
                        : "border-black/[0.08] bg-[#f7f6f4]"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`break-words text-[15px] leading-[1.55] ${
                          isLive ? "text-[#F2EDE8]" : "text-[#111111]"
                        }`}
                      >
                        {q.questionText}
                      </p>
                      <p
                        className={`mt-2 font-mono text-[11px] uppercase tracking-[0.07em] ${
                          isLive ? "text-[#F2EDE8]/55" : "text-[#111111]/55"
                        }`}
                      >
                        Asked by {q.authorName}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      disabled={hasVoted || upvotingId === q.id}
                      onClick={() => void handleUpvote(q)}
                      whileTap={prefersReduced ? undefined : { scale: 0.92 }}
                      aria-label={
                        hasVoted
                          ? `Upvoted (${q.upvotes})`
                          : `Upvote question by ${q.authorName}`
                      }
                      className={`flex min-h-[44px] min-w-[60px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2.5 py-1.5 font-mono text-[12px] font-bold tabular-nums transition-colors disabled:cursor-default ${
                        hasVoted
                          ? "border-[#D94F2B] bg-[#D94F2B]/15 text-[#D94F2B]"
                          : isLive
                            ? "border-white/15 bg-white/[0.05] text-[#F2EDE8] hover:border-[#D94F2B] hover:text-[#D94F2B]"
                            : "border-black/12 bg-white text-[#111111] hover:border-[#fe3619] hover:text-[#fe3619]"
                      }`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{q.upvotes}</span>
                    </motion.button>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {answeredQuestions.length > 0 && (
              <div className="pt-4">
                <p
                  className={`label-mono mb-2.5 ${
                    isLive ? "text-[#F2EDE8]/50" : "text-[#111111]/50"
                  }`}
                >
                  Answered On-Air
                </p>
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {answeredQuestions.map((q) => (
                      <motion.article
                        key={q.id}
                        layout={!prefersReduced}
                        initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 0.7, y: 0 }}
                        exit={prefersReduced ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.22, ease: EDITORIAL_EASE }}
                        className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                          isLive
                            ? "border-white/10 bg-white/[0.02]"
                            : "border-black/[0.06] bg-[#f7f6f4]/70"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[14px] leading-[1.55]">{q.questionText}</p>
                          <p
                            className={`mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.07em] ${
                              isLive ? "text-[#F2EDE8]/65" : "text-[#111111]/60"
                            }`}
                          >
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-[#D94F2B]"
                              aria-hidden="true"
                            />
                            <span>Answered · {q.authorName}</span>
                          </p>
                        </div>
                        <span className="font-mono text-[11px] font-bold tabular-nums opacity-70">
                          {q.upvotes} ▲
                        </span>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
    </EditorialReveal>
  );
}
