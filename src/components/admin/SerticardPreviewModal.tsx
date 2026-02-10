"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Download, Loader2, Save } from "lucide-react";
import { Modal } from "./Modal";
import { toast } from "sonner";
import type { SerticardAdjustmentData } from "@/lib/serticard-adjustment";
import { getFontSizeMultipliers } from "@/lib/serticard-config";
import { SERTICARD_VARIANTS } from "@/utils/serticard-templates";

type PreviewModalProps = {
  open: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    uniqCode: string;
    serialCode?: string;
    qrImageUrl: string | null;
  };
  templateVariant: string; // "01", "03", ..., "custom"
  onDownload: (adjustment: SerticardAdjustmentData) => void;
};

export function SerticardPreviewModal({
  open,
  onClose,
  product,
  templateVariant,
  onDownload,
}: PreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adjustment, setAdjustment] = useState<SerticardAdjustmentData>({
    templateVariant,
    fontFamily: "Arial",
    fontSizePreset: "BESAR",
    productTitleSize: 1.0,
    uniqcodeSize: 1.0,
    serialcodeSize: 1.0,
    qrSize: 1.0,
  });

  // Load adjustment from API
  useEffect(() => {
    if (!open) return;
    
    const loadAdjustment = async () => {
      try {
        const res = await fetch(
          `/api/admin/serticard/adjustment?templateVariant=${templateVariant}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.adjustment) {
            setAdjustment(data.adjustment);
          }
        }
      } catch (error) {
        console.error("Failed to load adjustment:", error);
      }
    };

    loadAdjustment();
  }, [open, templateVariant]);

  // Render preview to canvas
  const renderPreview = useCallback(async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setLoading(true);

    try {
      // Load template image
      // For custom template, use preview API; for default variants, use template-proxy
      const templateUrl = templateVariant === "custom"
        ? "/api/admin/serticard/preview?side=front"
        : `/api/admin/template-proxy?template=front&variant=${templateVariant}`;
      
      const templateImg = new Image();
      templateImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        templateImg.onload = () => resolve();
        templateImg.onerror = (err) => reject(err);
        templateImg.src = templateUrl;
      });

      // Load QR image
      const qrUrl = product.qrImageUrl || `/api/qr-gram/${encodeURIComponent(product.uniqCode)}/qr-only`;
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = (err) => reject(err);
        qrImg.src = qrUrl;
      });

      // Set canvas size
      canvas.width = templateImg.width;
      canvas.height = templateImg.height;

      // Draw template
      ctx.drawImage(templateImg, 0, 0);

      // Calculate sizes with adjustments
      const sizeMultipliers = getFontSizeMultipliers(adjustment.fontSizePreset);
      const baseQrSize = Math.min(templateImg.width * 0.55, templateImg.height * 0.55, 900);
      const qrSize = baseQrSize * adjustment.qrSize;
      const qrX = (templateImg.width - qrSize) / 2;
      const qrY = templateImg.height * 0.38;

      // Draw QR code
      const padding = 8;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - padding, qrY - padding, qrSize + padding * 2, qrSize + padding * 2);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // Draw product name
      const nameOffset = Math.round(templateImg.height * 0.038);
      const isDarkTemplate = templateVariant !== "01";
      const textColor = isDarkTemplate ? "#ffffff" : "#111111";

      const baseNameFontSize = Math.floor(templateImg.width * sizeMultipliers.nameMultiplier);
      const nameFontSize = baseNameFontSize * adjustment.productTitleSize;
      const nameY = qrY - nameOffset;
      const nameFont = `bold ${nameFontSize}px ${adjustment.fontFamily}, sans-serif`;

      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = nameFont;
      ctx.fillText(product.name || "PRODUCT", templateImg.width / 2, nameY);

      // Draw serial code
      const serialOffset = Math.round(templateImg.height * 0.038);
      const baseSerialFontSize = Math.floor(templateImg.width * sizeMultipliers.serialMultiplier);
      const serialFontSize = baseSerialFontSize * adjustment.serialcodeSize;
      const serialY = qrY + qrSize + serialOffset;
      const serialFont = `bold ${serialFontSize}px ${adjustment.fontFamily}, monospace`;
      const displayCode = product.serialCode || product.uniqCode || "UNKNOWN";

      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = serialFont;
      ctx.fillText(displayCode, templateImg.width / 2, serialY);

      setLoading(false);
    } catch (error) {
      console.error("Failed to render preview:", error);
      toast.error("Gagal memuat preview");
      setLoading(false);
    }
  }, [product, templateVariant, adjustment]);

  // Re-render when adjustment changes
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(renderPreview, 100); // Debounce
      return () => clearTimeout(timeoutId);
    }
  }, [open, adjustment, renderPreview]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/serticard/adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustment),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Pengaturan disimpan");
    } catch (error) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    onDownload(adjustment);
    onClose();
  };

  const variantLabel = templateVariant === "custom"
    ? "Custom"
    : SERTICARD_VARIANTS.find((v) => v.id === templateVariant)?.label || `Template ${templateVariant}`;

  return (
    <Modal open={open} onClose={onClose} title={`Preview Serticard - ${variantLabel}`}>
      <div className="space-y-6">
        {/* Preview Canvas */}
        <div className="relative rounded-lg border border-white/10 bg-black/30 p-4 flex items-center justify-center min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded-lg shadow-lg"
            style={{ maxHeight: "600px" }}
          />
        </div>

        {/* Adjustment Controls */}
        <div className="space-y-4 border-t border-white/10 pt-4">
          <h3 className="text-lg font-semibold text-white">Pengaturan</h3>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Jenis Font</label>
            <select
              value={adjustment.fontFamily}
              onChange={(e) =>
                setAdjustment((a) => ({ ...a, fontFamily: e.target.value }))
              }
              className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white focus:border-[#FFD700]/50 focus:outline-none"
            >
              <option value="Arial">Arial</option>
              <option value="Lucida Sans">Lucida Sans</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="SF Mono">SF Mono</option>
            </select>
          </div>

          {/* Font Size Preset */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Ukuran Font</label>
            <select
              value={adjustment.fontSizePreset}
              onChange={(e) =>
                setAdjustment((a) => ({
                  ...a,
                  fontSizePreset: e.target.value as "BESAR" | "KECIL",
                }))
              }
              className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-2.5 text-white focus:border-[#FFD700]/50 focus:outline-none"
            >
              <option value="BESAR">Besar</option>
              <option value="KECIL">Kecil</option>
            </select>
          </div>

          {/* Product Title Size */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Ukuran Judul Produk: {(adjustment.productTitleSize * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={adjustment.productTitleSize}
              onChange={(e) =>
                setAdjustment((a) => ({
                  ...a,
                  productTitleSize: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          {/* Uniqcode Size */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Ukuran Uniqcode: {(adjustment.uniqcodeSize * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={adjustment.uniqcodeSize}
              onChange={(e) =>
                setAdjustment((a) => ({
                  ...a,
                  uniqcodeSize: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          {/* Serialcode Size */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Ukuran Serial Code: {(adjustment.serialcodeSize * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={adjustment.serialcodeSize}
              onChange={(e) =>
                setAdjustment((a) => ({
                  ...a,
                  serialcodeSize: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>

          {/* QR Size */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Ukuran QR Code: {(adjustment.qrSize * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={adjustment.qrSize}
              onChange={(e) =>
                setAdjustment((a) => ({
                  ...a,
                  qrSize: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Pengaturan
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/50 px-5 py-2.5 text-sm font-medium text-[#FFD700] hover:bg-[#FFD700]/30 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </Modal>
  );
}
