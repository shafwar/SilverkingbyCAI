"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Download, Loader2, Save, Eye } from "lucide-react";
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

      // Set canvas size - ensure proper dimensions
      const canvasWidth = templateImg.width;
      const canvasHeight = templateImg.height;
      
      // Use device pixel ratio for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      
      // Scale context to match device pixel ratio
      ctx.scale(dpr, dpr);

      // Clear canvas first
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw template background
      ctx.drawImage(templateImg, 0, 0, canvasWidth, canvasHeight);

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
        {/* Preview Canvas - Professional Layout */}
        <div className="relative rounded-xl border-2 border-white/20 bg-gradient-to-br from-black/50 to-[#0a0a0a] p-6 shadow-2xl">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Preview Serticard</h3>
              <p className="text-xs text-white/50 mt-0.5">
                Template: {variantLabel} | Produk: {product.name}
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Memuat preview...</span>
              </div>
            )}
          </div>

          {/* Preview Container */}
          <div className="relative flex items-center justify-center min-h-[500px] rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-8 overflow-auto scrollbar-admin">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg z-10">
                <Loader2 className="h-12 w-12 animate-spin text-[#FFD700]/60 mb-4" />
                <p className="text-white/70 text-sm font-medium">Memuat template serticard...</p>
                <p className="text-white/40 text-xs mt-1">Template {variantLabel}</p>
              </div>
            ) : canvasRef.current && canvasRef.current.width > 0 ? (
              <>
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto rounded-lg shadow-2xl border-2 border-white/30 bg-white mx-auto block"
                  style={{ 
                    maxHeight: "600px",
                    maxWidth: "100%",
                  }}
                />
                {/* Overlay info */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/60 bg-black/50 backdrop-blur-md rounded-lg px-4 py-2.5 border border-white/20 shadow-lg">
                  <span className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    Preview akan sesuai dengan hasil download
                  </span>
                  <span className="font-mono text-[#FFD700]">{product.uniqCode}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center mb-4">
                  <Eye className="h-10 w-10 text-white/30" />
                </div>
                <p className="text-white/70 text-sm font-medium mb-1">Preview tidak tersedia</p>
                <p className="text-white/40 text-xs">Template atau QR code tidak dapat dimuat</p>
              </div>
            )}
          </div>
        </div>

        {/* Adjustment Controls - Professional Styling */}
        <div className="space-y-5 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-white">Pengaturan</h3>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
              Real-time Preview
            </span>
          </div>
          <p className="text-sm text-white/60 mb-4">
            Sesuaikan font, ukuran teks, dan QR code. Perubahan akan langsung terlihat di preview di atas.
          </p>

          {/* Font Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Font Family */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white/90">
                <span>Jenis Font</span>
              </label>
              <select
                value={adjustment.fontFamily}
                onChange={(e) =>
                  setAdjustment((a) => ({ ...a, fontFamily: e.target.value }))
                }
                className="w-full rounded-xl border border-white/20 bg-black/60 backdrop-blur-sm px-4 py-3 text-white focus:border-[#FFD700]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-all hover:border-white/30"
              >
                <option value="Arial" className="bg-[#0a0a0a]">Arial</option>
                <option value="Lucida Sans" className="bg-[#0a0a0a]">Lucida Sans</option>
                <option value="Times New Roman" className="bg-[#0a0a0a]">Times New Roman</option>
                <option value="SF Mono" className="bg-[#0a0a0a]">SF Mono</option>
              </select>
            </div>

            {/* Font Size Preset */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-white/90">
                <span>Ukuran Font</span>
              </label>
              <select
                value={adjustment.fontSizePreset}
                onChange={(e) =>
                  setAdjustment((a) => ({
                    ...a,
                    fontSizePreset: e.target.value as "BESAR" | "KECIL",
                  }))
                }
                className="w-full rounded-xl border border-white/20 bg-black/60 backdrop-blur-sm px-4 py-3 text-white focus:border-[#FFD700]/50 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20 transition-all hover:border-white/30"
              >
                <option value="BESAR" className="bg-[#0a0a0a]">Besar</option>
                <option value="KECIL" className="bg-[#0a0a0a]">Kecil</option>
              </select>
            </div>
          </div>

          {/* Size Controls - Professional Sliders */}
          <div className="space-y-5">
            {/* Product Title Size */}
            <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Ukuran Judul Produk
                </label>
                <span className="text-sm font-semibold text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded-full border border-[#FFD700]/20">
                  {(adjustment.productTitleSize * 100).toFixed(0)}%
                </span>
              </div>
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
                className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${((adjustment.productTitleSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((adjustment.productTitleSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = parseFloat(target.value);
                  setAdjustment((a) => ({ ...a, productTitleSize: value }));
                }}
              />
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>50%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Uniqcode Size */}
            <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Ukuran Uniqcode
                </label>
                <span className="text-sm font-semibold text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded-full border border-[#FFD700]/20">
                  {(adjustment.uniqcodeSize * 100).toFixed(0)}%
                </span>
              </div>
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
                className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${((adjustment.uniqcodeSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((adjustment.uniqcodeSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = parseFloat(target.value);
                  setAdjustment((a) => ({ ...a, uniqcodeSize: value }));
                }}
              />
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>50%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* Serialcode Size */}
            <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Ukuran Serial Code
                </label>
                <span className="text-sm font-semibold text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded-full border border-[#FFD700]/20">
                  {(adjustment.serialcodeSize * 100).toFixed(0)}%
                </span>
              </div>
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
                className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${((adjustment.serialcodeSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((adjustment.serialcodeSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = parseFloat(target.value);
                  setAdjustment((a) => ({ ...a, serialcodeSize: value }));
                }}
              />
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>50%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>

            {/* QR Size */}
            <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">
                  Ukuran QR Code
                </label>
                <span className="text-sm font-semibold text-[#FFD700] bg-[#FFD700]/10 px-3 py-1 rounded-full border border-[#FFD700]/20">
                  {(adjustment.qrSize * 100).toFixed(0)}%
                </span>
              </div>
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
                className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #FFD700 0%, #FFD700 ${((adjustment.qrSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) ${((adjustment.qrSize - 0.5) / 1.5) * 100}%, rgba(255,255,255,0.1) 100%)`,
                }}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  const value = parseFloat(target.value);
                  setAdjustment((a) => ({ ...a, qrSize: value }));
                }}
              />
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>50%</span>
                <span>100%</span>
                <span>200%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-6">
          <div className="text-xs text-white/50">
            <p>💡 Tip: Preview di atas akan sesuai dengan hasil download</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 transition-all backdrop-blur-sm"
              whileHover={{ scale: saving ? 1 : 1.02 }}
              whileTap={{ scale: saving ? 1 : 0.98 }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Pengaturan
            </motion.button>
            <motion.button
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10 border border-[#FFD700]/50 px-6 py-3 text-sm font-semibold text-[#FFD700] hover:from-[#FFD700]/30 hover:to-[#FFD700]/20 disabled:opacity-50 transition-all shadow-lg shadow-[#FFD700]/10 backdrop-blur-sm"
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </motion.button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
