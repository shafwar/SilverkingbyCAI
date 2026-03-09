import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * Root `/` page – redirects to the default locale route.
 * All home page logic lives in `app/[locale]/page.tsx` (single source of truth).
 * With `localePrefix: 'as-needed'`, `/en` is canonical for the default locale,
 * but next-intl middleware rewrites it back to `/` for the user.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
