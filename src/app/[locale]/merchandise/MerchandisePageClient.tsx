"use client";

import { useRef, useState, useEffect } from "react";
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

      <section className="relative flex min-h-[50vh] flex-col items-center justify-center px-6 pt-28 pb-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/95 to-luxury-black" />
        <div className="relative z-10 max-w-3xl">
          <motion.h1
            className="text-4xl font-light tracking-tight text-white md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-luxury-gold">{t("hero.title")}</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-lg text-white/70 md:text-xl"
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
          return (
            <section
              key={category}
              ref={(el) => {
                sectionRefs.current[sectionIndex] = el;
              }}
              className="mb-20 md:mb-28"
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
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    variants={cardVariants}
                    custom={isAdmin ? index + 1 : index}
                    className="group relative overflow-hidden rounded-2xl bg-white/5"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <Image
                        src={resolveImageUrl(item.imageUrl)}
                        alt={item.title || `${sectionTitles[category]} ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                        unoptimized={item.imageUrl.startsWith("http")}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      {item.title && (
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-sm font-medium text-white drop-shadow-lg">
                            {item.title}
                          </p>
                        </div>
                      )}
                      {isAdmin && (
                        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                            aria-label={t("cms.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="rounded-full bg-black/60 p-2 text-red-300 hover:bg-red-500/80"
                            aria-label={t("cms.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
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
