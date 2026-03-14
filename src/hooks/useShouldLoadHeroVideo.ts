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
 * Returns true when it's OK to load hero video (fast connection, no data saver).
 * When false, hero should show poster/image only to keep page light on slow networks.
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

    if (effectiveType === "slow-2g" || effectiveType === "2g" || effectiveType === "3g") {
      setShouldLoad(false);
      return;
    }

    setShouldLoad(true);
  }, []);

  return shouldLoad;
}
