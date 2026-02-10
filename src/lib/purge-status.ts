/**
 * Client-side utilities for managing purge status persistence
 * Uses localStorage to persist purge status across page reloads
 */

export type PurgeStatus = {
  month: number;
  year: number;
  verified: boolean;
  r2Uploaded: boolean;
  remainingPage1Logs: number;
  remainingPage2Logs: number;
  page1Deleted: number;
  page2Deleted: number;
  csvRows: number;
  filename: string;
  downloadUrl: string;
  timestamp: number; // When purge was completed
};

const STORAGE_KEY = "silverking_purged_months";

/**
 * Get purge status for a specific month from localStorage
 */
export function getPurgeStatus(month: number, year: number): PurgeStatus | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const purgedMonths: PurgeStatus[] = JSON.parse(stored);
    const status = purgedMonths.find(
      (s) => s.month === month && s.year === year
    );

    if (status) {
      console.log("[PurgeStatus] Found cached status for", month, year, ":", status);
    }

    return status || null;
  } catch (error) {
    console.error("[PurgeStatus] Error reading from localStorage:", error);
    return null;
  }
}

/**
 * Save purge status to localStorage
 */
export function savePurgeStatus(status: PurgeStatus): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const purgedMonths: PurgeStatus[] = stored ? JSON.parse(stored) : [];

    // Remove existing status for this month/year if exists
    const filtered = purgedMonths.filter(
      (s) => !(s.month === status.month && s.year === status.year)
    );

    // Add new status
    filtered.push({
      ...status,
      timestamp: Date.now(),
    });

    // Keep only last 24 months (2 years) to prevent localStorage bloat
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateB.getTime() - dateA.getTime();
    });
    const recent = sorted.slice(0, 24);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
    console.log("[PurgeStatus] Saved purge status to localStorage:", {
      month: status.month,
      year: status.year,
      verified: status.verified,
      r2Uploaded: status.r2Uploaded,
      totalMonths: recent.length,
    });
    
    // Verify it was saved correctly
    const verify = getPurgeStatus(status.month, status.year);
    if (!verify) {
      console.error("[PurgeStatus] WARNING: Status was not saved correctly!");
    } else {
      console.log("[PurgeStatus] Verified saved status:", verify);
    }
  } catch (error) {
    console.error("[PurgeStatus] Error saving to localStorage:", error);
  }
}

/**
 * Get all purged months from localStorage
 */
export function getAllPurgedMonths(): PurgeStatus[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    return JSON.parse(stored);
  } catch (error) {
    console.error("[PurgeStatus] Error reading from localStorage:", error);
    return [];
  }
}

/**
 * Clear purge status for a specific month
 */
export function clearPurgeStatus(month: number, year: number): void {
  if (typeof window === "undefined") return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const purgedMonths: PurgeStatus[] = JSON.parse(stored);
    const filtered = purgedMonths.filter(
      (s) => !(s.month === month && s.year === year)
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("[PurgeStatus] Error clearing from localStorage:", error);
  }
}

/**
 * Check if a month is purged (from localStorage)
 */
export function isMonthPurged(month: number, year: number): boolean {
  const status = getPurgeStatus(month, year);
  return status !== null && status.verified && status.r2Uploaded;
}
