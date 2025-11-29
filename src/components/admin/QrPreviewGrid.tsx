"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Maximize2,
  Download,
  FileText,
  CheckSquare2,
  Square,
  Grid3x3,
  Table2,
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  Check,
} from "lucide-react";
import jsPDF from "jspdf";

import { fetcher } from "@/lib/fetcher";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Modal } from "./Modal";
import { AnimatedCard } from "./AnimatedCard";
import { DownloadProgressBar } from "./DownloadProgressBar";

type Product = {
  id: number;
  name: string;
  weight: number;
  serialCode: string;
  qrImageUrl: string | null;
};

type PreviewResponse = {
  products: Product[];
};

export function QrPreviewGrid() {
  const t = useTranslations("admin.qrPreviewDetail");
  const tCommon = useTranslations("common");
  const { data, error, isLoading, mutate } = useSWR<PreviewResponse>(
    "/api/admin/qr-preview",
    fetcher,
    {
      refreshInterval: 60000,
    }
  );
  const [selected, setSelected] = useState<Product | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [layoutView, setLayoutView] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Tambah state untuk progress bar
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [downloadLabel, setDownloadLabel] = useState<string>("");

  // Extract categories from products (first 3 letters of serial code)
  const categories = useMemo(() => {
    if (!data?.products) return [];

    const categoryMap = new Map<string, { prefix: string; weight: number; count: number }>();

    data.products.forEach((product) => {
      const prefix = product.serialCode.substring(0, 3).toUpperCase();
      if (prefix.length === 3) {
        const existing = categoryMap.get(prefix);
        if (existing) {
          existing.count += 1;
        } else {
          categoryMap.set(prefix, {
            prefix,
            weight: product.weight,
            count: 1,
          });
        }
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.prefix.localeCompare(b.prefix));
  }, [data?.products]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    if (!data?.products) return [];

    let filtered = data.products;

    // Filter by category (serial prefix)
    if (selectedCategory) {
      filtered = filtered.filter((product) => {
        const prefix = product.serialCode.substring(0, 3).toUpperCase();
        return prefix === selectedCategory;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(query);
        const serialMatch = product.serialCode.toLowerCase().includes(query);
        return nameMatch || serialMatch;
      });
    }

    return filtered;
  }, [data?.products, searchQuery, selectedCategory]);

  // Helper function to load image with better error handling and CORS support
  // All images now go through proxy endpoints which have CORS headers
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // All images now come from same-origin proxy endpoints with CORS headers
      // Set crossOrigin for proxy endpoints to allow canvas export
      const isProxyEndpoint =
        src.includes("/api/admin/template-proxy") || src.includes("/api/admin/qr-proxy");

      if (isProxyEndpoint) {
        img.crossOrigin = "anonymous";
      }

      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error(`Image load timeout: ${src}`));
      }, 30000); // 30 seconds timeout

      img.onload = () => {
        clearTimeout(timeout);
        console.log(`[LoadImage] Successfully loaded: ${src}`, {
          width: img.width,
          height: img.height,
          crossOrigin: img.crossOrigin || "not set",
        });
        resolve(img);
      };

      img.onerror = (error) => {
        clearTimeout(timeout);
        console.error(`[LoadImage] Failed to load image: ${src}`, error);
        reject(new Error(`Failed to load image: ${src}. Please check if the file exists.`));
      };

      img.src = src;
    });
  };

  const handleDownload = async (product: Product) => {
    setIsDownloading(true);
    try {
      console.log("[Download] Starting download for:", product.serialCode);

      // Use proxy endpoint for templates to avoid CORS/tainted canvas issues
      // Proxy will fetch from R2 and serve with proper CORS headers, or fallback to local
      const absoluteFrontUrl = `${window.location.origin}/api/admin/template-proxy?template=front`;
      const absoluteBackUrl = `${window.location.origin}/api/admin/template-proxy?template=back`;

      console.log("[Download] Using template proxy URLs:", {
        front: absoluteFrontUrl,
        back: absoluteBackUrl,
      });

      // Get QR code from R2 via proxy endpoint (prioritizes R2, fallback to API)
      // This ensures QR code comes from R2 if available, with proper CORS headers
      const qrImageUrl = `${window.location.origin}/api/admin/qr-proxy?serialCode=${encodeURIComponent(product.serialCode)}`;
      console.log("[Download] QR URL (via proxy, from R2):", qrImageUrl);

      // Load all images: front template, back template, and QR code
      // If R2 template fails, fallback to local paths
      console.log("[Download] Loading images...");
      let frontTemplateImg: HTMLImageElement;
      let backTemplateImg: HTMLImageElement;

      try {
        frontTemplateImg = await loadImage(absoluteFrontUrl);
        console.log("[Download] Front template loaded from:", absoluteFrontUrl);
      } catch (frontErr: any) {
        console.warn("[Download] Failed to load front template from R2, trying local:", frontErr);
        // Fallback to local path
        const localFrontUrl = window.location.origin + "/images/serticard/Serticard-01.png";
        try {
          frontTemplateImg = await loadImage(localFrontUrl);
          console.log("[Download] Front template loaded from local:", localFrontUrl);
        } catch (localErr: any) {
          throw new Error(`Failed to load front template from R2 and local: ${frontErr.message}`);
        }
      }

      try {
        backTemplateImg = await loadImage(absoluteBackUrl);
        console.log("[Download] Back template loaded from:", absoluteBackUrl);
      } catch (backErr: any) {
        console.warn("[Download] Failed to load back template from R2, trying local:", backErr);
        // Fallback to local path
        const localBackUrl = window.location.origin + "/images/serticard/Serticard-02.png";
        try {
          backTemplateImg = await loadImage(localBackUrl);
          console.log("[Download] Back template loaded from local:", localBackUrl);
        } catch (localErr: any) {
          throw new Error(`Failed to load back template from R2 and local: ${backErr.message}`);
        }
      }

      // Load QR code (required, no fallback)
      const qrImg = await loadImage(qrImageUrl).catch((err) => {
        console.error("[Download] Failed to load QR:", err);
        throw new Error(`Failed to load QR code: ${err.message}`);
      });

      console.log("[Download] Images loaded successfully", {
        frontSize: { width: frontTemplateImg.width, height: frontTemplateImg.height },
        backSize: { width: backTemplateImg.width, height: backTemplateImg.height },
        qrSize: { width: qrImg.width, height: qrImg.height },
      });

      // Create canvas for FRONT template with QR code overlay
      const frontCanvas = document.createElement("canvas");
      frontCanvas.width = frontTemplateImg.width;
      frontCanvas.height = frontTemplateImg.height;
      const frontCtx = frontCanvas.getContext("2d", {
        willReadFrequently: false, // Optimize for drawing, not reading
      });
      if (!frontCtx) throw new Error("Failed to get canvas context");

      // Draw front template as background
      // Use try-catch to handle potential tainted canvas errors
      try {
        frontCtx.drawImage(frontTemplateImg, 0, 0);
      } catch (drawError: any) {
        // If tainted canvas error, try to reload image without crossOrigin
        if (drawError.message?.includes("tainted") || drawError.message?.includes("cross-origin")) {
          console.warn(
            "[Download] Tainted canvas detected, reloading front template without crossOrigin"
          );
          const localFrontUrl = window.location.origin + "/images/serticard/Serticard-01.png";
          const fallbackImg = await loadImage(localFrontUrl);
          frontCtx.drawImage(fallbackImg, 0, 0);
          frontTemplateImg = fallbackImg; // Update reference for later use
        } else {
          throw drawError;
        }
      }

      // Calculate QR position based on template design
      // From image: QR is centered, serial below, product name above
      const qrSize = Math.min(frontTemplateImg.width * 0.55, frontTemplateImg.height * 0.55, 900);
      const qrX = (frontTemplateImg.width - qrSize) / 2; // Center horizontally
      const qrY = frontTemplateImg.height * 0.38; // Position vertically

      // Draw white background for QR (optional, for better contrast)
      const padding = 8;
      frontCtx.fillStyle = "#ffffff";
      frontCtx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);

      // Draw QR code on front template
      frontCtx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Add product name above QR code
      if (product.name) {
        const nameY = qrY - 35;
        const nameFontSize = Math.floor(frontTemplateImg.width * 0.025);
        frontCtx.fillStyle = "#222222";
        frontCtx.textAlign = "center";
        frontCtx.textBaseline = "middle";
        frontCtx.font = `${nameFontSize}px Arial, sans-serif`;

        // Truncate if too long
        let displayName = product.name;
        const maxWidth = frontTemplateImg.width * 0.65;
        const metrics = frontCtx.measureText(displayName);
        if (metrics.width > maxWidth) {
          while (
            frontCtx.measureText(displayName + "...").width > maxWidth &&
            displayName.length > 0
          ) {
            displayName = displayName.slice(0, -1);
          }
          displayName += "...";
        }

        frontCtx.fillText(displayName, frontTemplateImg.width / 2, nameY);
      }

      // Add serial number below QR code (using LucidaSans font)
      const serialY = qrY + qrSize + 35;
      const fontSize = Math.floor(frontTemplateImg.width * 0.032);
      frontCtx.fillStyle = "#222222";
      frontCtx.textAlign = "center";
      frontCtx.textBaseline = "middle";
      // Try to use LucidaSans, fallback to monospace for serial codes
      frontCtx.font = `${fontSize}px "LucidaSans", "Lucida Console", "Courier New", monospace`;
      frontCtx.fillText(product.serialCode, frontTemplateImg.width / 2, serialY);

      // Create canvas for BACK template (no QR, just the template)
      const backCanvas = document.createElement("canvas");
      backCanvas.width = backTemplateImg.width;
      backCanvas.height = backTemplateImg.height;
      const backCtx = backCanvas.getContext("2d", {
        willReadFrequently: false, // Optimize for drawing, not reading
      });
      if (!backCtx) throw new Error("Failed to get canvas context");

      // Draw back template as background (no QR code, just the template)
      // Use try-catch to handle potential tainted canvas errors
      try {
        backCtx.drawImage(backTemplateImg, 0, 0);
      } catch (drawError: any) {
        // If tainted canvas error, try to reload image without crossOrigin
        if (drawError.message?.includes("tainted") || drawError.message?.includes("cross-origin")) {
          console.warn(
            "[Download] Tainted canvas detected, reloading back template without crossOrigin"
          );
          const localBackUrl = window.location.origin + "/images/serticard/Serticard-02.png";
          const fallbackImg = await loadImage(localBackUrl);
          backCtx.drawImage(fallbackImg, 0, 0);
          backTemplateImg = fallbackImg; // Update reference for later use
        } else {
          throw drawError;
        }
      }

      // Convert both canvases to image data
      // Handle tainted canvas errors with fallback
      console.log("[Download] Converting canvases to image data...");
      let frontImageData: string;
      let backImageData: string;

      try {
        frontImageData = frontCanvas.toDataURL("image/png", 1.0);
      } catch (toDataError: any) {
        if (toDataError.message?.includes("tainted")) {
          console.warn("[Download] Tainted canvas error on front, using local template fallback");
          // Reload with local template and recreate canvas
          const localFrontUrl = window.location.origin + "/images/serticard/Serticard-01.png";
          const localFrontImg = await loadImage(localFrontUrl);
          const fallbackCanvas = document.createElement("canvas");
          fallbackCanvas.width = localFrontImg.width;
          fallbackCanvas.height = localFrontImg.height;
          const fallbackCtx = fallbackCanvas.getContext("2d");
          if (!fallbackCtx) throw new Error("Failed to get canvas context");
          fallbackCtx.drawImage(localFrontImg, 0, 0);
          // Redraw QR and text on fallback canvas
          const qrSize = Math.min(localFrontImg.width * 0.55, localFrontImg.height * 0.55, 900);
          const qrX = (localFrontImg.width - qrSize) / 2;
          const qrY = localFrontImg.height * 0.38;
          const padding = 8;
          fallbackCtx.fillStyle = "#ffffff";
          fallbackCtx.fillRect(
            qrX - padding,
            qrY - padding,
            qrSize + padding * 2,
            qrSize + padding * 2
          );
          fallbackCtx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          // Add product name and serial
          if (product.name) {
            const nameY = qrY - 35;
            const nameFontSize = Math.floor(localFrontImg.width * 0.025);
            fallbackCtx.fillStyle = "#222222";
            fallbackCtx.textAlign = "center";
            fallbackCtx.textBaseline = "middle";
            fallbackCtx.font = `${nameFontSize}px Arial, sans-serif`;
            let displayName = product.name;
            const maxWidth = localFrontImg.width * 0.65;
            const metrics = fallbackCtx.measureText(displayName);
            if (metrics.width > maxWidth) {
              while (
                fallbackCtx.measureText(displayName + "...").width > maxWidth &&
                displayName.length > 0
              ) {
                displayName = displayName.slice(0, -1);
              }
              displayName += "...";
            }
            fallbackCtx.fillText(displayName, localFrontImg.width / 2, nameY);
          }
          const serialY = qrY + qrSize + 35;
          const fontSize = Math.floor(localFrontImg.width * 0.032);
          fallbackCtx.fillStyle = "#222222";
          fallbackCtx.textAlign = "center";
          fallbackCtx.textBaseline = "middle";
          fallbackCtx.font = `${fontSize}px "LucidaSans", "Lucida Console", "Courier New", monospace`;
          fallbackCtx.fillText(product.serialCode, localFrontImg.width / 2, serialY);
          frontImageData = fallbackCanvas.toDataURL("image/png", 1.0);
        } else {
          throw toDataError;
        }
      }

      try {
        backImageData = backCanvas.toDataURL("image/png", 1.0);
      } catch (toDataError: any) {
        if (toDataError.message?.includes("tainted")) {
          console.warn("[Download] Tainted canvas error on back, using local template fallback");
          // Reload with local template and recreate canvas
          const localBackUrl = window.location.origin + "/images/serticard/Serticard-02.png";
          const localBackImg = await loadImage(localBackUrl);
          const fallbackCanvas = document.createElement("canvas");
          fallbackCanvas.width = localBackImg.width;
          fallbackCanvas.height = localBackImg.height;
          const fallbackCtx = fallbackCanvas.getContext("2d");
          if (!fallbackCtx) throw new Error("Failed to get canvas context");
          fallbackCtx.drawImage(localBackImg, 0, 0);
          backImageData = fallbackCanvas.toDataURL("image/png", 1.0);
        } else {
          throw toDataError;
        }
      }

      console.log("[Download] Image data lengths:", {
        front: frontImageData.length,
        back: backImageData.length,
      });

      if (
        !frontImageData ||
        frontImageData === "data:," ||
        !backImageData ||
        backImageData === "data:,"
      ) {
        throw new Error("Failed to generate image data from canvas");
      }

      // Create PDF using jsPDF with LANDSCAPE orientation for side-by-side layout
      console.log("[Download] Creating PDF with side-by-side layout...");
      const pdf = new jsPDF({
        orientation: "landscape", // Landscape to fit two cards side by side
        unit: "mm",
        format: [297, 210], // A4 landscape: width=297mm, height=210mm
      });

      // Calculate dimensions for side-by-side layout
      // Each card should fit in half the page width with some margin
      const pageWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const margin = 5; // Margin on each side
      const cardWidth = (pageWidth - margin * 3) / 2; // Two cards with margins
      const cardHeightFront = (frontTemplateImg.height / frontTemplateImg.width) * cardWidth;
      const cardHeightBack = (backTemplateImg.height / backTemplateImg.width) * cardWidth;

      // Use the maximum height to ensure both fit
      const maxCardHeight = Math.max(cardHeightFront, cardHeightBack);

      // If cards are too tall, scale down proportionally
      const scaleFactor =
        maxCardHeight > pageHeight - margin * 2 ? (pageHeight - margin * 2) / maxCardHeight : 1;

      const finalCardWidth = cardWidth * scaleFactor;
      const finalCardHeightFront = cardHeightFront * scaleFactor;
      const finalCardHeightBack = cardHeightBack * scaleFactor;

      // Center vertically
      const yOffsetFront = (pageHeight - finalCardHeightFront) / 2;
      const yOffsetBack = (pageHeight - finalCardHeightBack) / 2;

      console.log("[Download] PDF layout dimensions:", {
        pageWidth,
        pageHeight,
        finalCardWidth,
        finalCardHeightFront,
        finalCardHeightBack,
        yOffsetFront,
        yOffsetBack,
      });

      // Add front template (left side)
      try {
        pdf.addImage(
          frontImageData,
          "PNG",
          margin,
          yOffsetFront,
          finalCardWidth,
          finalCardHeightFront
        );
        console.log("[Download] Front template added to PDF");
      } catch (pdfError: any) {
        console.error("[Download] Failed to add front image to PDF:", pdfError);
        throw new Error(
          `Failed to add front template to PDF: ${pdfError.message || "Unknown error"}`
        );
      }

      // Add back template (right side)
      try {
        const backX = margin * 2 + finalCardWidth; // Position to the right of front card
        pdf.addImage(backImageData, "PNG", backX, yOffsetBack, finalCardWidth, finalCardHeightBack);
        console.log("[Download] Back template added to PDF");
      } catch (pdfError: any) {
        console.error("[Download] Failed to add back image to PDF:", pdfError);
        throw new Error(
          `Failed to add back template to PDF: ${pdfError.message || "Unknown error"}`
        );
      }

      console.log("[Download] PDF created successfully with side-by-side layout");

      // Generate filename
      const sanitizedName = product.name
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const filename = `QR-${product.serialCode}${sanitizedName ? `-${sanitizedName}` : ""}.pdf`;

      // Download PDF
      console.log("[Download] Saving PDF:", filename);
      pdf.save(filename);
      console.log("[Download] Download completed successfully");
    } catch (error: any) {
      console.error("[Download] Failed to download QR code:", error);
      console.error("[Download] Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });

      // Show more detailed error message
      const errorMessage = error?.message || "Unknown error occurred";
      alert(`${t("downloadFailed")}: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!data?.products || data.products.length === 0) {
      alert(t("downloadAllFailed"));
      return;
    }
    setIsDownloadingAll(true);
    setDownloadPercent(0);
    setDownloadLabel("Menyiapkan... 0%");

    try {
      const allProducts = data.products;
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(allProducts.length / BATCH_SIZE);
      let downloadedBatches = 0;

      // Split products into batches of 100 and download each batch as a separate ZIP
      for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
        const batch = allProducts.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const serialCodes = batch.map((p) => p.serialCode);

        setDownloadLabel(
          `Menggenerate batch ${batchNumber}/${totalBatches}... (${serialCodes.length} file)`
        );
        setDownloadPercent(Math.round((downloadedBatches / totalBatches) * 100));

        try {
          // Call endpoint for this batch (100 files) - backend will generate and return 1 ZIP
          const response = await fetch("/api/qr/download-multiple-pdf", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ serialCodes, batchNumber }), // Pass batchNumber for R2 folder naming
          });

          // Check if response is OK
          if (!response.ok) {
            let errorMessage = `Batch ${batchNumber} gagal`;
            try {
              const errorText = await response.text();
              if (
                errorText.trim().startsWith("<!DOCTYPE") ||
                errorText.trim().startsWith("<html")
              ) {
                errorMessage = `Server error pada batch ${batchNumber}. Silakan coba lagi.`;
              } else {
                try {
                  const errorJson = JSON.parse(errorText);
                  // Use message if available, otherwise use error field
                  errorMessage =
                    errorJson.message || errorJson.error || `Gagal mengunduh batch ${batchNumber}`;
                  // Add details if available (for debugging)
                  if (errorJson.details && process.env.NODE_ENV === "development") {
                    console.error(
                      `[Download] Error details for batch ${batchNumber}:`,
                      errorJson.details
                    );
                  }
                } catch {
                  errorMessage = errorText || `Gagal mengunduh batch ${batchNumber}`;
                }
              }
            } catch (parseError) {
              errorMessage = `Gagal mengunduh batch ${batchNumber}. Status: ${response.status}`;
            }
            throw new Error(errorMessage);
          }

          // Check Content-Type - could be JSON (R2 URL) or ZIP (direct download)
          const contentType = response.headers.get("Content-Type");

          if (contentType?.includes("application/json")) {
            // Response is JSON with R2 download URL
            const result = await response.json();
            if (result.success && result.downloadUrl) {
              setDownloadLabel(`Mengunduh batch ${batchNumber}/${totalBatches} dari R2...`);
              setDownloadPercent(Math.round(((downloadedBatches + 0.5) / totalBatches) * 100));

              console.log(`[Download] Downloading from R2: ${result.downloadUrl}`);

              // Download from R2 URL with progress tracking
              const r2Response = await fetch(result.downloadUrl);
              if (!r2Response.ok) {
                throw new Error(
                  `Gagal mengunduh dari R2 untuk batch ${batchNumber}. Status: ${r2Response.status}`
                );
              }

              // Track download progress from R2
              const r2ContentLength = r2Response.headers.get("content-length");
              const r2Total = r2ContentLength ? parseInt(r2ContentLength, 10) : null;
              let r2Loaded = 0;

              const r2Reader = r2Response.body?.getReader();
              if (!r2Reader) {
                throw new Error(
                  `Stream download tidak tersedia dari R2 untuk batch ${batchNumber}`
                );
              }

              const r2Chunks: BlobPart[] = [];
              while (true) {
                const { done, value } = await r2Reader.read();
                if (done) break;

                if (value) {
                  r2Chunks.push(value);
                  r2Loaded += value.length;

                  // Update progress
                  if (r2Total) {
                    const r2Progress = Math.round((r2Loaded / r2Total) * 100);
                    const overallProgress = Math.round(
                      ((downloadedBatches + r2Progress / 100) / totalBatches) * 100
                    );
                    setDownloadPercent(overallProgress);
                    setDownloadLabel(
                      `Mengunduh batch ${batchNumber}/${totalBatches} dari R2... ${r2Progress}%`
                    );
                  }
                }
              }

              const r2Blob = new Blob(r2Chunks, { type: "application/zip" });
              const url = window.URL.createObjectURL(r2Blob);
              const link = document.createElement("a");
              link.href = url;
              link.download =
                result.filename || `Silver-King-QR-Batch-${batchNumber}-of-${totalBatches}.zip`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);

              console.log(
                `[Download] Batch ${batchNumber}/${totalBatches} downloaded from R2 successfully: ${result.downloadUrl}`
              );
            } else {
              throw new Error(
                result.error || `Gagal mendapatkan URL download untuk batch ${batchNumber}`
              );
            }
          } else if (contentType?.startsWith("application/zip")) {
            // Direct ZIP download (fallback)
            // Stream download with progress
            const contentLength = response.headers.get("content-length");
            const total = contentLength ? parseInt(contentLength, 10) : null;
            let loaded = 0;

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error(`Stream download tidak tersedia untuk batch ${batchNumber}`);
            }

            const chunks: BlobPart[] = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              if (value) {
                chunks.push(value);
                loaded += value.length;
              }

              // Update progress within batch
              if (total) {
                const batchProgress = Math.round((loaded / total) * 100);
                const overallProgress = Math.round(
                  ((downloadedBatches + batchProgress / 100) / totalBatches) * 100
                );
                setDownloadPercent(overallProgress);
                setDownloadLabel(
                  `Mengunduh batch ${batchNumber}/${totalBatches}... ${batchProgress}%`
                );
              }
            }

            // Create blob and download this batch ZIP
            const blob = new Blob(chunks, { type: "application/zip" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            const contentDisposition = response.headers.get("Content-Disposition");
            const dateStr = new Date().toISOString().split("T")[0];
            let filename = `Silver-King-QR-Batch-${batchNumber}-of-${totalBatches}-${dateStr}.zip`;
            if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename=?"?([^\s"]+)"?/);
              if (filenameMatch) {
                filename = filenameMatch[1].replace(/\.zip$/, `-batch-${batchNumber}.zip`);
              }
            }

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log(`[Download] Batch ${batchNumber}/${totalBatches} downloaded directly`);
          } else {
            const errorText = await response.text();
            if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
              throw new Error(`Server error pada batch ${batchNumber}. Silakan coba lagi.`);
            }
            throw new Error(`Response tidak valid untuk batch ${batchNumber}: ${contentType}`);
          }

          downloadedBatches++;
          console.log(`[Download] Batch ${batchNumber}/${totalBatches} downloaded successfully`);

          // Small delay between downloads to avoid browser blocking
          if (batchNumber < totalBatches) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (batchError: any) {
          console.error(`[Download] Batch ${batchNumber} failed:`, batchError);
          const errorMsg = batchError?.message || "Unknown error";
          // Check if error contains JSON string
          let parsedError = errorMsg;
          try {
            if (errorMsg.includes("{") && errorMsg.includes("}")) {
              const jsonMatch = errorMsg.match(/\{.*\}/);
              if (jsonMatch) {
                const errorJson = JSON.parse(jsonMatch[0]);
                parsedError = errorJson.error || errorMsg;
              }
            }
          } catch {
            // Keep original error message if parsing fails
          }
          throw new Error(`Batch ${batchNumber} gagal: ${parsedError}`);
        }
      }

      setDownloadPercent(100);
      setDownloadLabel("Selesai!");
      setTimeout(() => {
        setDownloadPercent(null);
        setDownloadLabel("");
      }, 2000);

      alert(
        `Berhasil mengunduh ${totalBatches} file ZIP (${allProducts.length} file QR total). Setiap ZIP berisi 100 file PDF (kecuali batch terakhir).`
      );
    } catch (error: any) {
      setDownloadPercent(null);
      setDownloadLabel("");
      console.error("Failed to download batch ZIPs:", error);
      let errorMessage = error?.message || "Terjadi kesalahan tidak diketahui";

      // Try to extract more detailed error message
      if (
        errorMessage.includes("Failed to generate any PDFs") ||
        errorMessage.includes("All products failed")
      ) {
        errorMessage =
          "Gagal menghasilkan PDF. Pastikan semua produk memiliki QR code yang valid dan template serticard tersedia. Periksa log server untuk detail error.";
      } else if (errorMessage.includes("No products with QR codes found")) {
        errorMessage =
          "Tidak ada produk dengan QR code yang ditemukan. Pastikan produk memiliki QR code yang valid.";
      } else if (errorMessage.includes("Server error") || errorMessage.includes("<!DOCTYPE")) {
        errorMessage =
          "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator. Periksa log server untuk detail.";
      } else if (
        errorMessage.includes("Template file not found") ||
        errorMessage.includes("Serticard-01.png")
      ) {
        errorMessage =
          "Template serticard tidak ditemukan. Pastikan file Serticard-01.png ada di public/images/serticard/. Periksa log server untuk path lengkap.";
      } else if (errorMessage.includes("Failed to generate QR code")) {
        errorMessage =
          "Gagal generate QR code. Pastikan serial code valid dan URL verification dapat diakses.";
      } else if (errorMessage.includes("Failed to load template image")) {
        errorMessage =
          "Gagal memuat template image. Pastikan file template tidak corrupt dan dapat dibaca.";
      }

      // Log full error for debugging
      console.error("[Download All] Full error details:", {
        message: errorMessage,
        originalError: error,
        stack: error?.stack,
      });

      alert(`Gagal mengunduh: ${errorMessage}`);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedItems.size === 0) {
      alert(t("downloadSelectedFailed"));
      return;
    }

    if (!data?.products) return;

    const selectedProducts = data.products.filter((p) => selectedItems.has(p.id));
    const serialCodes = selectedProducts.map((p) => p.serialCode);

    setIsDownloadingSelected(true);
    setDownloadPercent(0);
    setDownloadLabel("Mengunduh... 0%");

    try {
      // Download selected QR codes as ZIP with PDFs (one PDF per QR)
      const response = await fetch("/api/qr/download-multiple-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serialCodes }),
      });

      // Check if response is OK
      if (!response.ok) {
        let errorMessage = "Gagal mengunduh file ZIP";
        try {
          const errorText = await response.text();
          // Check if response is HTML (error page from server)
          if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
            errorMessage = "Server error: Terjadi kesalahan pada server. Silakan coba lagi.";
          } else {
            // Try to parse as JSON error
            try {
              const errorJson = JSON.parse(errorText);
              // Use message if available, otherwise use error field
              errorMessage = errorJson.message || errorJson.error || "Gagal mengunduh file ZIP";
              // Add details if available (for debugging)
              if (errorJson.details && process.env.NODE_ENV === "development") {
                console.error("[Download] Error details:", errorJson.details);
              }
            } catch {
              errorMessage = errorText || "Gagal mengunduh file ZIP";
            }
          }
        } catch (parseError) {
          errorMessage = `Gagal mengunduh file ZIP. Status: ${response.status}`;
        }
        setDownloadPercent(null);
        setDownloadLabel("");
        throw new Error(errorMessage);
      }

      // Check Content-Type to ensure it's a ZIP file
      const contentType = response.headers.get("Content-Type");
      if (!contentType || !contentType.startsWith("application/zip")) {
        const errorText = await response.text();
        if (errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html")) {
          throw new Error("Server error: Terjadi kesalahan pada server. Silakan coba lagi.");
        }
        throw new Error("Response bukan file ZIP. Silakan coba lagi.");
      }

      // Stream download with progress
      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : null;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) {
        setDownloadPercent(null);
        setDownloadLabel("");
        throw new Error("Stream download tidak tersedia. Silakan coba lagi.");
      }

      const chunks: BlobPart[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          loaded += value.length;
        }

        if (total) {
          const percent = Math.round((loaded / total) * 100);
          setDownloadPercent(percent);
          setDownloadLabel(`Mengunduh... ${percent}%`);
        } else {
          // If no content-length, show indeterminate progress
          setDownloadLabel("Mengunduh...");
        }
      }

      // Create blob and download
      const blob = new Blob(chunks, { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `Silver-King-Selected-QR-Codes-${serialCodes.length}-${new Date().toISOString().split("T")[0]}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=?"?([^\s"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadPercent(100);
      setDownloadLabel("Selesai!");
      setTimeout(() => {
        setDownloadPercent(null);
        setDownloadLabel("");
      }, 2000);

      alert(t("downloadSelectedSuccess", { count: serialCodes.length }));
    } catch (error: any) {
      setDownloadPercent(null);
      setDownloadLabel("");
      console.error("Failed to download selected ZIP:", error);
      let errorMessage = error?.message || "Terjadi kesalahan tidak diketahui";

      // Try to extract more detailed error message
      if (errorMessage.includes("Failed to generate any PDFs")) {
        errorMessage =
          "Gagal menghasilkan PDF. Pastikan semua produk yang dipilih memiliki QR code yang valid dan template serticard tersedia.";
      } else if (errorMessage.includes("No products with QR codes found")) {
        errorMessage =
          "Tidak ada produk dengan QR code yang ditemukan. Pastikan produk yang dipilih memiliki QR code yang valid.";
      } else if (errorMessage.includes("Server error")) {
        errorMessage =
          "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.";
      }

      alert(`Gagal mengunduh: ${errorMessage}`);
    } finally {
      setIsDownloadingSelected(false);
    }
  };

  const toggleSelectItem = (productId: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const isIndeterminate = useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) return false;
    return selectedItems.size > 0 && selectedItems.size < filteredProducts.length;
  }, [filteredProducts, selectedItems.size]);

  // Update select all to work with filtered products
  const handleRefresh = async () => {
    setIsRegenerating(true);
    try {
      // Simply refresh the data from server (no regeneration)
      // This will fetch latest QR codes with correct serial numbers from database
      await mutate();
    } catch (error: any) {
      console.error("Failed to refresh QR codes:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const toggleSelectAll = () => {
    if (!filteredProducts) return;

    const allFilteredIds = filteredProducts.map((p) => p.id);
    const allFilteredSelected = allFilteredIds.every((id) => selectedItems.has(id));

    if (allFilteredSelected) {
      // Deselect all filtered items
      setSelectedItems((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all filtered items
      setSelectedItems((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const isAllSelected = useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedItems.has(p.id));
  }, [filteredProducts, selectedItems]);

  if (isLoading) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }

  if (error) {
    console.error("QR Preview Error:", error);
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-red-400">{t("unableToLoad")}</p>
        <button
          onClick={() => mutate()}
          className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white transition hover:border-white/40 hover:bg-white/10"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  if (!data) {
    return <LoadingSkeleton className="h-64 w-full" />;
  }
  return (
    <>
      {downloadPercent !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur">
          <DownloadProgressBar percent={downloadPercent} label={downloadLabel} />
        </div>
      )}
      {/* Mesmerizing Header Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mb-10 rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.03] via-white/[0.02] to-transparent p-8 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          {/* Typography Section */}
          <div className="space-y-3">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs font-medium uppercase tracking-[0.5em] text-white/40"
            >
              {t("eyebrow")}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.2] text-white"
            >
              {t("title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-2 text-sm leading-relaxed text-white/50 md:text-base"
            >
              {t("description")}
              {filteredProducts.length > 0 && (
                <span className="ml-1 text-[#FFD700]/80">
                  {filteredProducts.length} {filteredProducts.length === 1 ? t("item") : t("items")}
                  .
                </span>
              )}
            </motion.p>
          </div>

          {/* Stats Badge */}
          {data && data.products.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-end gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">{t("totalAssets")}</p>
              <p className="text-3xl font-light tracking-tight text-white">
                {data.products.length}
              </p>
              {selectedItems.size > 0 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-medium text-[#FFD700]"
                >
                  {selectedItems.size} {t("selected")}
                </motion.p>
              )}
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* Search Bar and Layout Toggle */}
      {data && data.products.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            {/* Search Bar */}
            <motion.div
              className="group flex flex-1 items-center rounded-full border border-white/10 bg-white/5 px-5 py-3 focus-within:border-[#FFD700]/50 focus-within:bg-white/10 focus-within:shadow-[0_0_20px_rgba(255,215,0,0.15)] transition-all max-w-md backdrop-blur-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.5,
              }}
            >
              <Search className="h-4 w-4 text-white/50 mr-3 transition-colors group-focus-within:text-[#FFD700]/70" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent text-sm font-light text-white placeholder:text-white/40 placeholder:font-light focus:outline-none"
              />
            </motion.div>

            {/* Category Filter - Custom Dropdown */}
            <motion.div
              ref={categoryDropdownRef}
              className="relative"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.52,
              }}
            >
              <motion.button
                type="button"
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="group relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-light text-white backdrop-blur-sm transition-all hover:border-[#FFD700]/50 hover:bg-white/10 focus:border-[#FFD700]/50 focus:bg-white/10 focus:outline-none focus:shadow-[0_0_20px_rgba(255,215,0,0.15)] min-w-[200px] justify-between"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Filter className="h-4 w-4 text-white/50 transition-colors group-hover:text-[#FFD700]/70 flex-shrink-0" />
                  <span className="truncate">
                    {selectedCategory
                      ? (() => {
                          const category = categories.find((c) => c.prefix === selectedCategory);
                          return category
                            ? `${category.prefix} (${category.weight} gr)`
                            : selectedCategory;
                        })()
                      : t("allCategories")}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isCategoryDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4 text-white/50 transition-colors group-hover:text-[#FFD700]/70 flex-shrink-0" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {isCategoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute top-full left-0 mt-2 z-50 w-full min-w-[280px] rounded-2xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden"
                  >
                    <div className="max-h-[300px] overflow-y-auto scrollbar-show">
                      <motion.button
                        type="button"
                        onClick={() => {
                          setSelectedCategory("");
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                          selectedCategory === ""
                            ? "bg-[#FFD700]/10 text-[#FFD700] border-l-2 border-[#FFD700]"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        }`}
                        whileHover={{ x: 4 }}
                      >
                        <span className="font-medium">{t("allCategories")}</span>
                        {selectedCategory === "" && <Check className="h-4 w-4 text-[#FFD700]" />}
                      </motion.button>
                      {categories.map((category) => (
                        <motion.button
                          key={category.prefix}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category.prefix);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors border-t border-white/5 ${
                            selectedCategory === category.prefix
                              ? "bg-[#FFD700]/10 text-[#FFD700] border-l-2 border-[#FFD700]"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span className="font-semibold">{category.prefix}</span>
                            <span className="text-xs text-white/50">
                              {category.weight} gr • {category.count}{" "}
                              {category.count === 1 ? t("item") : t("items")}
                            </span>
                          </div>
                          {selectedCategory === category.prefix && (
                            <Check className="h-4 w-4 text-[#FFD700] flex-shrink-0 ml-2" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Layout Toggle - Fluid Switch */}
            <motion.div
              className="relative flex items-center gap-0.5 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-sm"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.55,
              }}
            >
              {/* Sliding Background Indicator */}
              <motion.div
                className="absolute inset-y-1 rounded-full bg-gradient-to-r from-[#FFD700]/30 to-[#FFD700]/20 backdrop-blur-sm shadow-[0_0_20px_rgba(255,215,0,0.3)]"
                layout
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 600,
                  damping: 30,
                }}
                style={{
                  width: "calc(50% - 4px)",
                  left: layoutView === "table" ? "4px" : "calc(50% + 0px)",
                }}
              />

              <motion.button
                onClick={() => setLayoutView("table")}
                className="relative z-10 flex items-center justify-center p-2 rounded-lg transition-colors min-w-[36px]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <motion.div
                  animate={{
                    color: layoutView === "table" ? "#FFD700" : "#ffffff99",
                    scale: layoutView === "table" ? 1.1 : 1,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                >
                  <Table2 className="h-4 w-4" />
                </motion.div>
              </motion.button>
              <motion.button
                onClick={() => setLayoutView("grid")}
                className="relative z-10 flex items-center justify-center p-2 rounded-lg transition-colors min-w-[36px]"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <motion.div
                  animate={{
                    color: layoutView === "grid" ? "#FFD700" : "#ffffff99",
                    scale: layoutView === "grid" ? 1.1 : 1,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeOut",
                  }}
                >
                  <Grid3x3 className="h-4 w-4" />
                </motion.div>
              </motion.button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {data && data.products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 text-xs font-light uppercase tracking-[0.1em] text-white/40">
            <span>
              {selectedItems.size > 0
                ? `${selectedItems.size} ${t("of")} ${filteredProducts.length} ${t("selected")}`
                : `${filteredProducts.length} ${t("of")} ${data.products.length} ${t("products")}`}
              {(searchQuery || selectedCategory) && ` (${t("filtered")})`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedItems.size > 0 && (
              <motion.button
                onClick={handleDownloadSelected}
                disabled={isDownloadingSelected}
                className="group inline-flex items-center gap-2 rounded-full border border-[#FFD700]/60 bg-[#FFD700]/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-[#FFD700] hover:bg-[#FFD700]/20 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isDownloadingSelected ? 1 : 1.02 }}
                whileTap={{ scale: isDownloadingSelected ? 1 : 0.98 }}
              >
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                {isDownloadingSelected
                  ? t("generating")
                  : `${t("downloadSelected")} (${selectedItems.size})`}
              </motion.button>
            )}
            <motion.button
              onClick={handleRefresh}
              disabled={isRegenerating}
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isRegenerating ? 1 : 1.02 }}
              whileTap={{ scale: isRegenerating ? 1 : 0.98 }}
            >
              <RefreshCw
                className={`h-4 w-4 transition-transform ${isRegenerating ? "animate-spin" : "group-hover:rotate-180"}`}
              />
              {isRegenerating ? t("refreshing") : t("refresh")}
            </motion.button>
            <motion.button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-[#FFD700]/40 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isDownloadingAll ? 1 : 1.02 }}
              whileTap={{ scale: isDownloadingAll ? 1 : 0.98 }}
            >
              <FileText className="h-4 w-4 transition-transform group-hover:rotate-3" />
              {isDownloadingAll
                ? t("generatingPng")
                : `${t("downloadAll")} (${data.products.length})`}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Table Layout with Smooth Transition */}
      <AnimatePresence mode="wait">
        {layoutView === "table" ? (
          <motion.div
            key="table-layout"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
                    <tr className="bg-white/5">
                      <th scope="col" className="w-12 px-4 py-3">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
                        >
                          {isAllSelected ? (
                            <CheckSquare2 className="h-5 w-5 text-[#FFD700]" />
                          ) : isIndeterminate ? (
                            <div className="relative h-5 w-5">
                              <Square className="h-5 w-5 text-white/40" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-2 w-2 bg-[#FFD700]" />
                              </div>
                            </div>
                          ) : (
                            <Square className="h-5 w-5 text-white/40" />
                          )}
                        </button>
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        {t("serialCode")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        {t("productName")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        {t("weight")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        {t("qrPreview")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-light uppercase tracking-[0.3em] text-white/60"
                      >
                        {t("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-white/60">
                          {t("noProductsFound")}{" "}
                          {searchQuery && `${t("matching")} "${searchQuery}"`}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const isItemSelected = selectedItems.has(product.id);
                        return (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={`transition-colors hover:bg-white/5 ${
                              isItemSelected ? "bg-[#FFD700]/5" : ""
                            }`}
                          >
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleSelectItem(product.id)}
                                className="inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
                              >
                                {isItemSelected ? (
                                  <CheckSquare2 className="h-5 w-5 text-[#FFD700]" />
                                ) : (
                                  <Square className="h-5 w-5 text-white/40" />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-mono text-sm font-semibold text-white">
                                {product.serialCode}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-white">{product.name}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm text-white/60">{product.weight} gr</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/api/qr/${product.serialCode}`}
                                  alt={product.name}
                                  className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 rounded-lg border border-white/10 bg-white p-1.5 sm:p-2 object-contain"
                                  loading="lazy"
                                  key={product.serialCode}
                                  onError={(e) => {
                                    // Only retry once if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    if (!target.dataset.retried) {
                                      target.dataset.retried = "true";
                                      console.error(
                                        "[QR Table] Image load error, retrying once:",
                                        product.serialCode
                                      );
                                      // Force reload by adding cache buster only on retry
                                      target.src = `/api/qr/${product.serialCode}?t=${Date.now()}`;
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <motion.button
                                  onClick={() => setSelected(product)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#FFD700]/40 hover:bg-white/10 hover:text-white"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  {t("enlarge")}
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDownload(product)}
                                  disabled={isDownloading}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#FFD700]/40 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  whileHover={{ scale: isDownloading ? 1 : 1.05 }}
                                  whileTap={{ scale: isDownloading ? 1 : 0.95 }}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {t("download")}
                                </motion.button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid-layout"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-12 text-center">
                <p className="text-sm text-white/60">
                  {t("noProductsFound")} {searchQuery && `${t("matching")} "${searchQuery}"`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product, index) => {
                  const isItemSelected = selectedItems.has(product.id);
                  return (
                    <AnimatedCard
                      key={product.id}
                      delay={index * 0.05}
                      className={`relative transition-all ${
                        isItemSelected ? "ring-2 ring-[#FFD700] bg-[#FFD700]/5" : ""
                      }`}
                    >
                      {/* Checkbox overlay */}
                      <div className="absolute top-3 left-3 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(product.id);
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm p-1.5 text-white/60 hover:text-white transition-colors hover:bg-black/80"
                        >
                          {isItemSelected ? (
                            <CheckSquare2 className="h-5 w-5 text-[#FFD700]" />
                          ) : (
                            <Square className="h-5 w-5 text-white/40" />
                          )}
                        </button>
                      </div>

                      {/* QR Code Image */}
                      <div className="relative aspect-square w-full rounded-lg border border-white/10 bg-white p-3 sm:p-4 mb-3">
                        <img
                          src={`/api/qr/${product.serialCode}`}
                          alt={product.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = "true";
                              target.src = `/api/qr/${product.serialCode}?t=${Date.now()}`;
                            }
                          }}
                        />
                      </div>

                      {/* Product Info */}
                      <div className="space-y-2">
                        <h3 className="font-mono text-sm font-semibold text-white truncate">
                          {product.serialCode}
                        </h3>
                        <p className="text-xs text-white/70 line-clamp-2">{product.name}</p>
                        <p className="text-xs text-white/50">{product.weight} gr</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex items-center gap-2">
                        <motion.button
                          onClick={() => setSelected(product)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:border-[#FFD700]/40 hover:bg-white/10 hover:text-white"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                          {t("enlarge")}
                        </motion.button>
                        <motion.button
                          onClick={() => handleDownload(product)}
                          disabled={isDownloading}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:border-[#FFD700]/40 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          whileHover={{ scale: isDownloading ? 1 : 1.05 }}
                          whileTap={{ scale: isDownloading ? 1 : 0.95 }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t("download")}
                        </motion.button>
                      </div>
                    </AnimatedCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Penutup Modal */}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-sm">
              {/* Responsive QR Code Image Container */}
              <div className="relative aspect-square w-full rounded-3xl border border-white/10 bg-white p-4 sm:p-6 overflow-hidden">
                <img
                  key={`qr-modal-${selected.serialCode}`}
                  src={`/api/qr/${selected.serialCode}`}
                  alt={selected.name}
                  className="h-full w-full object-contain transition-opacity duration-300"
                  loading="eager"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.retried) {
                      target.dataset.retried = "true";
                      target.src = `/api/qr/${selected.serialCode}?t=${Date.now()}`;
                    }
                  }}
                />
              </div>
            </div>
            <p className="font-mono text-lg sm:text-xl text-white/70">{selected.serialCode}</p>
            <motion.button
              onClick={() => handleDownload(selected)}
              disabled={isDownloading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-6 py-3 text-sm text-white/70 transition hover:border-[#FFD700]/40 hover:bg-black/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isDownloading ? 1 : 1.05 }}
              whileTap={{ scale: isDownloading ? 1 : 0.95 }}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? t("downloading") : t("downloadQRCode")}
            </motion.button>
          </div>
        )}
      </Modal>
    </>
  );
}
