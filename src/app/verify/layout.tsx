import { NavigationTransitionProvider } from "@/components/layout/NavigationTransitionProvider";
import { NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import { getMessages } from "next-intl/server";
import { Providers } from "../providers";

// Layout khusus untuk verify route
// Menyediakan NavigationTransitionProvider yang diperlukan oleh Navbar
export default async function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get messages untuk default locale
  const locale = routing.defaultLocale;
  let messages;
  try {
    messages = await getMessages({ locale });
  } catch (error) {
    console.error("[VerifyLayout] Error loading messages:", error);
    // Fallback to empty messages object to prevent crash
    messages = {};
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <NavigationTransitionProvider>
        <Providers>{children}</Providers>
      </NavigationTransitionProvider>
    </NextIntlClientProvider>
  );
}

