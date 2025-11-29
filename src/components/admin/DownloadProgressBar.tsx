import React from "react";

interface DownloadProgressBarProps {
  percent: number; // 0-100
  label?: string;
}

export const DownloadProgressBar: React.FC<DownloadProgressBarProps> = ({ percent, label }) => {
  return (
    <div className="w-full max-w-lg mx-auto my-6">
      {label && <div className="mb-2 text-sm text-white text-center font-medium">{label}</div>}
      <div className="w-full h-4 rounded-xl bg-white/10 overflow-hidden relative">
        <div
          className="h-full rounded-xl bg-gradient-to-r from-[#FFD700] via-yellow-400 to-[#FDE68A] transition-all duration-300"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <div className="mt-1 text-xs text-white/60 text-center">{percent}%</div>
    </div>
  );
};
