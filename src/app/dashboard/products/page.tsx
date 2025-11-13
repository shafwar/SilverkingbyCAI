"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  LogOut,
  Sparkles,
  Edit,
  Trash2,
  Download,
  Eye,
} from "lucide-react";
import { signOut } from "next-auth/react";
import ProductForm from "@/components/forms/ProductForm";

interface Product {
  id: number;
  name: string;
  weight: string;
  purity: number;
  serialNumber: string;
  uniqueCode: string;
  qrCode: string;
  scannedCount: number;
  createdAt: string;
}

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard/login");
    }

    if (status === "authenticated") {
      fetchProducts();
    }
  }, [status, router]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleDownloadQR = (product: Product) => {
    const link = document.createElement("a");
    link.href = product.qrCode;
    link.download = `${product.serialNumber}-QR.png`;
    link.click();
  };

  const getWeightLabel = (weight: string) => {
    const weightMap: { [key: string]: string } = {
      FIVE_GR: "5gr",
      TEN_GR: "10gr",
      TWENTY_FIVE_GR: "25gr",
      FIFTY_GR: "50gr",
      HUNDRED_GR: "100gr",
      TWO_FIFTY_GR: "250gr",
      FIVE_HUNDRED_GR: "500gr",
    };
    return weightMap[weight] || weight;
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-luxury-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-luxury-gold border-t-transparent"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-luxury-black">
      {/* Navigation */}
      <nav className="border-b border-luxury-silver/10 bg-luxury-black/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Sparkles className="w-8 h-8 text-luxury-gold" />
              <span className="text-2xl font-serif font-bold text-luxury-gold">
                Silver King Admin
              </span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-luxury-silver hover:text-luxury-gold transition-colors duration-300"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-serif font-bold text-luxury-gold mb-2">
                Products
              </h1>
              <p className="text-luxury-silver">
                Manage your product inventory and QR codes
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
              }}
              className="luxury-button flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>

          {/* Product Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="luxury-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-serif font-bold text-luxury-gold">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingProduct(null);
                    }}
                    className="text-luxury-silver hover:text-luxury-gold"
                  >
                    ✕
                  </button>
                </div>
                <ProductForm
                  product={editingProduct}
                  onSuccess={handleFormSuccess}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                />
              </motion.div>
            </div>
          )}

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="luxury-card text-center py-12">
              <p className="text-luxury-silver text-lg">
                No products yet. Click &quot;Add Product&quot; to create your first product.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="luxury-card"
                >
                  <div className="flex gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.qrCode}
                        alt={`QR Code for ${product.name}`}
                        className="w-32 h-32 rounded-lg bg-white p-2"
                      />
                    <div className="flex-1">
                      <h3 className="text-xl font-serif font-bold text-luxury-gold mb-2">
                        {product.name}
                      </h3>
                      <div className="space-y-1 text-sm mb-4">
                        <p className="text-luxury-silver">
                          <span className="text-luxury-lightSilver font-semibold">
                            Weight:
                          </span>{" "}
                          {getWeightLabel(product.weight)}
                        </p>
                        <p className="text-luxury-silver">
                          <span className="text-luxury-lightSilver font-semibold">
                            Purity:
                          </span>{" "}
                          {product.purity}%
                        </p>
                        <p className="text-luxury-silver">
                          <span className="text-luxury-lightSilver font-semibold">
                            Serial:
                          </span>{" "}
                          <span className="font-mono text-xs">
                            {product.serialNumber}
                          </span>
                        </p>
                        <p className="text-luxury-silver flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span className="font-semibold">{product.scannedCount}</span>{" "}
                          scans
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadQR(product)}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-luxury-gold/20 text-luxury-gold rounded hover:bg-luxury-gold/30 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          QR
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowForm(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-luxury-silver/20 text-luxury-silver rounded hover:bg-luxury-silver/30 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </button>
                        {(session.user as any)?.role === "ADMIN" && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

