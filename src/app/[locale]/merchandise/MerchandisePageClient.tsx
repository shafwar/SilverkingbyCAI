"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import Navbar from "@/components/layout/Navbar";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Phone } from "lucide-react";
import { getR2UrlClient } from "@/utils/r2-url";
import { VideoLoadGuard } from "@/components/section-media/SectionMediaLoadGuard";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";
import { Plus_Jakarta_Sans } from "next/font/google";

gsap.registerPlugin(ScrollTrigger);

const fontMerch = Plus_Jakarta_Sans({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-merch",
  display: "swap",
});

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
  polo: [
    "/images/merchandise/polo-1-polo-1.jpg",
    "/images/merchandise/polo-2-polo-2.jpg",
    "/images/merchandise/polo-3-polo-3.jpg",
    "/images/merchandise/polo-4-polo-4.jpg",
  ],
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

/** Centered product copy: larger type, subtle gradient, no box. Optional second colors line. */
function DetailBlockCentered({
  tagline,
  description,
  highlights,
  highlightsLabel,
  colorsLabel,
  colors,
  colorsLine2,
  index = 0,
  useMerchFont = false,
}: {
  tagline: string;
  description: string;
  highlights?: string[];
  highlightsLabel: string;
  colorsLabel: string;
  colors: string;
  colorsLine2?: string;
  index?: number;
  useMerchFont?: boolean;
}) {
  return (
    <motion.div
      className={`relative text-center ${useMerchFont ? "font-[family-name:var(--font-merch)]" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
    >
      <div className="absolute inset-0 -inset-x-8 rounded-2xl bg-gradient-to-b from-luxury-gold/[0.06] via-transparent to-luxury-silver/[0.04] pointer-events-none" />
      <div className="relative py-8 md:py-10">
        <p
          className={`text-2xl font-semibold tracking-tight text-luxury-gold md:text-3xl lg:text-4xl ${!useMerchFont ? "font-serif" : ""}`}
        >
          {tagline}
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg lg:text-xl">
          {description}
        </p>
        {highlights && highlights.length > 0 && (
          <div className="mt-8">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
              {highlightsLabel}
            </p>
            <ul className="mx-auto flex max-w-lg flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-white/85 md:gap-x-10 md:text-base">
              {highlights.map((item, i) => (
                <li key={i} className="flex items-center justify-center gap-2">
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-luxury-gold/90" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">
            {colorsLabel}
          </p>
          <p className="mt-2 text-base tracking-wide text-luxury-silver/95 md:text-lg">{colors}</p>
          {colorsLine2 && (
            <p className="mt-1 text-base tracking-wide text-luxury-silver/90 md:text-lg">
              {colorsLine2}
            </p>
          )}
        </div>
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
  const footerVideoRef = useRef<HTMLVideoElement | null>(null);
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addCategoryRef = useRef<MerchandiseCategory | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const shouldLoadHeroVideo = useShouldLoadHeroVideo();

  /** Hero images: second image first (polo close-up / “ss kedua”), then rest of flow. */
  const heroImageUrls = useMemo(() => {
    const fromApi: string[] = [];
    CATEGORY_ORDER.forEach((cat) => {
      (byCategory[cat] ?? []).forEach((item) => fromApi.push(item.imageUrl));
    });
    const raw =
      fromApi.length > 0
        ? fromApi.map(resolveImageUrl)
        : CATEGORY_ORDER.flatMap((cat) => FALLBACK_IMAGE_PATHS[cat].map((p) => getR2UrlClient(p)));
    if (raw.length < 2) return raw;
    return [raw[1], raw[0], ...raw.slice(2)];
  }, [byCategory]);

  /** Hero image carousel: transition every 6 seconds */
  const HERO_INTERVAL_MS = 6000;
  useEffect(() => {
    if (heroImageUrls.length <= 1) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroImageUrls.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(t);
  }, [heroImageUrls.length]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /** When Edit modal opens, auto-open file picker so admin can replace image (optional). */
  useEffect(() => {
    if (!editing) return;
    const t = setTimeout(() => {
      fileInputRef.current?.click();
    }, 400);
    return () => clearTimeout(t);
  }, [editing]);

  useEffect(() => {
    let cancelled = false;
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.isAdmin) setIsAdmin(true);
      } catch {
        // Retry once after delay (e.g. session not ready on first paint)
        if (!cancelled) {
          setTimeout(async () => {
            try {
              const res = await fetch("/api/admin/me", { credentials: "include" });
              if (!res.ok) return;
              const data = await res.json();
              if (!cancelled && data?.isAdmin) setIsAdmin(true);
            } catch {
              // silent
            }
          }, 500);
        }
      }
    };
    checkAdmin();
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

  useGSAP(() => {
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
  }, [isMounted, byCategory]);

  useReliableVideoAutoplay(footerVideoRef);

  const openAdd = (category: MerchandiseCategory) => {
    setEditing(null);
    setImageFile(null);
    setUploadProgress(null);
    addCategoryRef.current = category;
    if (fileInputRef.current) fileInputRef.current.value = "";
    requestAnimationFrame(() => addFileInputRef.current?.click());
  };

  const onAddFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const cat = addCategoryRef.current;
    addCategoryRef.current = null;
    if (file && cat) {
      setImageFile(file);
      setAddingCategory(cat);
    }
    e.target.value = "";
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
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (addFileInputRef.current) addFileInputRef.current.value = "";
  };

  const saveItem = async (payload: {
    id?: number;
    category: MerchandiseCategory;
    title: string;
  }) => {
    setIsSaving(true);
    setUploadProgress(0);
    try {
      let imageUrl = editing?.imageUrl ?? "";
      if (imageFile) {
        const form = new FormData();
        form.append("file", imageFile);
        imageUrl = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/merchandise/upload-image");
          xhr.onload = () => {
            setUploadProgress(100);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                resolve(data.url);
              } catch {
                reject(new Error("Invalid response"));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err?.error || "Upload failed"));
              } catch {
                reject(new Error("Upload failed"));
              }
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
              setUploadProgress(percent);
            }
          };
          xhr.send(form);
        });
      } else {
        setUploadProgress(null);
      }
      if (!imageUrl && !editing) throw new Error("Image required");

      const isEdit = !!payload.id;
      const endpoint = isEdit ? `/api/merchandise/${payload.id}` : "/api/merchandise";
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
      setUploadProgress(null);
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
      closeModal();
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
    <div
      ref={pageRef}
      className={`min-h-screen w-full max-w-full overflow-x-hidden bg-luxury-black ${fontMerch.variable}`}
    >
      <input
        ref={addFileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-hidden
        onChange={onAddFileSelected}
      />
      <Navbar />

      {/* Hero: extend layer + seam cover to prevent flickering line at bottom (mobile/desktop) */}
      <section className="relative min-h-[70vh] overflow-hidden pt-20 isolate">
        {heroImageUrls.length > 0 && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ transform: "translateZ(0)", WebkitBackfaceVisibility: "hidden" }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={heroIndex}
                className="absolute inset-0 origin-center"
                style={{
                  backfaceVisibility: "hidden",
                  willChange: "transform",
                  transform: "translateZ(0)",
                  WebkitBackfaceVisibility: "hidden",
                }}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="absolute inset-0 origin-center overflow-hidden"
                  style={{ backfaceVisibility: "hidden", transform: "translateZ(0)" }}
                  animate={{ scale: 1.05 }}
                  transition={{ duration: 6, ease: "linear" }}
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
        {/* Seam cover: hides subpixel line at hero bottom (flicker fix) */}
        <div
          className="absolute bottom-0 left-0 right-0 z-[1] h-[3px] bg-luxury-black pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[70vh] flex-col items-center justify-center px-6 pb-20 text-center font-[family-name:var(--font-merch)]">
          <motion.h1
            className="text-4xl font-semibold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] md:text-5xl lg:text-6xl xl:text-7xl"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-luxury-gold">{t("hero.title")}</span>
          </motion.h1>
          <motion.p
            className="mt-6 max-w-2xl text-center text-lg font-semibold leading-snug text-white/95 drop-shadow-md md:text-xl lg:text-2xl"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.subtitle")}
          </motion.p>
          <motion.p
            className="mt-1 max-w-2xl text-center text-lg font-medium leading-snug text-white/90 drop-shadow-md md:text-xl lg:text-2xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.subtitleProducts")}
          </motion.p>
          <motion.p
            className="mt-3 text-center text-base font-medium tracking-wide text-luxury-silver/95 drop-shadow md:text-lg"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("hero.tagline")}
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
          const isPolo = category === "polo";

          return (
            <section
              key={category}
              ref={(el) => {
                sectionRefs.current[sectionIndex] = el;
              }}
              className="mb-20 md:mb-28"
            >
              <motion.h2
                className="mb-10 text-center text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                <span className="border-b-2 border-luxury-gold/50 pb-2 text-luxury-gold">
                  {sectionTitles[category]}
                </span>
              </motion.h2>

              {/* Polo: featured image strip with slide-in transitions + Edit/Delete when admin */}
              {isPolo && displayItems.length > 0 && (
                <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {displayItems.slice(0, 4).map((item, index) => {
                    const isRealItem = typeof item.id === "number";
                    return (
                      <motion.div
                        key={item.id}
                        className="group relative overflow-hidden rounded-2xl"
                        initial={{ opacity: 0, x: index % 2 === 0 ? -48 : 48 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.25 }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          {item.title && (
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-sm font-medium text-white drop-shadow-lg">
                                {item.title}
                              </p>
                            </div>
                          )}
                          {isAdmin && (
                            <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-white/20 bg-black/80 p-1.5 shadow-lg backdrop-blur-sm">
                              <button
                                type="button"
                                onClick={() =>
                                  isRealItem
                                    ? openEdit(item as MerchandiseItemType)
                                    : openAdd(category)
                                }
                                className="rounded-full p-2 text-white hover:bg-white/20"
                                aria-label={isRealItem ? t("cms.edit") : t("cms.addCard")}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {isRealItem && (
                                <button
                                  type="button"
                                  onClick={() => typeof item.id === "number" && deleteItem(item.id)}
                                  className="rounded-full p-2 text-red-300 hover:bg-red-500/30"
                                  aria-label={t("cms.delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Centered copy: no container, powerful typography */}
              <div className="mb-14 flex flex-col gap-14 md:gap-16">
                {category === "polo" && (
                  <DetailBlockCentered
                    tagline={t("detail.polo.tagline")}
                    description={t("detail.polo.description")}
                    highlights={(t.raw("detail.polo.highlights") as string[]) ?? []}
                    highlightsLabel={t("detail.highlightsLabel")}
                    colorsLabel={t("detail.polo.colorsLabel")}
                    colors={t("detail.polo.colors")}
                    useMerchFont
                  />
                )}
                {category === "knitware" && (
                  <DetailBlockCentered
                    tagline={t("detail.knitware.tagline")}
                    description={t("detail.knitware.description")}
                    highlights={(t.raw("detail.knitware.highlights") as string[]) ?? []}
                    highlightsLabel={t("detail.highlightsLabel")}
                    colorsLabel={t("detail.knitware.colorsLabel")}
                    colors={t("detail.knitware.colors")}
                    useMerchFont
                  />
                )}
                {category === "tshirt_cap" && (
                  <DetailBlockCentered
                    tagline={t("detail.tshirtCapCombined.tagline")}
                    description={t("detail.tshirtCapCombined.description")}
                    highlights={(t.raw("detail.tshirtCapCombined.highlights") as string[]) ?? []}
                    highlightsLabel={t("detail.highlightsLabel")}
                    colorsLabel={t("detail.tshirtCapCombined.colorsLabel")}
                    colors={t("detail.tshirtCapCombined.colorsTshirt")}
                    colorsLine2={t("detail.tshirtCapCombined.colorsCap")}
                    index={0}
                    useMerchFont
                  />
                )}
              </div>

              {/* T-Shirt & Cap: first row of images, then "Finishing touch" block, then rest of images */}
              {category === "tshirt_cap" && displayItems.length > 0 ? (
                <>
                  <motion.div
                    className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={sectionVariants}
                  >
                    {isAdmin && (
                      <motion.button
                        type="button"
                        variants={cardVariants}
                        custom={0}
                        onClick={() => openAdd(category)}
                        className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-white/60 transition hover:border-luxury-gold/50 hover:bg-white/10 hover:text-luxury-gold sm:col-span-2 lg:col-span-1"
                      >
                        <Plus className="mb-2 h-8 w-8" />
                        <span className="text-sm">{t("cms.addCard")}</span>
                      </motion.button>
                    )}
                    <AnimatePresence>
                    {displayItems.slice(0, 3).map((item, index) => {
                      const isRealItem = typeof item.id === "number";
                      const imgUrl =
                        typeof item.imageUrl === "string"
                          ? item.imageUrl
                          : resolveImageUrl(item.imageUrl);
                      return (
                        <motion.div
                          key={item.id}
                          variants={cardVariants}
                          custom={index}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className="group relative overflow-hidden rounded-2xl bg-white/5"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <Image
                              src={imgUrl}
                              alt={item.title || `${sectionTitles[category]} ${index + 1}`}
                              fill
                              sizes="(max-width: 640px) 50vw, 33vw"
                              className="object-cover transition duration-500 group-hover:scale-105"
                              loading={index < 2 ? "eager" : "lazy"}
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
                            {isAdmin && (
                              <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-white/20 bg-black/80 p-1.5 shadow-lg backdrop-blur-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isRealItem
                                      ? openEdit(item as MerchandiseItemType)
                                      : openAdd(category)
                                  }
                                  className="rounded-full p-2 text-white hover:bg-white/20"
                                  aria-label={isRealItem ? t("cms.edit") : t("cms.addCard")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                {isRealItem && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      typeof item.id === "number" && deleteItem(item.id)
                                    }
                                    className="rounded-full p-2 text-red-300 hover:bg-red-500/30"
                                    aria-label={t("cms.delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>
                  </motion.div>
                  <motion.div
                    className="mb-10 py-8 text-center font-[family-name:var(--font-merch)]"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="text-xl font-semibold tracking-tight text-luxury-gold md:text-2xl lg:text-3xl">
                      {t("detail.cap.tagline")}
                    </p>
                    <p className="mx-auto mt-3 max-w-xl text-base text-white/85 md:text-lg">
                      {t("detail.cap.description")}
                    </p>
                    <p className="mt-4 text-sm uppercase tracking-[0.15em] text-white/55">
                      {t("detail.cap.colorsLabel")}
                    </p>
                    <p className="mt-1 text-base text-luxury-silver/95">{t("detail.cap.colors")}</p>
                  </motion.div>
                  <motion.div
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={sectionVariants}
                  >
                    <AnimatePresence>
                    {displayItems.slice(3).map((item, index) => {
                      const i = index + 3;
                      const isRealItem = typeof item.id === "number";
                      const imgUrl =
                        typeof item.imageUrl === "string"
                          ? item.imageUrl
                          : resolveImageUrl(item.imageUrl);
                      return (
                        <motion.div
                          key={item.id}
                          variants={cardVariants}
                          custom={i}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className="group relative overflow-hidden rounded-2xl bg-white/5"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            <Image
                              src={imgUrl}
                              alt={item.title || `${sectionTitles[category]} ${i + 1}`}
                              fill
                              sizes="(max-width: 640px) 50vw, 33vw"
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
                            {isAdmin && (
                              <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-white/20 bg-black/80 p-1.5 shadow-lg backdrop-blur-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    isRealItem
                                      ? openEdit(item as MerchandiseItemType)
                                      : openAdd(category)
                                  }
                                  className="rounded-full p-2 text-white hover:bg-white/20"
                                  aria-label={isRealItem ? t("cms.edit") : t("cms.addCard")}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                {isRealItem && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      typeof item.id === "number" && deleteItem(item.id)
                                    }
                                    className="rounded-full p-2 text-red-300 hover:bg-red-500/30"
                                    aria-label={t("cms.delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>
                  </motion.div>
                </>
              ) : (
                <motion.div
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={sectionVariants}
                >
                  {isAdmin && (
                    <motion.button
                      type="button"
                      variants={cardVariants}
                      custom={0}
                      onClick={() => openAdd(category)}
                      className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-white/60 transition hover:border-luxury-gold/50 hover:bg-white/10 hover:text-luxury-gold sm:col-span-2 lg:col-span-1"
                    >
                      <Plus className="mb-2 h-10 w-10" />
                      <span className="text-sm">{t("cms.addCard")}</span>
                    </motion.button>
                  )}
                  <AnimatePresence>
                  {displayItems.map((item, index) => {
                    const isRealItem = typeof item.id === "number";
                    const imgUrl =
                      typeof item.imageUrl === "string"
                        ? item.imageUrl
                        : resolveImageUrl(item.imageUrl);
                    const slideFromLeft = index % 2 === 0;
                    const total = displayItems.length;
                    const remainder = total % 4;
                    const lastRowStart = total - (remainder === 0 ? 4 : remainder);
                    const isInLastRow = remainder > 0 && index >= lastRowStart;
                    const lastRowColClass =
                      isInLastRow && remainder === 1
                        ? "sm:col-start-2 lg:col-start-2"
                        : isInLastRow && remainder === 2
                          ? index === lastRowStart
                            ? "sm:col-start-2 lg:col-start-2"
                            : "sm:col-start-2 lg:col-start-3"
                          : isInLastRow && remainder === 3
                            ? index === lastRowStart
                              ? "sm:col-start-2 lg:col-start-2"
                              : index === lastRowStart + 1
                                ? "sm:col-start-2 lg:col-start-3"
                                : "sm:col-start-2 lg:col-start-4"
                            : "";
                    return (
                      <motion.div
                        key={item.id}
                        className={`group relative overflow-hidden rounded-2xl bg-white/5 ${lastRowColClass}`}
                        initial={{ opacity: 0, x: slideFromLeft ? -56 : 56 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.25 } }}
                        transition={{
                          duration: 0.7,
                          ease: [0.22, 1, 0.36, 1],
                          delay: index * 0.06,
                        }}
                        viewport={{ once: true, amount: 0.2 }}
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
                          {isAdmin && (
                            <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg border border-white/20 bg-black/80 p-1.5 shadow-lg backdrop-blur-sm">
                              <button
                                type="button"
                                onClick={() =>
                                  isRealItem
                                    ? openEdit(item as MerchandiseItemType)
                                    : openAdd(category)
                                }
                                className="rounded-full p-2 text-white hover:bg-white/20"
                                aria-label={isRealItem ? t("cms.edit") : t("cms.addCard")}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              {isRealItem && (
                                <button
                                  type="button"
                                  onClick={() => typeof item.id === "number" && deleteItem(item.id)}
                                  className="rounded-full p-2 text-red-300 hover:bg-red-500/30"
                                  aria-label={t("cms.delete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </motion.div>
              )}
            </section>
          );
        })}
      </div>

      {/* Footer – video background (stays in section), contact admin – lightweight UI */}
      <footer className="relative min-h-[42vh] sm:min-h-[48vh] md:min-h-[52vh] flex flex-col justify-center overflow-hidden isolate">
        {/* Video layer: covers section, stays fixed in place while section scrolls */}
        <div className="absolute inset-0 z-0">
          <VideoLoadGuard
            ref={footerVideoRef}
            url={getR2UrlClient("/videos/hero/gold-footage.mp4")}
            forcePoster={!shouldLoadHeroVideo}
            containerClassName="absolute inset-0 w-full h-full"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectFit: "cover",
              objectPosition: "center center",
              width: "100%",
              height: "100%",
            }}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            onContextMenu={(e) => e.preventDefault()}
            onPlay={(e) => {
              const v = e.currentTarget;
              if (v.paused) v.play().catch(() => {});
            }}
          />
          {/* Soft overlay so content stays readable and UI feels light */}
          <div
            className="absolute inset-0 z-[1]"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.85) 100%)",
            }}
          />
        </div>

        {/* Content – contact admin */}
        <div className="relative z-10 mx-auto w-full max-w-2xl px-6 py-16 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-luxury-gold/90">
              {t("footer.contactAdmin")}
            </p>
            <p className="text-sm sm:text-base text-white/70">
              {t("footer.contactDescription")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="tel:+6285695785199"
                className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/[0.08] px-5 py-3.5 text-white/95 hover:bg-white/[0.12] hover:border-luxury-gold/40 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
              >
                <Phone className="h-5 w-5 text-luxury-gold shrink-0" />
                <span className="font-medium tracking-wide">+62 856-9578-5199</span>
              </a>
              <a
                href="https://wa.me/6285695785199"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white/80 hover:bg-white/[0.1] hover:text-white transition-all duration-300"
                aria-label="WhatsApp"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-sm font-medium">WhatsApp</span>
              </a>
            </div>
            <p className="text-[11px] uppercase tracking-widest text-white/50 pt-1">
              {t("footer.callOrWhatsApp")}
            </p>
          </motion.div>
        </div>
      </footer>

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
                  const title =
                    (form.querySelector('[name="title"]') as HTMLInputElement)?.value?.trim() ?? "";
                  saveItem({
                    id: editing?.id,
                    category: modalCategory as MerchandiseCategory,
                    title,
                  });
                }}
                className="space-y-4"
              >
                {uploadProgress !== null && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-white/80">
                      {t("cms.uploadingProgress", { percent: uploadProgress })}
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-luxury-gold transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
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
                {!editing && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">
                      {t("cms.image")}
                    </label>
                    <p className="text-[11px] text-white/50">
                      {imageFile ? imageFile.name : t("cms.keepCurrent")}
                    </p>
                  </div>
                )}
                {editing && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">
                      {t("cms.image")}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-xs text-white/80 file:mr-2 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
                    />
                    {!imageFile && (
                      <p className="mt-1 text-[11px] text-white/50">{t("cms.keepCurrent")}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="flex-1 rounded-lg border border-white/20 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
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
