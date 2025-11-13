"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { WEIGHTS } from "@/utils/constants";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  weight: z.enum([
    "FIVE_GR",
    "TEN_GR",
    "TWENTY_FIVE_GR",
    "FIFTY_GR",
    "HUNDRED_GR",
    "TWO_FIFTY_GR",
    "FIVE_HUNDRED_GR",
  ]),
  purity: z.number().min(0).max(100),
  uniqueCode: z.string(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      weight: product?.weight || "HUNDRED_GR",
      purity: product?.purity || 99.99,
      uniqueCode: product?.uniqueCode || "Be part of this kingdom",
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError("");

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-luxury-silver mb-2">
          Product Name *
        </label>
        <input
          id="name"
          type="text"
          {...register("name")}
          className="luxury-input"
          placeholder="Silver Bar 100gr"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="weight" className="block text-luxury-silver mb-2">
          Weight *
        </label>
        <select id="weight" {...register("weight")} className="luxury-input">
          {WEIGHTS.map((weight) => (
            <option key={weight.value} value={weight.value}>
              {weight.label}
            </option>
          ))}
        </select>
        {errors.weight && (
          <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="purity" className="block text-luxury-silver mb-2">
          Purity (%) *
        </label>
        <input
          id="purity"
          type="number"
          step="0.01"
          {...register("purity", { valueAsNumber: true })}
          className="luxury-input"
          placeholder="99.99"
        />
        {errors.purity && (
          <p className="text-red-500 text-sm mt-1">{errors.purity.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="uniqueCode" className="block text-luxury-silver mb-2">
          Unique Code
        </label>
        <input
          id="uniqueCode"
          type="text"
          {...register("uniqueCode")}
          className="luxury-input"
          placeholder="Be part of this kingdom"
        />
        {errors.uniqueCode && (
          <p className="text-red-500 text-sm mt-1">{errors.uniqueCode.message}</p>
        )}
      </div>

      {!product && (
        <div className="bg-luxury-gold/10 border border-luxury-gold/30 rounded-lg p-4">
          <p className="text-luxury-gold text-sm">
            💡 A unique QR code will be automatically generated when you create this
            product.
          </p>
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 luxury-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving..." : product ? "Update Product" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-luxury-black border-2 border-luxury-silver text-luxury-silver font-semibold rounded-lg transition-all duration-300 hover:bg-luxury-silver/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

