"use client";

import { Check, Download } from "lucide-react";
import { useState } from "react";
import { downloadQuoteCard, type QuoteCardPayload } from "../lib/quoteCardGenerator";

export function TakeawayQuoteButton({
  payload,
  className = "",
}: {
  payload: QuoteCardPayload;
  className?: string;
}) {
  const [downloaded, setDownloaded] = useState(false);

  const handleClick = () => {
    downloadQuoteCard(payload);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2400);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`label-mono inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-black/12 bg-[#efeeec] px-3 py-1.5 text-[10.5px] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white whitespace-nowrap ${className}`}
    >
      {downloaded ? (
        <>
          <Check className="h-3 w-3 shrink-0 text-[#fe3619]" aria-hidden="true" />
          <span>Saved PNG Card</span>
        </>
      ) : (
        <>
          <Download className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Download Quote Card</span>
        </>
      )}
    </button>
  );
}
