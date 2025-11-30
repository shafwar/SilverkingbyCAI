"use client";

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Globe, Loader2 } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { routing } from '@/i18n/routing';

export default function LanguageSwitcher() {
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-3 md:py-1.5 rounded-lg md:rounded-md bg-white/10 hover:bg-white/15 md:bg-white/5 md:hover:bg-white/10 text-white hover:text-white transition-all duration-200 text-sm md:text-xs font-semibold md:font-medium disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 md:border-transparent shadow-lg md:shadow-none"
        aria-label="Switch language"
        style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 md:w-3.5 md:h-3.5 animate-spin" />
        ) : (
          <Globe className="w-4 h-4 md:w-3.5 md:h-3.5" />
        )}
        <span className="font-semibold" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>{switchingTo ? languages.find(l => l.code === switchingTo)?.name || currentLanguage.name : currentLanguage.name}</span>
      </button>

      {isOpen && !isPending && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-28 md:w-24 bg-black/95 backdrop-blur-sm border border-white/20 md:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
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
                  <span className="font-semibold md:font-normal" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>{lang.name}</span>
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
