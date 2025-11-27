"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Plus, QrCode, FileDown, Activity } from "lucide-react";

export function AdminActionRow() {
  const t = useTranslations('admin.dashboard');
  
  const actions = [
    {
      label: t('actions.generateProduct'),
      href: "/admin/products/create",
      icon: Plus,
      description: t('actions.generateProductDesc'),
    },
    {
      label: t('actions.previewQR'),
      href: "/admin/qr-preview",
      icon: QrCode,
      description: t('actions.previewQRDesc'),
    },
    {
      label: t('actions.exportIntelligence'),
      href: "/admin/export",
      icon: FileDown,
      description: t('actions.exportIntelligenceDesc'),
    },
    {
      label: t('actions.scanAnalytics'),
      href: "/admin/logs",
      icon: Activity,
      description: t('actions.scanAnalyticsDesc'),
    },
  ];

  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6">
      <p className="text-xs uppercase tracking-[0.5em] text-white/60">{t('actions.operatorTools')}</p>
      <div className="mt-4 grid gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
            >
              <Link href={action.href} className="flex items-center gap-4 text-white">
                <span className="rounded-2xl bg-white/10 p-3">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="font-semibold">{action.label}</p>
                  <p className="text-xs text-white/50">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

