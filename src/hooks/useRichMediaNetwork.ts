"use client";

import { useEffect, useState } from "react";
import { useShouldLoadHeroVideo } from "@/hooks/useShouldLoadHeroVideo";

type ConnLike = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

/**
 * Optional rich media (large R2 photos, decorative backgrounds).
 * Fast/stable: true. Save-data, 2g, 3g, or very low downlink: false.
 */
export function useRichMediaNetwork(): boolean {
  const shouldLoadHeroVideo = useShouldLoadHeroVideo();
  const [richMedia, setRichMedia] = useState(true);

  useEffect(() => {
    if (!shouldLoadHeroVideo) {
      setRichMedia(false);
      return;
    }

    if (typeof window === "undefined" || !navigator) {
      setRichMedia(true);
      return;
    }

    const conn = navigator.connection as ConnLike | undefined;
    if (!conn) {
      setRichMedia(true);
      return;
    }

    if (conn.saveData === true) {
      setRichMedia(false);
      return;
    }

    const et = conn.effectiveType;
    if (et === "slow-2g" || et === "2g" || et === "3g") {
      setRichMedia(false);
      return;
    }

    if (typeof conn.downlink === "number" && conn.downlink > 0 && conn.downlink < 1.25) {
      setRichMedia(false);
      return;
    }

    setRichMedia(true);
  }, [shouldLoadHeroVideo]);

  return richMedia;
}
