"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

// Launch date: November 2025
const LAUNCH_YEAR = 2025;
const LAUNCH_MONTH = 11; // November (1-indexed)

type MonthYearPickerProps = {
  month: number; // 1-12
  year: number;
  onChange: (month: number, year: number) => void;
};

export function MonthYearPicker({ month, year, onChange }: MonthYearPickerProps) {
  const t = useTranslations('admin.charts');
  const tMonths = useTranslations('admin.months');
  
  // Generate available months/years starting from launch date
  const availableOptions = useMemo(() => {
    const options: Array<{ month: number; year: number; label: string }> = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    // Start from launch date (November 2025)
    let y = LAUNCH_YEAR;
    let m = LAUNCH_MONTH;

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const monthKey = m.toString().padStart(2, '0');
      const monthName = tMonths(monthKey);
      options.push({
        month: m,
        year: y,
        label: `${monthName} ${y}`,
      });

      // Move to next month
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }

    return options.reverse(); // Most recent first
  }, [tMonths]);

  const currentIndex = availableOptions.findIndex(
    (opt) => opt.month === month && opt.year === year
  );

  const canGoPrevious = currentIndex < availableOptions.length - 1;
  const canGoNext = currentIndex > 0;

  const handlePrevious = () => {
    if (canGoPrevious) {
      const next = availableOptions[currentIndex + 1];
      onChange(next.month, next.year);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      const next = availableOptions[currentIndex - 1];
      onChange(next.month, next.year);
    }
  };

  const currentOption = availableOptions[currentIndex];
  const isCurrentMonth =
    year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        className={clsx(
          "rounded-full border border-white/10 p-1 sm:p-1.5 transition flex-shrink-0",
          canGoPrevious
            ? "text-white/60 hover:border-white/30 hover:text-white"
            : "cursor-not-allowed opacity-30"
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>

      <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-4 py-1.5 sm:py-2 min-w-0">
        <span className="text-xs sm:text-sm font-medium text-white truncate">
          {currentOption?.label || `${tMonths(month.toString().padStart(2, '0'))} ${year}`}
        </span>
        {isCurrentMonth && (
          <span className="text-[10px] sm:text-xs text-white/50 flex-shrink-0 hidden sm:inline">({t('viewMode.current')})</span>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={clsx(
          "rounded-full border border-white/10 p-1 sm:p-1.5 transition flex-shrink-0",
          canGoNext
            ? "text-white/60 hover:border-white/30 hover:text-white"
            : "cursor-not-allowed opacity-30"
        )}
        aria-label="Next month"
      >
        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

