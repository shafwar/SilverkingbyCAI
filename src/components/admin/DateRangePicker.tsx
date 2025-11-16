"use client";

import { useMemo } from "react";
import clsx from "clsx";

export type DateRangeOption = "7d" | "30d" | "custom";

type DateRangePickerProps = {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
  onCustomSelect?: () => void;
};

export function DateRangePicker({ value, onChange, onCustomSelect }: DateRangePickerProps) {
  const options: { label: string; value: DateRangeOption }[] = useMemo(
    () => [
      { label: "Last 7 days", value: "7d" },
      { label: "Last 30 days", value: "30d" },
      { label: "Custom", value: "custom" },
    ],
    []
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


