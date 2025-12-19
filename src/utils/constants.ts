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

export const APP_NAME = "Silver King by CAI";
export const APP_DESCRIPTION =
  "Expert manufacturing of premium gold, silver, and palladium bars with QR-verified authenticity. ISO 9001 certified precious metals manufacturer offering investment-grade bullion from 5gr to 500gr, featuring 99.99% purity guarantee, advanced spectrometry testing, and blockchain-ready traceability. Custom bar fabrication, uncompromising quality standards, and instant QR code verification system for complete product provenance and anti-counterfeit protection.";

/**
 * Get the base URL for the application
 * In production, defaults to https://www.cahayasilverking.id/
 * Falls back to environment variables or localhost for development
 */
export function getBaseUrl(): string {
  // Production domain - CRITICAL: This is the canonical domain for QR codes
  const PRODUCTION_DOMAIN = "https://www.cahayasilverking.id";
  
  // Check if we're in production
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL;
  
  // In production, ALWAYS use production domain for QR codes
  // This ensures QR codes work even if env vars are misconfigured
  if (isProduction) {
    // Prioritize NEXT_PUBLIC_APP_URL if it matches production domain
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    
    // If env URL matches production domain, use it; otherwise use production domain
    if (envUrl && (envUrl.includes("cahayasilverking.id") || envUrl.includes("www.cahayasilverking.id"))) {
      return envUrl.replace(/\/$/, "");
    }
    
    // Always fallback to production domain for QR code stability
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

