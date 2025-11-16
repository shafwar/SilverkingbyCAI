"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

/**
 * CustomCursor Component
 * 
 * Premium custom cursor dengan smooth spring animation
 * untuk memberikan pengalaman interaktif yang sophisticated.
 * 
 * Features:
 * - Smooth spring-based mouse tracking
 * - Luxury gold accent
 * - Auto-hidden on mobile devices
 * - Subtle blur effect untuk depth
 * 
 * Usage:
 * ```tsx
 * import CustomCursor from "@/components/ui/CustomCursor";
 * 
 * export default function Page() {
 *   return (
 *     <>
 *       <CustomCursor />
 *       // ... rest of your page
 *     </>
 *   );
 * }
 * ```
 */

interface CustomCursorProps {
  /**
   * Size of the cursor ring in pixels
   * @default 32
   */
  size?: number;
  
  /**
   * Border color of the cursor ring
   * @default "luxury-gold/40"
   */
  borderColor?: string;
  
  /**
   * Background color of the cursor ring
   * @default "luxury-gold/10"
   */
  backgroundColor?: string;
  
  /**
   * Spring animation damping
   * Lower = more bouncy, Higher = more stiff
   * @default 25
   */
  damping?: number;
  
  /**
   * Spring animation stiffness
   * Lower = slower, Higher = faster
   * @default 700
   */
  stiffness?: number;
}

export default function CustomCursor({
  size = 32,
  borderColor = "luxury-gold/40",
  backgroundColor = "luxury-gold/10",
  damping = 25,
  stiffness = 700,
}: CustomCursorProps) {
  // Motion values untuk smooth tracking
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // Spring config untuk natural movement
  const springConfig = { damping, stiffness };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      // Center the cursor on mouse position
      cursorX.set(e.clientX - size / 2);
      cursorY.set(e.clientY - size / 2);
    };

    window.addEventListener("mousemove", moveCursor);
    
    return () => {
      window.removeEventListener("mousemove", moveCursor);
    };
  }, [cursorX, cursorY, size]);

  return (
    <motion.div
      className={`pointer-events-none fixed z-50 hidden rounded-full border backdrop-blur-sm lg:block border-${borderColor} bg-${backgroundColor}`}
      style={{
        left: cursorXSpring,
        top: cursorYSpring,
        width: size,
        height: size,
      }}
      // Optional: Add scale animation on click
      initial={{ scale: 1 }}
      whileTap={{ scale: 0.8 }}
      transition={{ duration: 0.1 }}
    />
  );
}

/**
 * CustomCursorWithDot Component
 * 
 * Enhanced version dengan inner dot untuk lebih precise targeting
 */
export function CustomCursorWithDot({
  size = 32,
  borderColor = "luxury-gold/40",
  backgroundColor = "luxury-gold/10",
  damping = 25,
  stiffness = 700,
}: CustomCursorProps) {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping, stiffness };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - size / 2);
      cursorY.set(e.clientY - size / 2);
    };

    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY, size]);

  return (
    <>
      {/* Outer ring */}
      <motion.div
        className={`pointer-events-none fixed z-50 hidden rounded-full border backdrop-blur-sm lg:block border-${borderColor} bg-${backgroundColor}`}
        style={{
          left: cursorXSpring,
          top: cursorYSpring,
          width: size,
          height: size,
        }}
      />
      
      {/* Inner dot */}
      <motion.div
        className="pointer-events-none fixed z-50 hidden rounded-full bg-luxury-gold lg:block"
        style={{
          left: cursorXSpring,
          top: cursorYSpring,
          width: 6,
          height: 6,
          x: size / 2 - 3,
          y: size / 2 - 3,
        }}
      />
    </>
  );
}

/**
 * InteractiveCursor Component
 * 
 * Advanced cursor yang bereaksi terhadap hoverable elements
 */
export function InteractiveCursor({
  size = 32,
  damping = 25,
  stiffness = 700,
}: CustomCursorProps) {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const cursorSize = useMotionValue(size);

  const springConfig = { damping, stiffness };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);
  const cursorSizeSpring = useSpring(cursorSize, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - size / 2);
      cursorY.set(e.clientY - size / 2);

      // Check if hovering over interactive elements
      const target = e.target as HTMLElement;
      const isInteractive = 
        target.tagName === "A" || 
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button");

      // Grow cursor on hover
      cursorSize.set(isInteractive ? size * 1.5 : size);
    };

    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY, cursorSize, size]);

  return (
    <motion.div
      className="pointer-events-none fixed z-50 hidden rounded-full border border-luxury-gold/40 bg-luxury-gold/10 backdrop-blur-sm lg:block"
      style={{
        left: cursorXSpring,
        top: cursorYSpring,
        width: cursorSizeSpring,
        height: cursorSizeSpring,
      }}
    />
  );
}