"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Weight,
  Hash,
  QrCode,
  DollarSign,
  Boxes,
  Sparkles,
  CheckCircle2,
  Loader2,
  Info,
} from "lucide-react";
import { productCreateSchema, ProductCreateInput } from "@/lib/validators/product";

type ProductFormProps = {
  defaultValues?: Partial<ProductCreateInput> & { id?: number };
};

export function ProductForm({ defaultValues }: ProductFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProductCreateInput>({
    resolver: zodResolver(productCreateSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? "",
      weight: defaultValues?.weight ?? 5,
      serialCode: defaultValues?.serialCode ?? "",
      serialPrefix: defaultValues?.serialPrefix ?? "",
      quantity: defaultValues?.quantity ?? 1,
      price: defaultValues?.price,
      stock: defaultValues?.stock,
    },
  });

  const quantity = form.watch("quantity") ?? 1;
  const serialPrefix = form.watch("serialPrefix") ?? "";
  const productName = form.watch("name") ?? "";
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
  // Support both batch creation (quantity > 1) and continuation (quantity = 1 with serialPrefix)
  useEffect(() => {
    const checkExistingSerials = async () => {
      if (!productName.trim() || !serialPrefix.trim()) {
        setSerialInfo(null);
        return;
      }

      setIsCheckingSerial(true);
      try {
        const response = await fetch(
          `/api/products/check-serial?name=${encodeURIComponent(productName.trim())}&serialPrefix=${encodeURIComponent(serialPrefix)}`
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
  }, [productName, serialPrefix, quantity]);

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      // Ensure serialCode is empty if serialPrefix is provided
      const submitValues = {
        ...values,
        serialCode:
          values.serialPrefix && values.serialPrefix.trim() !== "" ? "" : values.serialCode,
      };

      const endpoint = defaultValues?.id
        ? `/api/products/update/${defaultValues.id}`
        : "/api/products/create";
      const method = defaultValues?.id ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitValues),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Request failed");
      }

      const data = await res.json();
      const isBatch = values.quantity && values.quantity > 1;
      const isUpdate = !!defaultValues?.id;

      if (isUpdate) {
        toast.success("Product updated successfully!", {
          description: `${values.name} has been updated`,
          duration: 3000,
        });
      } else if (isBatch && data.count) {
        toast.success(`Successfully created ${data.count} products!`, {
          description: `Serial numbers generated for ${values.name}`,
          duration: 3000,
        });
      } else {
        toast.success("Product created successfully!", {
          description: `${values.name} has been added to inventory`,
          duration: 3000,
        });
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to save product", {
        description: error.message || "Please check your input and try again",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  const isEditMode = !!defaultValues?.id;
  const isBatchMode = !isEditMode && quantity > 1;

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-sm text-white/80">
      {/* Basic Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-6 backdrop-blur-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-blue-500/20 p-2">
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Basic Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-blue-300/80">
              <Package className="h-3 w-3 text-blue-400" />
              Product Name
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-white transition-all placeholder:text-white/30 focus:border-blue-400/60 focus:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              placeholder="e.g., Silver King 100g"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400"
              >
                <span>⚠</span> {form.formState.errors.name.message}
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={isEditMode ? "" : "grid grid-cols-1 gap-4 md:grid-cols-2"}
      >
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-4 backdrop-blur-sm">
          <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-emerald-300/80">
            <Weight className="h-3 w-3 text-emerald-400" />
            Weight (grams)
          </label>
          <input
            type="number"
            className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-white transition-all placeholder:text-white/30 focus:border-emerald-400/60 focus:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
            placeholder="100"
            {...form.register("weight", { valueAsNumber: true })}
          />
          {form.formState.errors.weight && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 text-xs text-red-400"
            >
              {form.formState.errors.weight.message}
            </motion.p>
          )}
        </div>
        {!isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent p-4 backdrop-blur-sm"
          >
            <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-purple-300/80">
              <Boxes className="h-3 w-3 text-purple-400" />
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-white transition-all placeholder:text-white/30 focus:border-purple-400/60 focus:bg-purple-500/20 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
              placeholder="1"
              {...form.register("quantity", { valueAsNumber: true })}
              onChange={(e) => {
                const newQuantity = Number(e.target.value) || 1;
                form.setValue("quantity", newQuantity);
                if (newQuantity > 1) {
                  form.setValue("serialCode", "");
                }
              }}
            />
            {form.formState.errors.quantity && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1.5 text-xs text-red-400"
              >
                {form.formState.errors.quantity.message}
              </motion.p>
            )}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex items-start gap-1.5 text-xs text-white/60"
            >
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                {quantity > 1
                  ? `Will create ${quantity} products with unique serial numbers`
                  : "Single product. Enter serial prefix (e.g., SKT) to auto-generate SKT00001 format."}
              </span>
            </motion.p>
          </motion.div>
        )}
      </motion.div>
      {!isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6 backdrop-blur-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <QrCode className="h-4 w-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">Serial Number Configuration</h3>
          </div>
          <div className="space-y-4">
            {/* Serial Prefix Input */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-amber-300/80">
                <Hash className="h-3 w-3 text-amber-400" />
                Serial Prefix
                {quantity === 1 && (
                  <span className="ml-1 text-[10px] normal-case text-white/40">
                    (Auto-generates SKT00001 format)
                  </span>
                )}
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-white uppercase transition-all placeholder:text-white/30 focus:border-amber-400/60 focus:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                placeholder={
                  quantity === 1
                    ? "SKT (will create SKT00001)"
                    : "SKA (will create SKA00001, SKA00002...)"
                }
                value={serialPrefix}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  const filtered = value.replace(/[^A-Z0-9]/g, "");
                  form.setValue("serialPrefix", filtered, {
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
                    <span className="text-xs text-white/60">Checking existing serials...</span>
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
                        Found {serialInfo.totalExisting} existing product(s)
                      </p>
                    </div>
                    <div className="rounded-md bg-black/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-white/50">
                        Last Serial
                      </p>
                      <p className="mt-1 font-mono text-sm text-white">{serialInfo.lastSerial}</p>
                    </div>
                    <div className="rounded-md bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-green-300/70">
                        Will Continue From
                      </p>
                      <p className="mt-1 font-mono text-sm text-green-300">
                        {serialPrefix}
                        {String(serialInfo.nextNumber).padStart(5, "0")}
                        {quantity > 1 && (
                          <>
                            {" "}
                            to {serialPrefix}
                            {String(serialInfo.nextNumber + quantity - 1).padStart(5, "0")}
                          </>
                        )}
                      </p>
                    </div>
                  </motion.div>
                ) : serialPrefix.trim() ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-3 rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-500/15 to-yellow-500/10 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <p className="text-xs font-medium text-white/90">Preview</p>
                    </div>
                    {quantity === 1 ? (
                      <div className="rounded-md bg-black/30 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-white/50">
                          Serial Number
                        </p>
                        <p className="mt-1.5 font-mono text-lg text-amber-400">
                          {serialPrefix}00001
                        </p>
                        {serialInfo && !serialInfo.exists && (
                          <p className="mt-1.5 text-xs text-green-400">
                            ✨ New prefix, starting from 00001
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="rounded-md bg-black/30 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">
                            Serial Range
                          </p>
                          <p className="mt-1.5 font-mono text-sm text-amber-400">
                            {serialPrefix}00001 to {serialPrefix}
                            {String(quantity).padStart(5, "0")}
                          </p>
                        </div>
                        <p className="text-xs text-white/60">
                          {quantity} products will be created with sequential serial numbers
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
                    <p className="text-xs text-white/60">
                      Enter a prefix (e.g., SKT) to auto-generate serial numbers in SKT00001 format
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Show Serial Code as alternative option only if serialPrefix is empty */}
            <AnimatePresence>
              {!serialPrefix.trim() && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-amber-300/80">
                    <Hash className="h-3 w-3 text-amber-400" />
                    Serial Code
                    <span className="ml-1 text-[10px] normal-case text-white/40">
                      (optional, auto-generated if empty)
                    </span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-white uppercase transition-all placeholder:text-white/30 focus:border-amber-400/60 focus:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    placeholder="Auto-generated or enter custom (e.g., SKA12345)"
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
      )}
      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4 backdrop-blur-sm"
        >
          <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-amber-300/80">
            <Hash className="h-3 w-3 text-amber-400" />
            Serial Code
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-white uppercase transition-all placeholder:text-white/30 focus:border-amber-400/60 focus:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            {...form.register("serialCode")}
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className={isEditMode ? "" : "grid grid-cols-1 gap-4 md:grid-cols-2"}
      >
        <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent p-4 backdrop-blur-sm">
          <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-green-300/80">
            <DollarSign className="h-3 w-3 text-green-400" />
            Price (optional)
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-white transition-all placeholder:text-white/30 focus:border-green-400/60 focus:bg-green-500/20 focus:outline-none focus:ring-2 focus:ring-green-400/30"
            placeholder="250000000 (optional)"
            {...form.register("price", { 
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
              }
            })}
          />
          {form.formState.errors.price && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 text-xs text-red-400"
            >
              {form.formState.errors.price.message}
            </motion.p>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isBatchMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-yellow-500/40 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 p-5 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-yellow-500/20 p-2">
                <Boxes className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-300">Batch Creation Mode</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                  {quantity} products will be created, each with a unique serial number and QR code.
                  Stock will be set to 1 for each product (one unit per serial number).
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {isBatchMode ? `Creating ${quantity} products...` : "Saving…"}
            </>
          ) : isEditMode ? (
            "Update Product"
          ) : isBatchMode ? (
            <>
              <Sparkles className="h-4 w-4" />
              Create {quantity} Products
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              Create Product
            </>
          )}
        </span>
      </motion.button>
    </form>
  );
}
