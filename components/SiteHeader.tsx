"use client";

import { ArrowUpRight, Megaphone, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_LIVE_SETTINGS,
  subscribeLiveSettings,
  type LiveSettingsRecord,
} from "../lib/firebaseContent";

type SiteHeaderProps = {
  onOpenJoin: () => void;
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/sessions", label: "Think Sessions" },
  { href: "/media", label: "Media" },
  { href: "/community", label: "Community" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader({ onOpenJoin }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveSettings, setLiveSettings] = useState<LiveSettingsRecord>(DEFAULT_LIVE_SETTINGS);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const unsub = subscribeLiveSettings(
      (settings) => {
        setLiveSettings(settings);
      },
      () => {
        // Optional notice bar; ignore errors silently
      },
    );
    return () => unsub();
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showAnnouncement =
    liveSettings.announcementEnabled &&
    liveSettings.announcementText.trim().length > 0 &&
    !announcementDismissed;

  const announcementHref = liveSettings.announcementLinkHref.trim();
  const announcementLabel = liveSettings.announcementLinkLabel.trim();
  const hasAnnouncementLink =
    Boolean(announcementHref && announcementLabel) &&
    (announcementHref.startsWith("/") || announcementHref.startsWith("https://"));

  return (
    <header className="fixed inset-x-0 top-3 z-40 flex flex-col items-center gap-2 px-4">
      {showAnnouncement && (
        <div
          role="region"
          aria-label="Site announcement"
          className="flex w-full max-w-[1120px] items-center justify-between gap-3 rounded-xl border border-black/15 bg-[#1C1C1C] px-4 py-2 text-[#F2EDE8] shadow-[0_6px_22px_rgba(17,17,17,0.14)]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-[12.5px] sm:text-[13px]">
            <Megaphone
              className="h-3.5 w-3.5 shrink-0 text-[#D94F2B]"
              aria-hidden="true"
            />
            <p className="truncate font-normal text-[#F2EDE8]/90">
              {liveSettings.announcementText}
            </p>
            {hasAnnouncementLink &&
              (announcementHref.startsWith("/") ? (
                <Link
                  href={announcementHref}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-[#D94F2B] underline-offset-4 hover:underline"
                >
                  <span>{announcementLabel}</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : (
                <a
                  href={announcementHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.07em] text-[#D94F2B] underline-offset-4 hover:underline"
                >
                  <span>{announcementLabel}</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              ))}
          </div>

          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss notice"
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#F2EDE8]/65 transition-colors hover:bg-white/10 hover:text-[#F2EDE8]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <nav
        aria-label="Primary navigation"
        className="w-full max-w-[1120px] overflow-hidden rounded-2xl border border-black/[0.06] bg-[#EAEAEA]/85 shadow-[0_8px_30px_rgba(17,17,17,0.06)] backdrop-blur-xl"
      >
        <div className="flex h-[54px] items-center justify-between gap-4 px-4 sm:gap-6 sm:px-5">
          {/* Zone 1: Single-line TTA Logo + Brand Wordmark */}
          <Link
            href="/"
            aria-label="TTA — The Thinking Architects home"
            className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[#111111] transition-opacity duration-200 hover:opacity-65"
          >
            <span className="logo-tta text-[21px] font-bold leading-none text-[#fe3619]">
              TTA
            </span>
            <span
              className="hidden h-3.5 w-px bg-black/15 sm:inline-block lg:hidden xl:inline-block"
              aria-hidden="true"
            />
            <span className="hidden text-[14px] font-semibold tracking-[-0.025em] sm:inline lg:hidden xl:inline">
              The Thinking Architects
            </span>
          </Link>

          {/* Zone 2: Concise single-line navigation links */}
          <div className="hidden items-center gap-5 lg:flex xl:gap-6">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap text-[13px] font-medium underline-offset-4 transition-colors duration-150 ${
                    active
                      ? "text-[#111111] underline decoration-[#fe3619] decoration-2"
                      : "text-[#111111]/72 hover:text-[#111111] hover:underline"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenJoin}
              className="label-mono inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#fe3619] px-4 py-2 text-white transition-opacity duration-200 hover:opacity-85"
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Join the community</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              className="inline-flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#111111]/75 transition-colors hover:bg-black/[0.05] hover:text-[#111111] lg:hidden"
            >
              {menuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile expandable drawer */}
        {menuOpen && (
          <div className="border-t border-black/[0.06] px-2 py-2 lg:hidden">
            <div className="flex flex-col divide-y divide-black/[0.05]">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-[44px] items-center justify-between px-3 text-[14px] font-medium transition-colors hover:bg-black/[0.03] ${
                      active ? "text-[#fe3619]" : "text-[#111111]"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#111111]/45" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
