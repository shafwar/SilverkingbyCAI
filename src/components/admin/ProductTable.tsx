"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { Trash2, AlertTriangle } from "lucide-react";

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
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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

  async function handleDeleteAll() {
    if (products.length === 0) {
      toast.info("No products to delete");
      return;
    }

    // First confirmation: Show warning modal
    setShowDeleteAllModal(true);
  }

  async function confirmDeleteAll() {
    // Second confirmation: Require typing "DELETE ALL"
    if (confirmText !== "DELETE ALL") {
      toast.error("Please type 'DELETE ALL' to confirm", {
        description: "This is a safety measure to prevent accidental deletion",
        duration: 4000,
      });
      return;
    }

    setIsDeletingAll(true);
    setShowConfirmModal(false);
    setShowDeleteAllModal(false);

    try {
      const res = await fetch("/api/products/delete-all", { method: "DELETE" });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Delete all failed");
      }

      const data = await res.json();

      toast.success("All products deleted successfully", {
        description: `${data.deletedCount || products.length} product(s) have been removed from inventory`,
        duration: 5000,
      });

      // Reset confirmation text
      setConfirmText("");
      
      // Refresh the page to show empty state
      startTransition(() => router.refresh());
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to delete all products", {
        description: error.message || "Please try again",
        duration: 5000,
      });
    } finally {
      setIsDeletingAll(false);
    }
  }

  function handleFirstConfirm() {
    setShowDeleteAllModal(false);
    setShowConfirmModal(true);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={handleDeleteAll}
          disabled={isDeletingAll || products.length === 0}
          className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeletingAll ? "Deleting All…" : "Delete All Products"}
        </button>
      </div>

      {/* First Confirmation Modal - Warning */}
      <Modal
        open={showDeleteAllModal}
        onClose={() => {
          setShowDeleteAllModal(false);
        }}
        title="⚠️ Delete All Products"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-400" />
            <div className="space-y-2">
              <p className="font-semibold text-red-300">This action cannot be undone!</p>
              <p className="text-sm text-white/70">
                You are about to delete <strong className="text-white">{products.length}</strong> product(s) from your inventory.
                This will also delete:
              </p>
              <ul className="ml-4 list-disc space-y-1 text-sm text-white/60">
                <li>All associated QR codes</li>
                <li>All scan logs and analytics data</li>
                <li>All QR code images from storage</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleFirstConfirm}
              className="flex-1 rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/30"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* Second Confirmation Modal - Type to Confirm */}
      <Modal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmText("");
        }}
        title="🔒 Final Confirmation Required"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-white/70">
              To confirm this destructive action, please type <strong className="text-white">DELETE ALL</strong> in the box below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE ALL to confirm"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmText === "DELETE ALL") {
                  confirmDeleteAll();
                }
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setConfirmText("");
              }}
              className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteAll}
              disabled={confirmText !== "DELETE ALL"}
              className="flex-1 rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete All Products
            </button>
          </div>
        </div>
      </Modal>

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
    </>
  );
}

