"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DownloadState {
  percent: number | null;
  label: string;
  isMinimized: boolean;
  abortController: AbortController | null;
}

interface DownloadContextType {
  downloadState: DownloadState;
  setDownloadPercent: (percent: number | null) => void;
  setDownloadLabel: (label: string) => void;
  setIsDownloadMinimized: (minimized: boolean) => void;
  setDownloadAbortController: (controller: AbortController | null) => void;
  cancelDownload: () => void;
  resetDownload: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    percent: null,
    label: "",
    isMinimized: false,
    abortController: null,
  });

  const setDownloadPercent = useCallback((percent: number | null) => {
    setDownloadState((prev) => ({ ...prev, percent }));
  }, []);

  const setDownloadLabel = useCallback((label: string) => {
    setDownloadState((prev) => ({ ...prev, label }));
  }, []);

  const setIsDownloadMinimized = useCallback((minimized: boolean) => {
    setDownloadState((prev) => ({ ...prev, isMinimized: minimized }));
  }, []);

  const setDownloadAbortController = useCallback((controller: AbortController | null) => {
    setDownloadState((prev) => ({ ...prev, abortController: controller }));
  }, []);

  const cancelDownload = useCallback(() => {
    if (downloadState.abortController) {
      downloadState.abortController.abort();
    }
    setDownloadState({
      percent: null,
      label: "",
      isMinimized: false,
      abortController: null,
    });
  }, [downloadState.abortController]);

  const resetDownload = useCallback(() => {
    setDownloadState({
      percent: null,
      label: "",
      isMinimized: false,
      abortController: null,
    });
  }, []);

  return (
    <DownloadContext.Provider
      value={{
        downloadState,
        setDownloadPercent,
        setDownloadLabel,
        setIsDownloadMinimized,
        setDownloadAbortController,
        cancelDownload,
        resetDownload,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownload() {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error("useDownload must be used within a DownloadProvider");
  }
  return context;
}

