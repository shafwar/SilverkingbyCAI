"use client";

import { useEffect, useState } from "react";

type EffectiveConnectionType = "4g" | "3g" | "2g" | "slow-2g";

interface NetworkInformationLike {
  effectiveType?: EffectiveConnectionType;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformationLike;
  }
}

/**
 * Returns true when it's OK to load hero video (no data saver, not on very slow links).
 * When false, hero should show poster/image only.
 *
 * Note: Many phones report cellular as "3g" in Network Information API even on usable LTE;
 * blocking 3g caused blank/black heroes on mobile. We only skip video for save-data, 2g, slow-2g.
 */
export function useShouldLoadHeroVideo(): boolean {
  const [shouldLoad, setShouldLoad] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator) {
      setShouldLoad(true);
      return;
    }

    const conn = navigator.connection;
    if (!conn) {
      setShouldLoad(true);
      return;
    }

    if (conn.saveData === true) {
      setShouldLoad(false);
      return;
    }

    const effectiveType: EffectiveConnectionType | undefined = conn.effectiveType;
    if (effectiveType === "slow-2g" || effectiveType === "2g") {
      setShouldLoad(false);
      return;
    }

    setShouldLoad(true);
  }, []);

  return shouldLoad;
}
