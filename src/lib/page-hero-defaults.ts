/** Static hero defaults — same pattern as Merchandise (instant first paint, CMS merges later). */
export type PageHeroSlug =
  | "about"
  | "authenticity"
  | "journal"
  | "distributor";

export type PageHeroDefault = {
  mediaType: "VIDEO" | "IMAGE";
  videoPath?: string;
  imagePath?: string;
  posterPath?: string;
  footerVideoPath?: string;
  assetVersion: number;
};

export const PAGE_HERO_DEFAULTS: Record<PageHeroSlug, PageHeroDefault> = {
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
};
