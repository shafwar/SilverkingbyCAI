"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
      price: defaultValues?.price,
      stock: defaultValues?.stock,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const endpoint = defaultValues?.id
        ? `/api/products/update/${defaultValues.id}`
        : "/api/products/create";
      const method = defaultValues?.id ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-sm text-white/80">
      <div>
        <label className="mb-1 block text-xs uppercase tracking-[0.4em] text-white/40">
          Name
        </label>
        <input
          type="text"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          {...form.register("name")}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.4em] text-white/40">
            Weight (gr)
          </label>
          <input
            type="number"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            {...form.register("weight", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.4em] text-white/40">
            Serial Code
          </label>
          <input
            type="text"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white uppercase"
            {...form.register("serialCode")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.4em] text-white/40">
            Price (optional)
          </label>
          <input
            type="number"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            {...form.register("price", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.4em] text-white/40">
            Stock (optional)
          </label>
          <input
            type="number"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
            {...form.register("stock", { valueAsNumber: true })}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#C0C0C0] py-3 text-black font-semibold tracking-wide"
      >
        {isSubmitting ? "Saving…" : defaultValues?.id ? "Update Product" : "Create Product"}
      </button>
    </form>
  );
}

