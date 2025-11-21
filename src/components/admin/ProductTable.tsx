"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { Trash2, AlertTriangle, Search, X } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return products;
    }

    const query = searchQuery.toLowerCase().trim();
    return products.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const serialMatch = product.serialCode.toLowerCase().includes(query);
      const weightMatch = product.weight.toString().includes(query);
      
      return nameMatch || serialMatch || weightMatch;
    });
  }, [products, searchQuery]);

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
      {/* Search Bar and Actions */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, serial, or weight..."
            className="w-full rounded-full border border-white/15 bg-white/5 px-10 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#FFD700] focus:outline-none focus:ring-2 focus:ring-[#FFD700]/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Delete All Button */}
        <button
          onClick={handleDeleteAll}
          disabled={isDeletingAll || products.length === 0}
          className="flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeletingAll ? "Deleting All…" : "Delete All Products"}
        </button>
      </div>

      {/* Search Results Count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-white/60">
          Found {filteredProducts.length} of {products.length} product(s)
        </div>
      )}

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
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-white/70">
            <thead>
              <tr className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.4em] text-white/40">
                <th className="px-4 lg:px-6 py-4">Product</th>
                <th className="px-4 lg:px-6 py-4">Serial</th>
                <th className="px-4 lg:px-6 py-4">Weight</th>
                <th className="px-4 lg:px-6 py-4">Scans</th>
                <th className="px-4 lg:px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/40">
                    {searchQuery ? "No products found matching your search." : "No products available."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-white/5">
                    <td className="px-4 lg:px-6 py-4">
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="text-xs text-white/40">#{product.id}</p>
                    </td>
                    <td className="px-4 lg:px-6 py-4 font-mono text-sm text-white/80">{product.serialCode}</td>
                    <td className="px-4 lg:px-6 py-4">{product.weight} gr</td>
                    <td className="px-4 lg:px-6 py-4">{product.qrRecord?.scanCount ?? 0}</td>
                    <td className="px-4 lg:px-6 py-4 text-right">
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-white/5">
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/40">
              {searchQuery ? "No products found matching your search." : "No products available."}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white text-base">{product.name}</p>
                    <p className="text-xs text-white/40 mt-1">#{product.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/products/create?id=${product.id}`)}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/40"
                    >
                      Edit
                    </button>
                    <button
                      disabled={isPending && deletingId === product.id}
                      onClick={() => handleDelete(product.id)}
                      className="rounded-full border border-red-400/40 px-3 py-1.5 text-xs text-red-300 hover:border-red-400 disabled:opacity-50"
                    >
                      {isPending && deletingId === product.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Serial</p>
                    <p className="font-mono text-white/80">{product.serialCode}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Weight</p>
                    <p className="text-white/80">{product.weight} gr</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Scans</p>
                    <p className="text-white/80">{product.qrRecord?.scanCount ?? 0}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

