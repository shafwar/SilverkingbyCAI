export const WEIGHTS = [
  { value: "FIVE_GR", label: "5gr" },
  { value: "TEN_GR", label: "10gr" },
  { value: "TWENTY_FIVE_GR", label: "25gr" },
  { value: "FIFTY_GR", label: "50gr" },
  { value: "HUNDRED_GR", label: "100gr" },
  { value: "TWO_FIFTY_GR", label: "250gr" },
  { value: "FIVE_HUNDRED_GR", label: "500gr" },
] as const;

export const ROLES = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
} as const;

export const APP_NAME = "Cahaya Silver King";

/** Public Instagram (footer, contact). Override with NEXT_PUBLIC_INSTAGRAM_URL. */
export function getSilverKingInstagramUrl(): string {
  if (typeof process === "undefined") {
    return "https://www.instagram.com/silverkingofc/";
  }
  return (
    process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/silverkingofc/"
  );
}

/**
 * WhatsApp deep link for Silver King / admin contact.
 * NEXT_PUBLIC_WHATSAPP_MSISDN or NEXT_PUBLIC_MERCH_ADMIN_MSISDN (digits, country code without +).
 */
export function getSilverKingWhatsAppUrl(): string {
  if (typeof process === "undefined") {
    return "https://wa.me/6285285726980";
  }
  const raw =
    process.env.NEXT_PUBLIC_WHATSAPP_MSISDN || process.env.NEXT_PUBLIC_MERCH_ADMIN_MSISDN;
  const digits = raw?.replace(/\D/g, "") || "6285285726980";
  return `https://wa.me/${digits}`;
}

export const APP_DESCRIPTION =
  "Official manufacturer of ISO 9001 certified gold, silver, and palladium bullion bars. Guaranteed 99.99% purity with instant QR code authenticity verification.";

export const APP_DESCRIPTION_ID =
  "Manufaktur resmi emas, perak, dan paladium batangan bersertifikat ISO 9001 dengan jaminan kemurnian 99.99% dan sistem verifikasi QR code instan.";

/**
 * Get the base URL for the application
 * In production, defaults to https://cahayasilverking.id (non-www canonical)
 * Falls back to environment variables or localhost for development
 */
export function getBaseUrl(): string {
  // Production domain - CRITICAL: Canonical domain for SEO & QR codes
  const PRODUCTION_DOMAIN = "https://cahayasilverking.id";
  
  // Check if we're in production
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL;
  
  // In production, ALWAYS use production domain for QR codes
  if (isProduction) {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    if (envUrl && (envUrl.includes("cahayasilverking.id"))) {
      return envUrl.replace(/\/$/, "");
    }
    return PRODUCTION_DOMAIN;
  }
  
  // Development: use env vars or localhost
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Get the verify URL for a serial code
 */
export function getVerifyUrl(serialCode: string): string {
  return `${getBaseUrl()}/verify/${serialCode}`;
}

