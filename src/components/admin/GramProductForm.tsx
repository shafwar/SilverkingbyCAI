"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Package, Weight, Boxes, Loader2, Info, X } from "lucide-react";
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
    },
  });

  const quantity = form.watch("quantity") ?? 1;
  const weight = form.watch("weight") ?? 50;
  const isSmallWeight = weight < 100;
  const isEditMode = !!defaultValues?.id;

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
        // CREATE: behaviour lama
        const res = await fetch("/api/gram-products/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || t("saveFailed"));
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
      console.error(error);
      toast.error(t("saveFailed"), {
        description: error.message || t("saveFailedDescription"),
        duration: 4000,
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

      {/* Basic Info */}
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
          </div>
        </div>
      </motion.div>

      {/* Weight + Quantity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2"
      >
        <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-3 sm:p-4 backdrop-blur-sm">
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.35em] text-emerald-300/80">
            <Weight className="h-3 w-3 text-emerald-400" />
            {t("weight")}
          </label>
          <input
            type="number"
            className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-white transition-all placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 disabled:opacity-60"
            placeholder={t("weightPlaceholder")}
            disabled={isEditMode} // berat tidak diubah setelah batch dibuat
            {...form.register("weight", { valueAsNumber: true })}
          />
          <p className="mt-2 text-[11px] text-white/60">
            {isSmallWeight
              ? "Weights below 100gr will generate 1 QR for the whole batch."
              : "Weights 250gr, 500gr, etc. will generate 1 QR per unit."}
          </p>
        </div>
        <div className="rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-3 sm:p-4 backdrop-blur-sm">
          <label className="mb-1.5 flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.35em] text-purple-300/80">
            <Boxes className="h-3 w-3 text-purple-400" />
            {t("quantity")}
          </label>
          <input
            type="number"
            min={1}
            max={10000}
            className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 sm:px-4 py-2.5 text-sm sm:text-base text-white transition-all placeholder:text-white/30 focus:border-purple-400/60 focus:bg-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-60"
            placeholder={t("quantityPlaceholder")}
            disabled={isEditMode} // quantity fix setelah QR dibuat
            {...form.register("quantity", { valueAsNumber: true })}
          />
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-white/60">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {isSmallWeight
                ? `Small weight mode: 1 QR will represent ${quantity} units of ${weight}gr.`
                : `Large weight mode: this will generate ${quantity} unique QR codes (each with its own uniqcode).`}
            </span>
          </p>
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


