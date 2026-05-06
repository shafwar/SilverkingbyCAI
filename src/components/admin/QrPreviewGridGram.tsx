"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import { Modal } from "./Modal";
import {
  Search,
  X,
  Grid3x3,
  Table2,
  Filter,
  Download,
  Maximize2,
  RefreshCw,
  FileText,
  CheckCircle2,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { SERTICARD_VARIANTS } from "@/utils/serticard-templates";
import { templateSelectToApiBody } from "@/utils/serticard-template-select";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";
import {
  mergeZipVerificationSummaries,
  zipVerificationSummaryFromHttpHeaders,
  type ZipVerificationSummary,
} from "@/lib/serticard-zip-verification";
import {
  readZipBackgroundTask,
  subscribeZipBackgroundTask,
  writeZipBackgroundTask,
} from "@/lib/zip-background-task-store";

const ZIP_CHUNK_SIZE = 80;

function parseErrorResponse(text: string, status: number): string {
  if (!text || text.trim() === "") return `Gagal mengunduh (${status}). Silakan coba lagi.`;
  if (text.trimStart().startsWith("<"))
    return "Server sibuk atau terjadi kesalahan. Silakan coba lagi nanti.";
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    if (j && typeof j.message === "string" && j.message.trim()) return j.message.trim();
    if (j && typeof j.error === "string" && j.error.trim()) return j.error.trim();
  } catch {
    // ignore
  }
  if (text.length > 300) return `Gagal mengunduh (${status}). Silakan coba lagi.`;
  return text;
}

/** ZIP magic bytes: PK (0x50 0x4B) */
async function isZipBlob(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false;
  const buf = await blob.slice(0, 2).arrayBuffer();
  const bytes = new Uint8Array(buf);
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function deriveR2KeyFromUrl(downloadUrl: string): string | null {
  try {
    const u = new URL(downloadUrl);
    return u.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
}

/** Query `_skcb` memaksa browser mengambil byte terbaru dari R2 untuk URL publik yang sama. */
function withZipDownloadCacheBust(url: string, bustMs: number): string {
  if (!url || typeof bustMs !== "number" || !Number.isFinite(bustMs)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("_skcb", String(Math.floor(bustMs)));
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}_skcb=${encodeURIComponent(String(Math.floor(bustMs)))}`;
  }
}

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

type GramPreviewBatch = {
  batchId: number;
  name: string;
  weight: number;
  weightGroup: string | null;
  itemCount: number;
  firstItem: {
    id: number;
    uniqCode: string;
    serialCode: string;
    qrImageUrl: string;
    hasRootKey: boolean;
    rootKey?: string | null;
  };
  allItems: Array<{
    id: number;
    uniqCode: string;
    serialCode: string;
    qrImageUrl: string;
    hasRootKey: boolean;
    rootKey?: string | null;
  }>;
};

type Props = {
  batches: GramPreviewBatch[];
};

export function QrPreviewGridGram({ batches }: Props) {
  const t = useTranslations("admin.qrPreviewDetail");
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutView, setLayoutView] = useState<"table" | "grid">("table");
  const [weightFilter, setWeightFilter] = useState<"ALL" | "SMALL" | "LARGE">("ALL");
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<GramPreviewBatch | null>(null);
  const [batchItems, setBatchItems] = useState<
    Array<{ id: number; serialCode: string; uniqCode: string; rootKey: string | null }>
  >([]);
  const [selectedQrItem, setSelectedQrItem] = useState<{ name: string; uniqCode: string } | null>(
    null
  );
  const [loadingBatchItems, setLoadingBatchItems] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState<number | null>(null);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);
  const downloadModalRef = useRef<HTMLDivElement>(null);
  const [isDownloadingBatchZip, setIsDownloadingBatchZip] = useState(false);
  const [downloadingZipBatchId, setDownloadingZipBatchId] = useState<number | null>(null);
  const [selectedZipTemplateId, setSelectedZipTemplateId] = useState<string>("01");
  const [zipProgress, setZipProgress] = useState<{ percent: number; label: string } | null>(null);
  const [zipDownloadResult, setZipDownloadResult] = useState<{
    batchId: number;
    product_title: string;
    product_id: string;
    rootkey: string | null;
    download_url?: string;
    total_files: number;
    cached?: boolean;
    cacheKey?: string;
    /** Timestamp ms saat link diambil — dipakai untuk cache-bust URL unduhan (selalu file terbaru). */
    linkBustMs?: number;
    /** Jika chunked: beberapa ZIP (batch 1, 2, ...) masing-masing 100 file */
    downloads?: Array<{
      batchIndex: number;
      totalBatches: number;
      download_url: string;
      r2Key?: string;
      fileCount: number;
      product_title?: string;
      product_id?: string;
      rootkey?: string | null;
    }>;
  } | null>(null);
  const [zipR2Status, setZipR2Status] = useState<
    Record<
      string,
      { exists: boolean | null; downloadedCount: number; lastDownloadedAt: string | null }
    >
  >({});
  const [zipR2StatusLoading, setZipR2StatusLoading] = useState(false);
  const [selectedSingleTemplateId, setSelectedSingleTemplateId] = useState<string>("01");
  /** Increment saat tombol segarkan modal / buka ulang agar zip-ready di-fetch ulang dari server. */
  const [zipReadyRefreshNonce, setZipReadyRefreshNonce] = useState(0);
  const [zipReadyListFetching, setZipReadyListFetching] = useState(false);
  const [zipPurgeBusy, setZipPurgeBusy] = useState(false);
  /** Membatalkan fetch ZIP (modal kartu + modal serial) saat user memilih batal. */
  const zipCompileAbortRef = useRef<AbortController | null>(null);
  const zipAbortReasonRef = useRef<"cancel" | "refresh" | null>(null);

  const abortZipCompileWithoutConfirm = (reason: "cancel" | "refresh") => {
    zipAbortReasonRef.current = reason;
    zipCompileAbortRef.current?.abort();
    zipCompileAbortRef.current = null;
    setDownloadingZipBatchId(null);
    setIsDownloadingBatchZip(false);
    setZipProgress(null);
  };

  const confirmCancelZipCompile = () => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin membatalkan? Proses ZIP di sini akan dihentikan dan tidak akan dilanjutkan."
      )
    ) {
      return;
    }
    abortZipCompileWithoutConfirm("cancel");
  };

  /** Segarkan: kosongkan daftar siap unduh, hentikan ZIP yang sedang jalan, ambil ulang dari server. */
  const handleModalZipRefresh = () => {
    if (zipCompileAbortRef.current) {
      abortZipCompileWithoutConfirm("refresh");
    }
    setZipDownloadResult(null);
    setZipR2Status({});
    setZipReadyRefreshNonce((n) => n + 1);
    router.refresh();
  };

  /** Hapus ZIP di R2 + cache DB untuk signature ini (admin mulai dari awal). */
  const handleModalZipPurge = async () => {
    const ck = zipDownloadResult?.cacheKey;
    if (!ck) {
      toast.error("Tidak ada cache ZIP untuk dihapus.");
      return;
    }
    if (
      !window.confirm(
        "Hapus semua file ZIP terkait di penyimpanan (R2), kosongkan cache server, dan reset riwayat unduhan untuk kombinasi batch + template ini? Anda harus membuat ZIP ulang setelah ini."
      )
    ) {
      return;
    }
    setZipPurgeBusy(true);
    try {
      const res = await fetch("/api/qr/zip-storage-purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cacheKey: ck }),
      });
      const text = await res.text();
      let json: { ok?: boolean; message?: string; error?: string; r2DeleteErrors?: string[] } = {};
      try {
        json = text ? (JSON.parse(text) as typeof json) : {};
      } catch {
        // ignore
      }
      if (!res.ok) {
        toast.error(json.message || json.error || `Gagal menghapus (${res.status}).`);
        return;
      }
      if (Array.isArray(json.r2DeleteErrors) && json.r2DeleteErrors.length > 0) {
        toast.message(
          "Cache dihapus. Sebagian file R2 mungkin gagal dihapus; cek log server atau coba lagi."
        );
      } else {
        toast.success(json.message || "ZIP di R2 dan cache berhasil dikosongkan.");
      }
      if (zipCompileAbortRef.current) {
        abortZipCompileWithoutConfirm("refresh");
      }
      setZipDownloadResult(null);
      setZipR2Status({});
      setZipReadyRefreshNonce((n) => n + 1);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus ZIP.");
    } finally {
      setZipPurgeBusy(false);
    }
  };

  useEffect(() => {
    setSelectedZipTemplateId((v) => (typeof v === "string" && v.startsWith("cms:") ? "01" : v));
    setSelectedSingleTemplateId((v) => (typeof v === "string" && v.startsWith("cms:") ? "01" : v));
  }, []);

  // Reflect global background ZIP task in page UI when user is in Batch Gram.
  useEffect(() => {
    const sync = () => {
      const task = readZipBackgroundTask();
      if (!task) return;
      setDownloadingZipBatchId(task.batchId);
      setZipProgress({
        percent: Math.round(task.progressPercent),
        label: task.progressLabel || "ZIP diproses di background...",
      });
      if (task.status === "completed") {
        setZipDownloadResult({
          batchId: task.batchId,
          product_title: task.batchName,
          product_id: String(task.batchId),
          rootkey: null,
          ...(task.download_url ? { download_url: task.download_url } : {}),
          total_files: task.totalFiles ?? 0,
          cacheKey: task.cacheKey,
          linkBustMs: Date.now(),
          ...(Array.isArray(task.downloads) && task.downloads.length > 0
            ? {
                downloads: task.downloads.map((d) => ({
                  ...d,
                  fileCount: d.fileCount ?? 0,
                  r2Key: d.r2Key,
                })),
              }
            : {}),
        });
      }
      if (task.status === "failed") {
        setDownloadingZipBatchId(null);
      }
    };
    sync();
    return subscribeZipBackgroundTask(sync);
  }, []);

  // Fetch serticard config to check for custom template
  const { data: fontConfig, mutate: mutateFontConfig } = useSWR<{
    customFrontR2Key: string | null;
    customBackR2Key: string | null;
    customTemplateDropdownLabel?: string | null;
  }>("/api/admin/serticard/config", fetcher, {
    revalidateOnFocus: false,
  });
  const hasCustomTemplate = fontConfig?.customFrontR2Key && fontConfig?.customBackR2Key;
  const customTemplateSelectLabel = (() => {
    const raw = fontConfig?.customTemplateDropdownLabel?.trim();
    if (raw) return `✨ ${raw}`;
    return "✨ Custom";
  })();

  // Listen for config updates from SerticardPanel
  useEffect(() => {
    const handleConfigUpdate = () => {
      mutateFontConfig();
    };
    window.addEventListener("serticard-config-updated", handleConfigUpdate);
    return () => window.removeEventListener("serticard-config-updated", handleConfigUpdate);
  }, [mutateFontConfig]);

  // Real-time status dari R2 + audit "pernah diunduh" (global, server-side)
  useEffect(() => {
    const cacheKey = zipDownloadResult?.cacheKey;
    const downloads = zipDownloadResult?.downloads;
    if (!cacheKey || !downloads || downloads.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        setZipR2StatusLoading(true);
        const res = await fetch(`/api/qr/zip-status?cacheKey=${encodeURIComponent(cacheKey)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          items: Array<{
            r2Key: string;
            exists: boolean | null;
            downloadedCount: number;
            lastDownloadedAt: string | null;
          }>;
        };
        if (cancelled) return;
        const map: Record<
          string,
          { exists: boolean | null; downloadedCount: number; lastDownloadedAt: string | null }
        > = {};
        for (const it of json.items || []) {
          map[it.r2Key] = {
            exists: it.exists ?? null,
            downloadedCount: it.downloadedCount ?? 0,
            lastDownloadedAt: it.lastDownloadedAt ?? null,
          };
        }
        setZipR2Status(map);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setZipR2StatusLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [zipDownloadResult?.cacheKey, zipDownloadResult?.downloads?.length]);

  // Saat modal ZIP dibuka / template diganti / tombol segarkan: selalu ambil ulang metadata zip-ready (bukan state lama).
  useEffect(() => {
    if (downloadDropdownOpen == null) return;
    const batch = batches.find((b) => b.batchId === downloadDropdownOpen);
    if (!batch) return;

    setZipDownloadResult(null);
    setZipR2Status({});

    let cancelled = false;
    setZipReadyListFetching(true);
    (async () => {
      try {
        const tpl = templateSelectToApiBody(selectedZipTemplateId);
        const cmsQ =
          tpl.cmsTemplateId != null ? `&cmsTemplateId=${encodeURIComponent(String(tpl.cmsTemplateId))}` : "";
        const res = await fetch(
          `/api/qr/zip-ready?batchId=${batch.batchId}&templateVariant=${encodeURIComponent(String(tpl.templateVariant))}&useCustom=${tpl.useCustomTemplate ? "1" : "0"}${cmsQ}&_nonce=${encodeURIComponent(String(zipReadyRefreshNonce))}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!json || json.cached !== true || json.success !== true) return;
        const url = json.download_url ?? json.downloadUrl;
        const downloads = json.downloads;
        if (!url && (!Array.isArray(downloads) || downloads.length === 0)) return;
        if (cancelled) return;
        const linkBustMs = Date.now();
        setZipDownloadResult({
          batchId: batch.batchId,
          product_title: json.product_title ?? batch.name,
          product_id: json.product_id ?? String(batch.batchId),
          rootkey: json.rootkey ?? null,
          ...(url ? { download_url: url } : {}),
          total_files: json.total_files ?? json.fileCount ?? batch.itemCount,
          cached: true,
          cacheKey: typeof json.cacheKey === "string" ? json.cacheKey : undefined,
          linkBustMs,
          ...(Array.isArray(downloads) && downloads.length > 0
            ? {
                downloads: downloads.map((d: any) => ({
                  ...d,
                  r2Key:
                    (typeof d.r2Key === "string" && d.r2Key.trim() !== ""
                      ? d.r2Key
                      : null) ??
                    (typeof d.download_url === "string"
                      ? deriveR2KeyFromUrl(d.download_url)
                      : null) ??
                    undefined,
                  fileCount: d.fileCount ?? 0,
                })),
              }
            : {}),
        });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setZipReadyListFetching(false);
      }
    })();

    return () => {
      cancelled = true;
      setZipReadyListFetching(false);
    };
  }, [downloadDropdownOpen, batches, selectedZipTemplateId, zipReadyRefreshNonce]);

  // Close modal when clicking outside (backdrop); jangan tutup jika klik di dalam modal card
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (downloadModalRef.current?.contains(target)) return;
      if (downloadDropdownRef.current?.contains(target)) return;
      setDownloadDropdownOpen(null);
      const task = readZipBackgroundTask();
      const isTaskRunning = task?.status === "pending" || task?.status === "processing";
      if (!isTaskRunning) {
        setZipDownloadResult(null);
        setZipProgress(null);
      }
    };

    if (downloadDropdownOpen !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [downloadDropdownOpen]);

  const filteredBatches = useMemo(() => {
    let result = batches;

    if (weightFilter !== "ALL") {
      result = result.filter(
        (b) => (b.weightGroup || "").toUpperCase() === weightFilter.toUpperCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const nameMatch = b.name.toLowerCase().includes(q);
        const codeMatch = b.firstItem.uniqCode.toLowerCase().includes(q);
        const weightMatch = b.weight.toString().includes(q);
        return nameMatch || codeMatch || weightMatch;
      });
    }

    return result;
  }, [batches, searchQuery, weightFilter]);

  const totalItems = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => sum + batch.itemCount, 0);
  }, [filteredBatches]);

  const handleSerialCodeClick = async (batch: GramPreviewBatch) => {
    setSelectedBatch(batch);
    setLoadingBatchItems(true);
    try {
      const response = await fetch(`/api/gram-products/batch/${batch.batchId}?includeItems=true`);
      if (response.ok) {
        const data = await response.json();
        setBatchItems(
          data.items.map((item: any) => ({
            id: item.id,
            serialCode: item.serialCode,
            uniqCode: item.uniqCode,
            rootKey: item.rootKey ?? null,
          }))
        );
      } else {
        console.error("Failed to fetch batch items");
        setBatchItems([]);
      }
    } catch (error) {
      console.error("Error fetching batch items:", error);
      setBatchItems([]);
    } finally {
      setLoadingBatchItems(false);
    }
  };

  const downloadZipBlob = async (response: Response, filename: string) => {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = async (
    product: {
      id: number;
      name: string;
      weight: number;
      uniqCode: string;
      serialCode?: string;
      qrImageUrl: string | null;
      weightGroup: string | null;
      hasRootKey?: boolean;
      rootKey?: string | null;
    },
    templateValue: string,
    options?: { includeRootKey?: boolean }
  ) => {
    if (!product) return;
    try {
      setDownloadingId(product.id);

      // Validate product data
      if (!product.name || product.name.trim().length === 0) {
        throw new Error("Product name is empty");
      }
      if (!product.uniqCode || product.uniqCode.trim().length === 0) {
        throw new Error("Unique code is empty");
      }

      const includeRootKey = options?.includeRootKey === true;
      const tpl = templateSelectToApiBody(templateValue);
      const body = {
        product: {
          id: product.id,
          name: product.name.trim(),
          // IMPORTANT: For page 2 we use uniqCode as serialCode (id)
          serialCode: product.uniqCode.trim().toUpperCase(),
          weight: product.weight,
          isGram: true,
          rootKey: includeRootKey ? (product.rootKey ?? undefined) : undefined,
        },
        templateVariant: tpl.templateVariant,
        useCustomTemplate: tpl.useCustomTemplate,
        ...(tpl.cmsTemplateId != null ? { cmsTemplateId: tpl.cmsTemplateId } : {}),
        includeRootKey,
      };

      console.log("[GramPreview] Sending download request:", body);

      const response = await fetch("/api/qr/download-single-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[GramPreview] Download single PDF failed:", {
          status: response.status,
          statusText: response.statusText,
          error: text,
        });
        throw new Error(parseErrorResponse(text, response.status));
      }

      // Validate blob
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${product.uniqCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log("[GramPreview] Serticard downloaded successfully:", link.download);
    } catch (error) {
      console.error("[GramPreview] handleDownloadSingle error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert(`Gagal mengunduh Serticard QR: ${errorMsg}`);
    } finally {
      setDownloadingId(null);
      setDownloadDropdownOpen(null);
    }
  };

  const handleDownloadOriginal = async (product: {
    id: number;
    name: string;
    weight: number;
    uniqCode: string;
    serialCode?: string;
    qrImageUrl: string | null;
    weightGroup: string | null;
    hasRootKey?: boolean;
  }) => {
    if (!product) return;
    try {
      setDownloadingId(product.id);

      // Validate data
      if (!product.uniqCode || product.uniqCode.trim().length === 0) {
        throw new Error("Product uniqCode is empty");
      }

      const uniqCode = encodeURIComponent(product.uniqCode.trim().toUpperCase());
      const downloadUrl = `/api/qr-gram/${uniqCode}/download-png`;

      console.log("[GramPreview] Downloading original QR from:", downloadUrl);

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Accept: "image/png",
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("[GramPreview] QR download failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: downloadUrl,
        });
        throw new Error(parseErrorResponse(errorText || "", response.status));
      }

      // Ensure response is image type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("image")) {
        throw new Error(`Invalid response type: ${contentType}. Expected image/png`);
      }

      const blob = await response.blob();

      // Validate blob size
      if (blob.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from header or use default format
      const contentDisposition = response.headers.get("content-disposition");
      let filename = `${product.uniqCode}_${product.name.replace(/\s+/g, "_")}.png`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log("[GramPreview] Original QR downloaded successfully:", filename);
    } catch (error) {
      console.error("[GramPreview] handleDownloadOriginal error:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      alert(`Gagal mengunduh QR original: ${errorMsg}`);
    } finally {
      setDownloadingId(null);
      setDownloadDropdownOpen(null);
    }
  };

  const handleRefresh = () => {
    try {
      setIsRefreshing(true);
      router.refresh();
    } catch (error) {
      console.error("[GramPreview] handleRefresh error:", error);
    } finally {
      // Beri sedikit waktu supaya animasi terasa natural
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const activeDownloadBatch = useMemo(
    () =>
      downloadDropdownOpen !== null
        ? (filteredBatches.find((b) => b.batchId === downloadDropdownOpen) ?? null)
        : null,
    [downloadDropdownOpen, filteredBatches]
  );

  // Download button: opens centered modal (no dropdown)
  const DownloadDropdown = ({
    batchId,
    batchName,
    batchWeight,
    itemCount,
    product,
    selectedZipTemplateId,
    setSelectedZipTemplateId,
    zipProgress,
  }: {
    batchId: number;
    batchName: string;
    batchWeight: number;
    itemCount: number;
    product: {
      id: number;
      name: string;
      weight: number;
      uniqCode: string;
      serialCode?: string;
      qrImageUrl: string | null;
      weightGroup: string | null;
      hasRootKey?: boolean;
      rootKey?: string | null;
    };
    selectedZipTemplateId: string;
    setSelectedZipTemplateId: (id: string) => void;
    zipProgress: { percent: number; label: string } | null;
  }) => {
    const isOpen = downloadDropdownOpen === batchId;
    const isLoading = downloadingId === product.id;
    const isZipLoading = downloadingZipBatchId === batchId;

    return (
      <div className="relative inline-block w-full">
        <button
          onClick={() => setDownloadDropdownOpen(isOpen ? null : batchId)}
          disabled={isLoading || isZipLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/90 transition hover:border-[#FFD700]/30 hover:bg-[#FFD700]/10 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {isZipLoading ? "ZIP..." : isLoading ? t("downloading") : t("download")}
          </span>
          <ChevronDown
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    );
  };

  const handleDownloadAll = async () => {
    if (!filteredBatches.length) return;
    try {
      setIsDownloadingAll(true);
      const batchIds = filteredBatches.map((b) => b.batchId);

      const response = await fetch("/api/gram-products/export-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchIds }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[GramPreview] Download Excel failed:", text);
        throw new Error("Failed to download Excel file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gram-products-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[GramPreview] handleDownloadAll error:", error);
      alert("Gagal mengunduh file Excel. Silakan coba lagi.");
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDownloadBatchSerticardsZip = async () => {
    if (!selectedBatch || batchItems.length === 0) return;
    const tpl = templateSelectToApiBody(selectedZipTemplateId);
    const products = batchItems.map((item) => ({
      id: item.id,
      name: selectedBatch.name,
      serialCode: item.uniqCode,
      weight: selectedBatch.weight,
      isGram: true,
      rootKey: item.rootKey ?? null,
    }));
    let compileAc: AbortController | null = null;
    try {
      setIsDownloadingBatchZip(true);
      setZipProgress({ percent: 0, label: "Mempersiapkan..." });
      zipCompileAbortRef.current?.abort();
      compileAc = new AbortController();
      zipCompileAbortRef.current = compileAc;
      const signal = compileAc.signal;

      const chunks: Array<{
        id: number;
        name: string;
        serialCode: string;
        weight: number;
        isGram: boolean;
        rootKey: string | null;
      }>[] = [];
      for (let i = 0; i < products.length; i += ZIP_CHUNK_SIZE) {
        chunks.push(products.slice(i, i + ZIP_CHUNK_SIZE));
      }
      const totalChunks = chunks.length;
      const blobs: Blob[] = [];
      const zipVerifyParts: ZipVerificationSummary[] = [];
      for (let i = 0; i < chunks.length; i++) {
        setZipProgress({
          percent: Math.round(((i + 0.5) / totalChunks) * 100),
          label: `Batch ${i + 1}/${totalChunks}...`,
        });
        const response = await fetch("/api/qr/download-multiple-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: chunks[i],
            templateVariant: tpl.templateVariant,
            useCustomTemplate: tpl.useCustomTemplate,
            includeRootKey: true,
            ...(tpl.cmsTemplateId != null ? { cmsTemplateId: tpl.cmsTemplateId } : {}),
          }),
          signal,
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(parseErrorResponse(text, response.status));
        }
        const ct = response.headers.get("content-type") || "";
        if (ct.includes("text/html") || ct.includes("application/json")) {
          const text = await response.text();
          throw new Error(parseErrorResponse(text, response.status));
        }
        const hdrSum = zipVerificationSummaryFromHttpHeaders(response.headers);
        if (hdrSum) zipVerifyParts.push(hdrSum);
        const blob = await response.blob();
        if (!(await isZipBlob(blob))) {
          throw new Error(
            `Batch ${i + 1}/${totalChunks} mengembalikan data bukan file ZIP (server error?). Coba batch lebih kecil atau coba lagi nanti.`
          );
        }
        blobs.push(blob);
      }
      setZipProgress({ percent: 98, label: "Menggabungkan file..." });
      const mainZip = new JSZip();
      for (let b = 0; b < blobs.length; b++) {
        try {
          const z = await JSZip.loadAsync(blobs[b]);
          const entries = Object.entries(z.files).filter(([, f]) => !f.dir);
          for (const [path, file] of entries) {
            mainZip.file(path, file.async("arraybuffer"));
          }
        } catch (zipErr) {
          const msg = zipErr instanceof Error ? zipErr.message : String(zipErr);
          throw new Error(
            `File ZIP batch ${b + 1} rusak atau tidak lengkap: ${msg}. Coba ukuran batch lebih kecil atau coba lagi nanti.`
          );
        }
      }
      const merged = await mainZip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(merged);
      const link = document.createElement("a");
      link.href = url;
      const safeName = selectedBatch.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      link.download = `${safeName || "batch"}-serticards-${products.length}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      const mergedV = mergeZipVerificationSummaries(zipVerifyParts);
      if (mergedV) {
        const ok = mergedV.items.length;
        const fail = mergedV.renderFailures.length;
        const warn = mergedV.warnings.length;
        if (fail > 0 && ok === 0) {
          toast.error("ZIP selesai tetapi tidak ada PDF yang lolos verifikasi buffer", {
            description: `Gagal: ${fail} · Peringatan: ${warn}. Buka SERTICARD-ZIP-VERIFICATION.json di dalam ZIP.`,
            duration: 14_000,
          });
        } else if (fail > 0) {
          toast.warning("ZIP diunduh — sebagian PDF gagal verifikasi / tidak masuk ZIP", {
            description: `Lulus: ${ok} · Gagal: ${fail} · Peringatan: ${warn}. Lihat JSON verifikasi di dalam ZIP.`,
            duration: 12_000,
          });
        } else if (warn > 0) {
          toast.message("ZIP diunduh", {
            description: `${ok} PDF terverifikasi · ${warn} peringatan (mis. root key).`,
            duration: 8000,
          });
        } else if (ok > 0) {
          toast.success(`ZIP Serticard: ${ok} PDF terverifikasi`, { duration: 6000 });
        }
      } else {
        toast.success(`ZIP Serticard batch (${products.length} item) diunduh`, { duration: 5000 });
      }
    } catch (error) {
      if (isAbortError(error)) {
        if (zipAbortReasonRef.current === "refresh") {
          toast.message("Memuat ulang daftar ZIP dari server…");
        } else {
          toast.message("Proses ZIP dibatalkan.");
        }
        zipAbortReasonRef.current = null;
        return;
      }
      console.error("[GramPreview] handleDownloadBatchSerticardsZip error:", error);
      alert(
        error instanceof Error ? error.message : "Gagal mengunduh ZIP Serticard. Silakan coba lagi."
      );
    } finally {
      if (compileAc != null && zipCompileAbortRef.current === compileAc) {
        zipCompileAbortRef.current = null;
      }
      setIsDownloadingBatchZip(false);
      setZipProgress(null);
    }
  };

  const handleDownloadBatchAsZipFromCard = async (
    batchId: number,
    name: string,
    weight: number,
    itemCount: number
  ) => {
    const tpl = templateSelectToApiBody(selectedZipTemplateId);
    let compileAc: AbortController | null = null;
    try {
      setZipDownloadResult(null);
      setDownloadingZipBatchId(batchId);
      setZipProgress({ percent: 0, label: "Mengambil data batch..." });
      zipCompileAbortRef.current?.abort();
      compileAc = new AbortController();
      zipCompileAbortRef.current = compileAc;
      const signal = compileAc.signal;

      const res = await fetch(`/api/gram-products/batch/${batchId}?includeItems=true`, { signal });
      if (!res.ok) throw new Error("Gagal mengambil data item batch");
      const data = await res.json();
      const items = data.items ?? [];
      if (items.length === 0) {
        setZipProgress(null);
        alert("Tidak ada item di batch ini.");
        return;
      }
      const products = items.map(
        (item: { id: number; uniqCode: string; rootKey?: string | null }) => ({
          id: item.id,
          name,
          serialCode: item.uniqCode,
          weight,
          isGram: true,
          rootKey: item.rootKey ?? null,
        })
      );
      const itemCountLabel = products.length > 1 ? ` (${products.length} item)` : "";
      setZipProgress({ percent: 15, label: `Menyiapkan ZIP${itemCountLabel}...` });
      let response: Response;
      try {
        response = await fetch("/api/qr/download-multiple-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products,
            batchId,
            productTitle: name,
            templateVariant: tpl.templateVariant,
            useCustomTemplate: tpl.useCustomTemplate,
            includeRootKey: true,
            ...(tpl.cmsTemplateId != null ? { cmsTemplateId: tpl.cmsTemplateId } : {}),
          }),
          signal,
        });
      } catch (networkErr) {
        if (isAbortError(networkErr)) throw networkErr;
        throw new Error("Koneksi gagal. Periksa jaringan dan coba lagi.");
      }
      if (!response.ok) {
        const text = await response.text();
        const status = response.status;
        if (status === 524) {
          throw new Error(
            "Server timeout. Batch ini akan diproses di background. Silakan coba lagi dalam beberapa saat."
          );
        }
        throw new Error(parseErrorResponse(text, status));
      }
      setZipProgress({ percent: 25, label: "Memproses respons..." });
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json = await response.json();
        const url = json.download_url ?? json.downloadUrl;
        const downloads = json.downloads;
        if ((url || (downloads && downloads.length > 0)) && json.success) {
          setZipDownloadResult({
            batchId,
            product_title: json.product_title ?? name,
            product_id: json.product_id ?? String(batchId),
            rootkey: json.rootkey ?? null,
            ...(url ? { download_url: url } : {}),
            total_files: json.total_files ?? json.fileCount ?? products.length,
            cached: json.cached === true,
            cacheKey: typeof json.cacheKey === "string" ? json.cacheKey : undefined,
            linkBustMs: Date.now(),
            ...(Array.isArray(downloads) && downloads.length > 0
              ? {
                  downloads: downloads.map((d: any) => ({
                    ...d,
                    r2Key:
                      (typeof d.r2Key === "string" && d.r2Key.trim() !== ""
                        ? d.r2Key
                        : null) ?? (typeof d.download_url === "string" ? deriveR2KeyFromUrl(d.download_url) : null) ??
                      undefined,
                    fileCount: d.fileCount ?? 0,
                  })),
                }
              : {}),
          });
          setZipProgress(null);
          return;
        }
        // Background job: persist task globally; polling + auto-download handled by ZipBackgroundRunner (DownloadCard).
        if (json.jobId != null && json.status === "pending") {
          const initialLabel =
            products.length > 500
              ? `ZIP ${products.length} file diproses di background (bisa 10–20 menit)...`
              : "ZIP diproses di background. Anda bisa tutup modal dan lanjut kerja.";
          writeZipBackgroundTask({
            jobId: Number(json.jobId),
            batchId,
            batchName: name,
            templateId: selectedZipTemplateId,
            cacheKey: typeof json.cacheKey === "string" ? json.cacheKey : undefined,
            status: "pending",
            progressPercent: 35,
            progressLabel: initialLabel,
            totalFiles: products.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          setZipProgress({ percent: 35, label: initialLabel });
          toast.message("ZIP berjalan di background. Progress ada di floating card.");
          return;
        }
        throw new Error(json.error || json.message || "Response tidak valid");
      }
      setZipProgress({ percent: 95, label: "Mengunduh file..." });
      const blob = await response.blob();
      if (!(await isZipBlob(blob))) {
        const text = await response.text().catch(() => "");
        throw new Error(parseErrorResponse(text || "Bukan file ZIP", response.status));
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
      link.download = `${safeName || "batch"}-serticards-${products.length}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setDownloadDropdownOpen(null);
    } catch (error) {
      if (isAbortError(error)) {
        if (zipAbortReasonRef.current === "refresh") {
          toast.message("Memuat ulang daftar ZIP dari server…");
        } else {
          toast.message("Proses ZIP dibatalkan.");
        }
        zipAbortReasonRef.current = null;
        return;
      }
      console.error("[GramPreview] handleDownloadBatchAsZipFromCard error:", error);
      alert(
        error instanceof Error ? error.message : "Gagal mengunduh ZIP Serticard. Silakan coba lagi."
      );
    } finally {
      if (compileAc != null && zipCompileAbortRef.current === compileAc) {
        zipCompileAbortRef.current = null;
      }
      setDownloadingZipBatchId(null);
      setZipProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header: judul + total aset */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6 backdrop-blur-sm"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-white/40">
              {t("eyebrow")}
            </p>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {t("description")}
              {totalItems > 0 && (
                <span className="ml-1 text-[#FFD700]/80">
                  {totalItems} {totalItems === 1 ? t("item") : t("items")}.
                </span>
              )}
            </p>
          </div>

          {totalItems > 0 && (
            <div className="flex flex-col items-end justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                {t("totalAssets")}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-white">{totalItems}</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Toolbar: search, filter, layout + actions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Filter className="h-3 w-3" />
              <span>Mode</span>
            </div>
            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setWeightFilter("ALL")}
                className={`rounded-lg px-3 py-2 font-medium transition ${
                  weightFilter === "ALL" ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setWeightFilter("SMALL")}
                className={`rounded-lg px-3 py-2 font-medium transition ${
                  weightFilter === "SMALL"
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                ≤ 99gr
              </button>
              <button
                onClick={() => setWeightFilter("LARGE")}
                className={`rounded-lg px-3 py-2 font-medium transition ${
                  weightFilter === "LARGE"
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
              >
                Over 99gr
              </button>
            </div>

            <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setLayoutView("table")}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${
                  layoutView === "table" ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                onClick={() => setLayoutView("grid")}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 font-medium transition ${
                  layoutView === "grid" ? "bg-white text-black" : "text-white/70 hover:text-white"
                }`}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons: Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          <motion.button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isRefreshing ? 1 : 1.02 }}
            whileTap={{ scale: isRefreshing ? 1 : 0.98 }}
            aria-label={t("refresh")}
          >
            <RefreshCw
              className={`h-4 w-4 flex-shrink-0 transition-transform ${
                isRefreshing ? "animate-spin" : "group-hover:rotate-180"
              }`}
            />
            <span className="whitespace-nowrap">
              {isRefreshing ? t("refreshing") : t("refresh")}
            </span>
          </motion.button>
        </div>
      </div>

      {layoutView === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04] text-left text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  <th className="px-5 py-3.5">{t("productName")}</th>
                  <th className="px-5 py-3.5">{t("weight")}</th>
                  <th className="px-5 py-3.5">{t("qrPreview")}</th>
                  <th className="px-5 py-3.5">Uniqcode</th>
                  <th className="px-5 py-3.5">Serial Code</th>
                  <th className="px-5 py-3.5">Root Key</th>
                  <th className="px-5 py-3.5 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center text-sm text-white/40">
                      {t("noProducts")}
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => (
                    <tr
                      key={batch.batchId}
                      className="border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{batch.name}</p>
                        <p className="text-[11px] text-white/40">#{batch.batchId}</p>
                      </td>
                      <td className="px-5 py-3.5 text-white/80">{batch.weight} gr</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              batch.firstItem.qrImageUrl ||
                              `/api/qr-gram/${encodeURIComponent(batch.firstItem.uniqCode)}`
                            }
                            alt={`QR code for ${batch.name} - ${batch.firstItem.uniqCode}`}
                            className="h-12 w-12 flex-shrink-0 rounded-lg border border-white/10 bg-white p-1.5 object-contain"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/90">
                        {batch.firstItem.uniqCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleSerialCodeClick(batch)}
                          className="text-xs font-medium text-white/80 underline decoration-white/30 underline-offset-2 hover:text-[#FFD700] hover:decoration-[#FFD700]/50"
                        >
                          {batch.itemCount} items
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        {batch.firstItem.hasRootKey ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/15 px-2.5 py-1 text-[11px] font-medium text-green-400 border border-green-500/25">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              setSelectedQrItem({
                                name: batch.name,
                                uniqCode: batch.firstItem.uniqCode,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/90 transition hover:border-white/25 hover:bg-white/10"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            {t("enlarge")}
                          </button>
                          <DownloadDropdown
                            batchId={batch.batchId}
                            batchName={batch.name}
                            batchWeight={batch.weight}
                            itemCount={batch.itemCount}
                            product={{
                              id: batch.firstItem.id,
                              name: batch.name,
                              weight: batch.weight,
                              uniqCode: batch.firstItem.uniqCode,
                              serialCode: batch.firstItem.serialCode,
                              qrImageUrl: batch.firstItem.qrImageUrl,
                              weightGroup: batch.weightGroup,
                              hasRootKey: batch.firstItem.hasRootKey,
                              rootKey: batch.firstItem.rootKey ?? undefined,
                            }}
                            selectedZipTemplateId={selectedZipTemplateId}
                            setSelectedZipTemplateId={setSelectedZipTemplateId}
                            zipProgress={zipProgress}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredBatches.length === 0 ? (
            <div className="col-span-full text-center text-white/40 text-sm">{t("noProducts")}</div>
          ) : (
            filteredBatches.map((batch) => (
              <div
                key={batch.batchId}
                className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 shadow-sm hover:border-white/20 hover:bg-white/[0.04] transition-all"
              >
                <div className="relative aspect-square w-full rounded-lg border border-white/10 bg-white p-3 mb-3">
                  <img
                    src={
                      batch.firstItem.qrImageUrl ||
                      `/api/qr-gram/${encodeURIComponent(batch.firstItem.uniqCode)}`
                    }
                    alt={batch.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="font-mono text-xs font-semibold text-white truncate">
                    {batch.firstItem.uniqCode}
                  </p>
                  <p className="text-xs text-white/70 line-clamp-2">{batch.name}</p>
                  <p className="text-xs text-white/50">{batch.weight} gr</p>
                  <p className="text-xs text-white/40">{batch.itemCount} items</p>
                </div>

                {/* Root key status */}
                <div className="mt-2">
                  {batch.firstItem.hasRootKey ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-[10px] text-green-300 border border-green-500/30">
                      <CheckCircle2 className="h-3 w-3" />
                      Active root key
                    </span>
                  ) : (
                    <span className="text-[10px] text-white/40">Root key: —</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setSelectedQrItem({
                        name: batch.name,
                        uniqCode: batch.firstItem.uniqCode,
                      })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[11px] text-white/80 hover:border-white/40 hover:bg-white/5 transition"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    {t("enlarge")}
                  </button>
                  <div className="flex-1 relative" ref={downloadDropdownRef}>
                    <DownloadDropdown
                      batchId={batch.batchId}
                      batchName={batch.name}
                      batchWeight={batch.weight}
                      itemCount={batch.itemCount}
                      product={{
                        id: batch.firstItem.id,
                        name: batch.name,
                        weight: batch.weight,
                        uniqCode: batch.firstItem.uniqCode,
                        serialCode: batch.firstItem.serialCode,
                        qrImageUrl: batch.firstItem.qrImageUrl,
                        weightGroup: batch.weightGroup,
                        hasRootKey: batch.firstItem.hasRootKey,
                        rootKey: batch.firstItem.rootKey ?? undefined,
                      }}
                      selectedZipTemplateId={selectedZipTemplateId}
                      setSelectedZipTemplateId={setSelectedZipTemplateId}
                      zipProgress={zipProgress}
                    />
                  </div>
                  <button
                    onClick={() => handleSerialCodeClick(batch)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[11px] text-white/80 hover:border-white/40 hover:bg-white/5 transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Root Key / Serial
                  </button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Serial Codes Modal - Shows all serial codes and root keys for a batch */}
      <Modal
        open={Boolean(selectedBatch)}
        onClose={() => {
          if (isDownloadingBatchZip && zipCompileAbortRef.current) {
            if (
              !window.confirm(
                "ZIP masih diproses. Batalkan unduhan dan tutup daftar serial?"
              )
            ) {
              return;
            }
            abortZipCompileWithoutConfirm("cancel");
          }
          setSelectedBatch(null);
          setBatchItems([]);
        }}
        title={selectedBatch ? `${selectedBatch.name} - All Serial Codes` : ""}
      >
        {selectedBatch && (
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-2 mb-3 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/60">Template ZIP:</span>
                <select
                  value={selectedZipTemplateId}
                  onChange={(e) => setSelectedZipTemplateId(e.target.value)}
                  disabled={isDownloadingBatchZip}
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-[#FFD700]/50 focus:outline-none"
                >
                  {SERTICARD_VARIANTS.map((v) => (
                    <option key={v.id} value={v.id} className="bg-gray-900 text-white">
                      {v.label}
                    </option>
                  ))}
                  {hasCustomTemplate && (
                    <option value="custom" className="bg-gray-900 text-white">
                      {customTemplateSelectLabel}
                    </option>
                  )}
                </select>
                <motion.button
                  type="button"
                  onClick={handleDownloadBatchSerticardsZip}
                  disabled={isDownloadingBatchZip || batchItems.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-[#FFD700]/10 px-4 py-2 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50"
                  whileHover={{ scale: isDownloadingBatchZip ? 1 : 1.02 }}
                  whileTap={{ scale: isDownloadingBatchZip ? 1 : 0.98 }}
                >
                  <Download className="h-4 w-4" />
                  {isDownloadingBatchZip && zipProgress
                    ? `${zipProgress.label} ${zipProgress.percent}%`
                    : isDownloadingBatchZip
                      ? "Generating ZIP..."
                      : `Download Serticards (ZIP) — ${batchItems.length} file${batchItems.length !== 1 ? "s" : ""}`}
                </motion.button>
              </div>
              {isDownloadingBatchZip && zipProgress && (
                <div className="space-y-2">
                  <div className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#FFD700]/70 rounded-full transition-all duration-300"
                      style={{ width: `${zipProgress.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={confirmCancelZipCompile}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/70 hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-200 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                      Batalkan ZIP
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mb-3 px-1 flex-wrap">
              <motion.button
                type="button"
                onClick={handleDownloadAll}
                disabled={isDownloadingAll}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:border-[#FFD700]/40 hover:bg-white/10 disabled:opacity-50"
                whileHover={{ scale: isDownloadingAll ? 1 : 1.02 }}
                whileTap={{ scale: isDownloadingAll ? 1 : 0.98 }}
              >
                <FileText className="h-4 w-4" />
                {isDownloadingAll ? "Generating Excel..." : "Download Excel"}
              </motion.button>
            </div>
            {loadingBatchItems ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-white/40" />
                <span className="ml-2 text-white/60">Loading serial codes...</span>
              </div>
            ) : batchItems.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-semibold text-white/60 border-b border-white/10">
                  <div>Serial Code</div>
                  <div>UniqCode</div>
                  <div>Root Key</div>
                </div>
                {batchItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-3 gap-4 px-4 py-3 text-sm border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="font-mono text-white/90">{item.serialCode}</div>
                    <div className="font-mono text-white/70 text-xs">{item.uniqCode}</div>
                    <div className="font-mono text-[#FFD700] font-semibold">
                      {item.rootKey || "N/A"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">No items found for this batch.</div>
            )}
          </div>
        )}
      </Modal>

      {/* QR Preview Modal (enlarge like Page 1) */}
      <Modal
        open={Boolean(selectedQrItem)}
        onClose={() => setSelectedQrItem(null)}
        title={selectedQrItem ? `${selectedQrItem.name} - ${selectedQrItem.uniqCode}` : ""}
      >
        {selectedQrItem && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-sm">
              <div className="relative aspect-square w-full rounded-3xl border border-white/10 bg-white p-4 sm:p-6 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`qr-modal-${selectedQrItem.uniqCode}`}
                  src={`/api/qr-gram/${encodeURIComponent(selectedQrItem.uniqCode)}`}
                  alt={selectedQrItem.name}
                  className="h-full w-full object-contain transition-opacity duration-300"
                  loading="eager"
                />
              </div>
            </div>
            <p className="font-mono text-lg sm:text-xl text-white/70">{selectedQrItem.uniqCode}</p>
            <p className="text-sm text-white/60">{selectedQrItem.name}</p>
          </div>
        )}
      </Modal>

      {/* Floating card Download - tengah layar (bukan dropdown) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeDownloadBatch && (
              <motion.div
                key="download-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => {
                  if (isDownloadingBatchZip && zipCompileAbortRef.current) {
                    if (
                      !window.confirm(
                        "ZIP masih disiapkan. Batalkan proses dan tutup modal?"
                      )
                    ) {
                      return;
                    }
                    abortZipCompileWithoutConfirm("cancel");
                  }
                  setDownloadDropdownOpen(null);
                  const task = readZipBackgroundTask();
                  const isTaskRunning = task?.status === "pending" || task?.status === "processing";
                  if (!isTaskRunning) {
                    setZipDownloadResult(null);
                    setZipProgress(null);
                  }
                }}
                role="presentation"
              >
                <motion.div
                  ref={downloadModalRef}
                  key="download-modal-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl border border-white/15 bg-gradient-to-b from-black/98 to-black/95 shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="download-modal-title"
                >
                  {(() => {
                    const batch = activeDownloadBatch;
                    const product = {
                      id: batch.firstItem.id,
                      name: batch.name,
                      weight: batch.weight,
                      uniqCode: batch.firstItem.uniqCode,
                      serialCode: batch.firstItem.serialCode,
                      qrImageUrl: batch.firstItem.qrImageUrl,
                      weightGroup: batch.weightGroup,
                      hasRootKey: batch.firstItem.hasRootKey,
                      rootKey: batch.firstItem.rootKey ?? undefined,
                    };
                    const isLoading = downloadingId === product.id;
                    const isZipLoading = downloadingZipBatchId === batch.batchId;
                    const zipPercent = isZipLoading && zipProgress ? zipProgress.percent : null;
                    return (
                      <>
                        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-br from-[#FFD700]/10 to-transparent">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD700]/15 border border-[#FFD700]/25">
                              <Download className="h-5 w-5 text-[#FFD700]" />
                            </div>
                            <div className="min-w-0">
                              <h2
                                id="download-modal-title"
                                className="font-semibold text-white text-base"
                              >
                                Unduh Serticard
                              </h2>
                              <p className="text-xs text-white/55 mt-0.5 truncate">{batch.name}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              onClick={handleModalZipRefresh}
                              disabled={zipPurgeBusy || zipReadyListFetching}
                              className="shrink-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition disabled:opacity-40 disabled:pointer-events-none"
                              aria-label="Segarkan data"
                              title="Ambil ulang daftar ZIP dari server (hentikan ZIP yang sedang berjalan jika ada)"
                            >
                              <RefreshCw
                                className={`h-5 w-5 ${zipReadyListFetching ? "animate-spin" : ""}`}
                              />
                            </button>
                            {zipDownloadResult?.cacheKey &&
                              (zipDownloadResult.downloads?.length ||
                                zipDownloadResult.download_url) && (
                                <button
                                  type="button"
                                  onClick={() => void handleModalZipPurge()}
                                  disabled={
                                    zipPurgeBusy ||
                                    zipReadyListFetching ||
                                    isZipLoading ||
                                    isDownloadingBatchZip
                                  }
                                  className="shrink-0 p-2 rounded-lg text-white/60 hover:text-red-300 hover:bg-red-500/15 transition disabled:opacity-40 disabled:pointer-events-none"
                                  aria-label="Hapus ZIP di server dan cache"
                                  title="Hapus semua file ZIP terkait di R2, kosongkan cache, dan reset riwayat unduhan"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            <button
                              type="button"
                              onClick={() => {
                                if (isDownloadingBatchZip && zipCompileAbortRef.current) {
                                  if (
                                    !window.confirm(
                                      "ZIP masih disiapkan. Batalkan proses dan tutup modal?"
                                    )
                                  ) {
                                    return;
                                  }
                                  abortZipCompileWithoutConfirm("cancel");
                                }
                                setDownloadDropdownOpen(null);
                                const task = readZipBackgroundTask();
                                const isTaskRunning =
                                  task?.status === "pending" || task?.status === "processing";
                                if (!isTaskRunning) {
                                  setZipDownloadResult(null);
                                  setZipProgress(null);
                                }
                              }}
                              className="shrink-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                              aria-label="Tutup"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 scrollbar-show">
                          {zipDownloadResult && zipDownloadResult.batchId === batch.batchId && (
                            <div className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4 space-y-3">
                              <div className="text-[10px] font-medium uppercase tracking-wider text-[#FFD700]/80">
                                ZIP siap diunduh
                              </div>
                              <div className="font-semibold text-white text-sm leading-tight">
                                {zipDownloadResult.product_title}
                              </div>
                              <div className="font-mono text-base font-semibold text-[#FFD700]">
                                {zipDownloadResult.product_id}
                              </div>
                              {zipDownloadResult.rootkey && (
                                <div className="font-mono text-xs text-white/70">
                                  {zipDownloadResult.rootkey}
                                </div>
                              )}
                              {(() => {
                                const linkBustMs = zipDownloadResult.linkBustMs;
                                const hrefZip = (rawUrl: string) =>
                                  linkBustMs ? withZipDownloadCacheBust(rawUrl, linkBustMs) : rawUrl;
                                const allDl = zipDownloadResult.downloads ?? [];
                                const visibleDl = allDl.filter((d) => {
                                  const rk =
                                    d.r2Key ??
                                    deriveR2KeyFromUrl(d.download_url) ??
                                    `batch-${d.batchIndex}`;
                                  return (zipR2Status[rk]?.downloadedCount ?? 0) === 0;
                                });
                                const hiddenDl = allDl.length - visibleDl.length;
                                return (
                                  <>
                                    <p className="text-[10px] text-white/50">
                                      {zipDownloadResult.total_files} file · disimpan di R2
                                      {allDl.length > 1 ? ` · ${allDl.length} batch total` : ""}
                                      {hiddenDl > 0
                                        ? ` · daftar: batch yang belum pernah diunduh saja (${hiddenDl} disembunyikan)`
                                        : ""}
                                      {zipDownloadResult.cached ? " · tersedia (cache)" : ""}
                                    </p>
                                    {allDl.length > 0 ? (
                                      visibleDl.length > 0 ? (
                                        <div className="space-y-2">
                                          {visibleDl.map((d) => {
                                            const r2Key =
                                              d.r2Key ??
                                              deriveR2KeyFromUrl(d.download_url) ??
                                              `batch-${d.batchIndex}`;
                                            const st = zipR2Status[r2Key];
                                            const exists = st?.exists ?? null;
                                            const statusLabel =
                                              exists === true
                                                ? "R2: OK"
                                                : exists === false
                                                  ? "R2: tidak ada"
                                                  : zipR2StatusLoading
                                                    ? "R2: cek..."
                                                    : "R2: ?";

                                            return (
                                              <div key={d.batchIndex} className="space-y-1">
                                                <a
                                                  href={hrefZip(d.download_url)}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  download={`${(zipDownloadResult.product_title || "serticard").replace(/\s+/g, "-")}-batch-${d.batchIndex}-of-${d.totalBatches}.zip`}
                                                  onClick={() => {
                                                    const ck = zipDownloadResult.cacheKey;
                                                    const rk =
                                                      d.r2Key ?? deriveR2KeyFromUrl(d.download_url);
                                                    if (!ck || !rk) return;
                                                    fetch("/api/qr/zip-download-audit", {
                                                      method: "POST",
                                                      headers: { "Content-Type": "application/json" },
                                                      body: JSON.stringify({
                                                        cacheKey: ck,
                                                        r2Key: rk,
                                                        batchIndex: d.batchIndex,
                                                        totalBatches: d.totalBatches,
                                                      }),
                                                    }).catch(() => {});
                                                    setZipR2Status((prev) => ({
                                                      ...prev,
                                                      [rk]: {
                                                        exists: prev[rk]?.exists ?? null,
                                                        downloadedCount:
                                                          (prev[rk]?.downloadedCount ?? 0) + 1,
                                                        lastDownloadedAt: new Date().toISOString(),
                                                      },
                                                    }));
                                                  }}
                                                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/15 px-3 py-2.5 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/25 transition"
                                                >
                                                  <Download className="h-4 w-4" />
                                                  ZIP Batch {d.batchIndex} dari {d.totalBatches} (
                                                  {d.fileCount} file)
                                                </a>
                                                <div className="flex items-center justify-between text-[10px] text-white/50 px-1">
                                                  <span className="tabular-nums">{statusLabel}</span>
                                                  <span className="tabular-nums">Belum pernah diunduh</span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[11px] leading-relaxed text-white/60">
                                          Semua batch ZIP sudah pernah diunduh. Riwayat unduhan tetap
                                          tersimpan di server; segarkan bila ada ZIP baru.
                                        </p>
                                      )
                                    ) : null}
                                  </>
                                );
                              })()}
                              {!zipDownloadResult.downloads?.length &&
                              zipDownloadResult.download_url ? (
                                <a
                                  href={
                                    zipDownloadResult.linkBustMs
                                      ? withZipDownloadCacheBust(
                                          zipDownloadResult.download_url,
                                          zipDownloadResult.linkBustMs
                                        )
                                      : zipDownloadResult.download_url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={`${(zipDownloadResult.product_title || "serticard").replace(/\s+/g, "-")}-${zipDownloadResult.total_files}file.zip`}
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/15 px-3 py-2.5 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/25 transition"
                                >
                                  <Download className="h-4 w-4" />
                                  Unduh dari R2
                                </a>
                              ) : null}
                            </div>
                          )}

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs font-medium text-white/60 mb-2">
                              Original QR
                            </div>
                            <motion.button
                              onClick={() => {
                                handleDownloadOriginal(product);
                                setDownloadDropdownOpen(null);
                              }}
                              disabled={isLoading}
                              className="w-full px-3 py-2.5 rounded-lg text-left hover:bg-white/10 active:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed group border border-white/10"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="font-medium text-white text-sm group-hover:text-[#FFD700]/90">
                                Original QR Only
                              </div>
                              <div className="text-[10px] text-white/50 mt-0.5">
                                PNG dengan judul & nomor seri
                              </div>
                            </motion.button>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs font-medium text-white/60 mb-2">
                              ZIP (semua item, dengan root key)
                            </div>
                            <div className="mb-2">
                              <label className="text-[10px] text-white/45 block mb-1">
                                Template
                              </label>
                              <select
                                value={selectedZipTemplateId}
                                onChange={(e) => setSelectedZipTemplateId(e.target.value)}
                                disabled={isZipLoading}
                                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#FFD700]/50 focus:outline-none"
                              >
                                {SERTICARD_VARIANTS.map((v) => (
                                  <option
                                    key={v.id}
                                    value={v.id}
                                    className="bg-gray-900 text-white"
                                  >
                                    {v.label}
                                  </option>
                                ))}
                                {hasCustomTemplate && (
                                  <option value="custom" className="bg-gray-900 text-white">
                                    {customTemplateSelectLabel}
                                  </option>
                                )}
                              </select>
                            </div>
                            {isZipLoading && (
                              <div className="relative mb-3 rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/5 px-3 py-2.5 pr-10">
                                <button
                                  type="button"
                                  onClick={confirmCancelZipCompile}
                                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-white/80 hover:bg-red-500/20 hover:text-red-200 hover:border-red-400/40 transition"
                                  aria-label="Batalkan pembuatan ZIP"
                                  title="Batalkan"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                                <div className="flex items-center justify-between gap-2 mb-1.5 pr-1">
                                  <span className="text-[11px] font-medium text-[#FFD700]/90 truncate">
                                    {zipProgress?.label ?? "Membuat ZIP..."}
                                  </span>
                                  <span className="text-sm font-semibold tabular-nums text-[#FFD700] shrink-0">
                                    {zipPercent != null ? `${zipPercent}%` : "—"}
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-[#FFD700]/70 rounded-full transition-all duration-300"
                                    style={{ width: `${zipPercent ?? 0}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            <motion.button
                              type="button"
                              onClick={() => {
                                handleDownloadBatchAsZipFromCard(
                                  batch.batchId,
                                  batch.name,
                                  batch.weight,
                                  batch.itemCount
                                );
                              }}
                              disabled={isLoading || isZipLoading}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2.5 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Download className="h-4 w-4" />
                              {isZipLoading
                                ? zipPercent != null
                                  ? `Membuat ZIP... ${zipPercent}%`
                                  : "Membuat ZIP..."
                                : `Unduh ZIP — ${batch.itemCount} file`}
                            </motion.button>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs font-medium text-white/60 mb-2">
                              Satuan PDF (1 file, item pertama)
                            </div>
                            <p className="text-[10px] text-white/45 mb-2">
                              Judul batch, kode unik (uniq), dan root key — sama seperti tiap lembar di ZIP.
                            </p>
                            <div className="mb-2">
                              <label className="text-[10px] text-white/45 block mb-1">
                                Jenis Serticard
                              </label>
                              <select
                                value={selectedSingleTemplateId}
                                onChange={(e) => setSelectedSingleTemplateId(e.target.value)}
                                disabled={isLoading}
                                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#FFD700]/50 focus:outline-none"
                              >
                                {SERTICARD_VARIANTS.map((v) => (
                                  <option
                                    key={v.id}
                                    value={v.id}
                                    className="bg-gray-900 text-white"
                                  >
                                    {v.label}
                                  </option>
                                ))}
                                {hasCustomTemplate && (
                                  <option value="custom" className="bg-gray-900 text-white">
                                    {customTemplateSelectLabel}
                                  </option>
                                )}
                              </select>
                            </div>
                            <motion.button
                              type="button"
                              onClick={() =>
                                handleDownloadSingle(product, selectedSingleTemplateId)
                              }
                              disabled={isLoading}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-2.5 text-xs font-semibold text-[#FFD700] hover:bg-[#FFD700]/20 disabled:opacity-50"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {isLoading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  Mengunduh...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                  Unduh 1 PDF
                                </>
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
