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
  "The Art of Precious Metal Perfection. Luxury gold, silver, palladium, and custom silver bars.";

/**
 * Get the base URL for the application
 * In production, defaults to https://www.cahayasilverking.id/
 * Falls back to environment variables or localhost for development
 */
export function getBaseUrl(): string {
  // Production domain
  const PRODUCTION_DOMAIN = "https://www.cahayasilverking.id";
  
  // Check if we're in production
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.VERCEL;
  
  // In production, prioritize the production domain
  if (isProduction) {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      PRODUCTION_DOMAIN
    ).replace(/\/$/, "");
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

