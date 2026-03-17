"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { getR2UrlClient } from "@/utils/r2-url";
import { useSearchParams } from "next/navigation";

type JournalItem = {
  id: number;
  slug: string;
  titleId: string;
  titleEn: string;
  contentId: string;
  contentEn: string;
  excerptId: string | null;
  excerptEn: string | null;
  heroImageR2Key: string | null;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const defaultItem: Partial<JournalItem> = {
  slug: "",
  titleId: "",
  titleEn: "",
  contentId: "",
  contentEn: "",
  excerptId: "",
  excerptEn: "",
  heroImageR2Key: null,
  publishedAt: null,
  sortOrder: 0,
};

export function JournalPageClient() {
  const t = useTranslations("admin.journal");
  const searchParams = useSearchParams();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JournalItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string | number | null>>({ ...defaultItem } as Record<string, string | number | null>);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/journal");
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Allow deep-link from public page: /admin/journal?new=1 or ?edit=<id>
  useEffect(() => {
    if (loading) return;
    const wantsNew = searchParams.get("new");
    const editId = searchParams.get("edit");
    if (wantsNew === "1" && !modalOpen) {
      openCreate();
      return;
    }
    if (editId && !modalOpen) {
      const id = parseInt(editId, 10);
      if (!Number.isNaN(id)) {
        const row = items.find((it) => it.id === id);
        if (row) openEdit(row);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, items, searchParams]);

  const getHeroPreview = (r2Key: string | null | undefined): string | null => {
    if (!r2Key) return null;
    const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
    if (base) return `${base}/${r2Key}`;
    // dev fallback: best-effort map known keys under static/ to / (public)
    if (r2Key.startsWith("static/")) return `/${r2Key.slice("static/".length)}`;
    return null;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...defaultItem } as Record<string, string | number | null>);
    setHeroFile(null);
    setHeroPreviewUrl(null);
    setModalOpen(true);
  };

  const openEdit = (row: JournalItem) => {
    setEditing(row);
    setForm({
      slug: row.slug,
      titleId: row.titleId,
      titleEn: row.titleEn,
      contentId: row.contentId,
      contentEn: row.contentEn,
      excerptId: row.excerptId ?? "",
      excerptEn: row.excerptEn ?? "",
      heroImageR2Key: row.heroImageR2Key,
      publishedAt: row.publishedAt ?? null,
      sortOrder: row.sortOrder,
    });
    setHeroFile(null);
    setHeroPreviewUrl(getHeroPreview(row.heroImageR2Key));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setHeroFile(null);
    setHeroPreviewUrl(null);
  };

  const uploadHero = async (): Promise<string | null> => {
    if (!heroFile) return (form.heroImageR2Key as string) || null;
    setUploadingHero(true);
    try {
      const fd = new FormData();
      fd.set("file", heroFile);
      const res = await fetch("/api/admin/journal/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      return data.r2Key ?? null;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
      return (form.heroImageR2Key as string) || null;
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = String(form.slug ?? "").trim();
    const titleId = String(form.titleId ?? "").trim();
    const titleEn = String(form.titleEn ?? "").trim();
    const contentId = String(form.contentId ?? "").trim();
    const contentEn = String(form.contentEn ?? "").trim();
    if (!titleId || !titleEn || !contentId || !contentEn) {
      alert("Title (ID & EN) and Content (ID & EN) are required.");
      return;
    }
    const excerptId = String(form.excerptId ?? "").trim();
    const excerptEn = String(form.excerptEn ?? "").trim();
    if ((!!excerptId) !== (!!excerptEn)) {
      alert("Excerpt must be filled in both languages (ID & EN), or left empty for both.");
      return;
    }

    setSaving(true);
    try {
      const heroR2Key = await uploadHero();
      const payload = {
        slug: slug || undefined,
        titleId,
        titleEn,
        contentId,
        contentEn,
        excerptId: excerptId ? excerptId : undefined,
        excerptEn: excerptEn ? excerptEn : undefined,
        heroImageR2Key: heroR2Key || undefined,
        publishedAt: form.publishedAt === "true" ? true : (form.publishedAt && String(form.publishedAt).trim() ? form.publishedAt : null),
        sortOrder: typeof form.sortOrder === "number" ? form.sortOrder : parseInt(String(form.sortOrder), 10) || 0,
      };

      if (editing) {
        const res = await fetch(`/api/admin/journal/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Update failed");
        }
      } else {
        const res = await fetch("/api/admin/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Create failed");
        }
      }
      closeModal();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this journal post?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/journal/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch {
      alert("Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminPageLayout eyebrow="Admin" title={t("title")}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">{t("title")}</h1>
          <button
            type="button"
            onClick={openCreate}
            aria-label={t("newPost")}
            title={t("newPost")}
            className="inline-flex items-center gap-2 rounded-lg bg-luxury-gold/20 px-4 py-2 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/30"
          >
            <Plus className="h-4 w-4" />
            {t("newPost")}
          </button>
        </div>

        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-white/50">{t("noPosts")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/60">{t("titleLabel")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/60">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/60">{t("status")}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/60">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white/90">{row.titleEn || row.titleId}</td>
                    <td className="px-4 py-3 text-sm text-white/60">{row.slug}</td>
                    <td className="px-4 py-3 text-sm">{row.publishedAt ? <span className="text-emerald-400">{t("published")}</span> : <span className="text-white/40">{t("draft")}</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        aria-label={t("editPost")}
                        title={t("editPost")}
                        className="mr-2 rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        aria-label={t("deletePost")}
                        title={t("deletePost")}
                        className="rounded p-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0c0c0c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">{editing ? t("editPost") : t("newPost")}</h2>
              <button type="button" onClick={closeModal} className="rounded p-2 text-white/60 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/60">{t("titleId")}</label>
                  <input
                    type="text"
                    value={String(form.titleId ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, titleId: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/60">{t("titleEn")}</label>
                  <input
                    type="text"
                    value={String(form.titleEn ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Slug (optional, auto from title)</label>
                <input
                  type="text"
                  value={String(form.slug ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g. company-news-march-2025"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/60">{t("excerptId")}</label>
                  <input
                    type="text"
                    value={String(form.excerptId ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, excerptId: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/60">{t("excerptEn")}</label>
                  <input
                    type="text"
                    value={String(form.excerptEn ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, excerptEn: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">{t("contentId")}</label>
                <textarea
                  value={String(form.contentId ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, contentId: e.target.value }))}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">{t("contentEn")}</label>
                <textarea
                  value={String(form.contentEn ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, contentEn: e.target.value }))}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">{t("heroImage")}</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70 hover:bg-white/10">
                    <Upload className="h-4 w-4" />
                    {heroFile ? heroFile.name : (form.heroImageR2Key ? "Replace image" : "Choose image")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setHeroFile(f ?? null);
                        if (f) setHeroPreviewUrl(URL.createObjectURL(f));
                      }}
                    />
                  </label>
                  {uploadingHero && <span className="text-sm text-white/50">Uploading…</span>}
                </div>
                {(heroPreviewUrl || form.heroImageR2Key) && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <img
                      src={heroPreviewUrl ?? getHeroPreview(form.heroImageR2Key as string) ?? getR2UrlClient("/images/hero-fallback.jpg")}
                      alt=""
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                    {form.heroImageR2Key && (
                      <div className="px-3 py-2 text-[11px] text-white/50">
                        R2 key: <span className="font-mono text-white/60">{String(form.heroImageR2Key)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={form.publishedAt === "true" || (!!form.publishedAt && String(form.publishedAt).trim() !== "")}
                    onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.checked ? "true" : null }))}
                    className="rounded border-white/20"
                  />
                  {t("published")}
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white/60">{t("sortOrder")}</label>
                  <input
                    type="number"
                    value={form.sortOrder ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                    className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <button type="button" onClick={closeModal} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-luxury-gold/90 px-4 py-2 text-sm font-medium text-black hover:bg-luxury-gold disabled:opacity-50">
                  {saving ? "Saving…" : editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
