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

function previewApiUrl(side: "front" | "back", cacheKey: number): string {
  return `/api/admin/serticard/preview?side=${side}&t=${cacheKey}`;
}

const shellClass =
  "rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:rounded-2xl";

const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-3 text-base text-white placeholder:text-white/25 outline-none transition focus:border-luxury-gold/40 focus:ring-2 focus:ring-luxury-gold/12 sm:py-2.5 sm:text-sm";

const helperTextClass = "text-[0.8125rem] leading-relaxed text-white/48 sm:text-sm sm:text-white/50";

const stepBadgeClass =
  "inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-md border border-luxury-gold/35 bg-luxury-gold/10 px-1.5 text-[10px] font-bold tabular-nums text-luxury-gold/95";

type ConfirmDialog = null | "deletePersisted" | "deleteFront" | "deleteBack";

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
  const [uploading, setUploading] = useState<"front" | "back" | null>(null);
  const [deleting, setDeleting] = useState<"front" | "back" | "all" | null>(null);
  const [thumbEpoch, setThumbEpoch] = useState(0);
  const [templateDropdownName, setTemplateDropdownName] = useState("");
  const [pairTitle, setPairTitle] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
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
      /** Draft text fields stay empty on load; previews follow server keys only. */
      setTemplateDropdownName("");
      setPairTitle("");
      setThumbEpoch(Date.now());
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

  const busy = !!uploading || deleting !== null;

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
      setThumbEpoch(Date.now());
      toast.success(side === "front" ? t("uploadFrontOk") : t("uploadBackOk"));
      await fetchConfig();
      notifyConfigUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("uploadFailedToast"));
    } finally {
      setUploading(null);
    }
  };

  const clearFormState = () => {
    setTemplateDropdownName("");
    setPairTitle("");
    toast.success(t("formResetOnlyToast"));
  };

  const runDeleteOneSide = async (side: "front" | "back") => {
    setDeleting(side);
    try {
      const body = side === "front" ? { deleteCustomFront: true } : { deleteCustomBack: true };
      const res = await fetch("/api/admin/serticard/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      setThumbEpoch(Date.now());
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

  const runDeletePersisted = async () => {
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
      setPairTitle("");
      setTemplateDropdownName("");
      setThumbEpoch(Date.now());
      toast.success(t("settingsSavedFreshToast"));
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

  const confirmModalBody =
    confirmDialog === "deletePersisted"
      ? t("deleteAllConfirm")
      : confirmDialog === "deleteFront"
        ? t("deleteFrontConfirm")
        : confirmDialog === "deleteBack"
          ? t("deleteBackConfirm")
          : "";

  const confirmModalAction = () => {
    if (confirmDialog === "deletePersisted") void runDeletePersisted();
    else if (confirmDialog === "deleteFront") void runDeleteOneSide("front");
    else if (confirmDialog === "deleteBack") void runDeleteOneSide("back");
  };

  const deletingLabel =
    deleting === "all" ? t("resetting") : deleting === "front" || deleting === "back" ? t("deleting") : null;

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-8 sm:space-y-10 pb-10 sm:pb-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className={clsx(shellClass, "overflow-hidden")}
      >
        <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-luxury-gold/80">
                <ImageIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={stepBadgeClass}>1</span>
                  <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {t("sectionUploadTitle")}
                  </h2>
                </div>
                <p className={`max-w-2xl text-sm ${helperTextClass}`}>{t("sectionUploadSubtitle")}</p>
              </div>
            </div>
            {customPairReady && (
              <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-100/95">
                {t("badgeActive")}
              </span>
            )}
          </div>
        </div>

        <div className="grid min-w-0 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Front column */}
          <div className="flex min-h-0 min-w-0 flex-col p-4 sm:p-6">
            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold text-white sm:text-[0.9375rem]">{t("frontFieldLabel")}</p>
              <p className={`text-sm leading-relaxed ${helperTextClass}`} title={t("frontHint")}>
                {t("frontHint")}
              </p>
            </div>
            <div className="flex flex-1 flex-col rounded-xl border border-dashed border-white/[0.1] bg-black/40 p-4 sm:p-5">
              <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3">
                {config.customFrontR2Key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewApiUrl("front", thumbEpoch)}
                    alt=""
                    className="max-h-52 w-full max-w-[260px] rounded-lg object-contain shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                  />
                ) : (
                  <p className="text-center text-sm text-white/40">{t("noCustomYet")}</p>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {config.customFrontR2Key && (
                  <button
                    type="button"
                    onClick={() => setConfirmDialog("deleteFront")}
                    disabled={busy}
                    className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-100 disabled:opacity-45 sm:min-w-[140px] sm:flex-none"
                  >
                    <Trash2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    {t("deleteFront")}
                  </button>
                )}
                <label
                  className={clsx(
                    "inline-flex min-h-[44px] flex-1 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border border-luxury-gold/30 bg-gradient-to-r from-[#e8c547]/90 to-[#c9a227]/90 px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 sm:min-w-[160px] sm:flex-none",
                    busy && "pointer-events-none opacity-45"
                  )}
                >
                  <Upload className="h-4 w-4 shrink-0" aria-hidden />
                  {uploading === "front" ? t("uploading") : t("replaceUpload")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="sr-only"
                    onChange={(e) => {
                      const input = e.target;
                      const f = input.files?.[0];
                      if (f) {
                        void handleUpload("front", f).finally(() => {
                          input.value = "";
                        });
                      }
                    }}
                    disabled={busy}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Back column */}
          <div className="flex min-h-0 min-w-0 flex-col p-4 sm:p-6 sm:pl-6">
            <div className="mb-4 space-y-2">
              <p className="text-sm font-semibold text-white sm:text-[0.9375rem]">{t("backFieldLabel")}</p>
              <p className={`text-sm leading-relaxed ${helperTextClass}`} title={t("backHint")}>
                {t("backHint")}
              </p>
            </div>
            <div className="flex flex-1 flex-col rounded-xl border border-dashed border-white/[0.1] bg-black/40 p-4 sm:p-5">
              <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3">
                {config.customBackR2Key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewApiUrl("back", thumbEpoch)}
                    alt=""
                    className="max-h-52 w-full max-w-[260px] rounded-lg object-contain shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                  />
                ) : (
                  <p className="text-center text-sm text-white/40">{t("noCustomYet")}</p>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {config.customBackR2Key && (
                  <button
                    type="button"
                    onClick={() => setConfirmDialog("deleteBack")}
                    disabled={busy}
                    className="inline-flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:border-red-400/35 hover:bg-red-500/10 hover:text-red-100 disabled:opacity-45 sm:min-w-[140px] sm:flex-none"
                  >
                    <Trash2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    {t("deleteBack")}
                  </button>
                )}
                <label
                  className={clsx(
                    "inline-flex min-h-[44px] flex-1 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border border-luxury-gold/30 bg-gradient-to-r from-[#e8c547]/90 to-[#c9a227]/90 px-4 py-2.5 text-sm font-semibold text-black shadow-sm transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-45 sm:min-w-[160px] sm:flex-none",
                    busy && "pointer-events-none opacity-45"
                  )}
                >
                  <Upload className="h-4 w-4 shrink-0" aria-hidden />
                  {uploading === "back" ? t("uploading") : t("replaceUpload")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="sr-only"
                    onChange={(e) => {
                      const input = e.target;
                      const f = input.files?.[0];
                      if (f) {
                        void handleUpload("back", f).finally(() => {
                          input.value = "";
                        });
                      }
                    }}
                    disabled={busy}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="border-t border-white/[0.06] bg-black/20 px-4 py-5 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <span className={stepBadgeClass}>2</span>
            <p className="text-sm font-semibold leading-snug text-white/88 sm:text-base">
              {t("pairTitleFieldLabel")}
              <span className="mx-1.5 text-white/30">/</span>
              {t("templateNameFieldLabel")}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
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
                disabled={busy}
              />
              <p className={`mt-2 text-xs sm:text-[0.8125rem] ${helperTextClass}`}>{t("pairTitleHelp")}</p>
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
                disabled={busy}
              />
              <p className={`mt-2 text-xs sm:text-[0.8125rem] ${helperTextClass}`}>{t("templateNameHelp")}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-4 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-end sm:justify-between">
            <p className={`max-w-xl text-sm ${helperTextClass}`}>{t("saveFooterHintMerged")}</p>
            <button
              type="submit"
              disabled={savingSettings || busy}
              className="inline-flex min-h-[44px] w-full shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-50 sm:w-auto sm:min-w-[180px]"
            >
              {savingSettings ? t("savingSettings") : t("saveSettings")}
            </button>
          </div>
        </form>

        {(pairTitle.trim() || templateDropdownName.trim()) && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className={`text-sm ${helperTextClass}`}>{t("resetHint")}</p>
            <button
              type="button"
              onClick={clearFormState}
              disabled={busy}
              className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:bg-amber-500/18 disabled:opacity-50 sm:w-auto"
            >
              <Trash2 className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {t("clearFormOnly")}
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
        <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-luxury-gold/80">
              <Tag className="h-5 w-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {t("managementSectionTitle")}
              </h2>
              <p className={`mt-1 max-w-2xl text-sm ${helperTextClass}`}>{t("managementSectionLead")}</p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {!hasPairData ? (
            <p
              className={`rounded-xl border border-white/[0.06] bg-black/30 px-5 py-10 text-center text-sm ${helperTextClass}`}
            >
              {t("managementEmpty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/25">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] bg-black/45">
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:px-5"
                      >
                        {t("managementColTitle")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:px-5"
                      >
                        {t("managementColFront")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:px-5"
                      >
                        {t("managementColBack")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:px-5"
                      >
                        {t("managementColActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/[0.05] bg-black/15">
                      <td className="max-w-[200px] px-4 py-4 align-middle sm:px-5">
                        <p className="font-medium leading-snug text-white">{displayTitle}</p>
                      </td>
                      <td className="px-4 py-4 align-middle sm:px-5">
                        {config.customFrontR2Key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewApiUrl("front", thumbEpoch)}
                            alt=""
                            className="h-16 w-auto max-w-[100px] rounded-md object-contain ring-1 ring-white/10"
                          />
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-middle sm:px-5">
                        {config.customBackR2Key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={previewApiUrl("back", thumbEpoch)}
                            alt=""
                            className="h-16 w-auto max-w-[100px] rounded-md object-contain ring-1 ring-white/10"
                          />
                        ) : (
                          <span className="text-white/35">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right align-middle sm:px-5">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/35 p-1">
                          <button
                            type="button"
                            onClick={handleEditPair}
                            disabled={deleting !== null}
                            className="inline-flex rounded-lg p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35"
                            aria-label={t("managementEditAria")}
                            title={t("managementEditAria")}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDialog("deletePersisted")}
                            disabled={deleting !== null}
                            className="inline-flex rounded-lg p-2.5 text-white/60 transition hover:bg-red-500/15 hover:text-red-200 disabled:pointer-events-none disabled:opacity-35"
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
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400/90" aria-hidden />
          <p className="leading-relaxed">{confirmModalBody}</p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="min-h-[44px] rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/5"
            onClick={() => !deleting && setConfirmDialog(null)}
            disabled={deleting !== null}
          >
            {t("confirmCancel")}
          </button>
          <button
            type="button"
            disabled={deleting !== null}
            className="min-h-[44px] rounded-xl bg-red-600/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
            onClick={confirmModalAction}
          >
            {deleting !== null ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                {deletingLabel}
              </span>
            ) : (
              t("confirmDelete")
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
