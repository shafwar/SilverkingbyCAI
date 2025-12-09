"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Weight,
  Boxes,
  Loader2,
  Info,
  X,
  Hash,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  gramProductCreateSchema,
  type GramProductCreateInput,
} from "@/lib/validators/gram-product";

type GramProductFormProps = {
  // Jika ada id + defaultValues => mode edit; jika tidak => create
  defaultValues?: Partial<GramProductCreateInput> & { id?: number };
};

export function GramProductForm({ defaultValues }: GramProductFormProps) {
  const t = useTranslations("admin.productsDetail.form");
  const tCommon = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<GramProductCreateInput>({
    resolver: zodResolver(gramProductCreateSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? "",
      weight: defaultValues?.weight ?? 50,
      quantity: defaultValues?.quantity ?? 1,
      serialCode: defaultValues?.serialCode ?? "",
      serialPrefix: defaultValues?.serialPrefix ?? "",
    },
  });

  const quantity = form.watch("quantity") ?? 1;
  const weight = form.watch("weight") ?? 50;
  const serialPrefix = form.watch("serialPrefix") ?? "";
  const productName = form.watch("name") ?? "";
  const isSmallWeight = weight < 100;
  const isEditMode = !!defaultValues?.id;

  const [serialInfo, setSerialInfo] = useState<{
    exists: boolean;
    lastSerial: string | null;
    lastNumber: number;
    nextNumber: number;
    totalExisting: number;
    message: string;
  } | null>(null);
  const [isCheckingSerial, setIsCheckingSerial] = useState(false);

  // Check for existing serials when name and prefix change
  useEffect(() => {
    const checkExistingSerials = async () => {
      // Safety checks: ensure all values are defined and valid
      if (
        !productName ||
        !productName.trim() ||
        !serialPrefix ||
        !serialPrefix.trim() ||
        isEditMode
      ) {
        setSerialInfo(null);
        return;
      }

      setIsCheckingSerial(true);
      try {
        const response = await fetch(
          `/api/gram-products/check-serial?name=${encodeURIComponent(productName.trim())}&serialPrefix=${encodeURIComponent(serialPrefix.trim())}`
        );
        if (response.ok) {
          const data = await response.json();
          setSerialInfo(data);
        } else {
          setSerialInfo(null);
        }
      } catch (error) {
        console.error("Failed to check serial:", error);
        setSerialInfo(null);
      } finally {
        setIsCheckingSerial(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkExistingSerials, 500);
    return () => clearTimeout(timeoutId);
  }, [productName, serialPrefix, isEditMode]);

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && defaultValues?.id) {
        // EDIT: hanya update nama / metadata; uniqcode & jumlah QR tidak berubah
        const res = await fetch(`/api/gram-products/batch/${defaultValues.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: values.name }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || t("saveFailed"));
        }

        toast.success("Batch updated", {
          description:
            "Data batch berhasil diperbarui. Semua QR dan uniqcode tetap sama; hanya data verifikasi/serticard yang ikut update.",
          duration: 4000,
        });
      } else {
        // CREATE: Ensure serialCode is empty if serialPrefix is provided
        // Safety: ensure serialPrefix exists before checking
        const submitValues = {
          name: values.name.trim(),
          weight: values.weight,
          quantity: values.quantity,
          serialCode:
            values.serialPrefix && values.serialPrefix.trim() !== "" ? "" : values.serialCode || "",
          serialPrefix: values.serialPrefix || "",
        };

        console.log("[GramProductForm] Submitting values:", submitValues);

        const res = await fetch("/api/gram-products/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitValues),
        });

        console.log("[GramProductForm] API Response status:", res.status, res.statusText);

        if (!res.ok) {
          let errorData: any = {};
          try {
            const text = await res.text();
            console.error("[GramProductForm] API Error Response (raw):", text);
            errorData = JSON.parse(text);
          } catch (parseError) {
            console.error("[GramProductForm] Failed to parse error response:", parseError);
            errorData = { error: `HTTP ${res.status}: ${res.statusText}` };
          }

          console.error("[GramProductForm] API Error Response (parsed):", {
            status: res.status,
            statusText: res.statusText,
            errorData,
          });

          // Extract error message more safely - check multiple possible error fields
          let errorMessage = t("saveFailed");
          let errorDetails = "";

          if (errorData.error) {
            errorMessage =
              typeof errorData.error === "string"
                ? errorData.error
                : JSON.stringify(errorData.error);
          }

          if (errorData.details) {
            errorDetails =
              typeof errorData.details === "string"
                ? errorData.details
                : JSON.stringify(errorData.details);
          } else if (errorData.message) {
            errorDetails =
              typeof errorData.message === "string"
                ? errorData.message
                : JSON.stringify(errorData.message);
          }

          if (errorData.fieldErrors) {
            // Handle field-specific errors
            const fieldErrors = Object.entries(errorData.fieldErrors)
              .map(
                ([field, errors]) =>
                  `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`
              )
              .join("; ");
            errorDetails = fieldErrors || errorDetails;
          }

          // Also check for meta (Prisma errors)
          if (errorData.meta) {
            const metaInfo =
              typeof errorData.meta === "string" ? errorData.meta : JSON.stringify(errorData.meta);
            errorDetails = errorDetails
              ? `${errorDetails} (Meta: ${metaInfo})`
              : `Meta: ${metaInfo}`;
          }

          // Combine error message and details
          const fullErrorMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;

          console.error("[GramProductForm] ========== ERROR START ==========");
          console.error("[GramProductForm] Full error message:", fullErrorMessage);
          console.error("[GramProductForm] Error data:", errorData);
          console.error("[GramProductForm] ========== ERROR END ==========");

          throw new Error(fullErrorMessage);
        }

        const data = await res.json();
        const qrCount = data.qrCount ?? (isSmallWeight ? 1 : quantity);

        toast.success("Gram-based batch created", {
          description: `Created ${qrCount} QR code${qrCount === 1 ? "" : "s"} for ${
            values.name
          } (${values.weight}gr)`,
          duration: 2000,
        });

        // Redirect to QR Preview Page 2
        router.push("/admin/qr-preview/page2");
        return;
      }
    } catch (error: any) {
      console.error("[GramProductForm] Full error object:", error);
      console.error("[GramProductForm] Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        toString: error?.toString(),
      });

      // Extract detailed error message
      let errorMessage = error?.message || t("saveFailed");
      let errorDescription = t("saveFailedDescription");

      // Try to get more details from error object
      if (error?.message) {
        errorDescription = error.message;
      } else if (typeof error === "string") {
        errorDescription = error;
      } else if (error?.toString) {
        errorDescription = error.toString();
      }

      console.error("[GramProductForm] Displaying error toast:", {
        title: t("saveFailed"),
        description: errorDescription,
      });

      toast.error(t("saveFailed"), {
        description: errorDescription,
        duration: 8000, // Longer duration to read error
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-sm text-white/80">
      {/* Close / Back */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin/products/page2")}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition hover:border-white/40 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      {/* Basic Info - Urutan: Judul → Quantity → Gr → Serial Number */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-4 sm:p-5 backdrop-blur-sm"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/20 p-1.5 sm:p-2">
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-white">
            {t("basicInformation")}
            {isEditMode && <span className="ml-2 text-[10px] text-white/50">(Edit)</span>}
          </h3>
        </div>
        <div className="space-y-4">
          {/* 1. Judul (Nama Produk) */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.35em] text-blue-300/80">
              <Package className="h-3 w-3 text-blue-400" />
              {t("productName")}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-white transition-all placeholder:text-white/30 focus:border-blue-400/60 focus:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              placeholder={t("productNamePlaceholder")}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-400">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* 2. Quantity */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.35em] text-purple-300/80">
              <Boxes className="h-3 w-3 text-purple-400" />
              {t("quantity")}
            </label>
            <input
              type="number"
              min={1}
              max={200000}
              className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-white transition-all placeholder:text-white/30 focus:border-purple-400/60 focus:bg-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-60"
              placeholder={t("quantityPlaceholder")}
              disabled={isEditMode}
              {...form.register("quantity", { valueAsNumber: true })}
            />
            {form.formState.errors.quantity && (
              <p className="mt-1 text-xs text-red-400">{form.formState.errors.quantity.message}</p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-white/60">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                {isSmallWeight
                  ? `Small weight mode: 1 QR will represent ${quantity} units of ${weight}gr.`
                  : `Large weight mode: this will generate ${quantity} unique QR codes (each with its own uniqcode).`}
              </span>
            </p>
          </div>

          {/* 3. Gr (Weight) */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.35em] text-emerald-300/80">
              <Weight className="h-3 w-3 text-emerald-400" />
              {t("weight")}
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-white transition-all placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:opacity-60"
              placeholder={t("weightPlaceholder")}
              disabled={isEditMode}
              {...form.register("weight", { valueAsNumber: true })}
            />
            {form.formState.errors.weight && (
              <p className="mt-1 text-xs text-red-400">{form.formState.errors.weight.message}</p>
            )}
            <p className="mt-2 text-[11px] text-white/60">
              {isSmallWeight
                ? "Weights below 100gr will generate 1 QR for the whole batch."
                : "Weights 100gr and above will generate 1 QR per unit."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Serial Number Configuration Section (like Page 1) - Urutan ke-4 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4 sm:p-5 backdrop-blur-sm"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-amber-500/20 p-1.5 sm:p-2">
            <Hash className="h-4 w-4 text-amber-400" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-white">
            {t("serialNumberConfiguration")}
          </h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {/* Serial Prefix Input */}
          <div>
            <label className="mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs uppercase tracking-[0.35em] sm:tracking-[0.4em] text-amber-300/80">
              <Hash className="h-3 w-3 text-amber-400" />
              <span className="truncate">{t("serialPrefix")}</span>
              {quantity === 1 && (
                <span className="ml-1 text-[9px] sm:text-[10px] normal-case text-white/40 hidden sm:inline">
                  {t("serialPrefixAutoGenerate")}
                </span>
              )}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-white uppercase transition-all placeholder:text-white/30 focus:border-amber-400/60 focus:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              placeholder={
                quantity === 1
                  ? t("serialPrefixPlaceholderSingle")
                  : t("serialPrefixPlaceholderBatch")
              }
              disabled={isEditMode}
              value={serialPrefix || ""}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                const filtered = value.replace(/[^A-Z0-9]/g, "");
                form.setValue("serialPrefix", filtered || "", {
                  shouldValidate: false,
                  shouldDirty: true,
                });
                form.setValue("serialCode", "", { shouldValidate: false });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                }
              }}
            />
            {form.formState.errors.serialPrefix && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-red-400"
              >
                {form.formState.errors.serialPrefix.message}
              </motion.p>
            )}

            {/* Interactive Preview Card */}
            <AnimatePresence mode="wait">
              {isCheckingSerial ? (
                <motion.div
                  key="checking"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-[#FFD700]" />
                  <span className="text-xs text-white/60">{t("checkingSerials")}</span>
                </motion.div>
              ) : serialInfo?.exists ? (
                <motion.div
                  key="exists"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-3 space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                    <p className="text-xs font-medium text-blue-300">
                      {t("foundExisting", { count: serialInfo.totalExisting })}
                    </p>
                  </div>
                  <div className="rounded-md bg-black/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-white/50">
                      {t("lastSerial")}
                    </p>
                    <p className="mt-1 font-mono text-sm text-white">{serialInfo.lastSerial}</p>
                  </div>
                  <div className="rounded-md bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-green-300/70">
                      {t("willContinueFrom")}
                    </p>
                    <p className="mt-1 font-mono text-sm text-green-300">
                      {serialPrefix || ""}
                      {String(serialInfo.nextNumber).padStart(6, "0")}
                      {quantity > 1 && (
                        <>
                          {" "}
                          to {serialPrefix || ""}
                          {String(serialInfo.nextNumber + quantity - 1).padStart(6, "0")}
                        </>
                      )}
                    </p>
                  </div>
                </motion.div>
              ) : serialPrefix && serialPrefix.trim() ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-3 rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-yellow-500/10 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <p className="text-xs font-medium text-white/90">{t("preview")}</p>
                  </div>
                  {quantity === 1 ? (
                    <div className="rounded-md bg-black/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        {t("serialNumber")}
                      </p>
                      <p className="mt-1.5 font-mono text-lg text-amber-400">
                        {serialPrefix || ""}000001
                      </p>
                      {serialInfo && !serialInfo.exists && (
                        <p className="mt-1.5 text-xs text-green-400">{t("newPrefix")}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-md bg-black/30 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/50">
                          {t("serialRange")}
                        </p>
                        <p className="mt-1.5 font-mono text-sm text-amber-400">
                          {serialPrefix || ""}000001 to {serialPrefix || ""}
                          {String(quantity).padStart(6, "0")}
                        </p>
                      </div>
                      <p className="text-xs text-white/60">
                        {t("willCreateSequential", { quantity })}
                      </p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-start gap-2 rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <Info className="h-4 w-4 mt-0.5 text-white/40" />
                  <p className="text-xs text-white/60">{t("serialPrefixInfo")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Show Serial Code as alternative option only if serialPrefix is empty */}
          <AnimatePresence>
            {(!serialPrefix || !serialPrefix.trim()) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-amber-300/80">
                  <Hash className="h-3 w-3 text-amber-400" />
                  {t("serialCode")}
                  <span className="ml-1 text-[10px] normal-case text-white/40">
                    {t("serialCodeOptional")}
                  </span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-white uppercase transition-all placeholder:text-white/30 focus:border-amber-400/60 focus:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  placeholder={t("serialCodePlaceholder")}
                  disabled={isEditMode}
                  {...form.register("serialCode")}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    const value = target.value.toUpperCase();
                    const filtered = value.replace(/[^A-Z0-9]/g, "");
                    if (filtered !== value) {
                      target.value = filtered;
                    }
                    form.setValue("serialCode", filtered);
                    if (filtered) {
                      form.setValue("quantity", 1, { shouldValidate: false });
                      form.setValue("serialPrefix", "", { shouldValidate: false });
                    }
                  }}
                />
                {form.formState.errors.serialCode && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 text-xs text-red-400"
                  >
                    {form.formState.errors.serialCode.message}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={!isSubmitting ? { scale: 1.02 } : {}}
        whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        className="group relative w-full overflow-hidden rounded-full bg-gradient-to-r from-[#FFD700] via-[#E5C100] to-[#C0C0C0] py-4 text-sm font-semibold tracking-wide text-black shadow-lg shadow-[#FFD700]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          animate={isSubmitting ? {} : { x: "200%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <span className="relative flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : isEditMode ? (
            <>
              <Package className="h-4 w-4" />
              {t("updateProduct")}
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              Create Gram-based Batch
            </>
          )}
        </span>
      </motion.button>
    </form>
  );
}
