"use client";

import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { Globe, Loader2 } from 'lucide-react';
import { useState, useTransition, useEffect } from 'react';
import { routing } from '@/i18n/routing';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname(); // This returns path WITHOUT locale prefix (e.g., '/' or '/what-we-do')
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const languages = [
    { code: 'en', name: 'EN' },
    { code: 'id', name: 'ID' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  // Prefetch routes for both locales to speed up navigation
  useEffect(() => {
    // Prefetch routes for the other locale to speed up language switching
    const prefetchRoutes = () => {
      const otherLocale = locale === 'en' ? 'id' : 'en';
      const paths = ['/', '/what-we-do', '/authenticity', '/products', '/about', '/contact'];
      
      paths.forEach((path) => {
        const prefetchPath = path === '/' 
          ? (otherLocale === routing.defaultLocale ? '/' : `/${otherLocale}`)
          : `/${otherLocale}${path}`;
        
        // Prefetch using link prefetch for faster navigation
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = prefetchPath;
        document.head.appendChild(link);
      });
    };

    // Delay prefetch slightly to not block initial render
    const timeoutId = setTimeout(prefetchRoutes, 100);
    return () => clearTimeout(timeoutId);
  }, [locale]);

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
    
    // pathname from next-intl already returns path without locale prefix
    // So we just need to build the new path with the new locale
    let newPath: string;
    
    if (newLocale === routing.defaultLocale) {
      // Default locale: no prefix for root, keep path for others
      newPath = pathname === '/' ? '/' : pathname;
    } else {
      // Non-default locale: always add prefix
      newPath = `/${newLocale}${pathname === '/' ? '' : pathname}`;
    }
    
    // Use startTransition for better UX and then navigate
    startTransition(() => {
      // Use window.location for full page refresh to ensure SSR
      // This ensures proper server-side rendering with the new locale
      window.location.href = newPath;
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Switch language"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Globe className="w-3.5 h-3.5" />
        )}
        <span>{switchingTo ? languages.find(l => l.code === switchingTo)?.name || currentLanguage.name : currentLanguage.name}</span>
      </button>

      {isOpen && !isPending && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-24 bg-black/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                disabled={isPending || lang.code === locale}
                className={`w-full px-3 py-2 text-left text-xs transition-colors duration-150 ${
                  locale === lang.code
                    ? 'bg-white/10 text-white font-medium cursor-default'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="flex items-center justify-between">
                  {lang.name}
                  {locale === lang.code && (
                    <span className="ml-2 text-xs">✓</span>
                  )}
                  {switchingTo === lang.code && (
                    <Loader2 className="ml-2 w-3 h-3 animate-spin" />
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
