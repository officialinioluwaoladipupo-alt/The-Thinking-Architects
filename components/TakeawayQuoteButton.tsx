"use client";

import { Check, Download } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { downloadQuoteCard, type QuoteCardPayload } from "../lib/quoteCardGenerator";

export function TakeawayQuoteButton({
  payload,
  className = "",
}: {
  payload: QuoteCardPayload;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const [downloaded, setDownloaded] = useState(false);

  const handleClick = () => {
    downloadQuoteCard(payload);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2400);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      className={`label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 overflow-hidden rounded-lg border border-black/12 bg-[#efeeec] px-3 py-1.5 text-[10.5px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {downloaded ? (
          <motion.span
            key="saved"
            initial={prefersReduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="inline-flex items-center gap-1.5"
          >
            <Check className="h-3 w-3 shrink-0 text-[#fe3619]" aria-hidden="true" />
            <span>Saved PNG Card</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={prefersReduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="inline-flex items-center gap-1.5"
          >
            <Download className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Download Quote Card</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
