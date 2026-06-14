/** Static hero defaults — same pattern as Merchandise (instant first paint, CMS merges later). */
export type PageHeroSlug =
  | "home"
  | "products"
  | "about"
  | "authenticity"
  | "journal"
  | "distributor"
  | "what-we-do";

export type PageHeroDefault = {
  mediaType: "VIDEO" | "IMAGE";
  videoPath?: string;
  imagePath?: string;
  posterPath?: string;
  footerVideoPath?: string;
  assetVersion: number;
};

export const PAGE_HERO_DEFAULTS: Record<PageHeroSlug, PageHeroDefault> = {
  home: {
    mediaType: "VIDEO",
    videoPath: "/videos/hero/hero-background.mp4",
    assetVersion: 1,
  },
  products: {
    mediaType: "VIDEO",
    videoPath: "/videos/hero/gold-stone.mp4",
    assetVersion: 1,
  },
  about: {
    mediaType: "VIDEO",
    videoPath: "/videos/hero/gold-footage.mp4",
    assetVersion: 1,
  },
  authenticity: {
    mediaType: "VIDEO",
    videoPath: "/videos/hero/mobile scanning qr.mp4",
    assetVersion: 1,
  },
  journal: {
    mediaType: "VIDEO",
    videoPath: "/videos/hero/Jurnal%20Silverking.mp4",
    assetVersion: 2,
  },
  distributor: {
    mediaType: "IMAGE",
    imagePath: "/images/DSC02998.JPG",
    videoPath: "/videos/hero/gold-footage.mp4",
    assetVersion: 1,
  },
  "what-we-do": {
    mediaType: "VIDEO",
    videoPath: "/videos/hero/metal crafting hands.mp4",
    footerVideoPath: "/videos/hero/molten metal slow motion.mp4",
    assetVersion: 1,
  },
};
