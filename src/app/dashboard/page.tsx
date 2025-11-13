"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  QrCode,
  Eye,
  LogOut,
  Sparkles,
  Plus,
} from "lucide-react";
import { signOut } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalScans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard/login");
    }

    if (status === "authenticated") {
      fetchStats();
    }
  }, [status, router]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      
      const totalScans = data.products.reduce(
        (sum: number, product: any) => sum + product.scannedCount,
        0
      );

      setStats({
        totalProducts: data.products.length,
        totalScans,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
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
              <span className="text-luxury-silver">
                {session.user?.name || session.user?.email}
              </span>
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
          <h1 className="text-4xl font-serif font-bold text-luxury-gold mb-2">
            Dashboard
          </h1>
          <p className="text-luxury-silver mb-8">
            Welcome back! Here&apos;s an overview of your products.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="luxury-card"
            >
              <Package className="w-12 h-12 text-luxury-gold mb-4" />
              <div className="text-4xl font-bold text-luxury-gold mb-2">
                {stats.totalProducts}
              </div>
              <div className="text-luxury-silver">Total Products</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="luxury-card"
            >
              <QrCode className="w-12 h-12 text-luxury-gold mb-4" />
              <div className="text-4xl font-bold text-luxury-gold mb-2">
                {stats.totalProducts}
              </div>
              <div className="text-luxury-silver">QR Codes Generated</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="luxury-card"
            >
              <Eye className="w-12 h-12 text-luxury-gold mb-4" />
              <div className="text-4xl font-bold text-luxury-gold mb-2">
                {stats.totalScans}
              </div>
              <div className="text-luxury-silver">Total Scans</div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="luxury-card"
          >
            <h2 className="text-2xl font-serif font-bold text-luxury-gold mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/dashboard/products"
                className="flex items-center gap-4 p-6 bg-luxury-black/50 border border-luxury-silver/20 rounded-lg hover:border-luxury-gold transition-all duration-300 group"
              >
                <Package className="w-8 h-8 text-luxury-gold" />
                <div>
                  <h3 className="text-lg font-semibold text-luxury-lightSilver group-hover:text-luxury-gold transition-colors">
                    Manage Products
                  </h3>
                  <p className="text-luxury-silver text-sm">
                    View, edit, and delete products
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/products"
                className="flex items-center gap-4 p-6 bg-luxury-black/50 border border-luxury-silver/20 rounded-lg hover:border-luxury-gold transition-all duration-300 group"
              >
                <Plus className="w-8 h-8 text-luxury-gold" />
                <div>
                  <h3 className="text-lg font-semibold text-luxury-lightSilver group-hover:text-luxury-gold transition-colors">
                    Add New Product
                  </h3>
                  <p className="text-luxury-silver text-sm">
                    Create product with QR code
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

