"use client";

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { EDITORIAL_EASE } from "../components/MotionPrimitives";
import { formatFirestoreErrorMessage } from "../lib/firebase";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    console.error("Application route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f6f4] px-4 py-16 text-[#111111] sm:px-6 sm:py-20">
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: EDITORIAL_EASE }}
        className="w-full max-w-[600px] rounded-2xl border border-black/[0.09] bg-[#efeeec] p-6 sm:p-10"
      >
        <div className="flex items-center gap-2.5 text-[#fe3619]">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span className="label-mono">Application Notice</span>
        </div>

        <h1 className="mt-3 text-[clamp(1.6rem,3vw,2.2rem)] font-medium leading-[1.14] tracking-[-0.03em]">
          Something interrupted this page.
        </h1>

        <p className="mt-3 text-[15px] leading-[1.6] text-[#111111]/75">
          {formatFirestoreErrorMessage(error)}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <motion.button
            type="button"
            onClick={reset}
            whileTap={prefersReduced ? undefined : { scale: 0.97 }}
            className="label-mono inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Try again</span>
          </motion.button>

          <Link
            href="/"
            className="label-mono inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-black/10 bg-[#f7f6f4] px-5 py-3 text-[#111111] transition-colors hover:bg-[#e5e3e0]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
