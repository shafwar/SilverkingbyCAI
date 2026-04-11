"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, ImageIcon, Tag } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useTranslations } from "next-intl";

type Config = {
  customFrontR2Key: string | null;
  customBackR2Key: string | null;
  customTemplateDropdownLabel: string | null;
};

function getPreviewUrl(side: "front" | "back"): string {
  return `/api/admin/serticard/preview?side=${side}&t=${Date.now()}`;
}

const shellClass =
  "rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl";

const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white placeholder:text-white/25 outline-none transition focus:border-luxury-gold/40 focus:ring-2 focus:ring-luxury-gold/12 sm:py-2.5 sm:text-sm";

const helperTextClass = "text-[0.8125rem] leading-relaxed text-white/48 sm:text-sm sm:text-white/50";
/** Equal-width columns (50/50 on sm+): basis-0 + flex-1 + min-w-0 */
const uploadColClass =
  "flex min-h-0 min-w-0 flex-1 basis-0 flex-col rounded-xl border border-white/[0.06] bg-black/25 p-4 sm:p-5";

function FieldLabel({ children, dense }: { children: React.ReactNode; dense?: boolean }) {
  return (
    <span
      className={clsx(
        "block uppercase tracking-[0.12em] text-white/55",
        dense
          ? "mb-1 text-[0.6875rem] font-bold tracking-[0.11em] text-white/62 sm:text-[0.75rem] sm:tracking-[0.12em]"
          : "mb-1.5 text-[0.8125rem] font-semibold sm:mb-2 sm:text-[13px]"
      )}
    >
      {children}
    </span>
  );
}

export function SerticardPanel() {
  const t = useTranslations("admin.serticard");
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const [templateDropdownName, setTemplateDropdownName] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/serticard/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      const data = await res.json();
      setConfig({
        customFrontR2Key: data.customFrontR2Key ?? null,
        customBackR2Key: data.customBackR2Key ?? null,
        customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
      });
      setTemplateDropdownName(data.customTemplateDropdownLabel ?? "");
      setFrontPreview(data.customFrontR2Key ? getPreviewUrl("front") : null);
      setBackPreview(data.customBackR2Key ? getPreviewUrl("back") : null);
    } catch {
      toast.error("Gagal memuat konfigurasi");
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const notifyConfigUpdated = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("serticard-config-updated"));
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
      toast.success(side === "front" ? t("uploadFrontOk") : t("uploadBackOk"));
      fetchConfig();
      notifyConfigUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah template");
    } finally {
      setUploading(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/serticard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customTemplateDropdownLabel: templateDropdownName.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setConfig((c) =>
        c
          ? {
              ...c,
              customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
            }
          : c
      );
      setTemplateDropdownName(data.customTemplateDropdownLabel ?? "");
      toast.success(t("settingsSavedToast"));
      notifyConfigUpdated();
    } catch {
      toast.error(t("settingsSaveFailedToast"));
    } finally {
      setSavingSettings(false);
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
              customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
            }
          : c
      );
      setTemplateDropdownName("");
      setFrontPreview(null);
      setBackPreview(null);
      toast.success(t("resetTemplatesToast"));
      fetchConfig();
      notifyConfigUpdated();
    } catch {
      toast.error(t("resetTemplatesFailedToast"));
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
    <div className="w-full min-w-0 space-y-6 sm:space-y-8 pb-10 sm:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxury-gold/75">
              <ImageIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-white/92 sm:text-[1.05rem]">
              {t("sectionUploadTitle")}
            </h2>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
          <div className={uploadColClass}>
            <p className="text-[13px] font-semibold text-white/88 sm:text-sm">{t("frontFieldLabel")}</p>
            <p className={`mt-1.5 ${helperTextClass}`}>{t("frontHint")}</p>
            <div className="mt-4 flex min-h-[180px] w-full flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-black/35 px-3 py-5">
              {frontPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={frontPreview}
                  alt=""
                  className="max-h-40 w-full max-w-[200px] object-contain"
                />
              ) : (
                <span className="text-xs text-white/35">{t("noCustomYet")}</span>
              )}
              <label className="mt-3 inline-flex min-h-[40px] w-full max-w-[220px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white/90 transition hover:border-luxury-gold/30 hover:bg-white/[0.1] sm:text-sm">
                <Upload className="h-3.5 w-3.5 shrink-0 text-luxury-gold/65" />
                {uploading === "front" ? t("uploading") : t("upload")}
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

          <div className={uploadColClass}>
            <p className="text-[13px] font-semibold text-white/88 sm:text-sm">{t("backFieldLabel")}</p>
            <p className={`mt-1.5 ${helperTextClass}`}>{t("backHint")}</p>
            <div className="mt-4 flex min-h-[180px] w-full flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-white/12 bg-black/35 px-3 py-5">
              {backPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={backPreview}
                  alt=""
                  className="max-h-40 w-full max-w-[200px] object-contain"
                />
              ) : (
                <span className="text-xs text-white/35">{t("noCustomYet")}</span>
              )}
              <label className="mt-3 inline-flex min-h-[40px] w-full max-w-[220px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white/90 transition hover:border-luxury-gold/30 hover:bg-white/[0.1] sm:text-sm">
                <Upload className="h-3.5 w-3.5 shrink-0 text-luxury-gold/65" />
                {uploading === "back" ? t("uploading") : t("upload")}
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
          <div className="flex flex-col gap-1 border-t border-white/[0.06] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <button
              type="button"
              onClick={handleClearCustom}
              disabled={saving}
              className="self-start text-xs font-medium text-amber-400/95 transition hover:text-amber-300 disabled:opacity-50 sm:text-sm"
            >
              {saving ? t("resetting") : t("resetToDefault")}
            </button>
            <p className={`max-w-xl text-xs sm:text-[13px] ${helperTextClass}`}>{t("resetHint")}</p>
          </div>
        )}
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        onSubmit={handleSaveSettings}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxury-gold/80 sm:h-9 sm:w-9">
              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
            </span>
            <h2 className="min-w-0 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white/92 sm:text-base">
              {t("sectionAppearanceTitle")}
            </h2>
          </div>
          <p className={`mt-2 ${helperTextClass}`}>{t("sectionAppearanceLead")}</p>
        </div>

        <div className="p-4 sm:p-5">
          <FieldLabel dense>Nama template (di dropdown)</FieldLabel>
          <input
            type="text"
            value={templateDropdownName}
            onChange={(e) => setTemplateDropdownName(e.target.value)}
            placeholder={t("templateNamePlaceholder")}
            className={inputClass}
            maxLength={191}
          />
          <p className={`mt-2 ${helperTextClass}`}>{t("templateNameHelp")}</p>
        </div>

        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5 sm:py-5">
          <p className={`mb-3 text-sm ${helperTextClass}`}>{t("saveFooterHint")}</p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-xl bg-gradient-to-r from-[#e8c547] to-[#c9a227] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_-6px_rgba(232,197,71,0.35)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
            >
              {savingSettings ? t("savingSettings") : t("saveSettings")}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
