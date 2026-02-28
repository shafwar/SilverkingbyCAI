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
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent">
      {/* Header: section title + nav tabs */}
      <header className="flex-shrink-0 border-b border-white/[0.08] bg-black/30 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
                Admin
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Pratinjau QR
              </h1>
              <p className="text-xs text-white/50">
                Kelola dan unduh aset QR produk
              </p>
            </div>
            <nav
              className="flex rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-inner"
              aria-label="Pilih tipe produk"
            >
              <Link
                href="/admin/qr-preview"
                className={`flex flex-col rounded-xl px-5 py-3 text-left transition-all sm:min-w-[140px] ${
                  isPage1
                    ? "bg-white text-black shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-sm font-semibold">Produk Satuan</span>
                <span className={`mt-0.5 text-[10px] ${isPage1 ? "text-black/60" : "text-white/50"}`}>
                  QR per item
                </span>
              </Link>
              <Link
                href="/admin/qr-preview/page2"
                className={`flex flex-col rounded-xl px-5 py-3 text-left transition-all sm:min-w-[140px] ${
                  isPage2
                    ? "bg-white text-black shadow-sm"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-sm font-semibold">Batch Gram</span>
                <span className={`mt-0.5 text-[10px] ${isPage2 ? "text-black/60" : "text-white/50"}`}>
                  Batch per gramasi
                </span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-admin">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
