"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEFAULT_WRAPPED_CONFIG,
  subscribeLiveState,
  subscribePublishedSessions,
  subscribeWrappedConfig,
} from "../lib/firebaseContent";
import { ArchitecturalScrollProgress, EDITORIAL_EASE } from "./MotionPrimitives";
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
  const [isSessionLiveNow, setIsSessionLiveNow] = useState(false);
  const [wrappedNav, setWrappedNav] = useState({
    enabled: DEFAULT_WRAPPED_CONFIG.enabled,
    showInNav: DEFAULT_WRAPPED_CONFIG.showInNav,
    yearLabel: DEFAULT_WRAPPED_CONFIG.yearLabel,
  });
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

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

    const unsubLive = subscribeLiveState(
      (state) => {
        setIsSessionLiveNow(Boolean(state.isLive && state.sessionId));
      },
      () => {
        // Ignore transient live state error in global navbar
      },
    );

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      unsubWrapped();
      unsubSessions();
      unsubLive();
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const showWrappedLink = wrappedNav.enabled && wrappedNav.showInNav;
  const wrappedHref = "/wrapped";
  const wrappedLabel = `${wrappedNav.yearLabel} Wrapped`;

  return (
    <>
      <ArchitecturalScrollProgress />
      <motion.header
        initial={prefersReduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: EDITORIAL_EASE }}
        className="fixed inset-x-0 top-3 z-40 flex justify-center px-3 sm:top-4 sm:px-4"
      >
        <SessionReminderRunner />
        <nav
          aria-label="Primary navigation"
          className="w-full max-w-[1120px] overflow-hidden rounded-2xl border border-black/[0.06] bg-[#EAEAEA]/85 shadow-[0_8px_30px_rgba(17,17,17,0.06)] backdrop-blur-xl"
        >
        <div className="flex h-[54px] items-center justify-between gap-2 px-3.5 sm:gap-6 sm:px-5">
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
              const showLiveDot = link.href === "/sessions" && (isSessionLiveNow || hasUpcomingSession);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  title={
                    isSessionLiveNow && link.href === "/sessions"
                      ? "Think Session happening live now"
                      : showLiveDot
                        ? "Upcoming Think Session scheduled"
                        : undefined
                  }
                  className={`relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1 text-[13px] font-medium transition-colors duration-150 ${
                    active
                      ? "text-[#111111]"
                      : "text-[#111111]/72 hover:text-[#111111]"
                  }`}
                >
                  <span>{link.label}</span>
                  {showLiveDot && (
                    <span className="relative flex h-2 w-2 items-center justify-center">
                      {isSessionLiveNow && (
                        <span
                          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fe3619] opacity-65"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className="relative h-1.5 w-1.5 rounded-full bg-[#fe3619]"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        {isSessionLiveNow ? "(Live session active now)" : "(Upcoming live session)"}
                      </span>
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="header-active-nav"
                      transition={{ type: "spring", stiffness: 460, damping: 34 }}
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#fe3619]"
                    />
                  )}
                </Link>
              );
            })}

            {showWrappedLink && (
              <Link
                href={wrappedHref}
                aria-current={isActive(wrappedHref) ? "page" : undefined}
                className={`relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap py-1 text-[13px] font-medium transition-colors duration-150 ${
                  isActive(wrappedHref)
                    ? "text-[#111111]"
                    : "text-[#111111]/85 hover:text-[#111111]"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#fe3619]" aria-hidden="true" />
                <span>{wrappedLabel}</span>
                {isActive(wrappedHref) && (
                  <motion.span
                    layoutId="header-active-nav"
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-[#fe3619]"
                  />
                )}
              </Link>
            )}
          </div>

          {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
          <div className="flex shrink-0 items-center gap-2">
            <motion.button
              type="button"
              onClick={onOpenJoin}
              whileHover={prefersReduced ? undefined : { scale: 1.02 }}
              whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              className="label-mono inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#fe3619] px-4 py-2 text-white transition-opacity duration-200 hover:opacity-90"
            >
              <span className="sm:hidden">Join</span>
              <span className="hidden sm:inline">Join the community</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </motion.button>

            <motion.button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              whileTap={prefersReduced ? undefined : { scale: 0.92 }}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              className="inline-flex h-[40px] w-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#111111]/75 transition-colors hover:bg-black/[0.05] hover:text-[#111111] lg:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span
                    key="close"
                    initial={prefersReduced ? false : { opacity: 0, rotate: -45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={prefersReduced ? undefined : { opacity: 0, rotate: 45 }}
                    transition={{ duration: 0.14 }}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={prefersReduced ? false : { opacity: 0, rotate: 45 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={prefersReduced ? undefined : { opacity: 0, rotate: -45 }}
                    transition={{ duration: 0.14 }}
                  >
                    <Menu className="h-4 w-4" aria-hidden="true" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile expandable drawer */}
        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.div
              initial={prefersReduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={prefersReduced ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: EDITORIAL_EASE }}
              className="overflow-hidden border-t border-black/[0.06] lg:hidden"
            >
              <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain px-2 py-2">
                <div className="flex flex-col divide-y divide-black/[0.05]">
                  {navLinks.map((link, idx) => {
                    const active = isActive(link.href);
                    const showLiveDot = link.href === "/sessions" && (isSessionLiveNow || hasUpcomingSession);
                    return (
                      <motion.div
                        key={link.href}
                        initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.025, ease: EDITORIAL_EASE }}
                      >
                        <Link
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
                                <span>{isSessionLiveNow ? "Live Now" : "Next Live"}</span>
                              </span>
                            )}
                          </span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-[#111111]/45" aria-hidden="true" />
                        </Link>
                      </motion.div>
                    );
                  })}

                  {showWrappedLink && (
                    <motion.div
                      initial={prefersReduced ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: navLinks.length * 0.025, ease: EDITORIAL_EASE }}
                    >
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
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
    </>
  );
}
