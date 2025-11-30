"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useNavigationTransition } from "./NavigationTransitionProvider";
import { Variants } from "framer-motion";
import { getR2UrlClient } from "@/utils/r2-url";

const panelVariants: Variants = {
  enter: { y: "100%" },
  active: {
    y: "0%",
    transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }, // Faster: 0.75 -> 0.4
  },
  exit: {
    y: "-100%",
    transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }, // Faster: 0.95 -> 0.4
  },
};

export function PageTransitionOverlay() {
  // Overlay Disabled - instant navigation
  return null;
}


