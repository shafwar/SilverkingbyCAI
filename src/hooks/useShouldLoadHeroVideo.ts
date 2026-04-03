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
 * Returns true when it's OK to load hero video (no data saver, not extremely slow).
 * When false, hero should show poster/image only.
 *
 * Important: Do NOT treat `effectiveType === "3g"` as "no video". Safari on iOS (and
 * some Android builds) often report Wi‑Fi or LTE as "3g", which would hide every hero
 * video on mobile while desktop still loads — looks like a site bug.
 * Only skip video for save-data and true 2G-class labels.
 */
export function useShouldLoadHeroVideo(): boolean {
  const [shouldLoad, setShouldLoad] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator) {
      setShouldLoad(true);
      return;
    }

    const conn = navigator.connection;
    const saveData = conn?.saveData === true;
    const effectiveType: EffectiveConnectionType | undefined = conn?.effectiveType;

    if (saveData) {
      setShouldLoad(false);
      return;
    }

    if (effectiveType === "slow-2g" || effectiveType === "2g") {
      setShouldLoad(false);
      return;
    }

    setShouldLoad(true);
  }, []);

  return shouldLoad;
}
