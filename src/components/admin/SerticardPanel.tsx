"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, ImageIcon, Palette } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useTranslations } from "next-intl";

type Config = {
  customFrontR2Key: string | null;
  customBackR2Key: string | null;
  customTemplateDropdownLabel: string | null;
  fontFamily: string;
  fontSizePreset: string;
};

type FontOption = { value: string; label: string };
type SizeOption = { value: string; label: string };

function getPreviewUrl(side: "front" | "back"): string {
  return `/api/admin/serticard/preview?side=${side}&t=${Date.now()}`;
}

const shellClass =
  "rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl";

const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white placeholder:text-white/25 outline-none transition focus:border-luxury-gold/40 focus:ring-2 focus:ring-luxury-gold/12 sm:py-2.5 sm:text-sm";

const selectClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white outline-none transition focus:border-luxury-gold/40 focus:ring-2 focus:ring-luxury-gold/12 sm:py-2.5 sm:text-sm";

const helperTextClass = "text-[0.9375rem] leading-relaxed text-white/52 sm:text-sm";

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

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white/92 sm:mb-3 sm:text-base">
      {children}
    </h2>
  );
}

export function SerticardPanel() {
  const t = useTranslations("admin.serticard");
  const [config, setConfig] = useState<Config | null>(null);
  const [fontFamilies, setFontFamilies] = useState<FontOption[]>([]);
  const [fontSizePresets, setFontSizePresets] = useState<SizeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const [templateDropdownName, setTemplateDropdownName] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSizePreset, setFontSizePreset] = useState("BESAR");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/serticard/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      const data = await res.json();
      setFontFamilies(Array.isArray(data.fontFamilies) ? data.fontFamilies : []);
      setFontSizePresets(Array.isArray(data.fontSizePresets) ? data.fontSizePresets : []);
      setConfig({
        customFrontR2Key: data.customFrontR2Key ?? null,
        customBackR2Key: data.customBackR2Key ?? null,
        customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
        fontFamily: data.fontFamily ?? "Arial",
        fontSizePreset: data.fontSizePreset ?? "BESAR",
      });
      setTemplateDropdownName(data.customTemplateDropdownLabel ?? "");
      setFontFamily(data.fontFamily ?? "Arial");
      setFontSizePreset(data.fontSizePreset ?? "BESAR");
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
      toast.success(
        side === "front"
          ? "Template depan berhasil diunggah. Lengkapi juga belakang agar opsi custom aktif di Pratinjau QR."
          : "Template belakang berhasil diunggah. Lengkapi juga depan agar opsi custom aktif di Pratinjau QR."
      );
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
          fontFamily,
          fontSizePreset,
          customTemplateDropdownLabel: templateDropdownName.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setConfig((c) =>
        c
          ? {
              ...c,
              fontFamily: data.fontFamily ?? fontFamily,
              fontSizePreset: data.fontSizePreset ?? fontSizePreset,
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
      {/* Ringkasan */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={clsx(shellClass, "px-3.5 py-3.5 sm:px-5 sm:py-4")}
      >
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
          <ImageIcon className="h-4 w-4 shrink-0 text-luxury-gold/60" aria-hidden />
          <span className="min-w-0">{t("introEyebrow")}</span>
        </div>
        <p className={`mt-4 border-t border-white/[0.06] pt-4 ${helperTextClass}`}>{t("introBody")}</p>
      </motion.div>

      {/* Upload depan / belakang */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-3.5 py-3.5 sm:px-5 sm:py-4">
          <Subheading>{t("sectionUploadTitle")}</Subheading>
          <p className={helperTextClass}>{t("sectionUploadLead")}</p>
        </div>

        <div className="grid min-w-0 gap-0 md:grid-cols-2 md:divide-x md:divide-white/[0.06]">
          <div className="space-y-4 p-3.5 sm:space-y-5 sm:p-5">
            <div>
              <FieldLabel>{t("frontFieldLabel")}</FieldLabel>
              <p className={`mb-3 ${helperTextClass}`}>{t("frontFieldHelp")}</p>
              <ul className={`mb-4 list-disc space-y-1.5 pl-5 ${helperTextClass}`}>
                <li>{t("frontBullet1")}</li>
                <li>{t("frontBullet2")}</li>
                <li>{t("frontBullet3")}</li>
              </ul>
              <div className="relative flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/18 bg-black/30 p-4">
                {frontPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={frontPreview} alt="" className="max-h-40 object-contain rounded-lg" />
                ) : (
                  <span className="text-sm text-white/40">{t("noCustomYet")}</span>
                )}
                <label className="mt-4 inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:border-luxury-gold/35 hover:bg-white/[0.12]">
                  <Upload className="h-4 w-4 shrink-0 text-luxury-gold/70" />
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
          </div>

          <div className="space-y-4 border-t border-white/[0.06] p-3.5 sm:space-y-5 sm:p-5 md:border-t-0">
            <div>
              <FieldLabel>{t("backFieldLabel")}</FieldLabel>
              <p className={`mb-3 ${helperTextClass}`}>{t("backFieldHelp")}</p>
              <ul className={`mb-4 list-disc space-y-1.5 pl-5 ${helperTextClass}`}>
                <li>{t("backBullet1")}</li>
                <li>{t("backBullet2")}</li>
                <li>{t("backBullet3")}</li>
              </ul>
              <div className="relative flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/18 bg-black/30 p-4">
                {backPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={backPreview} alt="" className="max-h-40 object-contain rounded-lg" />
                ) : (
                  <span className="text-sm text-white/40">{t("noCustomYet")}</span>
                )}
                <label className="mt-4 inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition hover:border-luxury-gold/35 hover:bg-white/[0.12]">
                  <Upload className="h-4 w-4 shrink-0 text-luxury-gold/70" />
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
        </div>

        {(config.customFrontR2Key || config.customBackR2Key) && (
          <div className="border-t border-white/[0.06] px-3.5 py-3 sm:px-5 sm:py-4">
            <button
              type="button"
              onClick={handleClearCustom}
              disabled={saving}
              className="text-sm font-medium text-amber-400/95 transition hover:text-amber-300 disabled:opacity-50"
            >
              {saving ? t("resetting") : t("resetToDefault")}
            </button>
            <p className={`mt-2 ${helperTextClass}`}>{t("resetHint")}</p>
          </div>
        )}
      </motion.div>

      {/* Nama dropdown + font — simpan di bawah seperti journal */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        onSubmit={handleSaveSettings}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-3.5 py-3.5 sm:px-5 sm:py-4">
          <div className="mb-2 flex items-center gap-2.5 sm:mb-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxury-gold/80 sm:h-9 sm:w-9">
              <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
            </span>
            <h2 className="min-w-0 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white/92 sm:text-base">
              {t("sectionAppearanceTitle")}
            </h2>
          </div>
          <p className={helperTextClass}>{t("sectionAppearanceLead")}</p>
        </div>

        <div className="space-y-5 p-3.5 sm:space-y-6 sm:p-5">
          <div>
            <FieldLabel dense>Nama template (di dropdown)</FieldLabel>
            <input
              type="text"
              value={templateDropdownName}
              onChange={(e) => setTemplateDropdownName(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
              className={inputClass}
              maxLength={191}
            />
            <p className={`mt-2.5 ${helperTextClass}`}>{t("templateNameHelp")}</p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel dense>{t("fontFamilyLabel")}</FieldLabel>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className={selectClass}
              >
                {fontFamilies.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#0a0a0a]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel dense>{t("fontSizeLabel")}</FieldLabel>
              <select
                value={fontSizePreset}
                onChange={(e) => setFontSizePreset(e.target.value)}
                className={selectClass}
              >
                {fontSizePresets.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#0a0a0a]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={helperTextClass}>{t("fontHelp")}</p>
        </div>

        <div className="border-t border-white/[0.06] px-3.5 py-4 sm:px-6 sm:py-6">
          <p className={`mb-3 text-center sm:mb-4 sm:text-left ${helperTextClass}`}>{t("saveFooterHint")}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-gradient-to-r from-[#e8c547] to-[#c9a227] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_24px_-6px_rgba(232,197,71,0.35)] transition hover:brightness-105 disabled:opacity-50 sm:min-h-[44px] sm:w-auto sm:min-w-[160px] sm:py-2.5"
            >
              {savingSettings ? t("savingSettings") : t("saveSettings")}
            </button>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
