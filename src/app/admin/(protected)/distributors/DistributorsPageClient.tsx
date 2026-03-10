"use client";

import { DistributorForm } from "@/components/admin/DistributorForm";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
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

  const actions = (
    <button
      type="button"
      onClick={openCreate}
      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:border-[#FFD700]/30 hover:bg-[#FFD700]/10 touch-manipulation whitespace-nowrap inline-flex items-center gap-2 transition"
    >
      <Plus className="h-4 w-4" />
      {t("addDistributor")}
    </button>
  );

  return (
    <AdminPageLayout
      eyebrow="Admin"
      title={t("title")}
      actions={actions}
    >
      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-white/50 text-sm">
            Loading…
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-white/50">
            {t("noDistributors")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.04]">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("distributorName")}</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("storeName")}</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("city")}</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("phone")}</th>
                  <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/60">{t("status")}</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/60 w-28">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-white/[0.04]">
                    <td className="px-5 py-3.5 font-medium text-white/90">{row.distributorName}</td>
                    <td className="px-5 py-3.5 text-white/80">{row.storeName}</td>
                    <td className="px-5 py-3.5 text-white/80">{row.city}</td>
                    <td className="px-5 py-3.5 text-white/80">{row.phone}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-medium border ${
                          row.status === "ACTIVE"
                            ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-400"
                            : "border-white/10 bg-white/5 text-white/60"
                        }`}
                      >
                        {row.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-lg border border-white/20 p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
                          title={t("edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="rounded-lg border border-red-400/30 p-2 text-red-300/80 hover:bg-red-500/20 hover:text-red-300 transition disabled:opacity-50"
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
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-black/95 backdrop-blur-xl p-6 shadow-2xl"
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
    </AdminPageLayout>
  );
}
