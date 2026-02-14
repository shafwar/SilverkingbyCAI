"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MapPin, Phone, Store, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { fetcher } from "@/lib/fetcher";

type Distributor = {
  id: number;
  name: string;
  storeName: string | null;
  address: string;
  phone: string;
  mapUrl: string | null;
  city: string;
  displayOrder: number;
};

export function DistributorPanel() {
  const t = useTranslations("admin.distributors");
  const tCommon = useTranslations("common");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [form, setForm] = useState({
    name: "",
    storeName: "",
    address: "",
    phone: "",
    mapUrl: "",
    city: "",
    displayOrder: 0,
  });

  const { data: distributors = [], mutate } = useSWR<Distributor[]>(
    "/api/admin/distributors",
    fetcher
  );

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      storeName: "",
      address: "",
      phone: "",
      mapUrl: "",
      city: "",
      displayOrder: 0,
    });
    setEditing(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (d: Distributor) => {
    setForm({
      name: d.name,
      storeName: d.storeName || "",
      address: d.address,
      phone: d.phone,
      mapUrl: d.mapUrl || "",
      city: d.city,
      displayOrder: d.displayOrder,
    });
    setEditing(d);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        storeName: form.storeName || null,
        address: form.address,
        phone: form.phone,
        mapUrl: form.mapUrl || null,
        city: form.city,
        displayOrder: form.displayOrder,
      };

      if (editing) {
        const res = await fetch(`/api/admin/distributors/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success(t("updated"));
      } else {
        const res = await fetch("/api/admin/distributors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create");
        toast.success(t("created"));
      }
      setModalOpen(false);
      resetForm();
      mutate();
    } catch {
      toast.error(t("error"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/admin/distributors/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(t("deleted"));
      mutate();
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/50">{t("eyebrow")}</p>
          <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
          <p className="mt-1 text-sm text-white/70">{t("description")}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-luxury-gold/40 bg-luxury-gold/10 px-4 py-3 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/20 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t("add")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {distributors.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="font-semibold text-white">{d.name}</h3>
                {d.storeName && (
                  <p className="text-sm text-white/60 flex items-center gap-1 mt-0.5">
                    <Store className="h-3.5 w-3.5" />
                    {d.storeName}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                {d.city}
              </span>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-luxury-gold/70" />
                <span>{d.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 text-luxury-gold/70" />
                <a href={`tel:${d.phone}`} className="hover:text-luxury-gold transition-colors">
                  {d.phone}
                </a>
              </p>
              {d.mapUrl && (
                <a
                  href={d.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-luxury-gold/80 hover:text-luxury-gold text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("viewOnMap")}
                </a>
              )}
            </div>
            <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEdit(d)}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                {tCommon("edit")}
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tCommon("delete")}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {distributors.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-12 text-center">
          <p className="text-white/50">{t("empty")}</p>
          <button
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-luxury-gold/40 bg-luxury-gold/10 px-4 py-2 text-sm text-luxury-gold hover:bg-luxury-gold/20"
          >
            <Plus className="h-4 w-4" />
            {t("add")}
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-black p-6 shadow-2xl"
          >
            <h3 className="text-xl font-semibold text-white mb-6">
              {editing ? t("editTitle") : t("createTitle")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {t("form.name")} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-luxury-gold/50 focus:outline-none"
                  placeholder="Youceu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {t("form.storeName")}
                </label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-luxury-gold/50 focus:outline-none"
                  placeholder="Toko Kang Emas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {t("form.address")} *
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  required
                  rows={2}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-luxury-gold/50 focus:outline-none resize-none"
                  placeholder="Jl Ahmad Yani No 161, Sumur Bandung - Kebon Pisang, Kosambi, Bandung"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {t("form.phone")} *
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-luxury-gold/50 focus:outline-none"
                  placeholder="082297131527"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  {t("form.mapUrl")}
                </label>
                <input
                  type="url"
                  value={form.mapUrl}
                  onChange={(e) => setForm((f) => ({ ...f, mapUrl: e.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-luxury-gold/50 focus:outline-none"
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    {t("form.city")} *
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-luxury-gold/50 focus:outline-none"
                    placeholder="Bandung"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    {t("form.displayOrder")}
                  </label>
                  <input
                    type="number"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value, 10) || 0 }))
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:border-luxury-gold/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/5"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-luxury-gold/80 px-4 py-2.5 text-sm font-semibold text-black hover:bg-luxury-gold"
                >
                  {editing ? tCommon("save") : t("add")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
