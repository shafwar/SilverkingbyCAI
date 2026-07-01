/** CMS-managed page heroes — static R2 fallbacks + optional PageSection override. */
export type PageHeroCmsSlug =
  | "home"
  | "what-we-do"
  | "products"
  | "merchandise"
  | "authenticity"
  | "about"
  | "journal"
  | "distributor";

export type PageHeroCmsConfig = {
  label: string;
  mediaType: "VIDEO" | "IMAGE";
  videoPath?: string;
  imagePath?: string;
  posterPath: string;
  assetVersion: number;
};

export const PAGE_HERO_CMS_SLUGS: PageHeroCmsSlug[] = [
  "home",
  "what-we-do",
  "products",
  "merchandise",
  "authenticity",
  "about",
  "journal",
  "distributor",
];

export const PAGE_HERO_CMS_CONFIG: Record<PageHeroCmsSlug, PageHeroCmsConfig> = {
  home: {
    label: "Home",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/hero-background.mp4",
    posterPath: "/images/home/home-hero-poster.webp",
    assetVersion: 2,
  },
  "what-we-do": {
    label: "What We Do",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/WhatWeDo-SilverKing.mp4",
    posterPath: "/images/what-we-do/what-we-do-hero-poster.webp",
    assetVersion: 1,
  },
  products: {
    label: "Products",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/Products-SilverKing.mp4",
    posterPath: "/images/products/products-hero-poster.webp",
    assetVersion: 1,
  },
  merchandise: {
    label: "Merchandise",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/merchandise-hero.mp4",
    posterPath: "/images/merchandise/merch-hero-poster.webp",
    assetVersion: 1,
  },
  authenticity: {
    label: "Authenticity",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/mobile scanning qr.mp4",
    posterPath: "/images/hero-fallback.jpg",
    assetVersion: 1,
  },
  about: {
    label: "About Us",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/gold-footage.mp4",
    posterPath: "/images/hero-fallback.jpg",
    assetVersion: 1,
  },
  journal: {
    label: "Journal",
    mediaType: "VIDEO",
    videoPath: "/videos/hero/Jurnal%20Silverking.mp4",
    posterPath: "/images/hero-fallback.jpg",
    assetVersion: 2,
  },
  distributor: {
    label: "Distributor",
    mediaType: "IMAGE",
    imagePath: "/images/DSC02998.JPG",
    posterPath: "/images/DSC02998.JPG",
    assetVersion: 1,
  },
};

export const HERO_POSTER_SECTION_KEY = "hero_poster";
