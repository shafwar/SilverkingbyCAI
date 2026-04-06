"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, ImageIcon, Trash2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

type Config = {
  customFrontR2Key: string | null;
  customBackR2Key: string | null;
};

function getPreviewUrl(side: "front" | "back"): string {
  return `/api/admin/serticard/preview?side=${side}&t=${Date.now()}`;
}

type CmsTemplateRow = { id: number; name: string; r2Key: string; createdAt: string };

export function SerticardPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [cmsName, setCmsName] = useState("");
  const [cmsUploading, setCmsUploading] = useState(false);
  const [deletingCmsId, setDeletingCmsId] = useState<number | null>(null);

  const {
    data: cmsListData,
    mutate: mutateCmsList,
    isLoading: cmsListLoading,
  } = useSWR<{ templates: CmsTemplateRow[] }>("/api/admin/serticard/cms-templates", fetcher, {
    revalidateOnFocus: false,
  });
  const cmsTemplates = cmsListData?.templates ?? [];

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/serticard/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      const data = await res.json();
      setConfig({
        customFrontR2Key: data.customFrontR2Key ?? null,
        customBackR2Key: data.customBackR2Key ?? null,
      });
      setFrontPreview(data.customFrontR2Key ? getPreviewUrl("front") : null);
      setBackPreview(data.customBackR2Key ? getPreviewUrl("back") : null);
    } catch (e) {
      toast.error("Gagal memuat konfigurasi");
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleUpload = async (side: "front" | "back", file: File) => {
    setUploading(side);
    try {
      const formData = new FormData();
      formData.append(side, file);
      const res = await fetch("/api/admin/serticard/upload-template", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setConfig((c) =>
        c && data.config
          ? {
              ...c,
              customFrontR2Key: data.config.customFrontR2Key ?? c.customFrontR2Key,
              customBackR2Key: data.config.customBackR2Key ?? c.customBackR2Key,
            }
          : c
      );
      if (side === "front") setFrontPreview(URL.createObjectURL(file));
      else setBackPreview(URL.createObjectURL(file));
      toast.success(`Template ${side === "front" ? "depan" : "belakang"} berhasil diunggah. Opsi "Custom" sekarang tersedia di dropdown download.`);
      fetchConfig();
      // Trigger refresh for other components (QrPreviewGrid, QrPreviewGridGram)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("serticard-config-updated"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah template");
    } finally {
      setUploading(null);
    }
  };

  const handleCmsUpload = async (file: File) => {
    const name = cmsName.trim() || file.name.replace(/\.[^.]+$/, "") || "Template";
    setCmsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name);
      const res = await fetch("/api/admin/serticard/cms-templates", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Upload gagal");
      toast.success(`Template “${name}” tersimpan di R2 dan muncul di dropdown QR Preview.`);
      setCmsName("");
      await mutateCmsList();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("serticard-cms-templates-updated"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah template CMS");
    } finally {
      setCmsUploading(false);
    }
  };

  const handleDeleteCms = async (id: number) => {
    setDeletingCmsId(id);
    try {
      const res = await fetch(`/api/admin/serticard/cms-templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Gagal menghapus");
      }
      toast.success("Template CMS dihapus.");
      await mutateCmsList();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("serticard-cms-templates-updated"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setDeletingCmsId(null);
    }
  };

  const handleClearCustom = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/serticard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearCustomTemplates: true }),
      });
      if (!res.ok) throw new Error("Failed to clear");
      const data = await res.json();
      setConfig((c) =>
        c
          ? {
              ...c,
              customFrontR2Key: data.customFrontR2Key ?? null,
              customBackR2Key: data.customBackR2Key ?? null,
            }
          : c
      );
      setFrontPreview(null);
      setBackPreview(null);
      toast.success("Kembali ke template bawaan. Opsi Custom telah dihapus dari dropdown.");
      fetchConfig();
      // Trigger refresh for other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("serticard-config-updated"));
      }
    } catch {
      toast.error("Gagal mereset template");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
        Tidak dapat memuat konfigurasi serticard. Silakan refresh halaman.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Upload Template */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Upload Desain Serticard (depan / belakang terpisah)
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Unggah gambar template depan dan/atau belakang (PNG atau JPEG). Template custom akan digunakan saat generate PDF.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Front */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Template Depan (Front)</label>
            <div className="relative rounded-lg border-2 border-dashed border-white/20 bg-black/30 p-4 min-h-[160px] flex flex-col items-center justify-center">
              {frontPreview ? (
                <img
                  src={frontPreview}
                  alt="Front preview"
                  className="max-h-32 object-contain rounded"
                />
              ) : (
                <span className="text-white/40 text-sm">Belum ada template custom</span>
              )}
              <label className="mt-2 cursor-pointer inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">
                <Upload className="h-4 w-4" />
                {uploading === "front" ? "Mengunggah..." : "Unggah"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("front", f);
                  }}
                  disabled={!!uploading}
                />
              </label>
            </div>
          </div>
          {/* Back */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">Template Belakang (Back)</label>
            <div className="relative rounded-lg border-2 border-dashed border-white/20 bg-black/30 p-4 min-h-[160px] flex flex-col items-center justify-center">
              {backPreview ? (
                <img
                  src={backPreview}
                  alt="Back preview"
                  className="max-h-32 object-contain rounded"
                />
              ) : (
                <span className="text-white/40 text-sm">Belum ada template custom</span>
              )}
              <label className="mt-2 cursor-pointer inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">
                <Upload className="h-4 w-4" />
                {uploading === "back" ? "Mengunggah..." : "Unggah"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("back", f);
                  }}
                  disabled={!!uploading}
                />
              </label>
            </div>
          </div>
        </div>
        {(config.customFrontR2Key || config.customBackR2Key) && (
          <button
            onClick={handleClearCustom}
            disabled={saving}
            className="mt-4 text-sm text-amber-400 hover:text-amber-300 disabled:opacity-50"
          >
            Kembali ke template bawaan
          </button>
        )}
      </motion.div>

      {/* CMS: satu file spread kiri + kanan */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-[#FFD700]" />
          Template serticard CMS (satu gambar — kiri dan kanan)
        </h3>
        <div className="rounded-lg border border-white/10 bg-black/30 p-4 mb-4 space-y-2 text-sm text-white/75">
          <p className="font-medium text-[#FFD700]/90">Petunjuk upload</p>
          <ul className="list-disc pl-5 space-y-1 text-white/65">
            <li>
              Unggah <strong className="text-white/90">satu file</strong> berisi panel{" "}
              <strong className="text-white/90">kiri</strong> (area QR / teks nanti) dan{" "}
              <strong className="text-white/90">kanan</strong> (desain belakang), dalam satu baris
              horizontal — sama seperti layout PDF akhir.
            </li>
            <li>
              File harus <strong className="text-white/90">polos</strong>: tanpa QR, tanpa kode
              unicode/serial, tanpa data dinamis (sistem yang akan menempelkannya).
            </li>
            <li>Format: PNG atau JPEG. File disimpan di R2 pada folder{" "}
              <code className="text-[#FFD700]/80 text-xs">serticard-templates/</code> dengan nama unik.
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Nama template (di dropdown)</label>
            <input
              type="text"
              value={cmsName}
              onChange={(e) => setCmsName(e.target.value)}
              placeholder="Contoh: Eid Limited Edition"
              className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white placeholder:text-white/35 focus:border-[#FFD700]/50 focus:outline-none"
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="inline-flex items-center justify-center gap-2 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 px-4 py-2.5 text-sm text-[#FFD700] hover:bg-[#FFD700]/25 cursor-pointer">
              <Upload className="h-4 w-4" />
              {cmsUploading ? "Mengunggah..." : "Pilih file spread"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                disabled={cmsUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleCmsUpload(f);
                }}
              />
            </label>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/50 mb-2">Template tersimpan ({cmsListLoading ? "…" : cmsTemplates.length})</p>
          {cmsTemplates.length === 0 ? (
            <p className="text-sm text-white/40">Belum ada template CMS.</p>
          ) : (
            <ul className="space-y-2">
              {cmsTemplates.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="text-white font-medium truncate">{row.name}</div>
                    <div className="text-[10px] text-white/40 font-mono truncate">{row.r2Key}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteCms(row.id)}
                    disabled={deletingCmsId === row.id}
                    className="shrink-0 p-2 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    aria-label="Hapus template"
                  >
                    {deletingCmsId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
