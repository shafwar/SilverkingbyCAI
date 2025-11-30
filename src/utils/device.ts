/**
 * Device detection and optimization utilities
 * For mobile optimization and reduced motion preferences
 */

/**
 * Check if device is mobile (touch device with small screen)
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;

  // Check screen width
  if (window.innerWidth < 768) return true;

  // Check for touch capability
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    // Additional check: if touch device but large screen, might be tablet
    return window.innerWidth < 1024;
  }

  return false;
}

/**
 * Check if user prefers reduced motion
 * Respects CSS prefers-reduced-motion media query
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get optimized transition duration based on device and preferences
 */
export function getTransitionDuration(baseDuration: number): number {
  if (prefersReducedMotion()) {
    return 0; // Instant transitions for reduced motion
  }

  if (isMobileDevice()) {
    // Much faster on mobile for better perceived performance
    return baseDuration * 0.75; // Slightly adjusted for ultra-fast mobile
  }

  return baseDuration;
}

/**
 * Get optimized blur intensity based on device
 */
export function getBlurIntensity(baseBlur: number): number {
  if (prefersReducedMotion()) {
    return 0; // No blur for reduced motion
  }

  if (isMobileDevice()) {
    // Reduced blur on mobile for better performance
    return baseBlur * 0.5;
  }

  return baseBlur;
}

/**
 * Check if device has low performance (heuristic)
 */
export function isLowPerformanceDevice(): boolean {
  if (typeof window === "undefined") return false;

  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;

  // Check for device memory (if available)
  const memory = (navigator as any).deviceMemory || 4;

  // Consider it low performance if:
  // - Less than 4 cores OR
  // - Less than 4GB RAM (if available)
  return cores < 4 || memory < 4;
}
