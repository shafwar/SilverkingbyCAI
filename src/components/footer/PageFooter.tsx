"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Instagram, Linkedin, Youtube, Twitter } from "lucide-react";
import { APP_NAME } from "@/utils/constants";

gsap.registerPlugin(ScrollTrigger);

const navKeys = ["whatWeDo", "authenticity", "products", "merchandise", "distributor", "aboutUs"] as const;
const social = [
  { key: "Instagram", href: "https://instagram.com", Icon: Instagram },
  { key: "Twitter", href: "https://twitter.com", Icon: Twitter },
  { key: "LinkedIn", href: "https://linkedin.com", Icon: Linkedin },
  { key: "YouTube", href: "https://youtube.com", Icon: Youtube },
];

const paths: Record<(typeof navKeys)[number], string> = {
  whatWeDo: "/what-we-do",
  authenticity: "/authenticity",
  products: "/products",
  merchandise: "/merchandise",
  distributor: "/distributor",
  aboutUs: "/about",
};

export function PageFooter() {
  const locale = useLocale();
  const t = useTranslations("nav");
  const footerRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.2 });

  useEffect(() => {
    const el = linksRef.current;
    if (!el || !isInView) return;
    const links = el.querySelectorAll("a");
    gsap.fromTo(
      links,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "power2.out",
      }
    );
  }, [isInView]);

  return (
    <motion.footer
      ref={footerRef}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative overflow-hidden border-t border-white/5"
    >
      {/* Glamorous gradient background – simple classy */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.97) 0%, rgba(20,18,12,0.98) 40%, rgba(15,14,12,0.99) 100%)",
          boxShadow: "inset 0 1px 0 0 rgba(212,175,55,0.06)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(212,175,55,0.04)_0%,transparent_60%)]" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[1320px] px-6 py-16 md:px-8 md:py-20 lg:px-12 lg:py-24">
        <div
          ref={linksRef}
          className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10 md:gap-0"
        >
          {/* Nav links */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:gap-8">
            {navKeys.map((key) => (
              <Link
                key={key}
                href={`/${locale}${paths[key]}`}
                prefetch={true}
                className="text-sm md:text-base font-medium text-white/70 hover:text-luxury-gold/90 transition-colors duration-300"
              >
                {t(key)}
              </Link>
            ))}
          </div>
          {/* Social */}
          <div className="flex items-center gap-4 md:gap-5">
            {social.map(({ key, href, Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-luxury-gold/80 transition-colors duration-300"
                aria-label={key}
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
              </a>
            ))}
          </div>
        </div>
        <motion.div
          className="mt-12 pt-8 border-t border-white/5"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
