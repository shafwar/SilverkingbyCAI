"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, Check, ImageIcon, Type } from "lucide-react";
import { toast } from "sonner";

type Config = {
  customFrontR2Key: string | null;
  customBackR2Key: string | null;
  fontFamily: string;
  fontSizePreset: string;
  fontFamilies?: { value: string; label: string }[];
  fontSizePresets?: { value: string; label: string }[];
};

function getPreviewUrl(side: "front" | "back"): string {
  return `/api/admin/serticard/preview?side=${side}&t=${Date.now()}`;
}

export function SerticardPanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/serticard/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      const data = await res.json();
      setConfig(data);
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

  const handleFontSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/serticard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fontFamily: config.fontFamily,
          fontSizePreset: config.fontSizePreset,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setConfig((c) => (c ? { ...c, ...data } : c));
      toast.success("Pengaturan font disimpan. Download PDF akan menggunakan pengaturan baru.");
      // Trigger refresh for other components using this config (e.g., QrPreviewGrid)
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("serticard-config-updated"));
      }
    } catch {
      toast.error("Gagal menyimpan pengaturan font");
    } finally {
      setSaving(false);
    }
  };

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
      setConfig((c) => (c ? { ...c, ...data.config } : c));
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
      setConfig((c) => (c ? { ...c, ...data } : c));
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
          Upload Desain Serticard
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

      {/* Font Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/10 bg-white/5 p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Type className="h-5 w-5" />
          Pengaturan Font
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Atur jenis dan ukuran font untuk teks (nama produk & serial code) di serticard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Jenis Font</label>
            <select
              value={config.fontFamily}
              onChange={(e) => setConfig((c) => (c ? { ...c, fontFamily: e.target.value } : c))}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white focus:border-[#FFD700]/50 focus:outline-none"
            >
              {(config.fontFamilies || [
                { value: "Arial", label: "Arial" },
                { value: "Lucida Sans", label: "Lucida Sans" },
                { value: "Times New Roman", label: "Times New Roman" },
                { value: "SF Mono", label: "SF Mono" },
              ]).map((f) => (
                <option key={f.value} value={f.value} className="bg-[#0a0a0a]">
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Ukuran Font</label>
            <select
              value={config.fontSizePreset}
              onChange={(e) => setConfig((c) => (c ? { ...c, fontSizePreset: e.target.value } : c))}
              className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white focus:border-[#FFD700]/50 focus:outline-none"
            >
              {(config.fontSizePresets || [
                { value: "BESAR", label: "Besar" },
                { value: "KECIL", label: "Kecil" },
              ]).map((p) => (
                <option key={p.value} value={p.value} className="bg-[#0a0a0a]">
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-white/50">Besar = lebih jelas; Kecil = lebih ringkas</p>
          </div>
        </div>
        <button
          onClick={handleFontSave}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/50 px-5 py-2.5 text-sm font-medium text-[#FFD700] hover:bg-[#FFD700]/30 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Simpan Pengaturan Font
        </button>
      </motion.div>
    </div>
  );
}
