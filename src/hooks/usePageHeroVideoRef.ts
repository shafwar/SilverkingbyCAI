"use client";

import { useCallback, useRef, useState, type MutableRefObject, type Ref } from "react";
import { useReliableVideoAutoplay } from "@/hooks/useReliableVideoAutoplay";

/** Merge forwarded ref + internal ref (merchandise hero video ref pattern). */
export function mergeVideoRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

/**
 * Merchandise-pattern hero video ref — paired with PageHeroSection (site-wide standard).
 * reattachKey bumps when the <video> DOM node is replaced (CMS attach / SPA return)
 * so mobile autoplay listeners bind to the live element.
 */
export function usePageHeroVideoRef(forwardedRef?: Ref<HTMLVideoElement>) {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  const [reattachKey, setReattachKey] = useState(0);
  useReliableVideoAutoplay(internalRef, { mode: "background", reattachKey });
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      const prev = internalRef.current;
      mergeVideoRefs(internalRef, forwardedRef)(node);
      if (node && node !== prev) {
        setReattachKey((k) => k + 1);
      }
    },
    [forwardedRef]
  );
  return { internalRef, setVideoRef };
}
