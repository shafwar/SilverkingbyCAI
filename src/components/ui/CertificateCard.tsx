"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { X, ZoomIn, Award } from "lucide-react";

const CertificateCard: React.FC = () => {
  const t = useTranslations("about.certificate");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Smooth entrance animation
  useEffect(() => {
    if (containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("animate-in");
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const cardVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: 0.1,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.2,
      },
    },
    hover: {
      scale: 1.03,
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const modalVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: [0.64, 0, 0.78, 0],
      },
    },
  };

  const imageModalVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 10,
      transition: {
        duration: 0.3,
        ease: [0.64, 0, 0.78, 0],
      },
    },
  };

  return (
    <>
      <motion.div
        ref={containerRef}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-3xl mx-auto"
      >
        {/* Main Content Container */}
        <div className="relative space-y-6">
          {/* Header Section - Smaller */}
          <motion.div variants={headerVariants} className="text-center space-y-3">
            <div className="inline-flex items-center justify-center gap-2 mb-1">
              <Award className="h-4 w-4 text-luxury-gold" />
              <span className="text-xs uppercase tracking-wider text-luxury-silver/60">
                {t("subtitle")}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight">
              <span className="bg-gradient-to-r from-luxury-gold to-luxury-lightGold bg-clip-text text-transparent">
                {t("title")}
              </span>{" "}
              <span className="text-white">{t("titleBold")}</span>
            </h2>
            <p className="mx-auto max-w-xl text-sm md:text-base text-luxury-silver/70 leading-relaxed px-4">
              {t("description.paragraph1")}
            </p>
          </motion.div>

          {/* Certificate Preview - No container, direct image */}
          <motion.div
            variants={imageVariants}
            whileHover="hover"
            className="relative group cursor-pointer"
            onClick={() => setOpen(true)}
          >
            {/* Subtle glow effect on hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-luxury-gold/10 via-luxury-lightGold/10 to-luxury-gold/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Badge - Positioned over image */}
            <div className="absolute top-3 left-3 z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-gradient-to-r from-luxury-gold/95 to-luxury-lightGold/95 text-luxury-black text-xs uppercase px-3 py-1 rounded-full shadow-lg font-bold tracking-wide backdrop-blur-sm"
              >
                {t("badge")}
              </motion.div>
            </div>

            {/* Zoom Icon Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.1 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-full p-3 border border-white/20">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </motion.div>
            </div>

            {/* Certificate Image - Direct, no container/border */}
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                ref={imageRef}
                src="/images/sertificate.jpeg"
                alt={t("certificateName")}
                className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02] ${
                  isImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setIsImageLoaded(true)}
                loading="lazy"
                draggable={false}
              />
              {!isImageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer" />
              )}
            </div>

            {/* Bottom Label - Simplified */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 md:p-4 pt-6">
              <p className="text-white font-medium text-xs md:text-sm text-center">
                {t("certificateName")}
              </p>
              <p className="text-luxury-silver/60 text-xs text-center mt-1 flex items-center justify-center gap-2">
                <span>{t("clickToView")}</span>
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-block"
                >
                  ?
                </motion.span>
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Full Screen Modal */}
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 0.2 }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="absolute top-4 right-4 md:top-8 md:right-8 z-20 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-3 border border-white/20 text-white transition-all duration-300 hover:scale-110"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </motion.button>

            {/* Certificate Image */}
            <motion.div
              variants={imageModalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-10 max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/images/sertificate.jpeg"
                alt={t("certificateName")}
                className="max-h-[90vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl border-2 border-luxury-gold/30"
                loading="lazy"
                draggable={false}
              />

              {/* Mobile optimization - tap to close hint */}
              <div className="md:hidden mt-4 text-center">
                <p className="text-white/60 text-sm">{t("clickToView")}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
          background-size: 2000px 100%;
        }
      `}</style>
    </>
  );
};

export default CertificateCard;
