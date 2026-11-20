"use client";

import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";

export const EDITORIAL_EASE = [0.16, 1, 0.3, 1] as const;

/**
 * 21st.dev Scroll Progress Hairline — fixed razor-thin architectural progress bar
 * reflecting vertical reading depth across the viewport.
 */
export function ArchitecturalScrollProgress() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 32,
    restDelta: 0.001,
  });

  if (prefersReduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="pointer-events-none fixed top-0 right-0 left-0 z-50 h-[2px] origin-left bg-[#fe3619] will-change-transform"
    />
  );
}

/**
 * ReactBits SplitText / Masked Editorial Word Reveal — lifts words smoothly
 * from behind crisp typographic line masks on mount or when scrolled into view.
 */
export function SplitHeadlineReveal({
  text,
  className = "",
  delay = 0,
  stagger = 0.032,
  trigger = "mount",
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  trigger?: "mount" | "inView";
}) {
  const prefersReduced = useReducedMotion();
  const words = text.split(" ");

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className} aria-label={text}>
      {words.map((word, idx) => (
        <span
          key={`${word}-${idx}`}
          aria-hidden="true"
          className="inline-block overflow-hidden align-bottom"
        >
          <motion.span
            initial={{ opacity: 0, y: "100%" }}
            animate={trigger === "mount" ? { opacity: 1, y: "0%" } : undefined}
            whileInView={trigger === "inView" ? { opacity: 1, y: "0%" } : undefined}
            viewport={trigger === "inView" ? { once: true, amount: 0.25 } : undefined}
            transition={{
              duration: 0.5,
              delay: delay + idx * stagger,
              ease: EDITORIAL_EASE,
            }}
            className="inline-block will-change-transform"
          >
            {word}
            {idx < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * ReactBits FadeContent / AnimatedContent — smooth viewport-triggered entrance
 * using strictly GPU-composited transform, opacity, and subtle blur.
 */
export function EditorialReveal({
  children,
  className = "",
  delay = 0,
  y = 14,
  duration = 0.45,
  trigger = "inView",
  blur = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  trigger?: "inView" | "mount";
  blur?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const initialState = blur
    ? { opacity: 0, y, filter: "blur(4px)" }
    : { opacity: 0, y };
  const targetState = blur
    ? { opacity: 1, y: 0, filter: "blur(0px)" }
    : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={initialState}
      animate={trigger === "mount" ? targetState : undefined}
      whileInView={trigger === "inView" ? targetState : undefined}
      viewport={trigger === "inView" ? { once: true, amount: 0.1 } : undefined}
      transition={{ duration, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Architectural 1px Blueprint Rule — draws left-to-right across a container on view.
 */
export function DraftingRule({
  className = "bg-black/[0.09]",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div aria-hidden="true" className={`h-px w-full ${className}`} />;
  }

  return (
    <motion.div
      aria-hidden="true"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, delay, ease: EDITORIAL_EASE }}
      className={`h-px w-full origin-left will-change-transform ${className}`}
    />
  );
}

/**
 * ReactBits SpotlightCard / 21st.dev Pointer Surface — renders a smooth,
 * zero-rerender pointer radial glow inside editorial containers.
 */
export function SpotlightSurface({
  children,
  className = "",
  spotlightColor = "rgba(254, 54, 25, 0.08)",
  radius = 360,
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  radius?: number;
}) {
  const prefersReduced = useReducedMotion();
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const background = useMotionTemplate`radial-gradient(${radius}px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 75%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => !prefersReduced && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${className}`}
    >
      {!prefersReduced && (
        <motion.div
          aria-hidden="true"
          style={{ background }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        />
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/**
 * ReactBits CountUp — animates numeric values smoothly when scrolled into view,
 * while rendering the target number immediately if reduced motion is preferred.
 */
export function NumberRollUp({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setDisplay(value);
      return;
    }

    let controls: ReturnType<typeof animate> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        controls?.stop();
        controls = animate(0, value, {
          duration: 0.75,
          ease: EDITORIAL_EASE,
          onUpdate: (latest) => setDisplay(Math.round(latest)),
        });
        observer.disconnect();
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      controls?.stop();
    };
  }, [value, prefersReduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {display}
    </span>
  );
}
