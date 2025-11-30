"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Award } from "lucide-react";

const CertificateCard: React.FC = () => {
  const t = useTranslations("about.certificate");
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

  const cardVariants = {
    hidden: { opacity: 0, y: 60, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.8,
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
        delay: 0.2,
      },
    },
    hover: {
      scale: 1.03,
      transition: {
        duration: 0.4,
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

          {/* Certificate Display - Direct view, no clickable modal */}
          <motion.div variants={imageVariants} className="relative group">
            {/* Container with proper padding and responsive sizing */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-4 md:p-6 lg:p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-sm">
              {/* Subtle glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-luxury-gold/10 via-luxury-lightGold/10 to-luxury-gold/10 blur-xl opacity-50 transition-opacity duration-500 rounded-2xl" />

              {/* Badge - Positioned over image */}
              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="bg-gradient-to-r from-luxury-gold/95 to-luxury-lightGold/95 text-luxury-black text-xs uppercase px-3 py-1.5 rounded-full shadow-lg font-bold tracking-wide backdrop-blur-sm"
                >
                  {t("badge")}
                </motion.div>
              </div>

              {/* Certificate Image - Responsive aspect ratio */}
              <div className="relative aspect-[4/3] md:aspect-[3/2] lg:aspect-[4/3] overflow-hidden rounded-lg bg-white/5">
                <img
                  ref={imageRef}
                  src="/images/sertificate.jpeg"
                  alt={t("certificateName")}
                  className={`w-full h-full object-contain ${
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

              {/* Bottom Label - Certificate name only */}
              <div className="mt-4 text-center">
                <p className="text-white font-medium text-sm md:text-base">
                  {t("certificateName")}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

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
