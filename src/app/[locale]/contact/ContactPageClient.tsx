"use client";

import { useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Instagram,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Toaster } from "sonner";
import Navbar from "@/components/layout/Navbar";
import { APP_NAME } from "@/utils/constants";

export default function ContactPageClient() {
  const t = useTranslations("contact");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Success - reset form
      setFormData({ name: "", email: "", message: "" });
      
      // Show success notification with checkmark - centered and prominent
      toast.success(t("successMessage") || "Message sent successfully!", {
        description: t("successDescription") || "We'll get back to you as soon as possible.",
        duration: 6000,
        icon: <CheckCircle2 className="h-7 w-7 text-green-400" />,
        className: "toast-success toast-contact-success",
        style: {
          fontSize: "17px",
          fontWeight: 600,
          minWidth: "420px",
          maxWidth: "520px",
        },
      });
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      const errorMessage = error.message || "Failed to send message. Please try again.";
      setSubmitError(errorMessage);
      
      // Show error notification
      toast.error("Failed to send message", {
        description: errorMessage,
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-luxury-black text-white">
      <Navbar />
      
      {/* Toast Notifications - Centered and Prominent */}
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={6000}
        offset="24px"
        toastOptions={{
          className: "toast-minimalist toast-contact",
          style: {
            background: "rgba(0, 0, 0, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "16px",
            color: "#fff",
            backdropFilter: "blur(20px)",
            maxWidth: "520px",
            minWidth: "420px",
            padding: "22px 26px",
            fontSize: "17px",
            fontWeight: 600,
            boxShadow: "0 12px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          },
          classNames: {
            success: "toast-success toast-contact-success",
            error: "toast-error",
            info: "toast-info",
            warning: "toast-warning",
          },
        }}
      />

      {/* Hero Section - Enhanced with Modern Design */}
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-24 md:py-36">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-luxury-black via-luxury-black/98 to-luxury-black" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-luxury-gold/10 via-transparent to-transparent"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-0 left-1/4 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-luxury-gold/5 rounded-full blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-luxury-gold/80 backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-luxury-gold animate-pulse" />
              Get In Touch
              <span className="h-1.5 w-1.5 rounded-full bg-luxury-gold animate-pulse" />
            </motion.span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 text-5xl font-sans font-semibold text-white sm:text-6xl md:text-7xl lg:text-8xl"
          >
            <span className="bg-gradient-to-r from-white via-luxury-gold/90 to-white bg-clip-text text-transparent">
              {t("title")}
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl text-lg font-sans leading-relaxed text-luxury-silver/80 sm:text-xl md:text-2xl"
          >
            {t("description")}
          </motion.p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Form - Enhanced Modern Design */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="group relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.03] p-8 backdrop-blur-2xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.8)] md:p-10 overflow-hidden">
                {/* Animated gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/8 via-transparent to-transparent pointer-events-none" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-tr from-transparent via-luxury-gold/5 to-transparent pointer-events-none"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Decorative corner accents */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-luxury-gold/10 to-transparent rounded-br-full blur-2xl" />
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-luxury-gold/10 to-transparent rounded-tl-full blur-2xl" />
                
                <div className="relative z-10">
                  <div className="mb-6">
                    <h2 className="mb-3 text-3xl font-bold text-white">{t("formTitle")}</h2>
                    <p className="text-base text-white/70 leading-relaxed">{t("formSubtitle") || "Fill out the form below and we'll get back to you."}</p>
                  </div>
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-white/80">
                      {t("form.name")}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.1] px-5 py-4 text-white placeholder:text-white/50 focus:border-luxury-gold/80 focus:outline-none focus:ring-2 focus:ring-luxury-gold/40 focus:bg-white/[0.15] focus:shadow-lg focus:shadow-luxury-gold/20 transition-all duration-300"
                      placeholder={t("form.namePlaceholder")}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
                      {t("form.email")}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.1] px-5 py-4 text-white placeholder:text-white/50 focus:border-luxury-gold/80 focus:outline-none focus:ring-2 focus:ring-luxury-gold/40 focus:bg-white/[0.15] focus:shadow-lg focus:shadow-luxury-gold/20 transition-all duration-300"
                      placeholder={t("form.emailPlaceholder")}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="mb-2 block text-sm font-medium text-white/80"
                    >
                      {t("form.message")}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={7}
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.1] px-5 py-4 text-white placeholder:text-white/50 focus:border-luxury-gold/80 focus:outline-none focus:ring-2 focus:ring-luxury-gold/40 focus:bg-white/[0.15] focus:shadow-lg focus:shadow-luxury-gold/20 transition-all duration-300 resize-none"
                      placeholder={t("form.messagePlaceholder")}
                    />
                  </div>

                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur-sm"
                    >
                      {submitError}
                    </motion.div>
                  )}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: isSubmitting ? 1 : 1.03, y: isSubmitting ? 0 : -2 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.97 }}
                    className="group relative w-full rounded-2xl bg-gradient-to-r from-luxury-gold via-luxury-gold to-luxury-lightGold px-8 py-5 text-base font-bold text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-2xl shadow-luxury-gold/30 hover:shadow-2xl hover:shadow-luxury-gold/50 overflow-hidden"
                  >
                    {/* Shine effect on hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    {isSubmitting ? (
                      <>
                        <div className="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        <span className="relative z-10">{t("form.submitting")}</span>
                      </>
                    ) : (
                      <>
                        <Send className="relative z-10 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        <span className="relative z-10">{t("form.submit")}</span>
                      </>
                    )}
                  </motion.button>
                </form>
                </div>
              </div>
            </motion.div>

            {/* Contact Information - Enhanced Design */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              <div>
                <h2 className="mb-4 text-3xl font-bold text-white">{t("infoTitle")}</h2>
                <p className="mb-10 text-lg leading-relaxed text-luxury-silver/80">
                  {t("infoDescription")}
                </p>
              </div>

              <div className="space-y-6">
                {/* Email */}
                <motion.div
                  whileHover={{ scale: 1.03, x: 6, y: -2 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex items-start gap-5 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.03] p-6 backdrop-blur-xl hover:border-luxury-gold/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.08] hover:to-white/[0.05] transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-luxury-gold/20 overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/0 via-luxury-gold/0 to-luxury-gold/0 group-hover:from-luxury-gold/10 group-hover:via-luxury-gold/5 group-hover:to-luxury-gold/0 transition-all duration-300 pointer-events-none" />
                  
                  <div className="relative z-10 rounded-2xl bg-gradient-to-br from-luxury-gold/30 to-luxury-gold/15 p-4 shadow-xl shadow-luxury-gold/20 group-hover:shadow-2xl group-hover:shadow-luxury-gold/30 transition-all duration-300">
                    <Mail className="h-6 w-6 text-luxury-gold" />
                  </div>
                  <div className="relative z-10 flex-1">
                    <h3 className="mb-2 text-base font-bold text-white">{t("info.email")}</h3>
                    <a
                      href="mailto:cahayaabuindonesia@gmail.com"
                      className="text-base text-luxury-silver/80 hover:text-luxury-gold transition-colors break-all font-medium"
                    >
                      cahayaabuindonesia@gmail.com
                    </a>
                  </div>
                </motion.div>

                {/* Phone */}
                <motion.div
                  whileHover={{ scale: 1.03, x: 6, y: -2 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex items-start gap-5 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.03] p-6 backdrop-blur-xl hover:border-luxury-gold/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.08] hover:to-white/[0.05] transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-luxury-gold/20 overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/0 via-luxury-gold/0 to-luxury-gold/0 group-hover:from-luxury-gold/10 group-hover:via-luxury-gold/5 group-hover:to-luxury-gold/0 transition-all duration-300 pointer-events-none" />
                  
                  <div className="relative z-10 rounded-2xl bg-gradient-to-br from-luxury-gold/30 to-luxury-gold/15 p-4 shadow-xl shadow-luxury-gold/20 group-hover:shadow-2xl group-hover:shadow-luxury-gold/30 transition-all duration-300">
                    <Phone className="h-6 w-6 text-luxury-gold" />
                  </div>
                  <div className="relative z-10 flex-1">
                    <h3 className="mb-2 text-base font-bold text-white">{t("info.phone")}</h3>
                    <a
                      href="tel:+6285285726980"
                      className="text-base text-luxury-silver/80 hover:text-luxury-gold transition-colors font-medium"
                    >
                      +62 852-8572-6980 (Nadhifa)
                    </a>
                  </div>
                </motion.div>

                {/* Address */}
                <motion.div
                  whileHover={{ scale: 1.03, x: 6, y: -2 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative flex items-start gap-5 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.03] p-6 backdrop-blur-xl hover:border-luxury-gold/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.08] hover:to-white/[0.05] transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-luxury-gold/20 overflow-hidden"
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-luxury-gold/0 via-luxury-gold/0 to-luxury-gold/0 group-hover:from-luxury-gold/10 group-hover:via-luxury-gold/5 group-hover:to-luxury-gold/0 transition-all duration-300 pointer-events-none" />
                  
                  <div className="relative z-10 rounded-2xl bg-gradient-to-br from-luxury-gold/30 to-luxury-gold/15 p-4 shadow-xl shadow-luxury-gold/20 group-hover:shadow-2xl group-hover:shadow-luxury-gold/30 transition-all duration-300">
                    <MapPin className="h-6 w-6 text-luxury-gold" />
                  </div>
                  <div className="relative z-10 flex-1">
                    <h3 className="mb-2 text-base font-bold text-white">{t("info.address")}</h3>
                    <p className="text-base text-luxury-silver/80 leading-relaxed font-medium">{t("info.addressValue")}</p>
                  </div>
                </motion.div>
              </div>

              {/* Social Media - Enhanced */}
              <div className="pt-8 border-t border-white/15">
                <h3 className="mb-6 text-lg font-bold text-white">{t("socialTitle")}</h3>
                <div className="flex gap-4">
                  <motion.a
                    href="https://www.instagram.com/silverkingofc/"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15, y: -4, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="group relative rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.04] p-5 text-white/70 hover:border-luxury-gold/60 hover:bg-gradient-to-br hover:from-luxury-gold/25 hover:to-luxury-gold/15 hover:text-luxury-gold transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-luxury-gold/30 overflow-hidden"
                    aria-label="Follow us on Instagram"
                  >
                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                    <Instagram className="relative z-10 h-6 w-6" />
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} {APP_NAME}. {t("footer.rights")}
            </p>
            <div className="flex gap-6 text-sm">
              <Link
                href={`/${locale}/what-we-do`}
                prefetch={true}
                className="text-white/60 hover:text-white transition-colors"
              >
                {tNav("whatWeDo")}
              </Link>
              <Link
                href={`/${locale}/authenticity`}
                prefetch={true}
                className="text-white/60 hover:text-white transition-colors"
              >
                {tNav("authenticity")}
              </Link>
              <Link
                href={`/${locale}/products`}
                prefetch={true}
                className="text-white/60 hover:text-white transition-colors"
              >
                {tNav("products")}
              </Link>
              <Link
                href={`/${locale}/about`}
                prefetch={true}
                className="text-white/60 hover:text-white transition-colors"
              >
                {tNav("aboutUs")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

