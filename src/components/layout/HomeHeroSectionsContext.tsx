"use client";

import { createContext, useContext } from "react";
import type { PageSectionEntry } from "@/hooks/usePageSections";

export type HomeHeroSectionsContextValue = {
  sections: Record<string, PageSectionEntry>;
  refetch: () => Promise<void>;
};

export const HomeHeroSectionsContext = createContext<HomeHeroSectionsContextValue | null>(null);

export function useHomeHeroSectionsContext() {
  return useContext(HomeHeroSectionsContext);
}
