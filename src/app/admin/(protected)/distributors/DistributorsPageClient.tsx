"use client";

import { DistributorForm } from "@/components/admin/DistributorForm";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";

export type DistributorRow = {
  id: number;
  distributorName: string;
  storeName: string;
  address: string;
  city: string;
  phone: string;
  mapLink: string | null;
  status: string;
};

export function DistributorsPageClient() {
  const t = useTranslations("admin.distributorsDetail");
  const [list, setList] = useState<DistributorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DistributorRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/distributors");
      if (!res.ok) return;
      const data = await res.json();
      setList(Array.isArray(data.distributors) ? data.distributors : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: DistributorRow) => {
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
    const payload = {
      distributorName: String(formData.get("distributorName") ?? "").trim(),
      storeName: String(formData.get("storeName") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      mapLink: String(formData.get("mapLink") ?? "").trim() || null,
      status: formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };
    if (!payload.distributorName || !payload.storeName || !payload.address || !payload.city || !payload.phone) {
      alert(t("saveFailed"));
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editing;
      const url = isEdit ? `/api/admin/distributors/${editing!.id}` : "/api/admin/distributors";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("saveFailed"));
      }
      closeModal();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("deleteConfirm"))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/distributors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("deleteFailed"));
      await load();
    } catch {
      alert(t("deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-white/60">{t("title")}</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">{t("title")}</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full border border-white/15 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm text-white hover:border-white/40 touch-manipulation whitespace-nowrap inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("addDistributor")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-admin">
        {loading ? (
          <div className="text-white/50 text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <p className="text-white/50">{t("noDistributors")}</p>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium text-white/80">{t("distributorName")}</th>
                  <th className="px-4 py-3 font-medium text-white/80">{t("storeName")}</th>
                  <th className="px-4 py-3 font-medium text-white/80">{t("city")}</th>
                  <th className="px-4 py-3 font-medium text-white/80">{t("phone")}</th>
                  <th className="px-4 py-3 font-medium text-white/80">{t("status")}</th>
                  <th className="px-4 py-3 font-medium text-white/80 w-28">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90">{row.distributorName}</td>
                    <td className="px-4 py-3 text-white/80">{row.storeName}</td>
                    <td className="px-4 py-3 text-white/80">{row.city}</td>
                    <td className="px-4 py-3 text-white/80">{row.phone}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                          row.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {row.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded border border-white/20 p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                          title={t("edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded border border-red-400/30 p-1.5 text-red-300/80 hover:bg-red-500/20 hover:text-red-300 transition disabled:opacity-50"
                          title={t("delete")}
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

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0a0a0a] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editing ? t("edit") : t("addDistributor")}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <DistributorForm
              defaultValues={editing}
              onSubmit={handleSubmit}
              onCancel={closeModal}
              saving={saving}
            />
          </div>
        </div>
      )}
    </div>
  );
}
