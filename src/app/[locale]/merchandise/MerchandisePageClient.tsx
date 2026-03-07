"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { getR2UrlClient } from "@/utils/r2-url";

gsap.registerPlugin(ScrollTrigger);

export type MerchandiseCategory = "polo" | "knitware" | "tshirt_cap";

export interface MerchandiseItemType {
  id: number;
  category: string;
  title: string | null;
  imageUrl: string;
  sortOrder: number;
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 48 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  }),
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      delay: i * 0.08,
    },
  }),
};

const CATEGORY_ORDER: MerchandiseCategory[] = ["polo", "tshirt_cap", "knitware"];

/** Fallback R2 paths when API returns no items (e.g. production not seeded) — matches compress-and-upload keys */
const FALLBACK_IMAGE_PATHS: Record<MerchandiseCategory, string[]> = {
  polo: ["/images/merchandise/polo-1-polo-1.jpg", "/images/merchandise/polo-2-polo-2.jpg", "/images/merchandise/polo-3-polo-3.jpg", "/images/merchandise/polo-4-polo-4.jpg"],
  tshirt_cap: [
    "/images/merchandise/tshirt_cap-1-t-shirt-&-cap-1.jpg",
    "/images/merchandise/tshirt_cap-2-t-shirt-&-cap-2.jpg",
    "/images/merchandise/tshirt_cap-3-t-shirt-&-cap-3.jpg",
    "/images/merchandise/tshirt_cap-4-t-shirt-&-cap-4.jpg",
    "/images/merchandise/tshirt_cap-5-t-shirt-&-cap-5.jpg",
    "/images/merchandise/tshirt_cap-6-t-shirt-&-cap-6.jpg",
  ],
  knitware: [
    "/images/merchandise/knitware-1-knitware-1.jpg",
    "/images/merchandise/knitware-2-knitware-2.jpg",
    "/images/merchandise/knitware-3-knitware-3.jpg",
    "/images/merchandise/knitware-4-knitware-4.jpg",
    "/images/merchandise/knitware-5-knitware-5.jpg",
  ],
};

/** Renders one product-detail block: tagline, description, highlights, colors */
function DetailBlock({
  tagline,
  description,
  highlights,
  highlightsLabel,
  colorsLabel,
  colors,
  index = 0,
}: {
  tagline: string;
  description: string;
  highlights?: string[];
  highlightsLabel: string;
  colorsLabel: string;
  colors: string;
  index?: number;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 md:p-8 backdrop-blur-sm"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.1 }}
    >
      <p className="text-lg font-medium tracking-tight text-luxury-gold md:text-xl">
        {tagline}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-white/80 md:text-base">
        {description}
      </p>
      {highlights && highlights.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">
            {highlightsLabel}
          </p>
          <ul className="space-y-1.5 text-sm text-white/75">
            {highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-luxury-gold/80" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 pt-4 border-t border-white/10">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">
          {colorsLabel}
        </p>
        <p className="mt-1 text-sm text-luxury-silver/90">{colors}</p>
      </div>
    </motion.div>
  );
}

function resolveImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return getR2UrlClient(path);
}

export default function MerchandisePageClient() {
  const t = useTranslations("merchandise");
  const pageRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, MerchandiseItemType[]>>({
    polo: [],
    knitware: [],
    tshirt_cap: [],
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<MerchandiseItemType | null>(null);
  const [addingCategory, setAddingCategory] = useState<MerchandiseCategory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  /** All merchandise image URLs for hero slideshow; fallback to R2 paths if API empty */
  const heroImageUrls = useMemo(() => {
    const fromApi: string[] = [];
    CATEGORY_ORDER.forEach((cat) => {
      (byCategory[cat] ?? []).forEach((item) => fromApi.push(item.imageUrl));
    });
    if (fromApi.length > 0) return fromApi.map(resolveImageUrl);
    return CATEGORY_ORDER.flatMap((cat) =>
      FALLBACK_IMAGE_PATHS[cat].map((p) => getR2UrlClient(p))
    );
  }, [byCategory]);

  useEffect(() => {
    if (heroImageUrls.length <= 1) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroImageUrls.length);
    }, 4500);
    return () => clearInterval(t);
  }, [heroImageUrls.length]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    loadAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/merchandise");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.byCategory) setByCategory(data.byCategory);
      } catch (e) {
        console.error("[MERCHANDISE_LOAD]", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      if (!pageRef.current || !isMounted) return;
      const ctx = gsap.context(() => {
        sectionRefs.current.forEach((el, i) => {
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
    [isMounted, byCategory]
  );

  const openAdd = (category: MerchandiseCategory) => {
    setAddingCategory(category);
    setEditing(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openEdit = (item: MerchandiseItemType) => {
    setEditing(item);
    setAddingCategory(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeModal = () => {
    setEditing(null);
    setAddingCategory(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveItem = async (payload: {
    id?: number;
    category: MerchandiseCategory;
    title: string;
  }) => {
    setIsSaving(true);
    try {
      let imageUrl = editing?.imageUrl ?? "";
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        const up = await fetch("/api/merchandise/upload-image", {
          method: "POST",
          body: form,
        });
        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          throw new Error(err?.error || "Upload failed");
        }
        const { url } = await up.json();
        imageUrl = url;
      }
      if (!imageUrl && !editing) throw new Error("Image required");

      const isEdit = !!payload.id;
      const endpoint = isEdit
        ? `/api/merchandise/${payload.id}`
        : "/api/merchandise";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: payload.category,
          title: payload.title || null,
          imageUrl,
          sortOrder: 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Save failed");
      }
      const { item } = await res.json();
      setByCategory((prev) => {
        const next = { ...prev };
        const cat = item.category as MerchandiseCategory;
        const list = [...(next[cat] || [])];
        if (isEdit) {
          const idx = list.findIndex((x) => x.id === item.id);
          if (idx >= 0) list[idx] = item;
          else list.push(item);
        } else {
          list.push(item);
        }
        next[cat] = list.sort((a, b) => a.sortOrder - b.sortOrder);
        return next;
      });
      closeModal();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm(t("cms.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/merchandise/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setByCategory((prev) => {
        const next = { ...prev };
        (Object.keys(next) as MerchandiseCategory[]).forEach((cat) => {
          next[cat] = (next[cat] || []).filter((x) => x.id !== id);
        });
        return next;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const sectionTitles: Record<MerchandiseCategory, string> = {
    polo: t("sections.polo"),
    tshirt_cap: t("sections.tshirtCap"),
    knitware: t("sections.knitware"),
  };

  const isModalOpen = !!editing || !!addingCategory;
  const modalCategory = editing?.category ?? addingCategory;

  return (
    <div ref={pageRef} className="min-h-screen bg-luxury-black">
      <Navbar />

      {/* Hero with smooth transitioning merchandise images */}
      <section className="relative min-h-[70vh] overflow-hidden pt-20">
        {heroImageUrls.length > 0 && (
          <div className="absolute inset-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={heroIndex}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{ scale: 1.04 }}
                  transition={{ duration: 4.5, ease: "none" }}
                >
                  <Image
                    src={heroImageUrls[heroIndex]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                    unoptimized={heroImageUrls[heroIndex]?.startsWith("http")}
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/60 to-luxury-black/40" />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 pb-20 text-center">
          <motion.h1
            className="text-4xl font-light tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-luxury-gold">{t("hero.title")}</span>
          </motion.h1>
          <motion.p
            className="mt-4 max-w-2xl text-lg text-white/90 drop-shadow md:text-xl"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.subtitle")}
          </motion.p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
        {CATEGORY_ORDER.map((category, sectionIndex) => {
          const items = byCategory[category] ?? [];
          const displayItems: { id: number | string; imageUrl: string; title: string | null }[] =
            items.length > 0
              ? items
              : FALLBACK_IMAGE_PATHS[category].map((path, i) => ({
                  id: `fallback-${category}-${i}`,
                  imageUrl: getR2UrlClient(path),
                  title: null,
                }));
          const sectionBg = sectionIndex === 1 ? "rounded-3xl border border-white/5 bg-white/[0.02] px-6 py-8 md:px-10 md:py-10" : "";
          const isPolo = category === "polo";

          return (
            <section
              key={category}
              ref={(el) => {
                sectionRefs.current[sectionIndex] = el;
              }}
              className={`mb-20 md:mb-28 ${sectionBg}`}
            >
              <motion.h2
                className="mb-8 text-2xl font-light tracking-tight text-white md:text-3xl"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                <span className="border-b border-luxury-gold/40 pb-2 text-luxury-gold">
                  {sectionTitles[category]}
                </span>
              </motion.h2>

              {/* Polo: featured image strip then copy; others: copy only above grid */}
              {isPolo && displayItems.length > 0 && (
                <motion.div
                  className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, staggerChildren: 0.08 }}
                >
                  {displayItems.slice(0, 4).map((item, index) => (
                    <motion.div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl"
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.08 }}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10">
                        <Image
                          src={item.imageUrl}
                          alt={item.title || `${sectionTitles[category]} ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                          loading="eager"
                          unoptimized={String(item.imageUrl).startsWith("http")}
                        />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Section copy: tagline, description, highlights, colors */}
              <div className="mb-10 grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {category === "polo" && (
                  <DetailBlock
                    tagline={t("detail.polo.tagline")}
                    description={t("detail.polo.description")}
                    highlights={(t.raw("detail.polo.highlights") as string[]) ?? []}
                    highlightsLabel={t("detail.highlightsLabel")}
                    colorsLabel={t("detail.polo.colorsLabel")}
                    colors={t("detail.polo.colors")}
                  />
                )}
                {category === "knitware" && (
                  <DetailBlock
                    tagline={t("detail.knitware.tagline")}
                    description={t("detail.knitware.description")}
                    highlights={(t.raw("detail.knitware.highlights") as string[]) ?? []}
                    highlightsLabel={t("detail.highlightsLabel")}
                    colorsLabel={t("detail.knitware.colorsLabel")}
                    colors={t("detail.knitware.colors")}
                  />
                )}
                {category === "tshirt_cap" && (
                  <>
                    <DetailBlock
                      tagline={t("detail.tshirt.tagline")}
                      description={t("detail.tshirt.description")}
                      highlights={(t.raw("detail.tshirt.highlights") as string[]) ?? []}
                      highlightsLabel={t("detail.highlightsLabel")}
                      colorsLabel={t("detail.tshirt.colorsLabel")}
                      colors={t("detail.tshirt.colors")}
                      index={0}
                    />
                    <DetailBlock
                      tagline={t("detail.cap.tagline")}
                      description={t("detail.cap.description")}
                      highlightsLabel={t("detail.highlightsLabel")}
                      colorsLabel={t("detail.cap.colorsLabel")}
                      colors={t("detail.cap.colors")}
                      index={1}
                    />
                  </>
                )}
              </div>

              <motion.div
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
              >
                {isAdmin && (
                  <motion.button
                    type="button"
                    variants={cardVariants}
                    custom={0}
                    onClick={() => openAdd(category)}
                    className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-white/60 transition hover:border-luxury-gold/50 hover:bg-white/10 hover:text-luxury-gold"
                  >
                    <Plus className="mb-2 h-10 w-10" />
                    <span className="text-sm">{t("cms.addCard")}</span>
                  </motion.button>
                )}
                {displayItems.map((item, index) => {
                  const isRealItem = typeof item.id === "number";
                  const imgUrl = typeof item.imageUrl === "string" ? item.imageUrl : resolveImageUrl(item.imageUrl);
                  return (
                    <motion.div
                      key={item.id}
                      variants={cardVariants}
                      custom={isAdmin ? index + 1 : index}
                      className="group relative overflow-hidden rounded-2xl bg-white/5"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <Image
                          src={imgUrl}
                          alt={item.title || `${sectionTitles[category]} ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                          unoptimized={String(item.imageUrl).startsWith("http")}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        {item.title && (
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-sm font-medium text-white drop-shadow-lg">
                              {item.title}
                            </p>
                          </div>
                        )}
                        {isAdmin && isRealItem && (
                          <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => openEdit(item as MerchandiseItemType)}
                              className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                              aria-label={t("cms.edit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => typeof item.id === "number" && deleteItem(item.id)}
                              className="rounded-full bg-black/60 p-2 text-red-300 hover:bg-red-500/80"
                              aria-label={t("cms.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && modalCategory && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-white/15 bg-gradient-to-b from-[#111] to-black p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {editing ? t("cms.editCard") : t("cms.addCard")}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const title = (form.querySelector('[name="title"]') as HTMLInputElement)?.value?.trim() ?? "";
                  saveItem({
                    id: editing?.id,
                    category: modalCategory as MerchandiseCategory,
                    title,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/70">
                    {t("cms.title")}
                  </label>
                  <input
                    name="title"
                    type="text"
                    defaultValue={editing?.title ?? ""}
                    placeholder={t("cms.titlePlaceholder")}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-white/70">
                    {t("cms.image")}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,image/jpeg"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-xs text-white/80 file:mr-2 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
                  />
                  {editing && !imageFile && (
                    <p className="mt-1 text-[11px] text-white/50">
                      {t("cms.keepCurrent")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    {t("cms.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || (!editing && !imageFile)}
                    className="flex-1 rounded-lg bg-luxury-gold py-2 text-sm font-medium text-black hover:bg-luxury-lightGold disabled:opacity-50"
                  >
                    {isSaving ? t("cms.saving") : t("cms.save")}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
