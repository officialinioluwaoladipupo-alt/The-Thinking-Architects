"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DEFAULT_WRAPPED_CONFIG,
  subscribeWrappedConfig,
  type WrappedConfigRecord,
} from "../lib/firebaseContent";
import { useFirebase } from "./FirebaseProvider";
import { WrappedCountdownClock } from "./WrappedCountdownClock";

export function WrappedBannerCard({
  config,
  onOpenJoin,
  isAdminPreview = false,
}: {
  config: Pick<
    WrappedConfigRecord,
    | "enabled"
    | "homeBannerEyebrow"
    | "homeBannerTitle"
    | "homeBannerCtaLabel"
    | "homeCountdownEnabled"
    | "launchDateIso"
  >;
  onOpenJoin?: () => void;
  isAdminPreview?: boolean;
}) {
  const showCountdown = Boolean(config.homeCountdownEnabled && config.launchDateIso.trim());

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.12] bg-[#1C1C1C] px-6 py-6 text-[#F2EDE8] shadow-[0_14px_40px_rgba(17,17,17,0.08)] sm:px-8 sm:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-[#fe3619]/15 blur-3xl"
      />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[56ch]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.09em] text-[#fe3619]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{config.homeBannerEyebrow}</span>
            </span>
            {!config.enabled && (
              <span className="rounded-md border border-[#F2EDE8]/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#F2EDE8]/70">
                Coming Soon
              </span>
            )}
          </div>
          <h2 className="mt-2 text-[clamp(1.35rem,2.4vw,1.95rem)] font-medium leading-[1.15] tracking-[-0.025em] text-[#F2EDE8]">
            {config.homeBannerTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {showCountdown && (
            <WrappedCountdownClock targetIso={config.launchDateIso} variant="dark" />
          )}

          {config.enabled || isAdminPreview ? (
            <Link
              href="/wrapped"
              className="label-mono group inline-flex min-h-[46px] shrink-0 items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
            >
              <span>{config.homeBannerCtaLabel}</span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onOpenJoin}
              className="label-mono group inline-flex min-h-[46px] shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[#fe3619] px-6 py-3 text-white transition-opacity hover:opacity-90"
            >
              <span>{config.homeBannerCtaLabel || "Notify Me"}</span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WrappedHomeBanner({ onOpenJoin }: { onOpenJoin: () => void }) {
  const { isAdmin } = useFirebase();
  const [config, setConfig] = useState<WrappedConfigRecord>({
    ...DEFAULT_WRAPPED_CONFIG,
    exists: false,
  });

  useEffect(() => {
    const unsub = subscribeWrappedConfig(
      (data) => setConfig(data),
      () => {
        // Keep default fallback silently if Wrapped config listener hits transient error
      },
    );
    return () => unsub();
  }, []);

  if (!config.homeBannerEnabled) {
    return null;
  }

  return (
    <section
      aria-label="TTA Year Wrapped highlight"
      className="-mt-[6vh] mb-[10vh] px-6 sm:-mt-[11vh] sm:mb-[12vh] sm:px-10"
    >
      <div className="mx-auto max-w-[1120px]">
        <WrappedBannerCard
          config={config}
          onOpenJoin={onOpenJoin}
          isAdminPreview={isAdmin}
        />
      </div>
    </section>
  );
}
