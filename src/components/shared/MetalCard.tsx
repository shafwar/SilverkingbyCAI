"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface MetalCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  gradient?: string;
  className?: string;
  delay?: number;
}

export function MetalCard({
  title,
  description,
  icon,
  gradient = "from-[#f5e29c]/10 to-transparent",
  className = "",
  delay = 0,
}: MetalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-8 backdrop-blur-sm transition-all duration-500 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#f5e29c]/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      {icon && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: delay + 0.2 }}
          className="mb-6 text-[#f5e29c]"
        >
          {icon}
        </motion.div>
      )}

      <h3 className="mb-4 font-sans text-2xl font-bold text-white">{title}</h3>
      <p className="text-white/70 leading-relaxed">{description}</p>

      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#f5e29c] to-transparent transition-all duration-500 group-hover:w-full" />
    </motion.div>
  );
}

