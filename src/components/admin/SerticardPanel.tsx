"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Loader2, ImageIcon, Tag, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/admin/Modal";

type Config = {
  customFrontR2Key: string | null;
  customBackR2Key: string | null;
  customPairTitle: string | null;
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

const uploadColClass =
  "flex min-h-0 min-w-0 flex-1 basis-0 flex-col rounded-xl border border-white/[0.06] bg-black/25 p-4 sm:p-5";

type ConfirmKind = null | "deleteFront" | "deleteBack" | "deleteAll";

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
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<"front" | "back" | "all" | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [templateDropdownName, setTemplateDropdownName] = useState("");
  const [pairTitle, setPairTitle] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmKind>(null);
  const pairTitleInputRef = useRef<HTMLInputElement>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/serticard/config");
      if (!res.ok) throw new Error("Failed to fetch config");
      const data = await res.json();
      setConfig({
        customFrontR2Key: data.customFrontR2Key ?? null,
        customBackR2Key: data.customBackR2Key ?? null,
        customPairTitle: data.customPairTitle ?? null,
        customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
      });
      setTemplateDropdownName(data.customTemplateDropdownLabel ?? "");
      setPairTitle(data.customPairTitle ?? "");
      setFrontPreview(data.customFrontR2Key ? getPreviewUrl("front") : null);
      setBackPreview(data.customBackR2Key ? getPreviewUrl("back") : null);
    } catch {
      toast.error(t("configLoadFailedToast"));
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      toast.success(side === "front" ? t("uploadFrontOk") : t("uploadBackOk"));
      await fetchConfig();
      notifyConfigUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("uploadFailedToast"));
    } finally {
      setUploading(null);
    }
  };

  const runDeleteSide = async (side: "front" | "back") => {
    setDeleting(side);
    try {
      const res = await fetch("/api/admin/serticard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [side === "front" ? "deleteCustomFront" : "deleteCustomBack"]: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setConfig((c) =>
        c
          ? {
              ...c,
              customFrontR2Key: data.customFrontR2Key ?? null,
              customBackR2Key: data.customBackR2Key ?? null,
              customPairTitle: data.customPairTitle ?? c.customPairTitle,
              customTemplateDropdownLabel:
                data.customTemplateDropdownLabel ?? c.customTemplateDropdownLabel,
            }
          : c
      );
      toast.success(side === "front" ? t("deleteFrontOk") : t("deleteBackOk"));
      await fetchConfig();
      notifyConfigUpdated();
    } catch {
      toast.error(t("deleteSideFailedToast"));
    } finally {
      setDeleting(null);
      setConfirmDialog(null);
    }
  };

  const runClearAll = async () => {
    setDeleting("all");
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
              customPairTitle: data.customPairTitle ?? null,
              customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
            }
          : c
      );
      setTemplateDropdownName("");
      setPairTitle("");
      setFrontPreview(null);
      setBackPreview(null);
      toast.success(t("resetTemplatesToast"));
      await fetchConfig();
      notifyConfigUpdated();
    } catch {
      toast.error(t("resetTemplatesFailedToast"));
    } finally {
      setDeleting(null);
      setConfirmDialog(null);
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
          customPairTitle: pairTitle.trim() || null,
          customTemplateDropdownLabel: templateDropdownName.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setConfig((c) =>
        c
          ? {
              ...c,
              customPairTitle: data.customPairTitle ?? null,
              customTemplateDropdownLabel: data.customTemplateDropdownLabel ?? null,
            }
          : c
      );
      setTemplateDropdownName(data.customTemplateDropdownLabel ?? "");
      setPairTitle(data.customPairTitle ?? "");
      toast.success(t("settingsSavedToast"));
      notifyConfigUpdated();
    } catch {
      toast.error(t("settingsSaveFailedToast"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEditPair = () => {
    pairTitleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => pairTitleInputRef.current?.focus());
  };

  const customPairReady = Boolean(config?.customFrontR2Key && config?.customBackR2Key);
  const hasPairData = Boolean(
    config?.customFrontR2Key ||
      config?.customBackR2Key ||
      (config?.customPairTitle && config.customPairTitle.trim()) ||
      (config?.customTemplateDropdownLabel && config.customTemplateDropdownLabel.trim())
  );

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
        {t("configLoadErrorInline")}
      </div>
    );
  }

  const displayTitle =
    (config.customPairTitle && config.customPairTitle.trim()) ||
    (config.customTemplateDropdownLabel && config.customTemplateDropdownLabel.trim()) ||
    t("managementUntitled");

  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8 pb-10 sm:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxury-gold/75">
                <ImageIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-white/92 sm:text-[1.05rem]">
                  {t("sectionUploadTitle")}
                </h2>
                <p className={`mt-0.5 text-xs sm:text-[13px] ${helperTextClass}`}>{t("sectionUploadSubtitle")}</p>
              </div>
            </div>
            {customPairReady && (
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200/90">
                {t("badgeActive")}
              </span>
            )}
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
                  className="max-h-44 w-full max-w-[220px] rounded-md object-contain ring-1 ring-white/10"
                />
              ) : (
                <span className="text-xs text-white/35">{t("noCustomYet")}</span>
              )}
              {config.customFrontR2Key && (
                <button
                  type="button"
                  onClick={() => setConfirmDialog("deleteFront")}
                  disabled={!!uploading || !!deleting}
                  className="mt-3 inline-flex w-full max-w-[240px] touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/18 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  {t("deleteFront")}
                </button>
              )}
              <label className="mt-3 inline-flex min-h-[44px] w-full max-w-[240px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-xs font-semibold text-white/90 transition hover:border-luxury-gold/35 hover:bg-white/[0.1] sm:text-sm">
                <Upload className="h-3.5 w-3.5 shrink-0 text-luxury-gold/65" />
                {uploading === "front" ? t("uploading") : t("replaceUpload")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const input = e.target;
                    const f = input.files?.[0];
                    if (f) {
                      void handleUpload("front", f).finally(() => {
                        input.value = "";
                      });
                    }
                  }}
                  disabled={!!uploading || !!deleting}
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
                  className="max-h-44 w-full max-w-[220px] rounded-md object-contain ring-1 ring-white/10"
                />
              ) : (
                <span className="text-xs text-white/35">{t("noCustomYet")}</span>
              )}
              {config.customBackR2Key && (
                <button
                  type="button"
                  onClick={() => setConfirmDialog("deleteBack")}
                  disabled={!!uploading || !!deleting}
                  className="mt-3 inline-flex w-full max-w-[240px] touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/18 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  {t("deleteBack")}
                </button>
              )}
              <label className="mt-3 inline-flex min-h-[44px] w-full max-w-[240px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3.5 py-2.5 text-xs font-semibold text-white/90 transition hover:border-luxury-gold/35 hover:bg-white/[0.1] sm:text-sm">
                <Upload className="h-3.5 w-3.5 shrink-0 text-luxury-gold/65" />
                {uploading === "back" ? t("uploading") : t("replaceUpload")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const input = e.target;
                    const f = input.files?.[0];
                    if (f) {
                      void handleUpload("back", f).finally(() => {
                        input.value = "";
                      });
                    }
                  }}
                  disabled={!!uploading || !!deleting}
                />
              </label>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="min-w-0">
              <FieldLabel dense>{t("pairTitleFieldLabel")}</FieldLabel>
              <input
                ref={pairTitleInputRef}
                type="text"
                value={pairTitle}
                onChange={(e) => setPairTitle(e.target.value)}
                placeholder={t("pairTitlePlaceholder")}
                className={inputClass}
                maxLength={191}
                disabled={!!uploading || !!deleting}
              />
              <p className={`mt-2 ${helperTextClass}`}>{t("pairTitleHelp")}</p>
            </div>
            <div className="min-w-0">
              <FieldLabel dense>{t("templateNameFieldLabel")}</FieldLabel>
              <input
                type="text"
                value={templateDropdownName}
                onChange={(e) => setTemplateDropdownName(e.target.value)}
                placeholder={t("templateNamePlaceholder")}
                className={inputClass}
                maxLength={191}
                disabled={!!uploading || !!deleting}
              />
              <p className={`mt-2 ${helperTextClass}`}>{t("templateNameHelp")}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm ${helperTextClass}`}>{t("saveFooterHintMerged")}</p>
            <button
              type="submit"
              disabled={savingSettings || !!uploading || !!deleting}
              className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center rounded-xl bg-gradient-to-r from-[#e8c547] to-[#c9a227] px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_-6px_rgba(232,197,71,0.35)] transition hover:brightness-105 disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
            >
              {savingSettings ? t("savingSettings") : t("saveSettings")}
            </button>
          </div>
        </form>

        {(config.customFrontR2Key || config.customBackR2Key) && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                  {t("manageTemplatesTitle")}
                </p>
                <p className={`mt-1 max-w-2xl text-xs sm:text-[13px] ${helperTextClass}`}>{t("resetHint")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDialog("deleteAll")}
              disabled={!!uploading || !!deleting}
              className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/12 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-500/20 disabled:opacity-50 sm:w-auto sm:self-start"
            >
              <Trash2 className="h-4 w-4 shrink-0 opacity-90" />
              {deleting === "all" && confirmDialog === "deleteAll" ? t("resetting") : t("resetToDefault")}
            </button>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-luxury-gold/80 sm:h-9 sm:w-9">
              <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="min-w-0 text-[0.9375rem] font-semibold leading-snug tracking-tight text-white/92 sm:text-base">
                {t("managementSectionTitle")}
              </h2>
              <p className={`mt-1 ${helperTextClass}`}>{t("managementSectionLead")}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          {!hasPairData ? (
            <p className={`rounded-xl border border-white/[0.06] bg-black/30 px-4 py-8 text-center text-sm ${helperTextClass}`}>
              {t("managementEmpty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.035] to-transparent">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-black/50">
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:px-5"
                      >
                        {t("managementColTitle")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:px-5"
                      >
                        {t("managementColFront")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:px-5"
                      >
                        {t("managementColBack")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:px-5"
                      >
                        {t("managementColActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/[0.05] bg-black/20">
                      <td className="max-w-[220px] px-4 py-4 align-middle sm:px-5">
                        <p className="font-medium leading-snug text-white">{displayTitle}</p>
                      </td>
                      <td className="px-4 py-4 align-middle sm:px-5">
                        {frontPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={frontPreview}
                            alt=""
                            className="h-16 w-auto max-w-[100px] rounded-md object-contain ring-1 ring-white/10"
                          />
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle sm:px-5">
                        {backPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={backPreview}
                            alt=""
                            className="h-16 w-auto max-w-[100px] rounded-md object-contain ring-1 ring-white/10"
                          />
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right align-middle sm:px-5">
                        <div className="inline-flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-black/30 p-0.5">
                          <button
                            type="button"
                            onClick={handleEditPair}
                            disabled={!!deleting}
                            className="inline-flex rounded-lg p-2 text-white/55 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35"
                            aria-label={t("managementEditAria")}
                            title={t("managementEditAria")}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDialog("deleteAll")}
                            disabled={!!deleting}
                            className="inline-flex rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300 disabled:pointer-events-none disabled:opacity-35"
                            aria-label={t("managementDeleteAria")}
                            title={t("managementDeleteAria")}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <Modal
        open={confirmDialog !== null}
        onClose={() => !deleting && setConfirmDialog(null)}
        title={t("confirmTitle")}
      >
        <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/95">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400/90" />
          <p className="leading-relaxed">
            {confirmDialog === "deleteFront" && t("deleteFrontConfirm")}
            {confirmDialog === "deleteBack" && t("deleteBackConfirm")}
            {confirmDialog === "deleteAll" && t("deleteAllConfirm")}
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-[44px] rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/5"
            onClick={() => !deleting && setConfirmDialog(null)}
            disabled={!!deleting}
          >
            {t("confirmCancel")}
          </button>
          <button
            type="button"
            disabled={!!deleting}
            className="min-h-[44px] rounded-xl bg-red-600/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            onClick={() => {
              if (confirmDialog === "deleteFront") void runDeleteSide("front");
              else if (confirmDialog === "deleteBack") void runDeleteSide("back");
              else if (confirmDialog === "deleteAll") void runClearAll();
            }}
          >
            {deleting ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t("confirmDelete")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
