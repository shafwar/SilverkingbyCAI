"use client";

import { forwardRef, type ReactNode } from "react";
import { motion } from "framer-motion";

/** next-intl returns the dotted key when a message is missing — don't render that in UI. */
export function isHeroCopyLine(value?: string | null): value is string {
  if (!value?.trim()) return false;
  if (/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+){2,}$/.test(value.trim())) return false;
  return true;
}

export type MerchStyleHeroCopyProps = {
  title: string;
  titleBold?: string;
  subtitle: string;
  secondarySubtitle?: string;
  tagline?: string;
  children?: ReactNode;
  /** upper = copy below navbar, leaves center/bottom for busy hero backgrounds. */
  layout?: "center" | "upper";
  className?: string;
};

/**
 * Centered hero title + description — same layout as MerchandisePageClient hero copy.
 */
export const MerchStyleHeroCopy = forwardRef<HTMLDivElement, MerchStyleHeroCopyProps>(
  function MerchStyleHeroCopy(
    {
      title,
      titleBold,
      subtitle,
      secondarySubtitle,
      tagline,
      children,
      layout = "center",
      className = "",
    },
    ref
  ) {
    const showSecondary = isHeroCopyLine(secondarySubtitle);
    const showTagline = isHeroCopyLine(tagline);
    const isUpper = layout === "upper";

    return (
      <div
        ref={ref}
        className={[
          "relative z-10 flex w-full flex-col items-center px-6 text-center",
          isUpper
            ? "min-h-[100dvh] justify-start pt-[max(6.5rem,calc(env(safe-area-inset-top)+5.25rem))] pb-[max(7rem,calc(env(safe-area-inset-bottom)+5.5rem))]"
            : "min-h-[100dvh] justify-center pb-[max(5rem,env(safe-area-inset-bottom))] pt-[max(5rem,env(safe-area-inset-top))]",
          className,
        ].join(" ")}
      >
        <div className="mx-auto w-full max-w-2xl rounded-2xl px-2 sm:px-4">
          <motion.h1
            className="text-4xl font-semibold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] md:text-5xl lg:text-6xl xl:text-7xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-luxury-gold">{title}</span>
            {titleBold ? (
              <>
                <br />
                <span className="text-white">{titleBold}</span>
              </>
            ) : null}
          </motion.h1>
          {isHeroCopyLine(subtitle) ? (
            <motion.p
              className="mt-5 max-w-2xl text-center text-base font-semibold leading-snug text-white/95 drop-shadow-md sm:mt-6 sm:text-lg md:text-xl lg:text-2xl"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              {subtitle}
            </motion.p>
          ) : null}
          {showSecondary ? (
            <motion.p
              className="mt-1 max-w-2xl text-center text-base font-medium leading-snug text-white/90 drop-shadow-md sm:text-lg md:text-xl lg:text-2xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {secondarySubtitle}
            </motion.p>
          ) : null}
          {showTagline ? (
            <motion.p
              className="mt-2 text-center text-sm font-medium tracking-wide text-luxury-silver/95 drop-shadow sm:mt-3 sm:text-base md:text-lg"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {tagline}
            </motion.p>
          ) : null}
          {children ? (
            <motion.div
              className="mt-8 flex w-full max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          ) : null}
        </div>
      </div>
    );
  }
);
