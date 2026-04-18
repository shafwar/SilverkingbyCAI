"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { Globe, Loader2 } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { routing } from "@/i18n/routing";
import clsx from "clsx";

export type LanguageSwitcherVariant = "default" | "adminNav";

type LanguageSwitcherProps = {
  /** adminNav: tinggi & pill selaras tombol logout di navbar admin */
  variant?: LanguageSwitcherVariant;
};

export default function LanguageSwitcher({ variant = "default" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname(); // This returns path WITHOUT locale prefix (e.g., '/' or '/what-we-do')
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const languages = [
    { code: 'en', name: 'EN' },
    { code: 'id', name: 'ID' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  // OPTIMIZED: ULTRA-AGGRESSIVE prefetch for BOTH locales (current + other)
  // Uses multiple strategies to ensure routes are cached for instant navigation
  useEffect(() => {
    const prefetchRoutes = () => {
      const paths = ['/', '/what-we-do', '/authenticity', '/products', '/about', '/contact'];
      
      // Prefetch for current locale (for fast navigation within same locale)
      paths.forEach((path) => {
        // Strategy 1: Use router.prefetch (handles locale automatically)
        try {
          router.prefetch(path);
        } catch (e) {
          // Silently fail
        }
        
        // Strategy 2: Direct link prefetch with explicit locale path
        try {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.as = 'document';
          const fullPath = locale === routing.defaultLocale
            ? path
            : `/${locale}${path === '/' ? '' : path}`;
          prefetchLink.href = fullPath;
          document.head.appendChild(prefetchLink);
        } catch (e) {
          // Silently fail
        }
        
        // Strategy 3: Additional prefetch for non-default locale
        if (locale !== routing.defaultLocale) {
          try {
            const fullPath = `/${locale}${path === '/' ? '' : path}`;
            const prefetchLink2 = document.createElement('link');
            prefetchLink2.rel = 'prefetch';
            prefetchLink2.as = 'document';
            prefetchLink2.href = fullPath;
            prefetchLink2.crossOrigin = 'anonymous';
            document.head.appendChild(prefetchLink2);
          } catch (e) {
            // Silently fail
          }
        }
      });
      
      // Also prefetch for other locale (for fast language switching)
      const otherLocale = locale === 'en' ? 'id' : 'en';
      paths.forEach((path) => {
        // Strategy 1: Try router.prefetch first
        try {
          router.prefetch(path);
        } catch (e) {
          // Silently fail
        }
        
        // Strategy 2: Direct link prefetch for other locale
        try {
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.as = 'document';
          const otherLocalePath = path === '/' 
            ? (otherLocale === routing.defaultLocale ? '/' : `/${otherLocale}`)
            : `/${otherLocale}${path}`;
          prefetchLink.href = otherLocalePath;
          document.head.appendChild(prefetchLink);
        } catch (e2) {
          // Silently fail
        }
      });
    };

    // Prefetch immediately on mount (no delay)
    prefetchRoutes();
    
    // Also prefetch again after a short delay to ensure it's cached
    const timeoutId = setTimeout(() => {
      prefetchRoutes();
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [locale, router]);

  const switchLanguage = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    setSwitchingTo(newLocale);
    
    // Handle admin paths - keep admin path, just change locale cookie
    if (pathname.startsWith('/admin')) {
      // Set locale cookie for admin pages
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      // Reload current page to apply new locale
      startTransition(() => {
        window.location.reload();
      });
      return;
    }
    
    // OPTIMIZED: Build the target path directly for faster navigation
    // This avoids the delay from router.push trying to resolve locale
    const targetPath = newLocale === routing.defaultLocale
      ? (pathname === '/' ? '/' : pathname)
      : `/${newLocale}${pathname === '/' ? '' : pathname}`;
    
    // Set locale cookie immediately for persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Use startTransition for smooth UI update, then navigate
    startTransition(() => {
      // Use window.location for instant navigation (faster than router.push)
      // This avoids the delay from next-intl's locale resolution
      window.location.href = targetPath;
    });
  };

  const triggerClass = clsx(
    "font-sans disabled:cursor-not-allowed disabled:opacity-50",
    variant === "adminNav"
      ? "inline-flex h-9 min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.07] px-2.5 text-[11px] font-semibold text-white shadow-none transition-colors duration-200 hover:bg-white/[0.12] xl:h-10 xl:min-h-10 xl:gap-2 xl:px-3.5 xl:text-xs"
      : "flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-white/15 hover:text-white md:rounded-md md:border-transparent md:bg-white/5 md:px-3 md:py-1.5 md:text-xs md:font-medium md:shadow-none md:hover:bg-white/10"
  );

  const iconClassTrigger =
    variant === "adminNav" ? "h-3 w-3 shrink-0 xl:h-3.5 xl:w-3.5" : "h-4 w-4 md:h-3.5 md:w-3.5";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={triggerClass}
        aria-label="Switch language"
        type="button"
      >
        {isPending ? (
          <Loader2 className={clsx(iconClassTrigger, "animate-spin")} />
        ) : (
          <Globe className={iconClassTrigger} />
        )}
        <span className="font-sans leading-none font-semibold">
          {switchingTo
            ? languages.find((l) => l.code === switchingTo)?.name || currentLanguage.name
            : currentLanguage.name}
        </span>
      </button>

      {isOpen && !isPending && (
        <>
          <div
            className={clsx("fixed inset-0", variant === "adminNav" ? "z-[55]" : "z-40")}
            onClick={() => setIsOpen(false)}
          />
          <div
            className={clsx(
              "absolute right-0 top-full mt-2 w-28 overflow-hidden rounded-lg border bg-black/95 shadow-xl backdrop-blur-sm",
              variant === "adminNav"
                ? "z-[70] border-white/20"
                : "z-[60] border-white/20 md:w-24 md:border-white/10"
            )}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                disabled={isPending || lang.code === locale}
                className={`w-full px-4 py-3 md:px-3 md:py-2 text-left text-sm md:text-xs transition-colors duration-150 ${
                  locale === lang.code
                    ? 'bg-white/10 text-white font-semibold md:font-medium cursor-default'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-sans font-semibold md:font-normal">{lang.name}</span>
                  {locale === lang.code && (
                    <span className="ml-2 text-sm md:text-xs">✓</span>
                  )}
                  {switchingTo === lang.code && (
                    <Loader2 className="ml-2 w-4 h-4 md:w-3 md:h-3 animate-spin" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
