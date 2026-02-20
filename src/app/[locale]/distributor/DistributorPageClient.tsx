"use client";

import Navbar from "@/components/layout/Navbar";
import { DistributorCard, type DistributorItem } from "@/components/distributor/DistributorCard";
import { DistributorForm } from "@/components/admin/DistributorForm";
import { AdminEditContentLink } from "@/components/admin/AdminEditContentLink";
import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

const HERO_FALLBACK_PATH = "/images/hero-fallback.jpg";

const revealVariants: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.15 },
  },
};

type DistributorPageClientProps = {
  initialDistributors?: DistributorItem[];
  heroImageUrl: string;
};

export default function DistributorPageClient({
  initialDistributors = [],
  heroImageUrl: initialHeroImageUrl,
}: DistributorPageClientProps) {
  const t = useTranslations("distributor");
  const [distributors, setDistributors] = useState<DistributorItem[]>(
    initialDistributors
  );
  const [loading, setLoading] = useState(initialDistributors.length === 0);
  const [heroImageError, setHeroImageError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DistributorItem | null>(null);
  const [saving, setSaving] = useState(false);

  const refetchDistributors = useCallback(async () => {
    try {
      const res = await fetch("/api/distributors");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.distributors)) {
        setDistributors(data.distributors);
      }
    } catch {
      setDistributors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialDistributors.length > 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/distributors");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.distributors)) {
          setDistributors(data.distributors);
        }
      } catch (e) {
        if (!cancelled) setDistributors([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [initialDistributors.length]);

  useEffect(() => {
    let cancelled = false;
    const loadAdmin = async () => {
      try {
        const res = await fetch("/api/admin/me");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.isAdmin) setIsAdmin(true);
      } catch {
        // silent
      }
    };
    void loadAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: DistributorItem) => {
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      closeModal();
      await refetchDistributors();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const displayHeroUrl = heroImageError ? HERO_FALLBACK_PATH : initialHeroImageUrl;
  const isExternalHero = displayHeroUrl.startsWith("http");

  return (
    <div className="min-h-screen bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white">
      {/* Hero background: selalu gambar public/images/DSC02998.JPG (via R2 atau path lokal) */}
      <div
        className="fixed inset-0 z-0 w-screen h-screen overflow-hidden"
        style={{
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-black/95 to-luxury-black z-0" />

        <Image
          src={displayHeroUrl}
          alt=""
          fill
          className="object-cover z-10"
          sizes="100vw"
          priority
          unoptimized={isExternalHero}
          onError={() => setHeroImageError(true)}
        />

        {/* Vignette and overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_60%,rgba(0,0,0,0.85)_100%)] z-20" />
        <div className="absolute inset-x-0 top-0 h-32 md:h-40 lg:h-48 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-48 md:h-56 lg:h-64 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-y-0 left-0 w-32 md:w-40 lg:w-48 bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none z-20" />
        <div className="absolute inset-y-0 right-0 w-32 md:w-40 lg:w-48 bg-gradient-to-l from-black/70 via-black/30 to-transparent pointer-events-none z-20" />
      </div>

      <Navbar />

      {/* Hero Section – same height and layout as Products (min-h-screen, left-aligned) */}
      <section className="relative flex min-h-screen items-center justify-start overflow-hidden">
        <div className="relative z-20 w-full text-left pl-4 sm:pl-6 md:pl-8 lg:pl-12 xl:pl-16 2xl:pl-20 pr-4 sm:pr-6 md:pr-8 lg:pr-12">
          <motion.div
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="space-y-6 sm:space-y-8 max-w-4xl"
          >
            <motion.h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-sans font-light leading-[1.1] tracking-tight text-white"
            >
              {t("hero.title")}
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg md:text-xl font-sans font-light leading-relaxed text-luxury-silver/90 max-w-2xl"
            >
              {t("hero.subtitle")}
            </motion.p>
          </motion.div>
        </div>

        {/* Scroll indicator – same as Products */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 pointer-events-none">
          <div className="relative w-5 h-8 border border-white/50 rounded-full flex items-start justify-center pt-2.5">
            <div className="w-1 h-1.5 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="relative py-12 md:py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/80 text-base md:text-lg leading-relaxed">
              {t("description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Distributor Cards */}
      <section className="relative pb-20 md:pb-28">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <motion.div
            className="mb-8 md:mb-12 text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-4">
              <h2 className="text-xl md:text-2xl font-light text-white">
                {t("listTitle")}
              </h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-luxury-gold/40 bg-luxury-gold/10 px-4 py-2 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/20 transition-colors"
                  title={t("addDistributor")}
                  aria-label={t("addDistributor")}
                >
                  <Plus className="h-5 w-5" />
                  {t("addDistributor")}
                </button>
              )}
            </div>
            <p className="mt-2 text-sm md:text-base text-white/60 max-w-2xl mx-auto">
              {t("listSubtitle")}
            </p>
            {!loading && (
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                {t("countDistributors", { count: distributors.length })}
              </p>
            )}
          </motion.div>
          {loading ? (
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 h-72 animate-pulse"
                />
              ))}
            </div>
          ) : distributors.length === 0 ? (
            <motion.div
              className="text-center py-16 rounded-2xl border border-white/10 bg-white/[0.02]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-lg text-white/50">{t("noDistributors")}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-luxury-gold/40 bg-luxury-gold/10 px-4 py-2 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/20 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  {t("addDistributor")}
                </button>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              {distributors.map((d, i) => (
                <DistributorCard
                  key={d.id}
                  data={d}
                  index={i}
                  showEditButton={isAdmin}
                  onEdit={isAdmin ? openEdit : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal Add / Edit (admin only) */}
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
                {editing ? t("card.edit") : t("addDistributor")}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-white/60 hover:text-white hover:bg-white/10 transition"
                aria-label="Close"
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
      <AdminEditContentLink pageName="distributor" />
    </div>
  );
}
