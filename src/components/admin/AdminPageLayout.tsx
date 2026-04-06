"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

export type AdminPageLayoutProps = {
  /** Status / scope label shown as a pill on the right in detail headers (e.g. "Admin") */
  eyebrow?: string;
  /** Main page title */
  title: string;
  /** Optional short description below title */
  description?: string;
  /** Optional icon beside the title (detail header with `leading` only) */
  titleIcon?: ReactNode;
  /** Optional block on the left of the title row (e.g. back navigation) */
  leading?: ReactNode;
  /** Optional actions (buttons, tabs) on the right side of the header */
  actions?: ReactNode;
  /** Page content */
  children: ReactNode;
  /** If true, content area has no extra vertical padding (for custom full-bleed content) */
  noContentPadding?: boolean;
  /**
   * If true, header and main content span the full width (horizontal padding only).
   * Default keeps a centered max-w-7xl column for list-style admin pages.
   */
  fluid?: boolean;
};

function AdminHeaderStatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "border border-luxury-gold/40 bg-luxury-gold/[0.18]",
        "px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-luxury-gold",
        "shadow-[0_0_28px_-10px_rgba(232,197,71,0.55)] ring-1 ring-luxury-gold/15",
        "sm:px-4 sm:py-1.5 sm:text-[11px] sm:tracking-[0.22em]",
        "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        "hover:border-luxury-gold/55 hover:bg-luxury-gold/[0.24] hover:shadow-[0_0_32px_-10px_rgba(232,197,71,0.5)]"
      )}
    >
      {children}
    </span>
  );
}

function DetailHeaderTitleBlock({
  title,
  description,
  titleIcon,
  eyebrow,
}: {
  title: string;
  description?: string;
  titleIcon?: ReactNode;
  eyebrow: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-3 sm:items-center sm:gap-5 lg:gap-8">
      {titleIcon ? (
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-luxury-gold/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mt-0 sm:h-10 sm:w-10 sm:rounded-xl"
          aria-hidden
        >
          {titleIcon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1 space-y-2 sm:space-y-2.5">
        <h1 className="text-lg font-bold leading-snug tracking-tight text-white sm:text-xl md:text-2xl lg:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="text-[0.8125rem] leading-relaxed text-white/62 sm:text-sm sm:text-white/65 md:text-[1.0625rem] md:leading-relaxed md:text-white/68">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 self-center pl-1 sm:pl-3 md:pl-4">
        <AdminHeaderStatusBadge>{eyebrow}</AdminHeaderStatusBadge>
      </div>
    </div>
  );
}

/**
 * Shared admin page shell: header strip + scrollable content.
 * Matches QrPreviewLayout structure for consistency across Dashboard, Products, Logs, etc.
 */
export function AdminPageLayout({
  eyebrow = "Admin",
  title,
  description,
  titleIcon,
  leading,
  actions,
  children,
  noContentPadding = false,
  fluid = false,
}: AdminPageLayoutProps) {
  const shellX =
    fluid === true
      ? "w-full max-w-full pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:pl-6 sm:pr-6 lg:pl-8 lg:pr-8 xl:pl-10 xl:pr-10 2xl:pl-12 2xl:pr-12"
      : "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

  const detailHeader = Boolean(leading);

  return (
    <div className="flex h-[calc(100vh-3.25rem-env(safe-area-inset-top,0px))] min-h-0 flex-col overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent supports-[height:100svh]:h-[calc(100svh-3.25rem-env(safe-area-inset-top,0px))] supports-[height:100dvh]:h-[calc(100dvh-3.25rem-env(safe-area-inset-top,0px))] sm:h-[calc(100vh-3.5rem-env(safe-area-inset-top,0px))] sm:supports-[height:100svh]:h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] sm:supports-[height:100dvh]:h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))]">
      <header
        className={clsx(
          "flex-shrink-0 border-b border-white/[0.08] backdrop-blur-md",
          "bg-gradient-to-b from-white/[0.05] via-black/35 to-black/45",
          "shadow-[0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.2)]"
        )}
      >
        <div className={shellX}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={clsx(
              "flex justify-between",
              detailHeader
                ? "flex-col gap-4 py-4 sm:flex-row sm:items-center sm:gap-8 sm:py-5 md:py-6"
                : "flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-8 sm:py-8"
            )}
          >
            <div
              className={clsx(
                "flex min-w-0 flex-1",
                detailHeader
                  ? "flex-col gap-4 sm:flex-row sm:items-center sm:gap-8"
                  : "flex-col gap-5 sm:flex-row sm:items-start sm:gap-0"
              )}
            >
              {leading ? (
                <div className="flex min-w-0 shrink-0 justify-start">
                  <div className="w-fit max-w-full rounded-xl bg-white/[0.04] p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] sm:p-2">
                    {leading}
                  </div>
                </div>
              ) : null}
              <div
                className={clsx(
                  "min-w-0 flex-1",
                  leading
                    ? "pl-0 sm:border-l sm:border-white/[0.1] sm:pl-6 md:pl-8 lg:pl-10"
                    : ""
                )}
              >
                {detailHeader ? (
                  <DetailHeaderTitleBlock
                    title={title}
                    description={description}
                    titleIcon={titleIcon}
                    eyebrow={eyebrow}
                  />
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                      {eyebrow}
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl sm:pr-4">
                      {title}
                    </h1>
                    {description ? (
                      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/58 sm:text-[15px] sm:leading-relaxed">
                        {description}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {actions ? (
              <div
                className={clsx(
                  "flex flex-shrink-0 items-center justify-center gap-2 sm:justify-end sm:gap-3",
                  detailHeader ? "sm:pl-2" : "sm:pt-1"
                )}
              >
                {actions}
              </div>
            ) : null}
          </motion.div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-admin">
        <div
          className={`${shellX} ${noContentPadding ? "" : "py-5 sm:py-6"} pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
