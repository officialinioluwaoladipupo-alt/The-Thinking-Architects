"use client";

import {
  AlertCircle,
  ArrowUp,
  Check,
  CheckCircle2,
  MessageSquarePlus,
  Mic,
  Radio,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  BLUEPRINT_LIMITS,
  removeSessionQuestion,
  submitSessionQuestion,
  subscribeSessionQuestions,
  updateSessionQuestionStatus,
  upvoteSessionQuestion,
  type QuestionStatus,
  type SessionQuestionRecord,
} from "../lib/firebaseContent";
import { useFirebase } from "./FirebaseProvider";

const STORAGE_KEY = "tta_upvoted_questions_v1";

const STAGE_OPTIONS = [
  "",
  "Architecture Student",
  "Graduate / NYSC",
  "Early-Career Architect",
  "Registered Architect",
  "Allied / Observer",
];

type SessionLiveQaQueueProps = {
  sessionId: string;
  sessionTitle: string;
  speaker: string;
  isLiveNow: boolean;
  qaOpen: boolean;
};

function loadUpvotedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function saveUpvotedSet(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // Ignore storage quota restrictions
  }
}

export function SessionLiveQaQueue({
  sessionId,
  sessionTitle,
  speaker,
  isLiveNow,
  qaOpen,
}: SessionLiveQaQueueProps) {
  const { isAdmin } = useFirebase();
  const [questions, setQuestions] = useState<SessionQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => loadUpvotedSet());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const [authorName, setAuthorName] = useState("");
  const [authorStage, setAuthorStage] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg("");

    const unsubscribe = subscribeSessionQuestions(
      sessionId,
      (items) => {
        if (!active) return;
        setQuestions(items);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setErrorMsg(formatFirestoreErrorMessage(err));
        setLoading(false);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [sessionId]);

  const canSubmitOrVote = isLiveNow || qaOpen;

  if (!canSubmitOrVote && !loading && questions.length === 0 && !isAdmin) {
    return null;
  }

  const onAirQuestions = questions.filter((q) => q.status === "on_air");
  const queuedQuestions = questions.filter((q) => q.status === "queued");
  const answeredQuestions = questions.filter((q) => q.status === "answered");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmitOrVote) return;
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitting(true);

    try {
      const createdId = await submitSessionQuestion({
        sessionId,
        authorName,
        authorStage,
        questionText,
      });
      const next = new Set(upvotedIds);
      next.add(createdId);
      setUpvotedIds(next);
      saveUpvotedSet(next);
      setQuestionText("");
      setSubmitSuccess("Your question is now in the live queue.");
      window.setTimeout(() => setSubmitSuccess(""), 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : formatFirestoreErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (q: SessionQuestionRecord) => {
    if (!canSubmitOrVote || upvotedIds.has(q.id) || votingId === q.id || q.status === "answered") {
      return;
    }
    setVotingId(q.id);
    try {
      await upvoteSessionQuestion(q.id);
      const next = new Set(upvotedIds);
      next.add(q.id);
      setUpvotedIds(next);
      saveUpvotedSet(next);
    } catch (err) {
      setErrorMsg(formatFirestoreErrorMessage(err));
    } finally {
      setVotingId(null);
    }
  };

  const handleAdminStatus = async (q: SessionQuestionRecord, status: QuestionStatus) => {
    setModeratingId(q.id);
    try {
      await updateSessionQuestionStatus(q.id, status);
    } catch (err) {
      setErrorMsg(formatFirestoreErrorMessage(err));
    } finally {
      setModeratingId(null);
    }
  };

  const handleAdminDelete = async (q: SessionQuestionRecord) => {
    setModeratingId(q.id);
    try {
      await removeSessionQuestion(q.id);
    } catch (err) {
      setErrorMsg(formatFirestoreErrorMessage(err));
    } finally {
      setModeratingId(null);
    }
  };

  return (
    <section
      id="live-qa"
      aria-label="Live Session Q and A Queue"
      className="mt-10 rounded-[12px] border border-black/[0.09] bg-[#efeeec] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#fe3619]">
            <Radio className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {isLiveNow
                ? "Live Session Q&A Queue · Active Now"
                : qaOpen
                  ? "Session Q&A Queue · Open"
                  : "Session Q&A Archive"}
            </span>
          </div>
          <h2 className="mt-2 text-[1.45rem] font-medium tracking-[-0.02em] text-[#111111]">
            Questions for {speaker}
          </h2>
          <p className="mt-1 max-w-[60ch] text-[14px] leading-[1.55] text-[#111111]/70">
            {canSubmitOrVote
              ? `Submit a question for ${sessionTitle} or upvote questions you want answered on-air.`
              : "Questions raised and upvoted during this Think Session conversation."}
          </p>
        </div>

        <div className="font-mono text-[11px] uppercase tracking-[0.07em] tabular-nums text-[#111111]/60">
          {questions.length} {questions.length === 1 ? "question" : "questions"} · real-time sync
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 rounded-lg border border-[#fe3619]/30 bg-[#fe3619]/10 px-4 py-3 text-[13.5px] text-[#111111]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-[#fe3619]" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Submit a Question Form */}
      {canSubmitOrVote && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border border-black/[0.08] bg-[#f7f6f4] p-4 sm:p-5"
        >
          <div className="flex items-center gap-2 text-[#111111]">
            <MessageSquarePlus className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
            <span className="label-mono">Ask the speaker &amp; host</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="qa-author-name"
                className="label-mono block text-[11px] text-[#111111]/60"
              >
                Your name
              </label>
              <input
                id="qa-author-name"
                type="text"
                required
                minLength={BLUEPRINT_LIMITS.question.authorName.min}
                maxLength={BLUEPRINT_LIMITS.question.authorName.max}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Tunde A."
                className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[14px] text-[#111111] placeholder:text-[#111111]/40 focus:border-[#fe3619] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="qa-author-stage"
                className="label-mono block text-[11px] text-[#111111]/60"
              >
                Career stage (optional)
              </label>
              <select
                id="qa-author-stage"
                value={authorStage}
                onChange={(e) => setAuthorStage(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-[14px] text-[#111111] focus:border-[#fe3619] focus:outline-none"
              >
                <option value="">Prefer not to say</option>
                {STAGE_OPTIONS.filter(Boolean).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="qa-question-text"
                className="label-mono block text-[11px] text-[#111111]/60"
              >
                Your question
              </label>
              <span className="font-mono text-[11px] tabular-nums text-[#111111]/45">
                {questionText.length}/{BLUEPRINT_LIMITS.question.questionText.max}
              </span>
            </div>
            <textarea
              id="qa-question-text"
              rows={2}
              required
              minLength={BLUEPRINT_LIMITS.question.questionText.min}
              maxLength={BLUEPRINT_LIMITS.question.questionText.max}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask something specific about studio practice, registration, or career decisions..."
              className="mt-1 w-full rounded-lg border border-black/10 bg-white p-3 text-[14px] leading-relaxed text-[#111111] placeholder:text-[#111111]/40 focus:border-[#fe3619] focus:outline-none"
            />
          </div>

          {submitError && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-[#fe3619]">
              {submitError}
            </p>
          )}
          {submitSuccess && (
            <p role="status" className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-[#111111]">
              <Check className="h-3.5 w-3.5 text-[#fe3619]" aria-hidden="true" />
              <span>{submitSuccess}</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] text-[#111111]/55">
              Visible immediately to attendees and moderators.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="label-mono inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-lg bg-[#fe3619] px-5 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span>{submitting ? "Sending..." : "Submit question"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Pinned On-Air Spotlight */}
      {onAirQuestions.length > 0 && (
        <div className="mt-6 space-y-3">
          {onAirQuestions.map((q) => {
            const hasVoted = upvotedIds.has(q.id);
            return (
              <article
                key={q.id}
                className="rounded-xl bg-[#111111] p-5 text-[#f7f6f4]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#fe3619]">
                    <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Being answered on-air now</span>
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-[#f7f6f4]/70">
                    {q.upvotes} {q.upvotes === 1 ? "vote" : "votes"}
                  </span>
                </div>

                <p className="mt-3 text-[1.08rem] font-medium leading-[1.48] text-white">
                  {q.questionText}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[11px] text-[#f7f6f4]/65">
                    Asked by {q.authorName}
                    {q.authorStage ? ` · ${q.authorStage}` : ""}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {canSubmitOrVote && (
                      <button
                        type="button"
                        disabled={hasVoted || votingId === q.id}
                        onClick={() => handleUpvote(q)}
                        className={`label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] tabular-nums transition-colors ${
                          hasVoted
                            ? "bg-white/15 text-white"
                            : "bg-white text-[#111111] hover:bg-[#fe3619] hover:text-white"
                        } disabled:cursor-default`}
                      >
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{hasVoted ? `Upvoted (${q.upvotes})` : `Upvote (${q.upvotes})`}</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={moderatingId === q.id}
                        onClick={() => handleAdminStatus(q, "answered")}
                        className="label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-[11px] text-white hover:bg-white/10"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Mark Answered</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Queued Questions List */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-20 animate-pulse rounded-lg bg-[#f7f6f4]" />
            <div className="h-20 animate-pulse rounded-lg bg-[#f7f6f4]" />
          </div>
        ) : queuedQuestions.length === 0 && onAirQuestions.length === 0 && answeredQuestions.length === 0 ? (
          <p className="rounded-xl border border-black/[0.06] bg-[#f7f6f4] px-5 py-6 text-[14.5px] text-[#111111]/65">
            No questions submitted yet. Be the first to ask {speaker} a question above.
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.08] rounded-xl border border-black/[0.08] bg-[#f7f6f4]">
            {queuedQuestions.map((q) => {
              const hasVoted = upvotedIds.has(q.id);
              return (
                <li key={q.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                  <div className="flex-1">
                    <p className="text-[15px] leading-[1.55] text-[#111111]">{q.questionText}</p>
                    <p className="mt-2 font-mono text-[11px] text-[#111111]/55">
                      {q.authorName}
                      {q.authorStage ? ` · ${q.authorStage}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!canSubmitOrVote || hasVoted || votingId === q.id}
                      onClick={() => handleUpvote(q)}
                      aria-label={`Upvote question by ${q.authorName}`}
                      className={`label-mono inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-[11px] tabular-nums transition-colors ${
                        hasVoted
                          ? "border-[#fe3619] bg-[#fe3619] text-white"
                          : canSubmitOrVote
                            ? "cursor-pointer border-black/12 bg-white text-[#111111] hover:border-[#fe3619] hover:text-[#fe3619]"
                            : "border-black/10 bg-white/60 text-[#111111]/55"
                      }`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{q.upvotes}</span>
                    </button>

                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          disabled={moderatingId === q.id}
                          onClick={() => handleAdminStatus(q, "on_air")}
                          className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1 rounded-lg bg-[#111111] px-3 py-1.5 text-[11px] text-white hover:bg-[#fe3619]"
                        >
                          <Mic className="h-3 w-3" aria-hidden="true" />
                          <span>On Air</span>
                        </button>
                        <button
                          type="button"
                          disabled={moderatingId === q.id}
                          onClick={() => handleAdminStatus(q, "answered")}
                          className="label-mono inline-flex min-h-[38px] cursor-pointer items-center gap-1 rounded-lg border border-black/12 bg-white px-3 py-1.5 text-[11px] text-[#111111] hover:bg-[#efeeec]"
                        >
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          <span>Answered</span>
                        </button>
                        <button
                          type="button"
                          disabled={moderatingId === q.id}
                          onClick={() => handleAdminDelete(q)}
                          aria-label="Delete question"
                          className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-lg border border-black/12 bg-white text-[#111111]/60 hover:border-[#fe3619] hover:text-[#fe3619]"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Answered Questions */}
      {answeredQuestions.length > 0 && (
        <div className="mt-6 border-t border-black/[0.08] pt-5">
          <p className="label-mono text-[#111111]/55">
            Answered on-air ({answeredQuestions.length})
          </p>
          <ul className="mt-3 space-y-2.5">
            {answeredQuestions.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-black/[0.06] bg-[#f7f6f4]/75 px-4 py-3 text-[#111111]/70"
              >
                <div className="flex-1">
                  <p className="text-[14px] leading-snug">{q.questionText}</p>
                  <p className="mt-1 font-mono text-[11px] text-[#111111]/50">
                    {q.authorName}
                    {q.authorStage ? ` · ${q.authorStage}` : ""} · {q.upvotes}{" "}
                    {q.upvotes === 1 ? "vote" : "votes"}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={moderatingId === q.id}
                      onClick={() => handleAdminStatus(q, "queued")}
                      className="label-mono cursor-pointer rounded-md border border-black/10 bg-white px-2.5 py-1 text-[10px] text-[#111111]"
                    >
                      Re-queue
                    </button>
                    <button
                      type="button"
                      disabled={moderatingId === q.id}
                      onClick={() => handleAdminDelete(q)}
                      aria-label="Delete answered question"
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-black/10 bg-white text-[#111111]/60 hover:text-[#fe3619]"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
