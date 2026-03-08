"use client";

import { Children, ReactNode, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";

/** Same easing as merchandise page – smooth, premium feel */
export const SCROLL_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;
export const SCROLL_REVEAL_DURATION = 0.7;
export const SCROLL_REVEAL_VIEWPORT = { once: true, amount: 0.2 } as const;

export type ScrollRevealDirection = "up" | "down" | "left" | "right" | "none";

const directionToOffset: Record<ScrollRevealDirection, { x?: number; y?: number }> = {
  up: { y: 48 },
  down: { y: -48 },
  left: { x: 48 },
  right: { x: -48 },
  none: {},
};

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const handler = () => setReduce(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduce;
}

export interface ScrollRevealSectionProps {
  children: ReactNode;
  /** Direction of entrance (default: up) */
  direction?: ScrollRevealDirection;
  /** Delay in seconds before animation starts */
  delay?: number;
  /** Custom duration (default: SCROLL_REVEAL_DURATION) */
  duration?: number;
  /** Amount of element visible to trigger (0–1). Default 0.2 */
  amount?: number;
  className?: string;
  /** Render as this element (default: div) */
  as?: "div" | "section" | "article";
}

const MotionWrapperByTag = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
};

/**
 * Reveals content on scroll with the same smooth GSAP/Framer-style transition as the merchandise page.
 * Respects prefers-reduced-motion (no animation when user prefers reduced motion).
 */
export function ScrollRevealSection({
  children,
  direction = "up",
  delay = 0,
  duration = SCROLL_REVEAL_DURATION,
  amount = 0.2,
  className = "",
  as = "div",
}: ScrollRevealSectionProps) {
  const reduceMotion = usePrefersReducedMotion();
  const offset = directionToOffset[direction];
  const MotionEl = MotionWrapperByTag[as];

  const initial = reduceMotion
    ? { opacity: 1, x: 0, y: 0 }
    : { opacity: 0, ...offset };

  const animate = reduceMotion
    ? undefined
    : { opacity: 1, x: 0, y: 0 };

  const transition = reduceMotion
    ? { duration: 0 }
    : {
        duration,
        ease: SCROLL_REVEAL_EASE,
        delay,
      };

  return (
    <MotionEl
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, amount }}
      transition={transition}
      className={className}
    >
      {children}
    </MotionEl>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: SCROLL_REVEAL_DURATION,
      ease: SCROLL_REVEAL_EASE,
    },
  },
};

export interface ScrollRevealStaggerProps {
  children: ReactNode;
  /** Stagger delay between each child (seconds). Default 0.08 */
  staggerChildren?: number;
  /** Class on the container */
  className?: string;
  /** Amount of container visible to start (0–1). Default 0.15 */
  amount?: number;
}

/**
 * Container that reveals children with a staggered animation (like merchandise cards).
 */
export function ScrollRevealStagger({
  children,
  staggerChildren = 0.08,
  className = "",
  amount = 0.15,
}: ScrollRevealStaggerProps) {
  const reduceMotion = usePrefersReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: reduceMotion ? 0 : staggerChildren,
        delayChildren: reduceMotion ? 0 : 0.06,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      className={className}
    >
      {Children.map(children, (child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
