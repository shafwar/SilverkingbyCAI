"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";

export type DateRangeOption = "7d" | "30d" | "custom";

type DateRangePickerProps = {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
  onCustomSelect?: () => void;
};

export function DateRangePicker({ value, onChange, onCustomSelect }: DateRangePickerProps) {
  const t = useTranslations('admin.analytics');
  const options: { label: string; value: DateRangeOption }[] = useMemo(
    () => [
      { label: t('last7Days'), value: "7d" },
      { label: t('last30Days'), value: "30d" },
      { label: t('custom'), value: "custom" },
    ],
    [t]
  );

  const handleClick = (option: DateRangeOption) => {
    onChange(option);
    if (option === "custom") {
      onCustomSelect?.();
    }
  };

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs text-white">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleClick(option.value)}
          className={clsx(
            "rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]",
            value === option.value
              ? "bg-[#FFD700]/30 text-white shadow-lg shadow-[#FFD700]/30"
              : "text-white/60 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}


