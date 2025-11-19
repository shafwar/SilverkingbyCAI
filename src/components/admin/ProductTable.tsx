"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ProductRow = {
  id: number;
  name: string;
  weight: number;
  serialCode: string;
  price?: number | null;
  stock?: number | null;
  createdAt: string;
  qrRecord?: {
    qrImageUrl: string;
    scanCount: number;
  } | null;
};

export function ProductTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    const product = products.find((p) => p.id === id);
    const productName = product?.name || "Product";

    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/delete/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Delete failed");
      }

      toast.success("Product deleted successfully", {
        description: `${productName} has been removed from inventory`,
        duration: 3000,
      });

      startTransition(() => router.refresh());
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to delete product", {
        description: error.message || "Please try again",
        duration: 4000,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
      <table className="w-full text-sm text-white/70">
        <thead>
          <tr className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.4em] text-white/40">
            <th className="px-6 py-4">Product</th>
            <th className="px-6 py-4">Serial</th>
            <th className="px-6 py-4">Weight</th>
            <th className="px-6 py-4">Scans</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t border-white/5">
              <td className="px-6 py-4">
                <p className="font-semibold text-white">{product.name}</p>
                <p className="text-xs text-white/40">#{product.id}</p>
              </td>
              <td className="px-6 py-4 font-mono text-sm text-white/80">{product.serialCode}</td>
              <td className="px-6 py-4">{product.weight} gr</td>
              <td className="px-6 py-4">{product.qrRecord?.scanCount ?? 0}</td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => router.push(`/admin/products/create?id=${product.id}`)}
                  className="mr-3 rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-white/40"
                >
                  Edit
                </button>
                <button
                  disabled={isPending && deletingId === product.id}
                  onClick={() => handleDelete(product.id)}
                  className="rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-300 hover:border-red-400"
                >
                  {isPending && deletingId === product.id ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

