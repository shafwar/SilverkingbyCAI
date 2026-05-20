"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Instagram } from "lucide-react";
import { APP_NAME, getSilverKingInstagramUrl, getSilverKingWhatsAppUrl } from "@/utils/constants";

gsap.registerPlugin(ScrollTrigger);

const navItems = [
  { navKey: "whatWeDo" as const, href: "/what-we-do" },
  { navKey: "authenticity" as const, href: "/authenticity" },
  { navKey: "products" as const, href: "/products" },
  { navKey: "merchandise" as const, href: "/merchandise" },
  { navKey: "distributor" as const, href: "/distributor" },
  { navKey: "journal" as const, href: "/journal" },
  { navKey: "aboutUs" as const, href: "/about" },
  { navKey: "getInTouch" as const, href: "/contact" },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function PageFooter() {
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const footerRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(footerRef, { once: true, amount: 0.2 });

  const bgImageUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_FOOTER_BG_IMAGE_URL?.trim()
      ? process.env.NEXT_PUBLIC_FOOTER_BG_IMAGE_URL.trim()
      : "/images/hero-fallback.jpg";

  const instagramHref = getSilverKingInstagramUrl();
  const whatsappHref = getSilverKingWhatsAppUrl();

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
        stagger: 0.05,
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
      {/* Optional photo layer — dark overlay keeps text readable */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${bgImageUrl})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#050505]/92 via-[#080808]/88 to-[#030303]/95"
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(212,175,55,0.07)_0%,transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none border-t border-luxury-gold/10"
        style={{ boxShadow: "inset 0 1px 0 0 rgba(212,175,55,0.05)" }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-5 py-14 sm:px-6 md:px-8 md:py-16 lg:px-12 lg:py-20">
        <div
          ref={linksRef}
          className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between md:gap-12"
        >
          <nav
            aria-label="Site"
            className="flex max-w-2xl flex-wrap gap-x-5 gap-y-1 sm:gap-x-7"
          >
            {navItems.map(({ navKey, href }) => (
              <Link
                key={navKey}
                href={href}
                prefetch={true}
                className="inline-flex min-h-[44px] items-center py-2 text-sm font-medium text-white/75 transition-colors duration-300 hover:text-luxury-gold sm:text-base md:min-h-0"
              >
                {tNav(navKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5 md:gap-6">
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 transition-colors duration-300 hover:border-luxury-gold/40 hover:text-luxury-gold md:min-h-0 md:min-w-0 md:border-0 md:bg-transparent md:p-1"
              aria-label={tFooter("instagramAria")}
            >
              <Instagram className="h-6 w-6 md:h-7 md:w-7" strokeWidth={1.75} />
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-black/30 text-emerald-400/90 transition-colors duration-300 hover:border-emerald-400/50 hover:text-emerald-300 md:min-h-0 md:min-w-0 md:border-0 md:bg-transparent md:p-1"
              aria-label={tFooter("whatsappAria")}
            >
              <WhatsAppIcon className="h-6 w-6 md:h-7 md:w-7" />
            </a>
          </div>
        </div>

        <motion.div
          className="mt-12 border-t border-white/10 pt-8"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <p className="text-xs text-white/45">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  );
}
