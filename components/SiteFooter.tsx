"use client";

import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatFirestoreErrorMessage } from "../lib/firebase";
import {
  DEFAULT_WRAPPED_CONFIG,
  saveSubscriber,
  subscribeSiteSettings,
  subscribeWrappedConfig,
  type SiteSettingsRecord,
} from "../lib/firebaseContent";
import { CONTACT_EMAIL } from "../lib/tally";

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [channels, setChannels] = useState<SiteSettingsRecord>({
    instagramUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
    exists: false,
  });
  const [wrappedVisible, setWrappedVisible] = useState(
    DEFAULT_WRAPPED_CONFIG.enabled && DEFAULT_WRAPPED_CONFIG.showInFooter,
  );
  const [wrappedYear, setWrappedYear] = useState(DEFAULT_WRAPPED_CONFIG.yearLabel);

  useEffect(() => {
    const unsubscribeSettings = subscribeSiteSettings(
      (data) => setChannels(data),
      () => {
        // Social links are optional; keep base footer navigation intact on transient error
      },
    );
    const unsubscribeWrapped = subscribeWrappedConfig(
      (cfg) => {
        setWrappedVisible(cfg.enabled && cfg.showInFooter);
        setWrappedYear(cfg.yearLabel || "2026");
      },
      () => {
        // Fallback to defaults if wrappedConfig listener encounters transient error
      },
    );
    return () => {
      unsubscribeSettings();
      unsubscribeWrapped();
    };
  }, []);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await saveSubscriber({ email: trimmed, source: "footer" });
      setSubscribed(true);
      setEmail("");
    } catch (err) {
      setError(formatFirestoreErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const socialLinks = [
    {
      label: "Instagram",
      href: channels.instagramUrl.trim().startsWith("https://")
        ? channels.instagramUrl.trim()
        : "https://www.instagram.com/_tta.ng",
    },
    {
      label: "X",
      href: channels.xUrl.trim().startsWith("https://")
        ? channels.xUrl.trim()
        : "https://x.com/TTA_Africa",
    },
    { label: "LinkedIn", href: channels.linkedinUrl },
    { label: "YouTube", href: channels.youtubeUrl },
  ].filter((item) => item.href.trim().startsWith("https://"));

  return (
    <footer className="bg-[#f7f6f4] px-6 text-[#111111] sm:px-10">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center border-t border-black/[0.09] py-20 text-center md:py-24">
        <Link
          href="/#top"
          aria-label="TTA — The Thinking Architects home"
          className="group flex flex-col items-center text-[#111111] transition-opacity hover:opacity-75"
        >
          <span className="logo-tta text-[2.2rem] font-bold leading-none text-[#fe3619]">
            TTA
          </span>
          <span className="mt-2 text-[14px] font-semibold tracking-[-0.02em] text-[#111111]">
            The Thinking Architects
          </span>
        </Link>

        {/* Inline newsletter/resource bar */}
        <div className="mt-14 flex w-full flex-col items-center gap-6 md:flex-row md:items-center md:justify-center md:gap-10 md:text-right">
          <h2 className="max-w-[18ch] text-[clamp(1.4rem,2.3vw,1.85rem)] font-medium leading-[1.12] tracking-[-0.02em]">
            Be the first to know about the next Think Session
          </h2>

          <div className="w-full max-w-[460px]">
            {subscribed ? (
              <div className="flex h-[60px] items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-[#efeeec] px-5 text-[14px] font-medium text-[#111111]">
                <Check className="h-4 w-4 text-[#fe3619]" aria-hidden="true" />
                <span>You&apos;re on the list for session invitations and updates.</span>
              </div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                noValidate
                className="relative flex h-[60px] items-center rounded-xl border border-black/10 bg-[#efeeec] p-1.5 pl-5 transition-colors focus-within:border-black/30"
              >
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                  disabled={submitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="h-full min-w-0 flex-1 bg-transparent text-[16px] leading-none text-[#111111] outline-none placeholder:text-[#111111]/40 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  aria-label="Subscribe for session invitations"
                  className="flex h-full w-[56px] shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#111111] text-[#f7f6f4] transition-opacity duration-200 hover:opacity-75 disabled:opacity-50"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}

            {error && (
              <p role="alert" className="mt-2 px-1 text-left text-[12px] font-medium text-[#fe3619]">
                {error}
              </p>
            )}

            <p className="mt-2.5 px-1 text-[11px] leading-[1.45] text-[#111111]/55 md:text-left">
              We use your email for welcome messages, session invitations, and updates. To have it
              deleted, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-2 hover:text-[#111111]"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </div>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="label-mono group mt-10 inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#fe3619] px-8 py-3.5 text-[12px] text-white transition-opacity duration-200 hover:opacity-90"
        >
          <span className="whitespace-nowrap">{CONTACT_EMAIL}</span>
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </a>

        <div className="mt-14 flex w-full flex-col items-center justify-between gap-6 border-t border-black/[0.08] pt-8 text-left md:flex-row md:items-end">
          <div className="space-y-2 text-center md:text-left">
            <p className="max-w-[60ch] text-[12px] leading-relaxed text-[#111111]/60">
              The Thinking Architects is an independent community and is not affiliated with ARCON,
              NIA, or JBAE.
            </p>
            <p className="text-[12px] text-[#111111]/45">
              © 2026 The Thinking Architects
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-medium text-[#111111]/75"
          >
            <Link
              href="/"
              className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
            >
              About
            </Link>
            <Link
              href="/sessions"
              className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
            >
              Think Sessions
            </Link>
            <Link
              href="/media"
              className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
            >
              Media
            </Link>
            <Link
              href="/community"
              className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
            >
              Community
            </Link>
            <Link
              href="/contact"
              className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
            >
              Contact
            </Link>
            {wrappedVisible && (
              <Link
                href="/wrapped"
                className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
              >
                {wrappedYear} Wrapped
              </Link>
            )}
            {socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 transition-colors hover:text-[#111111] hover:underline"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
