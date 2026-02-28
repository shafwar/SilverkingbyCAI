"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type QrPreviewLayoutProps = {
  children: React.ReactNode;
};

export function QrPreviewLayout({ children }: QrPreviewLayoutProps) {
  const pathname = usePathname();
  const isPage1 = pathname === "/admin/qr-preview" || pathname.endsWith("/qr-preview");
  const isPage2 = pathname.includes("/qr-preview/page2");

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
      {/* Header: title + segmented switcher */}
      <header className="flex-shrink-0 border-b border-white/[0.06] bg-black/20 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                Pratinjau QR
              </h1>
              <p className="mt-0.5 text-xs text-white/50 sm:text-sm">
                Aset QR produk — Page 1: satuan, Page 2: batch gram
              </p>
            </div>
            <nav
              className="flex items-center gap-0 rounded-xl border border-white/10 bg-white/5 p-1 shadow-inner"
              aria-label="Pilih halaman"
            >
              <Link
                href="/admin/qr-preview"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:px-5 ${
                  isPage1
                    ? "bg-white text-black shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                Page 1
              </Link>
              <Link
                href="/admin/qr-preview/page2"
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:px-5 ${
                  isPage2
                    ? "bg-white text-black shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                Page 2
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-admin">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
