"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import { DistributorCard, type DistributorItem } from "@/components/distributor/DistributorCard";
import { DistributorForm } from "@/components/admin/DistributorForm";
import { HeroEditPortal } from "@/components/layout/HeroEditPortal";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { usePageSections } from "@/hooks/usePageSections";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";
import { VideoLoadGuard, ImageLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { PageFooter } from "@/components/footer/PageFooter";
import { ModalPortal } from "@/components/ui/ModalPortal";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Plus_Jakarta_Sans } from "next/font/google";

gsap.registerPlugin(ScrollTrigger);

const fontDistributor = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-distributor",
  display: "swap",
});

const HERO_FALLBACK_PATH = "/images/hero-fallback.jpg";

const revealVariants: Variants = {
  initial: { opacity: 0, y: 48 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
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
  const [distributors, setDistributors] = useState<DistributorItem[]>(initialDistributors);
  const [loading, setLoading] = useState(initialDistributors.length === 0);
  const [heroImageError, setHeroImageError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const {
    sections: pageSections,
    loading: sectionsLoading,
    refetch: refetchPageSections,
  } = usePageSections("distributor");
  const heroMediaType = pageSections.hero?.mediaType?.toUpperCase() ?? "IMAGE";
  const shouldLoadHeroVideo = useShouldLoadHeroVideo();
  /** Show hero immediately with server URL; only use CMS URL after sections load (better LCP, no black flash) */
  const displayHeroUrl = heroImageError
    ? HERO_FALLBACK_PATH
    : (sectionsLoading ? initialHeroImageUrl : (pageSections.hero?.url ?? initialHeroImageUrl));
  const displayHeroMediaType = sectionsLoading ? "IMAGE" : heroMediaType;
  const [editing, setEditing] = useState<DistributorItem | null>(null);
  const [saving, setSaving] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

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

  useGSAP(
    () => {
      if (!pageRef.current) return;
      const sections = sectionRefs.current.filter(Boolean);
      const ctx = gsap.context(() => {
        sections.forEach((el) => {
          if (!el) return;
          gsap.fromTo(
            el,
            { opacity: 0, y: 56 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 82%",
                end: "top 55%",
                scrub: 0.6,
              },
            }
          );
        });
      }, pageRef);
      return () => ctx.revert();
    },
    [distributors.length, loading]
  );

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
    if (
      !payload.distributorName ||
      !payload.storeName ||
      !payload.address ||
      !payload.city ||
      !payload.phone
    ) {
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

  return (
    <div
      ref={pageRef}
      className={`min-h-screen w-full max-w-full overflow-x-hidden bg-luxury-black text-white selection:bg-luxury-gold/20 selection:text-white ${fontDistributor.variable}`}
    >
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
        <div className="absolute inset-0 bg-luxury-black z-0" />

        {/* Hero: show image immediately (initialHeroImageUrl) so no black flash; CMS overlay when sections load */}
        <div className="absolute inset-[-6%] z-10 scale-90 md:scale-100 md:inset-0 origin-center overflow-hidden">
          {displayHeroMediaType === "VIDEO" ? (
            <VideoLoadGuard
              url={displayHeroUrl}
              version={pageSections.hero?.version}
              forcePoster={!shouldLoadHeroVideo}
              containerClassName="absolute inset-0 w-full h-full"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectFit: "cover" }}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />
          ) : (
            <ImageLoadGuard
              url={displayHeroUrl}
              version={sectionsLoading ? undefined : pageSections.hero?.version}
              containerClassName="absolute inset-0 w-full h-full"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectFit: "cover" }}
            alt=""
            priority
            onError={() => setHeroImageError(true)}
          />
          )}
        </div>
        {/* Overlay: darker center so title/subtitle don't clash with hero image; readable everywhere */}
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.4) 100%)",
          }}
        />
        <div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,0,0,0.25) 0%, transparent 70%)",
          }}
        />
      </div>

      <Navbar />

      {/* Hero edit: same pattern as Home (portal + delay, same Replace image pop-up) */}
      <HeroEditPortal
        page="distributor"
        section="hero"
        type="image"
        onUploadDone={refetchPageSections}
        editLabel="Edit photo"
      />

      {/* Hero Section – centered text so it doesn't clash with hero image; overlay keeps it readable */}
      <section className="relative flex h-screen min-h-0 flex-col justify-center overflow-hidden">
        <div className="relative z-20 w-full flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 pb-24 overflow-hidden">
          <motion.div
            variants={revealVariants}
            initial="initial"
            animate="animate"
            className="relative text-center max-w-4xl font-[family-name:var(--font-distributor)] overflow-hidden min-h-0"
          >
            {/* Subtle backdrop so text never clashes with busy hero image */}
            <div
              className="absolute inset-0 -inset-x-8 rounded-2xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.08) 50%, transparent 70%)",
              }}
            />
            <div className="relative space-y-4 sm:space-y-6">
              <motion.h1
                variants={revealVariants}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.08] tracking-tight drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]"
              >
                <span className="bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent">
            {t("hero.title")}
                </span>
          </motion.h1>
          <motion.p
                variants={revealVariants}
                className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-white/95 max-w-2xl mx-auto drop-shadow-[0_1px_16px_rgba(0,0,0,0.5)]"
          >
            {t("hero.subtitle")}
          </motion.p>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator – same as Products */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 pointer-events-none shrink-0">
          <div className="relative w-5 h-8 border border-white/50 rounded-full flex items-start justify-center pt-2.5">
            <div className="w-1 h-1.5 bg-white/70 rounded-full" />
          </div>
        </div>
      </section>

      {/* Description Section – merchandise-style: gradient, tagline, no scroll */}
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative py-16 md:py-24 overflow-visible"
      >
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <motion.div
            className="relative max-w-3xl mx-auto text-center font-[family-name:var(--font-distributor)] overflow-visible"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
          >
            <div className="absolute inset-0 -inset-x-8 rounded-2xl bg-gradient-to-b from-luxury-gold/[0.06] via-transparent to-luxury-silver/[0.04] pointer-events-none" />
            <div className="relative py-8 md:py-10">
              <p className="text-2xl font-semibold tracking-tight text-luxury-gold md:text-3xl lg:text-4xl">
                {t("hero.subtitle")}
              </p>
              <p className="mt-5 text-base leading-relaxed text-white/90 md:text-lg lg:text-xl max-w-2xl mx-auto">
              {t("description")}
            </p>
              <div className="mt-8 mx-auto w-32 md:w-40 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Distributor Cards – gradient section, less rigid */}
      <section
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="relative pb-24 md:pb-32"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(212,175,55,0.02) 30%, rgba(192,192,192,0.02) 70%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12">
          <motion.div
            className="mb-10 md:mb-14 text-center font-[family-name:var(--font-distributor)]"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-4">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-r from-white via-white/95 to-luxury-silver/90 bg-clip-text text-transparent">
              {t("listTitle")}
            </h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-luxury-gold/50 bg-luxury-gold/15 px-5 py-2.5 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/25 hover:border-luxury-gold/60 transition-colors"
                  title={t("addDistributor")}
                  aria-label={t("addDistributor")}
                >
                  <Plus className="h-5 w-5" />
                  {t("addDistributor")}
                </button>
              )}
            </div>
            <p className="mt-3 text-base md:text-lg text-white/70 max-w-2xl mx-auto">
              {t("listSubtitle")}
            </p>
            {!loading && (
              <p className="mt-2 text-xs uppercase tracking-widest text-luxury-gold/70">
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
              className="text-center py-20 rounded-2xl border border-white/10 bg-white/[0.03]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-lg text-white/60">{t("noDistributors")}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-luxury-gold/50 bg-luxury-gold/15 px-5 py-2.5 text-sm font-medium text-luxury-gold hover:bg-luxury-gold/25 transition-colors"
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

      <PageFooter />

      {/* Modal Add / Edit (admin only) – CMS unchanged */}
      <AnimatePresence>
        {modalOpen && (
          <ModalPortal zIndex={9999}>
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pt-24 sm:pt-28"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModal}
            >
              <motion.div
                className="w-full max-w-lg max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-[#111] to-[#0a0a0a] p-6 shadow-2xl"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white font-[family-name:var(--font-distributor)]">
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
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
}
