"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

export type AdminPageLayoutProps = {
  /** Small label above title (e.g. "Admin") */
  eyebrow?: string;
  /** Main page title */
  title: string;
  /** Optional short description below title */
  description?: string;
  /** Optional actions (buttons, tabs) on the right side of the header */
  actions?: ReactNode;
  /** Page content */
  children: ReactNode;
  /** If true, content area has no extra vertical padding (for custom full-bleed content) */
  noContentPadding?: boolean;
};

/**
 * Shared admin page shell: header strip + scrollable content.
 * Matches QrPreviewLayout structure for consistency across Dashboard, Products, Logs, etc.
 */
export function AdminPageLayout({
  eyebrow = "Admin",
  title,
  description,
  actions,
  children,
  noContentPadding = false,
}: AdminPageLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
      <header className="flex-shrink-0 border-b border-white/[0.08] bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
                {eyebrow}
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl truncate">
                {title}
              </h1>
              {description && (
                <p className="text-xs text-white/50 max-w-2xl">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-admin">
        <div
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${
            noContentPadding ? "" : "py-5 sm:py-6"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
