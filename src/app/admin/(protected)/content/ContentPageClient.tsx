"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X, RefreshCw } from "lucide-react";

type Bilingual = { id: string; en: string };
type Meta = {
  titleIdAuto?: boolean;
  titleEnAuto?: boolean;
  descriptionIdAuto?: boolean;
  descriptionEnAuto?: boolean;
};

type Entry = {
  id: number;
  pageName: string;
  sectionName: string;
  title: Bilingual;
  description: Bilingual | null;
  translationMeta: Meta | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

const PAGE_OPTIONS = [
  "home",
  "what-we-do",
  "authenticity",
  "products",
  "distributor",
  "about",
];

export function ContentPageClient() {
  const t = useTranslations("admin.contentDetail");
  const searchParams = useSearchParams();
  const pageFilter = searchParams.get("page")?.trim() || null;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [translationAvailable, setTranslationAvailable] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const load = async () => {
    try {
      const url = pageFilter
        ? `/api/admin/content?page=${encodeURIComponent(pageFilter)}`
        : "/api/admin/content";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setTranslationAvailable(data.translationAvailable === true);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [pageFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const defaultPageForCreate = pageFilter && PAGE_OPTIONS.includes(pageFilter) ? pageFilter : "";

  const openEdit = (row: Entry) => {
    setEditing(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const pageName = String(formData.get("pageName") ?? "").trim();
    const sectionName = String(formData.get("sectionName") ?? "").trim();
    const titleId = String(formData.get("titleId") ?? "").trim();
    const titleEn = String(formData.get("titleEn") ?? "").trim();
    const descriptionId = String(formData.get("descriptionId") ?? "").trim();
    const descriptionEn = String(formData.get("descriptionEn") ?? "").trim();
    const autoTranslate = formData.get("autoTranslate") === "on";

    if (!pageName || !sectionName) return;

    const payload = {
      pageName,
      sectionName,
      title: { id: titleId, en: titleEn },
      description:
        descriptionId || descriptionEn
          ? { id: descriptionId, en: descriptionEn }
          : null,
      autoTranslate: !!autoTranslate && translationAvailable,
    };

    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/admin/content/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || t("saveFailed"));
        }
      } else {
        const res = await fetch("/api/admin/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || t("saveFailed"));
        }
      }
      closeModal();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async (
    field: "title" | "description",
    fromLang: "id" | "en",
    entry: Entry
  ) => {
    const key = `${entry.id}-${field}-${fromLang}`;
    setRegenerating(key);
    try {
      const text =
        field === "title"
          ? fromLang === "id"
            ? entry.title.id
            : entry.title.en
          : entry.description
            ? fromLang === "id"
              ? entry.description.id
              : entry.description.en
            : "";
      if (!text.trim()) return;

      const res = await fetch("/api/admin/content/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, fromLang }),
      });
      if (!res.ok) throw new Error("Translate failed");
      const data = await res.json();
      const translated = data.translated ?? "";

      const updatePayload: Record<string, unknown> = {
        pageName: entry.pageName,
        sectionName: entry.sectionName,
        title: entry.title,
        description: entry.description,
      };
      if (field === "title") {
        updatePayload.title =
          fromLang === "id"
            ? { id: entry.title.id, en: translated }
            : { id: translated, en: entry.title.en };
        updatePayload.regenerateTitle = fromLang;
      } else if (entry.description) {
        updatePayload.description =
          fromLang === "id"
            ? { id: entry.description.id, en: translated }
            : { id: translated, en: entry.description.en };
        updatePayload.regenerateDescription = fromLang;
      }

      const patchRes = await fetch(`/api/admin/content/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!patchRes.ok) throw new Error("Update failed");
      await load();
    } catch {
      alert(t("saveFailed"));
    } finally {
      setRegenerating(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("saveFailed"));
      await load();
    } catch {
      alert(t("saveFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-luxury-gold";
  const labelClass = "block text-xs font-medium text-white/70 mb-1";

  return (
    <div className="space-y-4 sm:space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-white/60">
            {t("title")}
          </p>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">
            {t("title")}
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full border border-white/15 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm text-white hover:border-white/40 inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("addEntry")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="text-white/50 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <p className="text-white/50">{t("noEntries")}</p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium text-white/80">
                    {t("pageName")}
                  </th>
                  <th className="px-4 py-3 font-medium text-white/80">
                    {t("sectionName")}
                  </th>
                  <th className="px-4 py-3 font-medium text-white/80">
                    Title ID / EN
                  </th>
                  <th className="px-4 py-3 font-medium text-white/80 w-28">
                    {t("save")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90">{row.pageName}</td>
                    <td className="px-4 py-3 text-white/80">
                      {row.sectionName}
                    </td>
                    <td className="px-4 py-3 text-white/80 max-w-xs">
                      <div className="truncate">
                        ID: {row.title.id || "—"} | EN: {row.title.en || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded border border-white/20 p-1.5 text-white/70 hover:bg-white/10"
                          title={t("save")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded border border-red-400/30 p-1.5 text-red-300/80 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editing ? "Edit" : t("addEntry")}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t("pageName")}</label>
                  <select
                    name="pageName"
                    defaultValue={editing?.pageName ?? defaultPageForCreate}
                    required
                    className={inputClass}
                  >
                    {PAGE_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t("sectionName")}</label>
                  <input
                    name="sectionName"
                    defaultValue={editing?.sectionName}
                    required
                    placeholder="e.g. hero, intro"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>{t("titleId")}</label>
                <input
                  name="titleId"
                  defaultValue={editing?.title.id}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t("titleEn")}</label>
                <input
                  name="titleEn"
                  defaultValue={editing?.title.en}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t("descriptionId")}</label>
                <textarea
                  name="descriptionId"
                  defaultValue={editing?.description?.id}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className={labelClass}>{t("descriptionEn")}</label>
                <textarea
                  name="descriptionEn"
                  defaultValue={editing?.description?.en}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {translationAvailable && (
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" name="autoTranslate" className="rounded" />
                  {t("autoTranslate")}
                </label>
              )}

              {editing && translationAvailable && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs text-white/50 mr-2">
                    {t("regenerateTranslation")}:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRegenerate("title", "id", editing)}
                    disabled={!!regenerating || !editing.title.id}
                    className="rounded border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {regenerating === `${editing.id}-title-id` ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}{" "}
                    Title ID→EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRegenerate("title", "en", editing)}
                    disabled={!!regenerating || !editing.title.en}
                    className="rounded border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-50 inline-flex items-center gap-1"
                  >
                    {regenerating === `${editing.id}-title-en` ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}{" "}
                    Title EN→ID
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-luxury-gold px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
                >
                  {saving ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
