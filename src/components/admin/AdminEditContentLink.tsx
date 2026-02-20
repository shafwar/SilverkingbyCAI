"use client";

import Link from "next/link";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { FileText } from "lucide-react";

type AdminEditContentLinkProps = {
  /** Page name matching Admin → Content (e.g. home, what-we-do, authenticity, products, distributor, about) */
  pageName: string;
  /** Optional: label override. Default: "Edit content" */
  label?: string;
  /** Optional: className for the wrapper/button */
  className?: string;
};

/**
 * Renders a fixed "Edit content" link to Admin → Content for this page, only when user is admin.
 * Place once per page (home, what-we-do, authenticity, products, distributor, about).
 */
export function AdminEditContentLink({
  pageName,
  label = "Edit content",
  className = "",
}: AdminEditContentLinkProps) {
  const isAdmin = useIsAdmin();

  if (!isAdmin) return null;

  return (
    <Link
      href={`/admin/content?page=${encodeURIComponent(pageName)}`}
      className={
        className ||
        "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-white/25 bg-black/70 px-4 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition hover:border-luxury-gold/50 hover:bg-black/90 hover:text-luxury-gold"
      }
      title={label}
    >
      <FileText className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
