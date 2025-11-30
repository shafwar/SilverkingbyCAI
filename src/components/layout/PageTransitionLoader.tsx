"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageLoadingSkeleton } from "@/components/ui/PageLoadingSkeleton";
import { AnimatePresence } from "framer-motion";

/**
 * Page transition loader that shows during navigation
 * Only shows for a brief moment to indicate navigation is happening
 */
export function PageTransitionLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    // Only show loader if pathname actually changed
    if (pathname !== prevPathname) {
      setIsLoading(true);
      setPrevPathname(pathname);

      // Hide loader quickly after navigation completes
      // This gives visual feedback without blocking
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 150); // Very short - just for visual feedback

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname]);

  return (
    <AnimatePresence mode="wait">
      {isLoading && <PageLoadingSkeleton key="loader" />}
    </AnimatePresence>
  );
}
