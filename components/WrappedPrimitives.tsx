"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import DitherBackground from "./DitherBackground";

/**
 * ReactBits BlurText / SplitText — staggered blur-to-sharp editorial word reveal.
 */
export function BlurWords({
  text,
  className = "",
  delay = 0,
  stagger = 0.045,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const prefersReduced = useReducedMotion();
  const words = text.split(" ");

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {words.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.36,
            delay: delay + idx * stagger,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block will-change-transform"
        >
          {word}
          {idx < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * ReactBits DecryptedText — kinetic glyph scramble that resolves cleanly into target text
 * on mount and optionally replays on pointer hover.
 */
const CIPHER_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·/+-";

export function DecryptedText({
  text,
  className = "",
  speed = 24,
  revealOnHover = true,
}: {
  text: string;
  className?: string;
  speed?: number;
  revealOnHover?: boolean;
}) {
  const prefersReduced = useReducedMotion();
  const [display, setDisplay] = useState(text);
  const [triggerCount, setTriggerCount] = useState(1);

  useEffect(() => {
    if (prefersReduced || triggerCount === 0) return;

    let step = 0;
    const totalSteps = 10;
    const timer = window.setInterval(() => {
      step += 1;
      const lockedChars = Math.floor((step / totalSteps) * text.length);

      const next = text
        .split("")
        .map((char, idx) => {
          if (char === " ") return " ";
          if (idx < lockedChars) return char;
          return CIPHER_GLYPHS[Math.floor(Math.random() * CIPHER_GLYPHS.length)];
        })
        .join("");

      setDisplay(next);

      if (step >= totalSteps) {
        window.clearInterval(timer);
        setDisplay(text);
      }
    }, speed);

    return () => window.clearInterval(timer);
  }, [text, speed, triggerCount, prefersReduced]);

  return (
    <span
      onMouseEnter={revealOnHover && !prefersReduced ? () => setTriggerCount((c) => c + 1) : undefined}
      className={className}
    >
      {prefersReduced ? text : display}
    </span>
  );
}

/**
 * ReactBits Counter — vertical spring-physics rolling digit drum.
 */
function RollingDigitReel({
  mv,
  digitIndex,
}: {
  mv: MotionValue<number>;
  digitIndex: number;
}) {
  const yPercent = useTransform(mv, (latest) => {
    const placeValue = ((latest % 10) + 10) % 10;
    let offset = (10 + digitIndex - placeValue) % 10;
    if (offset > 5) offset -= 10;
    return `${offset * 125}%`;
  });

  return (
    <motion.span
      style={{ y: yPercent }}
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center leading-none"
    >
      {digitIndex}
    </motion.span>
  );
}

function RollingDigitColumn({
  digit,
  spinLoops,
  delayMs,
}: {
  digit: number;
  spinLoops: number;
  delayMs: number;
}) {
  const prefersReduced = useReducedMotion();
  const targetSteps = digit + spinLoops * 10;
  const animatedValue = useSpring(prefersReduced ? targetSteps : 0, {
    mass: 0.42,
    stiffness: 165,
    damping: 22,
  });

  useEffect(() => {
    if (prefersReduced) {
      animatedValue.jump(targetSteps);
      return;
    }
    const timer = window.setTimeout(() => {
      animatedValue.set(targetSteps);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [animatedValue, targetSteps, delayMs, prefersReduced]);

  return (
    <span
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
      className="relative inline-block h-[1.12em] w-[0.66em] overflow-hidden align-middle"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digitIndex) => (
        <RollingDigitReel key={digitIndex} mv={animatedValue} digitIndex={digitIndex} />
      ))}
    </span>
  );
}

export function RollingCounter({
  target,
  prefix = "",
  suffix = "",
  className = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const digits = String(Math.max(0, Math.floor(target))).split("").map(Number);

  return (
    <span
      aria-label={`${prefix}${target}${suffix}`}
      className={`inline-flex items-center tabular-nums ${className}`}
    >
      {prefix && <span className="leading-none">{prefix}</span>}
      <span className="inline-flex items-center leading-none">
        {digits.map((digit, idx) => (
          <RollingDigitColumn
            key={`${idx}-${digit}`}
            digit={digit}
            spinLoops={digit === 0 ? 1 : 0}
            delayMs={idx * 45}
          />
        ))}
      </span>
      {suffix && <span className="leading-none">{suffix}</span>}
    </span>
  );
}

/**
 * ReactBits Magnet — spring-physics magnetic pull toward pointer on hover.
 */
export function MagneticAction({
  children,
  strength = 0.22,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 320, damping: 24, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 320, damping: 24, mass: 0.4 });

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (prefersReduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={prefersReduced ? undefined : { x: springX, y: springY }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * Combined WebGL Dither Shader + Architectural Drafting Lines + Pointer Spotlight Backdrop.
 */
export function SpotlightStageBackdrop({
  theme,
  slideIndex,
}: {
  theme: "dark" | "cream";
  slideIndex: number;
}) {
  const prefersReduced = useReducedMotion();
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  useEffect(() => {
    const parent = document.getElementById("wrapped-stage-surface");
    if (!parent || prefersReduced) return;

    const handleMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseX.set(((e.clientX - rect.left) / rect.width) * 100);
      mouseY.set(((e.clientY - rect.top) / rect.height) * 100);
    };

    parent.addEventListener("mousemove", handleMove);
    return () => parent.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY, prefersReduced]);

  const spotlightBg = useMotionTemplate`radial-gradient(480px circle at ${mouseX}% ${mouseY}%, ${
    theme === "dark" ? "rgba(217, 79, 43, 0.14)" : "rgba(28, 28, 28, 0.055)"
  }, transparent 70%)`;

  const strokeColor =
    theme === "dark" ? "rgba(242, 237, 232, 0.1)" : "rgba(28, 28, 28, 0.08)";
  const accentStroke = "rgba(217, 79, 43, 0.42)";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Live WebGL 8x8 Bayer Dithered FBM Wave Canvas */}
      <DitherBackground
        theme={theme}
        pixelSize={3}
        waveSpeed={0.045}
        waveFrequency={2.4}
        waveAmplitude={0.35}
        colorLevels={5}
        mouseRadius={0.32}
      />

      {/* Contrast reading scrim keeping left/center copy ultra-crisp against the dither wave */}
      <div
        className="absolute inset-0"
        style={{
          background:
            theme === "dark"
              ? "linear-gradient(100deg, rgba(28,28,28,0.88) 0%, rgba(28,28,28,0.68) 54%, rgba(28,28,28,0.22) 100%)"
              : "linear-gradient(100deg, rgba(242,237,232,0.94) 0%, rgba(242,237,232,0.82) 56%, rgba(242,237,232,0.42) 100%)",
        }}
      />

      {/* Pointer spotlight */}
      {!prefersReduced && (
        <motion.div className="absolute inset-0" style={{ background: spotlightBg }} />
      )}

      {/* Subtle animated architectural drafting overlays keyed per slide */}
      <svg
        key={`arch-bg-${slideIndex}`}
        viewBox="0 0 1000 560"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <motion.line
          x1="48"
          y1="84"
          x2="952"
          y2="84"
          stroke={strokeColor}
          strokeWidth="1"
          initial={{ pathLength: prefersReduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />

        {slideIndex === 0 && (
          <>
            <motion.circle
              cx="840"
              cy="280"
              r="180"
              stroke={accentStroke}
              strokeWidth="1"
              initial={{ pathLength: prefersReduced ? 1 : 0, opacity: 0.45 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.circle
              cx="840"
              cy="280"
              r="116"
              stroke={strokeColor}
              strokeWidth="1"
              strokeDasharray="4 6"
              initial={{ rotate: 0 }}
              animate={prefersReduced ? undefined : { rotate: 360 }}
              transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "840px 280px" }}
            />
          </>
        )}

        {slideIndex === 8 && (
          <>
            <motion.circle
              cx="745"
              cy="345"
              r="66"
              stroke={accentStroke}
              strokeWidth="1"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.circle
              cx="835"
              cy="225"
              r="44"
              stroke={accentStroke}
              strokeWidth="1"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.line
              x1="745"
              y1="345"
              x2="835"
              y2="225"
              stroke={accentStroke}
              strokeWidth="1.25"
              initial={{ pathLength: prefersReduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            />
          </>
        )}
      </svg>

      {/* Border beam along the top edge on Cover & Next CTA slides */}
      {!prefersReduced && (slideIndex === 0 || slideIndex === 11) && (
        <motion.div
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#D94F2B] to-transparent"
          initial={{ x: "-100%", opacity: 0.85 }}
          animate={{ x: "100%", opacity: 0.85 }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
