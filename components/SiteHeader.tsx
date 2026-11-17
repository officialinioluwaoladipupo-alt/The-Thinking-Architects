"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_WRAPPED_CONFIG,
  subscribePublishedSessions,
  subscribeWrappedConfig,
} from "../lib/firebaseContent";
import { SessionReminderRunner } from "./SessionRemindButton";

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
  const [hasUpcomingSession, setHasUpcomingSession] = useState(false);
  const [wrappedNav, setWrappedNav] = useState({
    enabled: DEFAULT_WRAPPED_CONFIG.enabled,
    showInNav: DEFAULT_WRAPPED_CONFIG.showInNav,
    yearLabel: DEFAULT_WRAPPED_CONFIG.yearLabel,
  });
  const pathname = usePathname();

  useEffect(() => {
    const unsubWrapped = subscribeWrappedConfig(
      (cfg) => {
        setWrappedNav({
          enabled: cfg.enabled,
          showInNav: cfg.showInNav,
          yearLabel: cfg.yearLabel || "2026",
        });
      },
      () => {
        // Keep defaults on transient listener error
      },
    );

    const unsubSessions = subscribePublishedSessions(
      (items) => {
        setHasUpcomingSession(items.some((item) => item.status === "upcoming"));
      },
      () => {
        // Ignore transient session indicator error in global navbar
      },
    );

    return () => {
      unsubWrapped();
      unsubSessions();
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showWrappedLink = wrappedNav.enabled && wrappedNav.showInNav;
  const wrappedHref = "/wrapped";
  const wrappedLabel = `${wrappedNav.yearLabel} Wrapped`;

  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <SessionReminderRunner />
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
              const showLiveDot = link.href === "/sessions" && hasUpcomingSession;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  title={showLiveDot ? "Upcoming Think Session scheduled" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium underline-offset-4 transition-colors duration-150 ${
                    active
                      ? "text-[#111111] underline decoration-[#fe3619] decoration-2"
                      : "text-[#111111]/72 hover:text-[#111111] hover:underline"
                  }`}
                >
                  <span>{link.label}</span>
                  {showLiveDot && (
                    <span className="relative flex h-2 w-2 items-center justify-center">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#fe3619]"
                        aria-hidden="true"
                      />
                      <span className="sr-only">(Upcoming live session)</span>
                    </span>
                  )}
                </Link>
              );
            })}

            {showWrappedLink && (
              <Link
                href={wrappedHref}
                aria-current={isActive(wrappedHref) ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium underline-offset-4 transition-colors duration-150 ${
                  isActive(wrappedHref)
                    ? "text-[#111111] underline decoration-[#fe3619] decoration-2"
                    : "text-[#111111]/85 hover:text-[#111111] hover:underline"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#fe3619]" aria-hidden="true" />
                <span>{wrappedLabel}</span>
              </Link>
            )}
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
                const showLiveDot = link.href === "/sessions" && hasUpcomingSession;
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
                    <span className="inline-flex items-center gap-2">
                      <span>{link.label}</span>
                      {showLiveDot && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-[#fe3619]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#fe3619]" aria-hidden="true" />
                          <span>Next Live</span>
                        </span>
                      )}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#111111]/45" aria-hidden="true" />
                  </Link>
                );
              })}

              {showWrappedLink && (
                <Link
                  href={wrappedHref}
                  aria-current={isActive(wrappedHref) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`flex min-h-[44px] items-center justify-between px-3 text-[14px] font-medium transition-colors hover:bg-black/[0.03] ${
                    isActive(wrappedHref) ? "text-[#fe3619]" : "text-[#111111]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#fe3619]" aria-hidden="true" />
                    <span>{wrappedLabel}</span>
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#111111]/45" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
