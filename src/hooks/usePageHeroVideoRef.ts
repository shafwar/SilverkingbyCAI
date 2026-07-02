"use client";

import { useCallback, useRef, type MutableRefObject, type Ref } from "react";
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
 */
export function usePageHeroVideoRef(forwardedRef?: Ref<HTMLVideoElement>) {
  const internalRef = useRef<HTMLVideoElement | null>(null);
  useReliableVideoAutoplay(internalRef, { mode: "background" });
  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      mergeVideoRefs(internalRef, forwardedRef)(node);
    },
    [forwardedRef]
  );
  return { internalRef, setVideoRef };
}
