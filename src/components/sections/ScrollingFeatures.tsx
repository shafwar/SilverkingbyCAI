"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface Feature {
  label: string;
  title: string;
  body: string;
}

interface ScrollingFeaturesProps {
  features: Feature[];
  shouldAnimate?: boolean;
}

export default function ScrollingFeatures({
  features,
  shouldAnimate = true,
}: ScrollingFeaturesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!shouldAnimate || !containerRef.current || !wrapperRef.current) return;

    // Wait for layout to calculate proper widths
    const initAnimation = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const firstChild = wrapper.firstElementChild as HTMLElement;
      if (!firstChild) return;

      // Calculate width of one set of features (we have 3 sets, so divide by 3)
      const itemWidth = firstChild.offsetWidth;
      const gap = 16; // gap-4 = 1rem = 16px
      const singleSetWidth = (itemWidth + gap) * features.length;
      
      // We need to scroll exactly one set width for seamless loop
      // Since we have 3 sets, when first set scrolls out, second set is in position
      const scrollDistance = singleSetWidth;

      // Reset position
      gsap.set(wrapper, { x: 0 });

      // Kill existing animation if any
      if (animationRef.current) {
        animationRef.current.kill();
      }

      // Create seamless infinite scroll using GSAP's repeat with proper reset
      // Technique: Scroll one set width, then instantly reset (invisible to user)
      animationRef.current = gsap.to(wrapper, {
        x: -scrollDistance,
        duration: features.length * 15, // 15 seconds per item for smooth, readable pace
        ease: "none",
        repeat: -1, // Infinite loop
        // No onRepeat needed - GSAP handles seamless repeat automatically
      });

      setIsReady(true);
    };

    // Small delay to ensure layout is calculated
    const timeoutId = setTimeout(initAnimation, 100);

    // Also try on next frame for faster initialization
    requestAnimationFrame(() => {
      requestAnimationFrame(initAnimation);
    });

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (animationRef.current) {
        animationRef.current.kill();
      }
    };
  }, [shouldAnimate, features]);

  // Duplicate features for seamless infinite loop
  const duplicatedFeatures = [...features, ...features, ...features]; // Triple for smoother loop

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden py-3 sm:py-4 md:hidden"
    >
      {/* No gradient masks - clean edges */}
      <div
        ref={wrapperRef}
        className="flex gap-5 sm:gap-6 w-fit"
        style={{ 
          willChange: "transform",
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.6s ease-in",
        }}
      >
        {duplicatedFeatures.map((feature, index) => (
          <div
            key={`${feature.label}-${index}`}
            className="flex-shrink-0 w-[270px] sm:w-[310px] relative pl-5"
          >
            {/* Vertical line indicator - clean and subtle */}
            <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/15 to-transparent">
              <div className="absolute -left-[2px] top-1.5 h-1.5 w-1.5 rounded-full bg-white/35" />
            </div>

            {/* Content - optimized spacing and typography */}
            <div className="pl-4 pr-2">
              <p className="font-sans text-[0.5rem] sm:text-[0.52rem] uppercase tracking-[0.4em] sm:tracking-[0.45em] text-white/50 mb-2.5" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>
                {feature.label}
              </p>
              <p className="font-sans text-[0.875rem] sm:text-[0.95rem] font-semibold text-white/95 tracking-tight leading-snug mb-2" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>
                {feature.title}
              </p>
              <p className="font-sans text-[0.7rem] sm:text-[0.75rem] text-white/60 leading-relaxed" style={{ fontFamily: "__GeistSans_fb8f2c, __GeistSans_Fallback_fb8f2c" }}>
                {feature.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

